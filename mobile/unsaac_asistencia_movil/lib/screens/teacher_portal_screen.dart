import 'package:flutter/material.dart';

import '../controllers/app_controller.dart';
import '../core/app_theme.dart';
import '../models/teacher_portal.dart';
import '../services/teacher_portal_service.dart';
import '../widgets/teacher_notification_button.dart';
import 'device_link_screen.dart';
import 'qr_attendance_scan_screen.dart';
import 'quick_attendance_screen.dart';
import 'settings_screen.dart';
import 'teacher_insights_screen.dart';

class TeacherPortalScreen extends StatefulWidget {
  const TeacherPortalScreen({required this.controller, super.key});

  final AppController controller;

  @override
  State<TeacherPortalScreen> createState() => _TeacherPortalScreenState();
}

class _TeacherPortalScreenState extends State<TeacherPortalScreen> {
  final TeacherPortalService _service = TeacherPortalService();

  TeacherPortalData _data = const TeacherPortalData(
    schedules: <TeacherSchedule>[],
    history: <TeacherAttendanceItem>[],
  );
  bool _loading = true;
  String? _error;
  int _tabIndex = 0;
  String _historyFilter = 'TODOS';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _refresh());
  }

  @override
  void dispose() {
    _service.close();
    super.dispose();
  }

  Future<void> _refresh({
    bool showFeedback = false,
    bool renewSchedules = false,
  }) async {
    if (mounted) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }

    try {
      await widget.controller.refreshAll();
      final String? token = widget.controller.sessionToken;
      if (token == null || token.isEmpty) {
        throw const TeacherPortalException(
          'No existe una sesión docente válida.',
        );
      }
      String? renewalMessage;
      if (renewSchedules) {
        if (widget.controller.pendingOfflineCount > 0) {
          renewalMessage =
              'Los horarios visibles se actualizaron, pero la copia offline no se renovó porque existen marcaciones pendientes.';
        } else if (widget.controller.linkedDevice?.isAuthorized == true) {
          final bool offlineRenewed = await widget.controller
              .prepareOfflineMode(notify: false, forceRefresh: true);
          renewalMessage = offlineRenewed
              ? 'Horarios renovados y copia offline cifrada actualizada.'
              : 'Los horarios visibles se actualizaron. ${widget.controller.offlineMessage ?? 'No se pudo renovar la copia offline.'}';
        } else {
          renewalMessage =
              'Los horarios visibles se actualizaron. Autorice este celular para preparar la copia offline.';
        }
      }

      final TeacherPortalData data = await _service.loadTeacherPortal(
        serverUrl: widget.controller.serverUrl,
        token: token,
      );
      if (!mounted) {
        return;
      }
      setState(() => _data = data);
      if (showFeedback) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              renewalMessage ?? 'Información actualizada correctamente.',
            ),
          ),
        );
      }
    } on TeacherPortalException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _error = error.message);
      if (showFeedback) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(error.message)));
      }
    } on Object {
      if (!mounted) {
        return;
      }
      setState(() => _error = 'No se pudo actualizar el panel docente.');
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _openWebSync() async {
    final bool? synchronized = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) => DeviceLinkScreen(controller: widget.controller),
      ),
    );

    if (synchronized == true && mounted) {
      await _refresh(showFeedback: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_titleForTab(_tabIndex)),
        actions: <Widget>[
          TeacherNotificationButton(appController: widget.controller),
          IconButton(
            tooltip: 'Resumen mensual y seguridad',
            onPressed: () async {
              await Navigator.of(context).push<void>(
                MaterialPageRoute<void>(
                  builder: (_) =>
                      TeacherInsightsScreen(controller: widget.controller),
                ),
              );
            },
            icon: const Icon(Icons.insights_outlined),
          ),
          IconButton(
            tooltip: 'Actualizar estado y datos',
            onPressed: _loading ? null : () => _refresh(showFeedback: true),
            icon: const Icon(Icons.refresh),
          ),
          PopupMenuButton<String>(
            onSelected: (String value) async {
              if (value == 'settings') {
                await Navigator.of(context).push<void>(
                  MaterialPageRoute<void>(
                    builder: (_) =>
                        SettingsScreen(controller: widget.controller),
                  ),
                );
              }
              if (value == 'logout') {
                await widget.controller.logout();
              }
            },
            itemBuilder: (_) => const <PopupMenuEntry<String>>[
              PopupMenuItem<String>(
                value: 'settings',
                child: Text('Configurar servidor'),
              ),
              PopupMenuItem<String>(
                value: 'logout',
                child: Text('Cerrar sesión'),
              ),
            ],
          ),
        ],
      ),
      body: Stack(
        children: <Widget>[
          IndexedStack(
            index: _tabIndex,
            children: <Widget>[
              _HomeTab(
                controller: widget.controller,
                data: _data,
                error: _error,
                onRefresh: () => _refresh(showFeedback: true),
                onOpenSchedules: () => setState(() => _tabIndex = 1),
                onOpenHistory: () => setState(() => _tabIndex = 2),
                onOpenAttendance: () => setState(() => _tabIndex = 3),
                onSyncWeb: _openWebSync,
              ),
              _SchedulesTab(
                schedules: _data.schedules,
                error: _error,
                onRefresh: () => _refresh(showFeedback: true),
                onRenewSchedules: () =>
                    _refresh(showFeedback: true, renewSchedules: true),
              ),
              _HistoryTab(
                history: _filteredHistory,
                selectedFilter: _historyFilter,
                onFilterChanged: (String value) {
                  setState(() => _historyFilter = value);
                },
                error: _error,
                onRefresh: () => _refresh(showFeedback: true),
              ),
              _AttendanceTab(
                controller: widget.controller,
                onQrCompleted: () async {
                  setState(() => _tabIndex = 2);
                  await _refresh(showFeedback: true);
                },
              ),
            ],
          ),
          if (_loading)
            const Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: LinearProgressIndicator(minHeight: 3),
            ),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tabIndex,
        onDestinationSelected: (int value) => setState(() => _tabIndex = value),
        destinations: const <NavigationDestination>[
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Inicio',
          ),
          NavigationDestination(
            icon: Icon(Icons.calendar_month_outlined),
            selectedIcon: Icon(Icons.calendar_month),
            label: 'Horarios',
          ),
          NavigationDestination(
            icon: Icon(Icons.history_outlined),
            selectedIcon: Icon(Icons.history),
            label: 'Historial',
          ),
          NavigationDestination(
            icon: Icon(Icons.how_to_reg_outlined),
            selectedIcon: Icon(Icons.how_to_reg),
            label: 'Marcar',
          ),
        ],
      ),
    );
  }

  List<TeacherAttendanceItem> get _filteredHistory {
    return switch (_historyFilter) {
      'CURSOS' =>
        _data.history
            .where((TeacherAttendanceItem item) => item.isCourse)
            .toList(),
      'INGRESOS' =>
        _data.history
            .where((TeacherAttendanceItem item) => !item.isCourse)
            .toList(),
      _ => _data.history,
    };
  }
}

