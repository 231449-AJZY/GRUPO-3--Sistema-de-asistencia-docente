import 'dart:async';

import 'package:flutter/material.dart';

import '../controllers/app_controller.dart';
import '../core/app_theme.dart';
import '../models/role_portal.dart';
import '../services/role_portal_service.dart';
import '../widgets/mobile_portal_widgets.dart';
import 'alerts_mobile_screen.dart';
import 'ble_station_mode_screen.dart';
import 'mobile_device_authorization_screen.dart';
import 'qr_attendance_station_screen.dart';
import 'quick_attendance_screen.dart';
import 'settings_screen.dart';

class AdminMobilePortalScreen extends StatefulWidget {
  const AdminMobilePortalScreen({required this.controller, super.key});

  final AppController controller;

  @override
  State<AdminMobilePortalScreen> createState() =>
      _AdminMobilePortalScreenState();
}

class _AdminMobilePortalScreenState extends State<AdminMobilePortalScreen> {
  final RolePortalService _service = RolePortalService();
  AdminDashboardData _data = const AdminDashboardData.empty();
  Timer? _timer;
  bool _loading = true;
  String? _error;
  int _tabIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _refresh());
    _timer = Timer.periodic(
      const Duration(minutes: 1),
      (_) => _refresh(silent: true),
    );
  }

  @override
  void dispose() {
    _timer?.cancel();
    _service.close();
    super.dispose();
  }

  Future<void> _refresh({bool silent = false}) async {
    final String? token = widget.controller.sessionToken;
    if (token == null || token.isEmpty) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = 'La sesión administrativa no está disponible.';
        });
      }
      return;
    }

    if (!silent && mounted) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }

    try {
      await widget.controller.refreshAll();
      final AdminDashboardData data = await _service.loadAdminDashboard(
        serverUrl: widget.controller.serverUrl,
        token: token,
      );
      if (!mounted) return;
      setState(() {
        _data = data;
        _error = null;
      });
    } on RolePortalException catch (error) {
      if (!mounted) return;
      setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _open(Widget page) async {
    await Navigator.of(
      context,
    ).push<void>(MaterialPageRoute<void>(builder: (_) => page));
    await _refresh(silent: true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_titleForTab(_tabIndex)),
        actions: <Widget>[
          IconButton(
            tooltip: 'Centro de alertas',
            onPressed: () =>
                _open(AlertsMobileScreen(controller: widget.controller)),
            icon: Badge(
              isLabelVisible: _data.recentAlerts.isNotEmpty,
              label: Text('${_data.recentAlerts.length}'),
              child: const Icon(Icons.notifications_outlined),
            ),
          ),
          IconButton(
            tooltip: 'Actualizar',
            onPressed: _loading ? null : _refresh,
            icon: const Icon(Icons.refresh),
          ),
          PopupMenuButton<String>(
            onSelected: (String value) async {
              if (value == 'settings') {
                await _open(SettingsScreen(controller: widget.controller));
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
              _AdminOverviewTab(
                controller: widget.controller,
                data: _data,
                error: _error,
                onRefresh: _refresh,
                onAlerts: () =>
                    _open(AlertsMobileScreen(controller: widget.controller)),
              ),
              _AdminOperationsTab(controller: widget.controller, onOpen: _open),
              _AdminAnalyticsTab(
                data: _data,
                error: _error,
                onRefresh: _refresh,
              ),
              _AdminAccountTab(controller: widget.controller, onOpen: _open),
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
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Resumen',
          ),
          NavigationDestination(
            icon: Icon(Icons.admin_panel_settings_outlined),
            selectedIcon: Icon(Icons.admin_panel_settings),
            label: 'Operaciones',
          ),
          NavigationDestination(
            icon: Icon(Icons.analytics_outlined),
            selectedIcon: Icon(Icons.analytics),
            label: 'Analítica',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Cuenta',
          ),
        ],
      ),
    );
  }
}

String _titleForTab(int index) => switch (index) {
  1 => 'Operaciones administrativas',
  2 => 'Analítica institucional',
  3 => 'Cuenta administradora',
  _ => 'Administración móvil',
};

