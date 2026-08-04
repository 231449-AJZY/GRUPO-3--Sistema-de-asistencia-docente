import 'package:flutter/material.dart';

import '../controllers/app_controller.dart';
import '../core/app_theme.dart';
import '../models/role_portal.dart';
import '../services/role_portal_service.dart';
import '../widgets/mobile_portal_widgets.dart';

class AlertsMobileScreen extends StatefulWidget {
  const AlertsMobileScreen({required this.controller, super.key});

  final AppController controller;

  @override
  State<AlertsMobileScreen> createState() => _AlertsMobileScreenState();
}

class _AlertsMobileScreenState extends State<AlertsMobileScreen> {
  final RolePortalService _service = RolePortalService();
  final TextEditingController _searchController = TextEditingController();

  AlertBundle _bundle = const AlertBundle(
    total: 0,
    alerts: <OperationalAlert>[],
  );
  bool _loading = true;
  String? _error;
  String _status = 'TODAS';
  String _priority = 'TODAS';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _searchController.dispose();
    _service.close();
    super.dispose();
  }

  Future<void> _load({bool feedback = false}) async {
    final String? token = widget.controller.sessionToken;
    if (token == null || token.isEmpty) {
      setState(() {
        _loading = false;
        _error = 'La sesión no está disponible.';
      });
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final AlertBundle bundle = await _service.loadAlerts(
        serverUrl: widget.controller.serverUrl,
        token: token,
        status: _status,
        priority: _priority,
        query: _searchController.text,
      );
      if (!mounted) return;
      setState(() => _bundle = bundle);
      if (feedback) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Alertas actualizadas.')));
      }
    } on RolePortalException catch (error) {
      if (!mounted) return;
      setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _generate() async {
    final String? token = widget.controller.sessionToken;
    if (token == null || token.isEmpty) return;

    setState(() => _loading = true);
    try {
      await _service.generateAlerts(
        serverUrl: widget.controller.serverUrl,
        token: token,
      );
      await _load(feedback: true);
    } on RolePortalException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(error.message)));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _changeStatus(OperationalAlert alert) async {
    final String? selected = await showDialog<String>(
      context: context,
      builder: (BuildContext dialogContext) => SimpleDialog(
        title: const Text('Cambiar estado de alerta'),
        children: <Widget>[
          for (final String value in <String>[
            'NUEVA',
            'REVISADA',
            'RESUELTA',
            'DESCARTADA',
          ])
            SimpleDialogOption(
              onPressed: () => Navigator.of(dialogContext).pop(value),
              child: Row(
                children: <Widget>[
                  Icon(_statusIcon(value), color: _statusColor(value)),
                  const SizedBox(width: 10),
                  Text(value),
                ],
              ),
            ),
        ],
      ),
    );

    if (selected == null || selected == alert.status || !mounted) return;

    final TextEditingController commentController = TextEditingController();
    final bool? confirmed = await showDialog<bool>(
      context: context,
      builder: (BuildContext dialogContext) => AlertDialog(
        title: Text('Marcar como $selected'),
        content: TextField(
          controller: commentController,
          maxLines: 3,
          maxLength: 500,
          decoration: const InputDecoration(
            labelText: 'Comentario de seguimiento',
            hintText: 'Detalle opcional de la decisión',
          ),
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Guardar'),
          ),
        ],
      ),
    );

    if (confirmed != true) {
      commentController.dispose();
      return;
    }

    final String? token = widget.controller.sessionToken;
    if (token == null || token.isEmpty) {
      commentController.dispose();
      return;
    }

    try {
      await _service.updateAlertStatus(
        serverUrl: widget.controller.serverUrl,
        token: token,
        alertId: alert.id,
        status: selected,
        comment: commentController.text,
      );
      commentController.dispose();
      await _load(feedback: true);
    } on RolePortalException catch (error) {
      commentController.dispose();
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(error.message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final int urgent = _bundle.alerts
        .where(
          (OperationalAlert item) => item.isUrgent && item.status == 'NUEVA',
        )
        .length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Centro de alertas'),
        actions: <Widget>[
          IconButton(
            tooltip: 'Generar alertas operativas',
            onPressed: _loading ? null : _generate,
            icon: const Icon(Icons.auto_awesome_motion_outlined),
          ),
          IconButton(
            tooltip: 'Actualizar',
            onPressed: _loading ? null : () => _load(feedback: true),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: Stack(
        children: <Widget>[
          RefreshIndicator(
            onRefresh: () => _load(feedback: true),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 30),
              children: <Widget>[
                PortalHero(
                  eyebrow: 'Monitoreo institucional',
                  title: '${_bundle.total} alertas encontradas',
                  subtitle: urgent > 0
                      ? '$urgent alerta(s) urgente(s) requieren atención.'
                      : 'No existen alertas urgentes en el filtro actual.',
                  icon: Icons.notifications_active_outlined,
                ),
                const SizedBox(height: 14),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: <Widget>[
                        TextField(
                          controller: _searchController,
                          textInputAction: TextInputAction.search,
                          onSubmitted: (_) => _load(),
                          decoration: InputDecoration(
                            labelText: 'Buscar docente o mensaje',
                            prefixIcon: const Icon(Icons.search),
                            suffixIcon: IconButton(
                              tooltip: 'Buscar',
                              onPressed: _load,
                              icon: const Icon(Icons.arrow_forward),
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: <Widget>[
                            Expanded(
                              child: DropdownButtonFormField<String>(
                                initialValue: _status,
                                decoration: const InputDecoration(
                                  labelText: 'Estado',
                                ),
                                items: const <DropdownMenuItem<String>>[
                                  DropdownMenuItem(
                                    value: 'TODAS',
                                    child: Text('Todos'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'NUEVA',
                                    child: Text('Nuevas'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'REVISADA',
                                    child: Text('Revisadas'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'RESUELTA',
                                    child: Text('Resueltas'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'DESCARTADA',
                                    child: Text('Descartadas'),
                                  ),
                                ],
                                onChanged: (String? value) {
                                  if (value == null) return;
                                  setState(() => _status = value);
                                  _load();
                                },
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: DropdownButtonFormField<String>(
                                initialValue: _priority,
                                decoration: const InputDecoration(
                                  labelText: 'Prioridad',
                                ),
                                items: const <DropdownMenuItem<String>>[
                                  DropdownMenuItem(
                                    value: 'TODAS',
                                    child: Text('Todas'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'CRITICA',
                                    child: Text('Crítica'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'ALTA',
                                    child: Text('Alta'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'MEDIA',
                                    child: Text('Media'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'BAJA',
                                    child: Text('Baja'),
                                  ),
                                ],
                                onChanged: (String? value) {
                                  if (value == null) return;
                                  setState(() => _priority = value);
                                  _load();
                                },
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
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
                if (_bundle.alerts.isEmpty && _error == null)
                  const PortalEmptyCard(
                    icon: Icons.notifications_none,
                    message: 'No existen alertas para estos filtros.',
                  )
                else
                  ..._bundle.alerts.map(
                    (OperationalAlert alert) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Card(
                        child: InkWell(
                          borderRadius: BorderRadius.circular(22),
                          onTap: () => _changeStatus(alert),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: <Widget>[
                                Row(
                                  children: <Widget>[
                                    Container(
                                      width: 44,
                                      height: 44,
                                      decoration: BoxDecoration(
                                        color: _priorityColor(
                                          alert.priority,
                                        ).withValues(alpha: 0.12),
                                        borderRadius: BorderRadius.circular(14),
                                      ),
                                      child: Icon(
                                        Icons.warning_amber_rounded,
                                        color: _priorityColor(alert.priority),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: <Widget>[
                                          Text(
                                            alert.teacher,
                                            style: const TextStyle(
                                              fontWeight: FontWeight.w900,
                                            ),
                                          ),
                                          Text(
                                            '${alert.teacherCode} · ${alert.department}',
                                            style: const TextStyle(
                                              color: unsaacMuted,
                                              fontSize: 12,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 9,
                                        vertical: 5,
                                      ),
                                      decoration: BoxDecoration(
                                        color: _statusColor(
                                          alert.status,
                                        ).withValues(alpha: 0.12),
                                        borderRadius: BorderRadius.circular(20),
                                      ),
                                      child: Text(
                                        alert.status,
                                        style: TextStyle(
                                          color: _statusColor(alert.status),
                                          fontSize: 10,
                                          fontWeight: FontWeight.w900,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  alert.type.replaceAll('_', ' '),
                                  style: TextStyle(
                                    color: _priorityColor(alert.priority),
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                                const SizedBox(height: 5),
                                Text(
                                  alert.message,
                                  style: const TextStyle(height: 1.4),
                                ),
                                const SizedBox(height: 10),
                                Wrap(
                                  spacing: 8,
                                  runSpacing: 7,
                                  children: <Widget>[
                                    _MetaChip(
                                      icon: Icons.flag_outlined,
                                      label: alert.priority,
                                      color: _priorityColor(alert.priority),
                                    ),
                                    _MetaChip(
                                      icon: Icons.hub_outlined,
                                      label: alert.source,
                                      color: unsaacBlue,
                                    ),
                                    _MetaChip(
                                      icon: Icons.schedule,
                                      label: _formatDateTime(alert.createdAt),
                                      color: unsaacMuted,
                                    ),
                                  ],
                                ),
                                if (alert.comment.isNotEmpty) ...<Widget>[
                                  const SizedBox(height: 10),
                                  Text(
                                    'Comentario: ${alert.comment}',
                                    style: const TextStyle(
                                      color: unsaacMuted,
                                      fontStyle: FontStyle.italic,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
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

class _MetaChip extends StatelessWidget {
  const _MetaChip({
    required this.icon,
    required this.label,
    required this.color,
  });

  final IconData icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.09),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 5),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 11,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

Color _priorityColor(String value) => switch (value.toUpperCase()) {
  'CRITICA' => const Color(0xFF991B1B),
  'ALTA' => const Color(0xFFDC2626),
  'MEDIA' => const Color(0xFFD97706),
  _ => const Color(0xFF2563EB),
};

Color _statusColor(String value) => switch (value.toUpperCase()) {
  'RESUELTA' => const Color(0xFF15803D),
  'REVISADA' => const Color(0xFF2563EB),
  'DESCARTADA' => const Color(0xFF64748B),
  _ => const Color(0xFFB45309),
};

IconData _statusIcon(String value) => switch (value.toUpperCase()) {
  'RESUELTA' => Icons.task_alt,
  'REVISADA' => Icons.visibility_outlined,
  'DESCARTADA' => Icons.delete_outline,
  _ => Icons.fiber_new,
};

String _formatDateTime(DateTime? value) {
  if (value == null) return 'Sin fecha';
  final DateTime local = value.toLocal();
  String two(int number) => number.toString().padLeft(2, '0');
  return '${two(local.day)}/${two(local.month)} ${two(local.hour)}:${two(local.minute)}';
}
