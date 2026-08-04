import 'package:flutter/material.dart';

import '../controllers/app_controller.dart';
import '../core/app_theme.dart';
import '../models/role_portal.dart';
import '../services/role_portal_service.dart';
import '../widgets/mobile_portal_widgets.dart';
import 'settings_screen.dart';

class TeacherInsightsScreen extends StatefulWidget {
  const TeacherInsightsScreen({required this.controller, super.key});

  final AppController controller;

  @override
  State<TeacherInsightsScreen> createState() => _TeacherInsightsScreenState();
}

class _TeacherInsightsScreenState extends State<TeacherInsightsScreen> {
  final RolePortalService _service = RolePortalService();
  TeacherDashboardData _data = const TeacherDashboardData.empty();
  bool _loading = true;
  String? _error;

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

  Future<void> _refresh() async {
    final String? token = widget.controller.sessionToken;
    if (token == null || token.isEmpty) {
      setState(() {
        _loading = false;
        _error = 'La sesión docente no está disponible.';
      });
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      await widget.controller.refreshAll();
      final TeacherDashboardData data = await _service.loadTeacherDashboard(
        serverUrl: widget.controller.serverUrl,
        token: token,
      );
      if (!mounted) return;
      setState(() => _data = data);
    } on RolePortalException catch (error) {
      if (!mounted) return;
      setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final double punctuality = _data.punctualityRate;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mi resumen mensual'),
        actions: <Widget>[
          IconButton(
            tooltip: 'Actualizar',
            onPressed: _loading ? null : _refresh,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: Stack(
        children: <Widget>[
          RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 30),
              children: <Widget>[
                PortalHero(
                  eyebrow: 'Panel docente ampliado',
                  title: widget.controller.user?.nombreCompleto ?? 'Docente',
                  subtitle:
                      'Estadísticas mensuales, seguridad móvil y últimos ingresos.',
                  icon: Icons.insights_outlined,
                ),
                if (_error != null) ...<Widget>[
                  const SizedBox(height: 14),
                  PortalEmptyCard(
                    icon: Icons.error_outline,
                    message: _error!,
                    error: true,
                  ),
                ],
                const SizedBox(height: 14),
                GridView.count(
                  crossAxisCount: 3,
                  crossAxisSpacing: 8,
                  mainAxisSpacing: 8,
                  childAspectRatio: 0.82,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  children: <Widget>[
                    PortalMetricCard(
                      value: '${_data.attendance}',
                      label: 'Asistencias',
                      icon: Icons.task_alt,
                      color: const Color(0xFF15803D),
                    ),
                    PortalMetricCard(
                      value: '${_data.late}',
                      label: 'Tardanzas',
                      icon: Icons.schedule,
                      color: const Color(0xFFD97706),
                    ),
                    PortalMetricCard(
                      value: '${_data.absences}',
                      label: 'Inasistencias',
                      icon: Icons.person_off_outlined,
                      color: const Color(0xFFDC2626),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                const PortalSectionHeader(
                  title: 'Puntualidad del mes',
                  subtitle:
                      'Relación entre asistencias puntuales y tardanzas registradas.',
                ),
                const SizedBox(height: 10),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      children: <Widget>[
                        Row(
                          children: <Widget>[
                            Expanded(
                              child: Text(
                                '${(punctuality * 100).round()}%',
                                style: const TextStyle(
                                  fontSize: 34,
                                  fontWeight: FontWeight.w900,
                                  color: unsaacBlue,
                                ),
                              ),
                            ),
                            PortalStatusPill(
                              label: punctuality >= 0.9
                                  ? 'Excelente'
                                  : punctuality >= 0.75
                                  ? 'En progreso'
                                  : 'Requiere atención',
                              icon: Icons.trending_up,
                              ok: punctuality >= 0.75,
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: LinearProgressIndicator(
                            minHeight: 12,
                            value: punctuality,
                            backgroundColor: const Color(0xFFE8EEF5),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                const PortalSectionHeader(
                  title: 'Seguridad y sincronización',
                  subtitle:
                      'Estado de este celular para marcaciones protegidas.',
                ),
                const SizedBox(height: 10),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(17),
                    child: Column(
                      children: <Widget>[
                        PortalInfoRow(
                          icon: Icons.cloud_outlined,
                          label: 'Servidor institucional',
                          value: widget.controller.serverOnline
                              ? 'Conectado'
                              : 'Sin conexión',
                          color: widget.controller.serverOnline
                              ? const Color(0xFF15803D)
                              : const Color(0xFFDC2626),
                        ),
                        PortalInfoRow(
                          icon: Icons.phonelink_lock_outlined,
                          label: 'Autorización del celular',
                          value:
                              widget.controller.linkedDevice?.isAuthorized ==
                                  true
                              ? 'Autorizado'
                              : widget.controller.linkedDevice == null
                              ? 'Sin vincular'
                              : widget.controller.linkedDevice!.state,
                          color:
                              widget.controller.linkedDevice?.isAuthorized ==
                                  true
                              ? const Color(0xFF15803D)
                              : const Color(0xFFD97706),
                        ),
                        PortalInfoRow(
                          icon: Icons.fingerprint,
                          label: 'Biometría Android',
                          value: widget.controller.biometricStatus.enrolled
                              ? 'Enrolada y disponible'
                              : widget.controller.biometricStatus.supported
                              ? 'Disponible sin enrolamiento'
                              : 'No disponible',
                          color: widget.controller.biometricStatus.enrolled
                              ? const Color(0xFF15803D)
                              : const Color(0xFFD97706),
                        ),
                        PortalInfoRow(
                          icon: Icons.offline_bolt_outlined,
                          label: 'Modo offline',
                          value: widget.controller.offlineReady
                              ? 'Preparado · ${widget.controller.pendingOfflineCount} pendiente(s)'
                              : 'No preparado',
                          color: widget.controller.offlineReady
                              ? const Color(0xFF7C3AED)
                              : unsaacMuted,
                        ),
                        PortalInfoRow(
                          icon: Icons.draw_outlined,
                          label: 'Firma de asistencia',
                          value: widget.controller.attendanceSigningReady
                              ? 'Clave segura preparada'
                              : widget.controller.attendanceSigningMessage ??
                                    'No preparada',
                          color: widget.controller.attendanceSigningReady
                              ? const Color(0xFF15803D)
                              : const Color(0xFFD97706),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                const PortalSectionHeader(
                  title: 'Últimos ingresos institucionales',
                  subtitle: 'Movimientos recientes del mes actual.',
                ),
                const SizedBox(height: 10),
                if (_data.history.isEmpty)
                  const PortalEmptyCard(
                    icon: Icons.history_toggle_off,
                    message: 'No existen registros institucionales recientes.',
                  )
                else
                  ..._data.history.map(
                    (TeacherMonthlyHistoryItem item) => Padding(
                      padding: const EdgeInsets.only(bottom: 9),
                      child: Card(
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: _statusColor(
                              item.status,
                            ).withValues(alpha: 0.12),
                            child: Icon(
                              _statusIcon(item.status),
                              color: _statusColor(item.status),
                            ),
                          ),
                          title: Text(
                            item.status,
                            style: const TextStyle(fontWeight: FontWeight.w900),
                          ),
                          subtitle: Text(item.date),
                          trailing: Text(
                            item.time,
                            style: const TextStyle(fontWeight: FontWeight.w900),
                          ),
                        ),
                      ),
                    ),
                  ),
                const SizedBox(height: 14),
                OutlinedButton.icon(
                  onPressed: () async {
                    await Navigator.of(context).push<void>(
                      MaterialPageRoute<void>(
                        builder: (_) =>
                            SettingsScreen(controller: widget.controller),
                      ),
                    );
                  },
                  icon: const Icon(Icons.settings_outlined),
                  label: const Text('Configurar servidor'),
                ),
              ],
            ),
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
    );
  }
}

Color _statusColor(String value) {
  final String normalized = value.toUpperCase();
  if (normalized.contains('TARDANZA')) return const Color(0xFFD97706);
  if (normalized.contains('AUSENTE')) return const Color(0xFFDC2626);
  return const Color(0xFF15803D);
}

IconData _statusIcon(String value) {
  final String normalized = value.toUpperCase();
  if (normalized.contains('TARDANZA')) return Icons.schedule;
  if (normalized.contains('AUSENTE')) return Icons.person_off_outlined;
  return Icons.task_alt;
}