String _titleForTab(int index) => switch (index) {
  1 => 'Mis horarios',
  2 => 'Historial de asistencia',
  3 => 'Registrar asistencia',
  _ => 'UNSAAC Asistencia',
};

class _HomeTab extends StatelessWidget {
  const _HomeTab({
    required this.controller,
    required this.data,
    required this.error,
    required this.onRefresh,
    required this.onOpenSchedules,
    required this.onOpenHistory,
    required this.onOpenAttendance,
    required this.onSyncWeb,
  });

  final AppController controller;
  final TeacherPortalData data;
  final String? error;
  final Future<void> Function() onRefresh;
  final VoidCallback onOpenSchedules;
  final VoidCallback onOpenHistory;
  final VoidCallback onOpenAttendance;
  final Future<void> Function() onSyncWeb;

  @override
  Widget build(BuildContext context) {
    final TeacherSchedule? next = _nextSchedule(data.schedules);
    final int courseMarks = data.history
        .where((TeacherAttendanceItem item) => item.isCourse)
        .length;
    final int entryMarks = data.history.length - courseMarks;

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(18, 18, 18, 32),
        children: <Widget>[
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: <Color>[unsaacPrimary, unsaacTop],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(26),
              boxShadow: const <BoxShadow>[
                BoxShadow(
                  color: Color(0x22061B34),
                  blurRadius: 20,
                  offset: Offset(0, 10),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: unsaacOrange,
                    borderRadius: BorderRadius.circular(30),
                  ),
                  child: const Text(
                    'PORTAL DOCENTE',
                    style: TextStyle(
                      color: unsaacPrimary,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.8,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Hola, ${controller.user?.nombres ?? 'Docente'}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 27,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 7),
                Text(
                  controller.user?.codigo ?? '',
                  style: const TextStyle(
                    color: Color(0xFFDCEAFF),
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 18),
                Row(
                  children: <Widget>[
                    _StatusPill(
                      icon: Icons.cloud_done,
                      label: controller.serverOnline
                          ? 'Servidor conectado'
                          : 'Sin conexión',
                      ok: controller.serverOnline,
                    ),
                    const SizedBox(width: 8),
                    _StatusPill(
                      icon: Icons.phone_android,
                      label: controller.linkedDevice?.isAuthorized == true
                          ? 'Celular autorizado'
                          : controller.linkedDevice == null
                          ? 'Sin sincronizar'
                          : 'Autorización pendiente',
                      ok: controller.linkedDevice?.isAuthorized == true,
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Row(
                    children: <Widget>[
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFF0D8),
                          borderRadius: BorderRadius.circular(15),
                        ),
                        child: const Icon(Icons.sync_alt, color: unsaacOrange),
                      ),
                      const SizedBox(width: 13),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: <Widget>[
                            Text(
                              'Sincronizar con la página',
                              style: TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            SizedBox(height: 3),
                            Text(
                              'Escanee el QR generado en Biometría → Móviles para autorizar este celular.',
                              style: TextStyle(
                                color: unsaacMuted,
                                height: 1.35,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () async {
                        await onSyncWeb();
                      },
                      icon: const Icon(Icons.qr_code_scanner),
                      label: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Text(
                          controller.linkedDevice?.isAuthorized == true
                              ? 'Volver a sincronizar'
                              : 'Sincronizar y autorizar móvil',
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (error != null) ...<Widget>[
            const SizedBox(height: 14),
            _MessageCard(message: error!, error: true),
          ],
          const SizedBox(height: 16),
          Row(
            children: <Widget>[
              Expanded(
                child: _MetricCard(
                  value: '${data.schedules.length}',
                  label: 'Horarios activos',
                  icon: Icons.calendar_month,
                  onTap: onOpenSchedules,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _MetricCard(
                  value: '$courseMarks',
                  label: 'Clases registradas',
                  icon: Icons.school,
                  onTap: onOpenHistory,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _MetricCard(
                  value: '$entryMarks',
                  label: 'Ingresos recientes',
                  icon: Icons.login,
                  onTap: onOpenHistory,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Card(
            child: InkWell(
              borderRadius: BorderRadius.circular(22),
              onTap: onOpenSchedules,
              child: Padding(
                padding: const EdgeInsets.all(19),
                child: Row(
                  children: <Widget>[
                    Container(
                      width: 54,
                      height: 54,
                      decoration: BoxDecoration(
                        color: const Color(0xFFDCEAFF),
                        borderRadius: BorderRadius.circular(17),
                      ),
                      child: const Icon(
                        Icons.event_available,
                        color: unsaacBlue,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          const Text(
                            'Próxima clase',
                            style: TextStyle(
                              color: unsaacMuted,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 5),
                          Text(
                            next?.courseName ??
                                'Sin clases próximas registradas',
                            style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          if (next != null)
                            Text(
                              '${next.dayName} · ${next.startTime}–${next.endTime} · Aula ${next.classroom}',
                              style: const TextStyle(
                                color: unsaacMuted,
                                height: 1.35,
                              ),
                            ),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: onOpenAttendance,
            icon: const Icon(Icons.how_to_reg),
            label: const Padding(
              padding: EdgeInsets.symmetric(vertical: 4),
              child: Text('Registrar asistencia'),
            ),
          ),
        ],
      ),
    );
  }
}

class _SchedulesTab extends StatelessWidget {
  const _SchedulesTab({
    required this.schedules,
    required this.error,
    required this.onRefresh,
    required this.onRenewSchedules,
  });

  final List<TeacherSchedule> schedules;
  final String? error;
  final Future<void> Function() onRefresh;
  final Future<void> Function() onRenewSchedules;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(18, 18, 18, 32),
        children: <Widget>[
          const _SectionIntro(
            icon: Icons.calendar_month,
            title: 'Programación académica',
            subtitle: 'Cursos, aulas y horas del semestre activo.',
          ),
          const SizedBox(height: 13),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () async {
                await onRenewSchedules();
              },
              icon: const Icon(Icons.sync),
              label: const Padding(
                padding: EdgeInsets.symmetric(vertical: 4),
                child: Text('Renovar horarios'),
              ),
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Actualiza la programación visible y, si no hay marcaciones pendientes, renueva también la copia offline cifrada.',
            style: TextStyle(color: unsaacMuted, fontSize: 12, height: 1.35),
          ),
          if (error != null) ...<Widget>[
            const SizedBox(height: 12),
            _MessageCard(message: error!, error: true),
          ],
          const SizedBox(height: 14),
          if (schedules.isEmpty)
            const _EmptyCard(
              icon: Icons.event_busy,
              message: 'No existen horarios activos para esta cuenta.',
            )
          else
            ...schedules.map(
              (TeacherSchedule schedule) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Row(
                      children: <Widget>[
                        Container(
                          width: 58,
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFF0D8),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Column(
                            children: <Widget>[
                              Text(
                                schedule.dayName.substring(0, 3).toUpperCase(),
                                style: const TextStyle(
                                  color: unsaacOrange,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                              Text(
                                schedule.startTime,
                                style: const TextStyle(
                                  color: unsaacPrimary,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: <Widget>[
                              Text(
                                schedule.courseName,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${schedule.courseCode} · ${schedule.startTime}–${schedule.endTime}',
                                style: const TextStyle(color: unsaacMuted),
                              ),
                              Text(
                                'Aula ${schedule.classroom} · ${schedule.semester}',
                                style: const TextStyle(color: unsaacMuted),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _HistoryTab extends StatelessWidget {
  const _HistoryTab({
    required this.history,
    required this.selectedFilter,
    required this.onFilterChanged,
    required this.error,
    required this.onRefresh,
  });

  final List<TeacherAttendanceItem> history;
  final String selectedFilter;
  final ValueChanged<String> onFilterChanged;
  final String? error;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(18, 18, 18, 32),
        children: <Widget>[
          const _SectionIntro(
            icon: Icons.history,
            title: 'Registros históricos',
            subtitle:
                'Últimos ingresos institucionales y asistencias de clase.',
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            children: <Widget>[
              for (final String value in <String>[
                'TODOS',
                'CURSOS',
                'INGRESOS',
              ])
                ChoiceChip(
                  label: Text(
                    value == 'TODOS'
                        ? 'Todos'
                        : value == 'CURSOS'
                        ? 'Cursos'
                        : 'Ingresos',
                  ),
                  selected: selectedFilter == value,
                  onSelected: (_) => onFilterChanged(value),
                ),
            ],
          ),
          if (error != null) ...<Widget>[
            const SizedBox(height: 12),
            _MessageCard(message: error!, error: true),
          ],
          const SizedBox(height: 14),
          if (history.isEmpty)
            const _EmptyCard(
              icon: Icons.manage_history,
              message: 'Todavía no existen registros en este filtro.',
            )
          else
            ...history.map(
              (TeacherAttendanceItem item) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(17),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Container(
                          width: 46,
                          height: 46,
                          decoration: BoxDecoration(
                            color: item.isCourse
                                ? const Color(0xFFDCEAFF)
                                : const Color(0xFFFFF0D8),
                            borderRadius: BorderRadius.circular(15),
                          ),
                          child: Icon(
                            item.isCourse ? Icons.school : Icons.login,
                            color: item.isCourse ? unsaacBlue : unsaacOrange,
                          ),
                        ),
                        const SizedBox(width: 13),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: <Widget>[
                              Text(
                                item.isCourse
                                    ? item.course ?? 'Asistencia de curso'
                                    : 'Ingreso institucional',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${item.date} · ${item.time}${item.classroom?.isNotEmpty == true ? ' · Aula ${item.classroom}' : ''}',
                                style: const TextStyle(color: unsaacMuted),
                              ),
                              const SizedBox(height: 7),
                              Wrap(
                                spacing: 7,
                                runSpacing: 6,
                                children: <Widget>[
                                  _SmallTag(label: item.state, blue: true),
                                  _SmallTag(
                                    label: _methodLabel(
                                      item.verificationMethod,
                                    ),
                                    blue: false,
                                  ),
                                  if (item.operationResult == 'DUPLICADA')
                                    const _SmallTag(
                                      label: 'Intento duplicado',
                                      blue: false,
                                    ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _AttendanceTab extends StatelessWidget {
  const _AttendanceTab({required this.controller, required this.onQrCompleted});

  final AppController controller;
  final Future<void> Function() onQrCompleted;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 32),
      children: <Widget>[
        const _SectionIntro(
          icon: Icons.verified_user,
          title: 'Elija el método de verificación',
          subtitle:
              'La biometría sigue siendo el método principal. El QR dinámico funciona como alternativa presencial.',
        ),
        const SizedBox(height: 16),
        _MethodCard(
          icon: Icons.fingerprint,
          iconColor: unsaacBlue,
          title: 'Biometría + Bluetooth',
          badge: 'RECOMENDADO',
          description:
              'Confirma biometría fuerte, firma criptográfica y proximidad BLE. También admite contingencia offline controlada.',
          buttonLabel: 'Marcar con huella',
          onPressed: () async {
            await Navigator.of(context).push<void>(
              MaterialPageRoute<void>(
                builder: (_) => QuickAttendanceScreen(controller: controller),
              ),
            );
          },
        ),
        const SizedBox(height: 14),
        _MethodCard(
          icon: Icons.qr_code_scanner,
          iconColor: unsaacOrange,
          title: 'QR dinámico sin huella',
          badge: 'ALTERNATIVA',
          description:
              'Escanea un QR de corta vigencia mostrado por una estación administradora. Requiere sesión y celular autorizado.',
          buttonLabel: 'Escanear QR',
          secondary: true,
          onPressed: () async {
            final bool? completed = await Navigator.of(context).push<bool>(
              MaterialPageRoute<bool>(
                builder: (_) => QrAttendanceScanScreen(controller: controller),
              ),
            );
            if (completed == true) {
              await onQrCompleted();
            }
          },
        ),
        const SizedBox(height: 14),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                const Icon(Icons.info_outline, color: unsaacBlue),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Pendientes offline: ${controller.pendingOfflineCount}. El modo QR necesita conexión; el modo biométrico conserva la contingencia cifrada sin internet.',
                    style: const TextStyle(
                      height: 1.4,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _MethodCard extends StatelessWidget {
  const _MethodCard({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.badge,
    required this.description,
    required this.buttonLabel,
    required this.onPressed,
    this.secondary = false,
  });

  final IconData icon;
  final Color iconColor;
  final String title;
  final String badge;
  final String description;
  final String buttonLabel;
  final VoidCallback onPressed;
  final bool secondary;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              children: <Widget>[
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: iconColor == unsaacOrange
                        ? const Color(0xFFFFF0D8)
                        : const Color(0xFFDCEAFF),
                    borderRadius: BorderRadius.circular(17),
                  ),
                  child: Icon(icon, color: iconColor, size: 29),
                ),
                const SizedBox(width: 13),
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                _SmallTag(label: badge, blue: !secondary),
              ],
            ),
            const SizedBox(height: 14),
            Text(
              description,
              style: const TextStyle(color: unsaacMuted, height: 1.45),
            ),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              child: secondary
                  ? OutlinedButton.icon(
                      onPressed: onPressed,
                      icon: Icon(icon),
                      label: Text(buttonLabel),
                    )
                  : FilledButton.icon(
                      onPressed: onPressed,
                      icon: Icon(icon),
                      label: Text(buttonLabel),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionIntro extends StatelessWidget {
  const _SectionIntro({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: const Color(0xFFDCEAFF),
            borderRadius: BorderRadius.circular(15),
          ),
          child: Icon(icon, color: unsaacBlue),
        ),
        const SizedBox(width: 13),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                title,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                subtitle,
                style: const TextStyle(color: unsaacMuted, height: 1.35),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.value,
    required this.label,
    required this.icon,
    required this.onTap,
  });

  final String value;
  final String label;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(22),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 15),
          child: Column(
            children: <Widget>[
              Icon(icon, color: unsaacBlue),
              const SizedBox(height: 6),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 23,
                  fontWeight: FontWeight.w900,
                ),
              ),
              Text(
                label,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: unsaacMuted,
                  fontSize: 11,
                  height: 1.25,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({
    required this.icon,
    required this.label,
    required this.ok,
  });

  final IconData icon;
  final String label;
  final bool ok;

  @override
  Widget build(BuildContext context) {
    return Flexible(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white.withAlpha(28),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withAlpha(40)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Icon(
              icon,
              color: ok ? const Color(0xFF63E6BE) : unsaacOrange,
              size: 17,
            ),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                label,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SmallTag extends StatelessWidget {
  const _SmallTag({required this.label, required this.blue});

  final String label;
  final bool blue;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: blue ? const Color(0xFFDCEAFF) : const Color(0xFFFFF0D8),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: blue ? unsaacBlue : const Color(0xFFB85E00),
          fontSize: 10,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

class _MessageCard extends StatelessWidget {
  const _MessageCard({required this.message, required this.error});

  final String message;
  final bool error;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: error ? const Color(0xFFFFE7E7) : const Color(0xFFDFF7EA),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Text(
        message,
        style: TextStyle(
          color: error ? const Color(0xFF9B1C1C) : const Color(0xFF166534),
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _EmptyCard extends StatelessWidget {
  const _EmptyCard({required this.icon, required this.message});

  final IconData icon;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 44),
        child: Column(
          children: <Widget>[
            Icon(icon, size: 50, color: unsaacMuted),
            const SizedBox(height: 12),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: unsaacMuted,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

TeacherSchedule? _nextSchedule(List<TeacherSchedule> schedules) {
  if (schedules.isEmpty) {
    return null;
  }
  final DateTime now = DateTime.now();
  for (final TeacherSchedule item in schedules) {
    if (item.dayOfWeek > now.weekday) {
      return item;
    }
    if (item.dayOfWeek == now.weekday) {
      final List<String> parts = item.startTime.split(':');
      final int hour = int.tryParse(parts.first) ?? 0;
      final int minute = parts.length > 1 ? int.tryParse(parts[1]) ?? 0 : 0;
      if (hour > now.hour || (hour == now.hour && minute >= now.minute)) {
        return item;
      }
    }
  }
  return schedules.first;
}

String _methodLabel(String value) {
  return switch (value.toUpperCase()) {
    'QR_DINAMICO' => 'QR dinámico',
    'BIOMETRIA_MOVIL' => 'Biometría móvil',
    'LECTOR_O_MANUAL' => 'Lector/manual',
    _ => value.replaceAll('_', ' '),
  };
}
