import 'package:flutter/material.dart';

import '../controllers/app_controller.dart';
import '../core/app_theme.dart';
import '../models/admin_mobile_device.dart';
import '../services/mobile_device_admin_service.dart';

class MobileDeviceAuthorizationScreen extends StatefulWidget {
  const MobileDeviceAuthorizationScreen({
    required this.controller,
    super.key,
  });

  final AppController controller;

  @override
  State<MobileDeviceAuthorizationScreen> createState() =>
      _MobileDeviceAuthorizationScreenState();
}

class _MobileDeviceAuthorizationScreenState
    extends State<MobileDeviceAuthorizationScreen> {
  final MobileDeviceAdminService _service = MobileDeviceAdminService();

  AdminDevicePortalData _data = AdminDevicePortalData(
    devices: const <AdminMobileDevice>[],
    summary: AdminDeviceSummary.empty(),
  );
  bool _loading = true;
  int? _approvingId;
  String? _error;
  String _filter = 'PENDIENTE';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _service.close();
    super.dispose();
  }

  Future<void> _load({bool showFeedback = false}) async {
    final String? token = widget.controller.sessionToken;
    if (token == null || token.isEmpty) {
      setState(() {
        _loading = false;
        _error = 'No existe una sesión administradora válida.';
      });
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final AdminDevicePortalData data = await _service.loadDevices(
        serverUrl: widget.controller.serverUrl,
        token: token,
      );
      if (!mounted) {
        return;
      }
      setState(() => _data = data);
      if (showFeedback) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Dispositivos actualizados.')),
        );
      }
    } on MobileDeviceAdminException catch (error) {
      if (mounted) {
        setState(() => _error = error.message);
      }
    } on Object {
      if (mounted) {
        setState(() => _error = 'No se pudieron cargar los dispositivos.');
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _approve(AdminMobileDevice device) async {
    final bool confirmed =
        await showDialog<bool>(
          context: context,
          builder: (BuildContext context) => AlertDialog(
            icon: const Icon(
              Icons.verified_user_outlined,
              color: unsaacBlue,
              size: 38,
            ),
            title: const Text('Autorizar este celular'),
            content: Text(
              'Docente: ${device.teacherName}\n'
              'Código: ${device.teacherCode}\n'
              'Equipo: ${device.deviceLabel}\n\n'
              'Al autorizarlo, el docente podrá usar la marcación biométrica y el QR dinámico.',
            ),
            actions: <Widget>[
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: const Text('Cancelar'),
              ),
              FilledButton.icon(
                onPressed: () => Navigator.of(context).pop(true),
                icon: const Icon(Icons.check_circle_outline),
                label: const Text('Autorizar'),
              ),
            ],
          ),
        ) ??
        false;

    if (!confirmed) {
      return;
    }

    final String? token = widget.controller.sessionToken;
    if (token == null || token.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('La sesión administradora venció.')),
        );
      }
      return;
    }

    setState(() {
      _approvingId = device.id;
      _error = null;
    });

    try {
      await _service.approveDevice(
        serverUrl: widget.controller.serverUrl,
        token: token,
        deviceId: device.id,
      );
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '${device.deviceLabel} fue autorizado para ${device.teacherName}.',
          ),
        ),
      );
      await _load();
    } on MobileDeviceAdminException catch (error) {
      if (mounted) {
        setState(() => _error = error.message);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error.message)),
        );
      }
    } on Object {
      if (mounted) {
        setState(() => _error = 'No se pudo autorizar el celular.');
      }
    } finally {
      if (mounted) {
        setState(() => _approvingId = null);
      }
    }
  }

  List<AdminMobileDevice> get _visibleDevices {
    return switch (_filter) {
      'PENDIENTE' => _data.devices
          .where((AdminMobileDevice device) => device.isPending)
          .toList(),
      'AUTORIZADO' => _data.devices
          .where((AdminMobileDevice device) => device.isAuthorized)
          .toList(),
      _ => _data.devices,
    };
  }

  @override
  Widget build(BuildContext context) {
    final AdminDeviceSummary summary = _data.summary;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Autorizar celulares'),
        actions: <Widget>[
          IconButton(
            tooltip: 'Actualizar dispositivos',
            onPressed: _loading ? null : () => _load(showFeedback: true),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: Stack(
        children: <Widget>[
          RefreshIndicator(
            onRefresh: () => _load(showFeedback: true),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(18, 18, 18, 32),
              children: <Widget>[
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: <Color>[unsaacPrimary, unsaacTop],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      const Row(
                        children: <Widget>[
                          Icon(
                            Icons.phonelink_lock_outlined,
                            color: unsaacOrange,
                            size: 36,
                          ),
                          SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'Control de dispositivos docentes',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 20,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      const Text(
                        'Autorice únicamente celulares identificados y entregados al docente correcto.',
                        style: TextStyle(
                          color: Color(0xFFDCEAFF),
                          height: 1.4,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: <Widget>[
                          _SummaryItem(
                            value: '${summary.pending}',
                            label: 'Pendientes',
                            accent: unsaacOrange,
                          ),
                          const SizedBox(width: 10),
                          _SummaryItem(
                            value: '${summary.authorized}',
                            label: 'Autorizados',
                            accent: const Color(0xFF63E6BE),
                          ),
                          const SizedBox(width: 10),
                          _SummaryItem(
                            value: '${summary.total}',
                            label: 'Total',
                            accent: Colors.white,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: <Widget>[
                    ChoiceChip(
                      label: Text('Pendientes (${summary.pending})'),
                      selected: _filter == 'PENDIENTE',
                      onSelected: (_) => setState(() => _filter = 'PENDIENTE'),
                    ),
                    ChoiceChip(
                      label: Text('Autorizados (${summary.authorized})'),
                      selected: _filter == 'AUTORIZADO',
                      onSelected: (_) => setState(() => _filter = 'AUTORIZADO'),
                    ),
                    ChoiceChip(
                      label: Text('Todos (${summary.total})'),
                      selected: _filter == 'TODOS',
                      onSelected: (_) => setState(() => _filter = 'TODOS'),
                    ),
                  ],
                ),
                if (_error != null) ...<Widget>[
                  const SizedBox(height: 13),
                  _MessageBox(message: _error!),
                ],
                const SizedBox(height: 14),
                if (!_loading && _visibleDevices.isEmpty)
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 22,
                        vertical: 44,
                      ),
                      child: Column(
                        children: <Widget>[
                          Icon(
                            _filter == 'PENDIENTE'
                                ? Icons.verified_outlined
                                : Icons.phone_android,
                            size: 52,
                            color: unsaacMuted,
                          ),
                          const SizedBox(height: 12),
                          Text(
                            _filter == 'PENDIENTE'
                                ? 'No existen celulares pendientes de autorización.'
                                : 'No existen dispositivos en este filtro.',
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              color: unsaacMuted,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  ..._visibleDevices.map(
                    (AdminMobileDevice device) => Padding(
                      padding: const EdgeInsets.only(bottom: 11),
                      child: _DeviceCard(
                        device: device,
                        approving: _approvingId == device.id,
                        onApprove: () => _approve(device),
                      ),
                    ),
                  ),
                const SizedBox(height: 8),
                const Card(
                  child: Padding(
                    padding: EdgeInsets.all(17),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Icon(Icons.info_outline, color: unsaacBlue),
                        SizedBox(width: 11),
                        Expanded(
                          child: Text(
                            'Después de autorizar, el docente debe pulsar Actualizar en su aplicación. No es necesario desinstalar ni volver a vincular el celular.',
                            style: TextStyle(
                              color: unsaacMuted,
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

class _DeviceCard extends StatelessWidget {
  const _DeviceCard({
    required this.device,
    required this.approving,
    required this.onApprove,
  });

  final AdminMobileDevice device;
  final bool approving;
  final VoidCallback onApprove;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    color: device.isPending
                        ? const Color(0xFFFFF0D8)
                        : const Color(0xFFDCEAFF),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(
                    device.isPending
                        ? Icons.phone_android_outlined
                        : Icons.verified_user_outlined,
                    color: device.isPending ? unsaacOrange : unsaacBlue,
                  ),
                ),
                const SizedBox(width: 13),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        device.teacherName.isEmpty
                            ? 'Docente ${device.teacherCode}'
                            : device.teacherName,
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        '${device.teacherCode} · ${device.department ?? 'Sin departamento'}',
                        style: const TextStyle(color: unsaacMuted),
                      ),
                    ],
                  ),
                ),
                _StatePill(state: device.state),
              ],
            ),
            const Divider(height: 28),
            _DetailRow(
              icon: Icons.smartphone,
              label: 'Celular',
              value: device.deviceLabel,
            ),
            const SizedBox(height: 8),
            _DetailRow(
              icon: Icons.android,
              label: 'Sistema',
              value: 'Android ${device.systemVersion}',
            ),
            const SizedBox(height: 8),
            _DetailRow(
              icon: Icons.apps,
              label: 'Aplicación',
              value: device.appVersion.isEmpty ? 'Sin versión' : device.appVersion,
            ),
            const SizedBox(height: 8),
            _DetailRow(
              icon: Icons.fingerprint,
              label: 'Biometría',
              value: device.biometricAvailable
                  ? (device.biometricTypes?.isNotEmpty == true
                      ? device.biometricTypes!
                      : 'Disponible')
                  : 'No reportada',
            ),
            if (device.stateReason?.isNotEmpty == true) ...<Widget>[
              const SizedBox(height: 8),
              _DetailRow(
                icon: Icons.info_outline,
                label: 'Motivo',
                value: device.stateReason!,
              ),
            ],
            if (device.isPending) ...<Widget>[
              const SizedBox(height: 17),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: approving ? null : onApprove,
                  icon: approving
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.check_circle_outline),
                  label: Text(
                    approving ? 'Autorizando…' : 'Autorizar celular',
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Icon(icon, size: 18, color: unsaacBlue),
        const SizedBox(width: 9),
        SizedBox(
          width: 82,
          child: Text(
            label,
            style: const TextStyle(
              color: unsaacMuted,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.w800),
          ),
        ),
      ],
    );
  }
}

class _StatePill extends StatelessWidget {
  const _StatePill({required this.state});

  final String state;

  @override
  Widget build(BuildContext context) {
    final bool pending = state == 'PENDIENTE';
    final bool authorized = state == 'AUTORIZADO';
    final Color color = pending
        ? const Color(0xFFB85E00)
        : authorized
            ? const Color(0xFF166534)
            : unsaacMuted;
    final Color background = pending
        ? const Color(0xFFFFF0D8)
        : authorized
            ? const Color(0xFFDFF7EA)
            : const Color(0xFFE8EEF5);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(11),
      ),
      child: Text(
        state,
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

class _SummaryItem extends StatelessWidget {
  const _SummaryItem({
    required this.value,
    required this.label,
    required this.accent,
  });

  final String value;
  final String label;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white.withAlpha(24),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withAlpha(35)),
        ),
        child: Column(
          children: <Widget>[
            Text(
              value,
              style: TextStyle(
                color: accent,
                fontSize: 23,
                fontWeight: FontWeight.w900,
              ),
            ),
            Text(
              label,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 10,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MessageBox extends StatelessWidget {
  const _MessageBox({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFFE7E7),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Text(
        message,
        style: const TextStyle(
          color: Color(0xFF9B1C1C),
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}