class _AdminOverviewTab extends StatelessWidget {
  const _AdminOverviewTab({
    required this.controller,
    required this.data,
    required this.error,
    required this.onRefresh,
    required this.onAlerts,
  });

  final AppController controller;
  final AdminDashboardData data;
  final String? error;
  final Future<void> Function() onRefresh;
  final VoidCallback onAlerts;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 30),
        children: <Widget>[
          PortalHero(
            eyebrow: 'Administración institucional',
            title: 'Hola, ${controller.user?.nombres ?? 'Administrador'}',
            subtitle:
                'Control de asistencia, seguridad móvil y alertas en tiempo real.',
            icon: Icons.admin_panel_settings_outlined,
            trailing: Icon(
              controller.serverOnline ? Icons.cloud_done : Icons.cloud_off,
              color: controller.serverOnline
                  ? const Color(0xFF86EFAC)
                  : const Color(0xFFFDBA74),
            ),
          ),
          if (error != null) ...<Widget>[
            const SizedBox(height: 14),
            PortalEmptyCard(
              icon: Icons.error_outline,
              message: error!,
              error: true,
            ),
          ],
          const SizedBox(height: 14),
          GridView.count(
            crossAxisCount: 2,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 1.05,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            children: <Widget>[
              PortalMetricCard(
                value: '${data.activeTeachers}',
                label: 'Docentes activos',
                icon: Icons.groups_2_outlined,
                color: unsaacBlue,
              ),
              PortalMetricCard(
                value: '${data.todayAttendance}',
                label: 'Asistencias hoy',
                icon: Icons.how_to_reg,
                color: const Color(0xFF15803D),
              ),
              PortalMetricCard(
                value: '${data.todayLate}',
                label: 'Tardanzas hoy',
                icon: Icons.schedule,
                color: const Color(0xFFD97706),
              ),
              PortalMetricCard(
                value: '${data.todayAbsences}',
                label: 'Inasistencias',
                icon: Icons.person_off_outlined,
                color: const Color(0xFFDC2626),
              ),
            ],
          ),
          const SizedBox(height: 18),
          PortalSectionHeader(
            title: 'Alertas recientes',
            subtitle: 'Incidencias que requieren seguimiento administrativo.',
            action: TextButton(
              onPressed: onAlerts,
              child: const Text('Ver todas'),
            ),
          ),
          const SizedBox(height: 10),
          if (data.recentAlerts.isEmpty)
            const PortalEmptyCard(
              icon: Icons.notifications_none,
              message: 'No existen alertas recientes.',
            )
          else
            ...data.recentAlerts.map(
              (AdminRecentAlert alert) => Padding(
                padding: const EdgeInsets.only(bottom: 9),
                child: Card(
                  child: ListTile(
                    onTap: onAlerts,
                    leading: const CircleAvatar(
                      backgroundColor: Color(0xFFFFF0D8),
                      child: Icon(
                        Icons.warning_amber_rounded,
                        color: unsaacOrange,
                      ),
                    ),
                    title: Text(
                      alert.title,
                      style: const TextStyle(fontWeight: FontWeight.w900),
                    ),
                    subtitle: Text(
                      alert.description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    trailing: Text(
                      alert.time,
                      style: const TextStyle(color: unsaacMuted, fontSize: 11),
                    ),
                  ),
                ),
              ),
            ),
          const SizedBox(height: 12),
          const PortalSectionHeader(
            title: 'Últimas marcaciones',
            subtitle: 'Registros unificados del día.',
          ),
          const SizedBox(height: 10),
          if (data.recentAttendances.isEmpty)
            const PortalEmptyCard(
              icon: Icons.history_toggle_off,
              message: 'Todavía no existen marcaciones hoy.',
            )
          else
            ...data.recentAttendances
                .take(6)
                .map(
                  (AdminRecentAttendance item) => Padding(
                    padding: const EdgeInsets.only(bottom: 9),
                    child: Card(
                      child: Padding(
                        padding: const EdgeInsets.all(15),
                        child: Row(
                          children: <Widget>[
                            Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                color: const Color(0xFFDCEAFF),
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: const Icon(
                                Icons.badge_outlined,
                                color: unsaacBlue,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: <Widget>[
                                  Text(
                                    item.teacher,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w900,
                                    ),
                                  ),
                                  Text(
                                    '${item.record} · ${item.method}',
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      color: unsaacMuted,
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: <Widget>[
                                Text(
                                  item.time,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                                Text(
                                  item.status,
                                  style: const TextStyle(
                                    color: unsaacMuted,
                                    fontSize: 11,
                                  ),
                                ),
                              ],
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

class _AdminOperationsTab extends StatelessWidget {
  const _AdminOperationsTab({required this.controller, required this.onOpen});

  final AppController controller;
  final Future<void> Function(Widget page) onOpen;

  @override
  Widget build(BuildContext context) {
    final List<_OperationItem> operations = <_OperationItem>[
      _OperationItem(
        title: 'Autorizar dispositivos',
        subtitle: 'Apruebe, suspenda o revoque celulares docentes.',
        icon: Icons.phonelink_lock_outlined,
        color: unsaacBlue,
        page: MobileDeviceAuthorizationScreen(controller: controller),
      ),
      _OperationItem(
        title: 'Centro de alertas',
        subtitle: 'Genere, revise y resuelva incidencias operativas.',
        icon: Icons.notifications_active_outlined,
        color: const Color(0xFFDC2626),
        page: AlertsMobileScreen(controller: controller),
      ),
      _OperationItem(
        title: 'Estación QR dinámica',
        subtitle: 'Emita códigos rotativos para asistencia institucional.',
        icon: Icons.qr_code_2,
        color: unsaacOrange,
        page: QrAttendanceStationScreen(controller: controller),
      ),
      _OperationItem(
        title: 'Estación Bluetooth',
        subtitle: 'Provisione y active una estación BLE institucional.',
        icon: Icons.bluetooth_searching,
        color: const Color(0xFF7C3AED),
        page: BleStationModeScreen(controller: controller),
      ),
      _OperationItem(
        title: 'Asistencia rápida',
        subtitle: 'Registre una marcación asistida con verificación.',
        icon: Icons.how_to_reg,
        color: const Color(0xFF15803D),
        page: QuickAttendanceScreen(controller: controller),
      ),
    ];

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 30),
      children: <Widget>[
        const PortalHero(
          eyebrow: 'Herramientas móviles',
          title: 'Centro de operaciones',
          subtitle: 'Acciones administrativas conectadas al backend real.',
          icon: Icons.tune,
        ),
        const SizedBox(height: 16),
        ...operations.map(
          (_OperationItem item) => Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Card(
              child: ListTile(
                contentPadding: const EdgeInsets.all(14),
                onTap: () => onOpen(item.page),
                leading: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: item.color.withValues(alpha: 0.11),
                    borderRadius: BorderRadius.circular(15),
                  ),
                  child: Icon(item.icon, color: item.color),
                ),
                title: Text(
                  item.title,
                  style: const TextStyle(fontWeight: FontWeight.w900),
                ),
                subtitle: Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    item.subtitle,
                    style: const TextStyle(height: 1.35),
                  ),
                ),
                trailing: const Icon(Icons.chevron_right),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _AdminAnalyticsTab extends StatelessWidget {
  const _AdminAnalyticsTab({
    required this.data,
    required this.error,
    required this.onRefresh,
  });

  final AdminDashboardData data;
  final String? error;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    final VerificationSummary verification = data.verification;
    final int methodTotal =
        verification.dynamicQr +
        verification.mobileBiometric +
        verification.offline +
        verification.other;

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 30),
        children: <Widget>[
          const PortalHero(
            eyebrow: 'Indicadores del día',
            title: 'Analítica operativa',
            subtitle:
                'Actividad horaria, métodos de verificación y calidad de registros.',
            icon: Icons.analytics_outlined,
          ),
          if (error != null) ...<Widget>[
            const SizedBox(height: 14),
            PortalEmptyCard(
              icon: Icons.error_outline,
              message: error!,
              error: true,
            ),
          ],
          const SizedBox(height: 16),
          const PortalSectionHeader(
            title: 'Actividad por hora',
            subtitle: 'Cantidad de marcaciones registradas durante la jornada.',
          ),
          const SizedBox(height: 10),
          PortalBarChart(points: data.hourlyActivity),
          const SizedBox(height: 16),
          const PortalSectionHeader(
            title: 'Métodos de verificación',
            subtitle: 'Distribución de mecanismos utilizados hoy.',
          ),
          const SizedBox(height: 10),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(17),
              child: Column(
                children: <Widget>[
                  PortalProgressRow(
                    label: 'QR dinámico',
                    value: verification.dynamicQr,
                    total: methodTotal,
                    color: unsaacOrange,
                  ),
                  PortalProgressRow(
                    label: 'Biometría móvil',
                    value: verification.mobileBiometric,
                    total: methodTotal,
                    color: unsaacBlue,
                  ),
                  PortalProgressRow(
                    label: 'Offline sincronizado',
                    value: verification.offline,
                    total: methodTotal,
                    color: const Color(0xFF7C3AED),
                  ),
                  PortalProgressRow(
                    label: 'Otros métodos',
                    value: verification.other,
                    total: methodTotal,
                    color: unsaacMuted,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          GridView.count(
            crossAxisCount: 2,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 1.25,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            children: <Widget>[
              PortalMetricCard(
                value: '${verification.registered}',
                label: 'Registradas',
                icon: Icons.task_alt,
                color: const Color(0xFF15803D),
              ),
              PortalMetricCard(
                value: '${verification.duplicate}',
                label: 'Duplicadas',
                icon: Icons.content_copy,
                color: const Color(0xFFD97706),
              ),
              PortalMetricCard(
                value: '${verification.rejected}',
                label: 'Rechazadas',
                icon: Icons.block,
                color: const Color(0xFFDC2626),
              ),
              PortalMetricCard(
                value: verification.totalAttempts.toString(),
                label: 'Intentos totales',
                icon: Icons.analytics,
                color: unsaacBlue,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _AdminAccountTab extends StatelessWidget {
  const _AdminAccountTab({required this.controller, required this.onOpen});

  final AppController controller;
  final Future<void> Function(Widget page) onOpen;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 30),
      children: <Widget>[
        PortalHero(
          eyebrow: 'Cuenta administradora',
          title: controller.user?.nombreCompleto ?? 'Administrador',
          subtitle: controller.user?.email ?? '',
          icon: Icons.account_circle_outlined,
        ),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(17),
            child: Column(
              children: <Widget>[
                PortalInfoRow(
                  icon: Icons.cloud_outlined,
                  label: 'Servidor',
                  value: controller.serverUrl,
                  color: controller.serverOnline
                      ? const Color(0xFF15803D)
                      : const Color(0xFFDC2626),
                ),
                PortalInfoRow(
                  icon: Icons.phone_android,
                  label: 'Dispositivo',
                  value: controller.deviceStatus.deviceLabel,
                ),
                PortalInfoRow(
                  icon: Icons.fingerprint,
                  label: 'Biometría Android',
                  value: controller.biometricStatus.supported
                      ? (controller.biometricStatus.enrolled
                            ? 'Disponible y enrolada'
                            : 'Disponible sin enrolamiento')
                      : 'No disponible',
                  color: controller.biometricStatus.enrolled
                      ? const Color(0xFF15803D)
                      : const Color(0xFFD97706),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),
        OutlinedButton.icon(
          onPressed: () => onOpen(SettingsScreen(controller: controller)),
          icon: const Icon(Icons.settings_outlined),
          label: const Text('Configurar servidor'),
        ),
        const SizedBox(height: 10),
        FilledButton.icon(
          style: FilledButton.styleFrom(
            backgroundColor: const Color(0xFFB91C1C),
          ),
          onPressed: () async {
            await controller.logout();
          },
          icon: const Icon(Icons.logout),
          label: const Text('Cerrar sesión'),
        ),
      ],
    );
  }
}

class _OperationItem {
  const _OperationItem({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
    required this.page,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;
  final Widget page;
}
