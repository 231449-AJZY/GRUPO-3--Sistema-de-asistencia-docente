import 'dart:async';

import 'package:flutter/material.dart';

import '../controllers/app_controller.dart';
import '../core/app_theme.dart';
import '../models/role_portal.dart';
import '../services/role_portal_service.dart';
import '../widgets/mobile_portal_widgets.dart';
import 'alerts_mobile_screen.dart';
import 'settings_screen.dart';

class SupervisorPortalScreen extends StatefulWidget {
  const SupervisorPortalScreen({required this.controller, super.key});

  final AppController controller;

  @override
  State<SupervisorPortalScreen> createState() => _SupervisorPortalScreenState();
}

class _SupervisorPortalScreenState extends State<SupervisorPortalScreen> {
  final RolePortalService _service = RolePortalService();
  final TextEditingController _searchController = TextEditingController();

  SupervisorDashboardData _data = const SupervisorDashboardData.empty();
  Timer? _timer;
  bool _loading = true;
  bool _autoRefresh = true;
  String? _error;
  int _tabIndex = 0;
  String _recordFilter = 'TODOS';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _refresh());
    _timer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (_autoRefresh) _refresh(silent: true);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _searchController.dispose();
    _service.close();
    super.dispose();
  }

  Future<void> _refresh({bool silent = false}) async {
    final String? token = widget.controller.sessionToken;
    if (token == null || token.isEmpty) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = 'La sesión del supervisor no está disponible.';
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
      await widget.controller.refreshCapabilities();
      final SupervisorDashboardData data = await _service
          .loadSupervisorDashboard(
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

  List<SupervisorRecord> get _filteredRecords {
    final String query = _searchController.text.trim().toLowerCase();
    return _data.records
        .where((SupervisorRecord record) {
          final bool statusMatches = switch (_recordFilter) {
            'PUNTUAL' =>
              record.status.toUpperCase().contains('PUNTUAL') ||
                  record.status.toUpperCase().contains('PRESENTE'),
            'TARDANZA' => record.isLate,
            'RECHAZADA' => record.isRejected,
            'DUPLICADA' => record.isDuplicate,
            _ => true,
          };
          if (!statusMatches) return false;
          if (query.isEmpty) return true;
          return record.teacher.toLowerCase().contains(query) ||
              record.code.toLowerCase().contains(query) ||
              record.department.toLowerCase().contains(query) ||
              record.record.toLowerCase().contains(query);
        })
        .toList(growable: false);
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
              isLabelVisible: _data.stats.newAlerts > 0,
              label: Text('${_data.stats.newAlerts}'),
              child: const Icon(Icons.notifications_outlined),
            ),
          ),
          IconButton(
            tooltip: 'Actualizar ahora',
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
              _SupervisorOverviewTab(
                controller: widget.controller,
                data: _data,
                error: _error,
                autoRefresh: _autoRefresh,
                onAutoRefreshChanged: (bool value) {
                  setState(() => _autoRefresh = value);
                },
                onRefresh: _refresh,
                onAlerts: () =>
                    _open(AlertsMobileScreen(controller: widget.controller)),
              ),
              _SupervisorActivityTab(
                data: _data,
                error: _error,
                onRefresh: _refresh,
              ),
              _SupervisorRecordsTab(
                records: _filteredRecords,
                filter: _recordFilter,
                searchController: _searchController,
                error: _error,
                onFilterChanged: (String value) {
                  setState(() => _recordFilter = value);
                },
                onSearchChanged: (_) => setState(() {}),
                onRefresh: _refresh,
              ),
              _SupervisorAccountTab(
                controller: widget.controller,
                data: _data,
                onOpen: _open,
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
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Resumen',
          ),
          NavigationDestination(
            icon: Icon(Icons.monitor_heart_outlined),
            selectedIcon: Icon(Icons.monitor_heart),
            label: 'Actividad',
          ),
          NavigationDestination(
            icon: Icon(Icons.fact_check_outlined),
            selectedIcon: Icon(Icons.fact_check),
            label: 'Registros',
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
  1 => 'Actividad en tiempo real',
  2 => 'Registros supervisados',
  3 => 'Cuenta del supervisor',
  _ => 'Supervisión móvil',
};

class _SupervisorOverviewTab extends StatelessWidget {
  const _SupervisorOverviewTab({
    required this.controller,
    required this.data,
    required this.error,
    required this.autoRefresh,
    required this.onAutoRefreshChanged,
    required this.onRefresh,
    required this.onAlerts,
  });

  final AppController controller;
  final SupervisorDashboardData data;
  final String? error;
  final bool autoRefresh;
  final ValueChanged<bool> onAutoRefreshChanged;
  final Future<void> Function() onRefresh;
  final VoidCallback onAlerts;

  @override
  Widget build(BuildContext context) {
    final SupervisorStats stats = data.stats;
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 30),
        children: <Widget>[
          PortalHero(
            eyebrow: 'Supervisión institucional',
            title: 'Hola, ${controller.user?.nombres ?? 'Supervisor'}',
            subtitle:
                'Seguimiento de asistencia, inconsistencias y alertas operativas.',
            icon: Icons.visibility_outlined,
            trailing: Switch(
              value: autoRefresh,
              onChanged: onAutoRefreshChanged,
              activeThumbColor: unsaacOrange,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            autoRefresh
                ? 'Actualización automática cada 30 segundos.'
                : 'Actualización automática desactivada.',
            style: const TextStyle(color: unsaacMuted, fontSize: 12),
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
                value: '${stats.monitoredTeachers}',
                label: 'Monitoreados',
                icon: Icons.groups_outlined,
                color: unsaacBlue,
              ),
              PortalMetricCard(
                value: '${stats.presentTeachers}',
                label: 'Presentes hoy',
                icon: Icons.person_pin_circle_outlined,
                color: const Color(0xFF15803D),
              ),
              PortalMetricCard(
                value: '${stats.newAlerts}',
                label: 'Alertas nuevas',
                icon: Icons.notifications_active_outlined,
                color: const Color(0xFFDC2626),
                onTap: onAlerts,
              ),
              PortalMetricCard(
                value: '${stats.inconsistencies}',
                label: 'Inconsistencias',
                icon: Icons.rule_folder_outlined,
                color: const Color(0xFFD97706),
              ),
            ],
          ),
          const SizedBox(height: 18),
          PortalSectionHeader(
            title: 'Resumen de la jornada',
            subtitle: 'Estado consolidado de los registros validados.',
            action: TextButton(
              onPressed: onAlerts,
              child: const Text('Alertas'),
            ),
          ),
          const SizedBox(height: 10),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(17),
              child: Column(
                children: <Widget>[
                  PortalProgressRow(
                    label: 'Puntuales',
                    value: stats.onTime,
                    total: stats.validatedRecords,
                    color: const Color(0xFF15803D),
                  ),
                  PortalProgressRow(
                    label: 'Tardanzas',
                    value: stats.late,
                    total: stats.validatedRecords,
                    color: const Color(0xFFD97706),
                  ),
                  PortalProgressRow(
                    label: 'Registros de curso',
                    value: stats.courseRecords,
                    total: stats.validatedRecords,
                    color: unsaacBlue,
                  ),
                  PortalProgressRow(
                    label: 'Ingresos institucionales',
                    value: stats.institutionalEntries,
                    total: stats.validatedRecords,
                    color: const Color(0xFF7C3AED),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: <Widget>[
              Expanded(
                child: PortalMetricCard(
                  value: '${stats.duplicates}',
                  label: 'Duplicadas',
                  icon: Icons.content_copy,
                  color: const Color(0xFFD97706),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: PortalMetricCard(
                  value: '${stats.rejected}',
                  label: 'Rechazadas',
                  icon: Icons.block,
                  color: const Color(0xFFDC2626),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: onAlerts,
            icon: const Icon(Icons.notifications_active_outlined),
            label: const Text('Abrir centro de alertas'),
          ),
        ],
      ),
    );
  }
}

class _SupervisorActivityTab extends StatelessWidget {
  const _SupervisorActivityTab({
    required this.data,
    required this.error,
    required this.onRefresh,
  });

  final SupervisorDashboardData data;
  final String? error;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    final int methodTotal = data.methods.fold<int>(
      0,
      (int total, MethodCount item) => total + item.total,
    );

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 30),
        children: <Widget>[
          const PortalHero(
            eyebrow: 'Tiempo real',
            title: 'Actividad de asistencia',
            subtitle:
                'Distribución horaria y métodos utilizados durante el día.',
            icon: Icons.monitor_heart_outlined,
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
            title: 'Actividad horaria',
            subtitle: 'Marcaciones validadas entre las 06:00 y las 23:00.',
          ),
          const SizedBox(height: 10),
          PortalBarChart(
            points: data.hourlyActivity,
            color: const Color(0xFF7C3AED),
          ),
          const SizedBox(height: 16),
          const PortalSectionHeader(
            title: 'Métodos de verificación',
            subtitle: 'Participación de cada mecanismo de marcación.',
          ),
          const SizedBox(height: 10),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(17),
              child: data.methods.isEmpty
                  ? const PortalEmptyCard(
                      icon: Icons.device_hub_outlined,
                      message: 'No existen métodos registrados hoy.',
                    )
                  : Column(
                      children: data.methods
                          .map((MethodCount item) {
                            return PortalProgressRow(
                              label: _methodLabel(item.method),
                              value: item.total,
                              total: methodTotal,
                              color: _methodColor(item.method),
                            );
                          })
                          .toList(growable: false),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SupervisorRecordsTab extends StatelessWidget {
  const _SupervisorRecordsTab({
    required this.records,
    required this.filter,
    required this.searchController,
    required this.error,
    required this.onFilterChanged,
    required this.onSearchChanged,
    required this.onRefresh,
  });

  final List<SupervisorRecord> records;
  final String filter;
  final TextEditingController searchController;
  final String? error;
  final ValueChanged<String> onFilterChanged;
  final ValueChanged<String> onSearchChanged;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 30),
        children: <Widget>[
          const PortalHero(
            eyebrow: 'Auditoría del día',
            title: 'Registros supervisados',
            subtitle:
                'Filtre por estado y busque docentes, cursos o departamentos.',
            icon: Icons.fact_check_outlined,
          ),
          const SizedBox(height: 14),
          TextField(
            controller: searchController,
            onChanged: onSearchChanged,
            decoration: const InputDecoration(
              labelText: 'Buscar registros',
              prefixIcon: Icon(Icons.search),
            ),
          ),
          const SizedBox(height: 12),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: <Widget>[
                for (final String value in <String>[
                  'TODOS',
                  'PUNTUAL',
                  'TARDANZA',
                  'RECHAZADA',
                  'DUPLICADA',
                ])
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(_filterLabel(value)),
                      selected: filter == value,
                      onSelected: (_) => onFilterChanged(value),
                    ),
                  ),
              ],
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
          if (records.isEmpty)
            const PortalEmptyCard(
              icon: Icons.search_off,
              message: 'No existen registros para este filtro.',
            )
          else
            ...records.map(
              (SupervisorRecord record) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Row(
                          children: <Widget>[
                            Container(
                              width: 46,
                              height: 46,
                              decoration: BoxDecoration(
                                color: _recordColor(
                                  record,
                                ).withValues(alpha: 0.11),
                                borderRadius: BorderRadius.circular(15),
                              ),
                              child: Icon(
                                _recordIcon(record),
                                color: _recordColor(record),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: <Widget>[
                                  Text(
                                    record.teacher,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w900,
                                    ),
                                  ),
                                  Text(
                                    '${record.code} · ${record.department}',
                                    style: const TextStyle(
                                      color: unsaacMuted,
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Text(
                              record.time,
                              style: const TextStyle(
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 11),
                        Text(
                          record.record,
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          'Aula ${record.classroom} · ${_methodLabel(record.method)}',
                          style: const TextStyle(
                            color: unsaacMuted,
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(height: 9),
                        Wrap(
                          spacing: 8,
                          runSpacing: 7,
                          children: <Widget>[
                            _RecordChip(
                              label: record.status,
                              color: _recordColor(record),
                            ),
                            _RecordChip(
                              label: record.result,
                              color: _resultColor(record.result),
                            ),
                            _RecordChip(
                              label: record.source,
                              color: unsaacBlue,
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

class _SupervisorAccountTab extends StatelessWidget {
  const _SupervisorAccountTab({
    required this.controller,
    required this.data,
    required this.onOpen,
  });

  final AppController controller;
  final SupervisorDashboardData data;
  final Future<void> Function(Widget page) onOpen;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 30),
      children: <Widget>[
        PortalHero(
          eyebrow: 'Cuenta supervisora',
          title: controller.user?.nombreCompleto ?? 'Supervisor',
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
                  icon: Icons.update,
                  label: 'Última actualización',
                  value: _formatDateTime(data.generatedAt),
                ),
                PortalInfoRow(
                  icon: Icons.verified_user_outlined,
                  label: 'Rol activo',
                  value: controller.user?.rol ?? 'Supervisor',
                  color: const Color(0xFF7C3AED),
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

class _RecordChip extends StatelessWidget {
  const _RecordChip({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label.replaceAll('_', ' '),
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

String _methodLabel(String value) => switch (value.toUpperCase()) {
  'QR_DINAMICO' => 'QR dinámico',
  'BIOMETRIA_MOVIL_BLE' => 'Biometría + BLE',
  'BIOMETRIA_MOVIL' => 'Biometría móvil',
  'OFFLINE_SINCRONIZADO' => 'Offline sincronizado',
  'LECTOR_BIOMETRICO' => 'Lector biométrico',
  _ => value.replaceAll('_', ' '),
};

Color _methodColor(String value) => switch (value.toUpperCase()) {
  'QR_DINAMICO' => unsaacOrange,
  'BIOMETRIA_MOVIL_BLE' => const Color(0xFF7C3AED),
  'BIOMETRIA_MOVIL' => unsaacBlue,
  'OFFLINE_SINCRONIZADO' => const Color(0xFF0F766E),
  _ => unsaacMuted,
};

String _filterLabel(String value) => switch (value) {
  'PUNTUAL' => 'Puntuales',
  'TARDANZA' => 'Tardanzas',
  'RECHAZADA' => 'Rechazadas',
  'DUPLICADA' => 'Duplicadas',
  _ => 'Todos',
};

Color _recordColor(SupervisorRecord record) {
  if (record.isRejected) return const Color(0xFFDC2626);
  if (record.isDuplicate) return const Color(0xFFD97706);
  if (record.isLate) return unsaacOrange;
  return const Color(0xFF15803D);
}

Color _resultColor(String result) => switch (result.toUpperCase()) {
  'RECHAZADA' => const Color(0xFFDC2626),
  'DUPLICADA' => const Color(0xFFD97706),
  _ => const Color(0xFF15803D),
};

IconData _recordIcon(SupervisorRecord record) {
  if (record.isRejected) return Icons.block;
  if (record.isDuplicate) return Icons.content_copy;
  if (record.isLate) return Icons.schedule;
  return Icons.task_alt;
}

String _formatDateTime(DateTime? value) {
  if (value == null) return 'Sin actualización';
  final DateTime local = value.toLocal();
  String two(int number) => number.toString().padLeft(2, '0');
  return '${two(local.day)}/${two(local.month)}/${local.year} ${two(local.hour)}:${two(local.minute)}';
}
