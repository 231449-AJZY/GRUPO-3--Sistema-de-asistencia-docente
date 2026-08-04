import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../controllers/app_controller.dart';
import '../models/ble_station.dart';

class BleStationModeScreen extends StatefulWidget {
  const BleStationModeScreen({required this.controller, super.key});

  final AppController controller;

  @override
  State<BleStationModeScreen> createState() => _BleStationModeScreenState();
}

class _BleStationModeScreenState extends State<BleStationModeScreen>
    with SingleTickerProviderStateMixin {
  final TextEditingController _manualController = TextEditingController();
  final MobileScannerController _scannerController = MobileScannerController(
    formats: <BarcodeFormat>[BarcodeFormat.qrCode],
  );
  late final AnimationController _pulseController;
  bool _processing = false;
  bool _showScanner = false;

  @override
  void initState() {
    super.initState();
    _showScanner = widget.controller.bleStationProfile == null;
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
      lowerBound: 0.85,
      upperBound: 1.08,
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _manualController.dispose();
    _scannerController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _processQr(String value) async {
    if (_processing || value.trim().isEmpty) {
      return;
    }

    setState(() => _processing = true);
    await _scannerController.stop();
    final bool success = await widget.controller.provisionBleStationFromQr(
      value,
    );

    if (!mounted) {
      return;
    }

    if (success) {
      setState(() {
        _processing = false;
        _showScanner = false;
        _manualController.clear();
      });
      return;
    }

    setState(() => _processing = false);
    await _scannerController.start();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_processing || !_showScanner) {
      return;
    }

    for (final Barcode barcode in capture.barcodes) {
      final String? value = barcode.rawValue;
      if (value != null && value.isNotEmpty) {
        _processQr(value);
        return;
      }
    }
  }

  Future<void> _forgetProfile() async {
    final bool confirmed =
        await showDialog<bool>(
          context: context,
          builder: (BuildContext context) => AlertDialog(
            title: const Text('Eliminar perfil local'),
            content: const Text(
              'La estación seguirá registrada en el servidor, pero este teléfono dejará de emitirla hasta volver a escanear un QR.',
            ),
            actions: <Widget>[
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: const Text('Cancelar'),
              ),
              FilledButton(
                onPressed: () => Navigator.of(context).pop(true),
                child: const Text('Eliminar'),
              ),
            ],
          ),
        ) ??
        false;

    if (!confirmed) {
      return;
    }

    await widget.controller.forgetBleStationProfile();
    if (mounted) {
      setState(() => _showScanner = true);
      await _scannerController.start();
    }
  }

  @override
  Widget build(BuildContext context) {
    final BleStationProfile? profile = widget.controller.bleStationProfile;
    final BleAdvertisingStatus status = widget.controller.bleAdvertisingStatus;
    final String? error = widget.controller.errorMessage;
    final String? message = widget.controller.bleStationMessage;

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Modo estación BLE',
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
        actions: <Widget>[
          IconButton(
            tooltip: 'Actualizar estado',
            onPressed: widget.controller.busy
                ? null
                : widget.controller.refreshCapabilities,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(18, 18, 18, 36),
        children: <Widget>[
          const Card(
            child: Padding(
              padding: EdgeInsets.all(18),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Icon(Icons.bluetooth, color: Color(0xFF1D4ED8)),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Este modo convierte un segundo teléfono Android en una estación Bluetooth de prueba. Mantenga esta pantalla abierta y el teléfono conectado a energía durante las marcaciones.',
                      style: TextStyle(color: Color(0xFF475569), height: 1.4),
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (message != null) ...<Widget>[
            const SizedBox(height: 13),
            _MessageBox(
              message: message,
              color: const Color(0xFF047857),
              background: const Color(0xFFECFDF5),
            ),
          ],
          if (error != null) ...<Widget>[
            const SizedBox(height: 13),
            _MessageBox(
              message: error,
              color: const Color(0xFFB91C1C),
              background: const Color(0xFFFEF2F2),
            ),
          ],
          const SizedBox(height: 16),
          if (profile != null && !_showScanner)
            _StationProfileCard(
              profile: profile,
              status: status,
              pulse: _pulseController,
              busy: widget.controller.busy,
              advertisingSupported:
                  widget.controller.deviceStatus.bleAdvertisingSupported,
              onStart: widget.controller.startBleStation,
              onStop: widget.controller.stopBleStation,
              onReplace: () async {
                await widget.controller.stopBleStation();
                if (mounted) {
                  setState(() => _showScanner = true);
                  await _scannerController.start();
                }
              },
              onForget: _forgetProfile,
            )
          else
            _ScannerCard(
              scannerController: _scannerController,
              manualController: _manualController,
              processing: _processing,
              onDetect: _onDetect,
              onManual: () => _processQr(_manualController.text),
              onCancel: profile == null
                  ? null
                  : () async {
                      await _scannerController.stop();
                      if (mounted) {
                        setState(() => _showScanner = false);
                      }
                    },
            ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  const Text(
                    'Comprobaciones del teléfono',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 13),
                  _CheckRow(
                    label: 'Bluetooth activo',
                    ok: widget.controller.deviceStatus.bluetoothEnabled,
                  ),
                  _CheckRow(
                    label: 'Permisos cercanos y ubicación',
                    ok: widget
                        .controller
                        .deviceStatus
                        .bluetoothPermissionGranted,
                  ),
                  _CheckRow(
                    label: 'Publicidad BLE compatible',
                    ok: widget.controller.deviceStatus.bleAdvertisingSupported,
                  ),
                  _CheckRow(
                    label: 'Emisión rotativa activa',
                    ok: status.active,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StationProfileCard extends StatelessWidget {
  const _StationProfileCard({
    required this.profile,
    required this.status,
    required this.pulse,
    required this.busy,
    required this.advertisingSupported,
    required this.onStart,
    required this.onStop,
    required this.onReplace,
    required this.onForget,
  });

  final BleStationProfile profile;
  final BleAdvertisingStatus status;
  final Animation<double> pulse;
  final bool busy;
  final bool advertisingSupported;
  final Future<bool> Function() onStart;
  final Future<void> Function() onStop;
  final Future<void> Function() onReplace;
  final Future<void> Function() onForget;

  @override
  Widget build(BuildContext context) {
    final bool active = status.active;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(21),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Align(
              child: ScaleTransition(
                scale: active ? pulse : const AlwaysStoppedAnimation<double>(1),
                child: CircleAvatar(
                  radius: 43,
                  backgroundColor: active
                      ? const Color(0xFF047857)
                      : const Color(0xFF7A1631),
                  child: Icon(
                    active ? Icons.bluetooth_connected : Icons.bluetooth,
                    color: Colors.white,
                    size: 45,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              active ? 'Estación emitiendo' : 'Estación preparada',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 23, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 6),
            Text(
              '${profile.name}\n${profile.code}',
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Color(0xFF475569),
                height: 1.4,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 18),
            _Detail(label: 'Tipo', value: profile.type),
            _Detail(
              label: 'Carrera',
              value: profile.department ?? 'Todas las carreras',
            ),
            _Detail(label: 'Aula', value: profile.classroom ?? 'Punto general'),
            _Detail(
              label: 'Rotación',
              value: '${profile.rotationSeconds} segundos',
            ),
            _Detail(
              label: 'Slot actual',
              value: status.timeSlot?.toString() ?? '—',
            ),
            const SizedBox(height: 18),
            FilledButton.icon(
              onPressed: busy || active || !advertisingSupported
                  ? null
                  : () async {
                      await onStart();
                    },
              icon: const Icon(Icons.play_arrow),
              label: const Padding(
                padding: EdgeInsets.symmetric(vertical: 13),
                child: Text('Iniciar emisión BLE'),
              ),
            ),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: busy || !active
                  ? null
                  : () async {
                      await onStop();
                    },
              icon: const Icon(Icons.stop_circle_outlined),
              label: const Text('Detener emisión'),
            ),
            const SizedBox(height: 10),
            TextButton.icon(
              onPressed: busy || active
                  ? null
                  : () async {
                      await onReplace();
                    },
              icon: const Icon(Icons.qr_code_scanner),
              label: const Text('Escanear otro QR'),
            ),
            TextButton.icon(
              onPressed: busy || active
                  ? null
                  : () async {
                      await onForget();
                    },
              icon: const Icon(Icons.delete_outline),
              label: const Text('Eliminar perfil de este teléfono'),
            ),
          ],
        ),
      ),
    );
  }
}

class _ScannerCard extends StatelessWidget {
  const _ScannerCard({
    required this.scannerController,
    required this.manualController,
    required this.processing,
    required this.onDetect,
    required this.onManual,
    this.onCancel,
  });

  final MobileScannerController scannerController;
  final TextEditingController manualController;
  final bool processing;
  final void Function(BarcodeCapture) onDetect;
  final VoidCallback onManual;
  final Future<void> Function()? onCancel;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            const Text(
              'Escanear QR de estación',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 21, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 14),
            ClipRRect(
              borderRadius: BorderRadius.circular(22),
              child: SizedBox(
                height: 320,
                child: Stack(
                  fit: StackFit.expand,
                  children: <Widget>[
                    MobileScanner(
                      controller: scannerController,
                      onDetect: onDetect,
                    ),
                    Container(
                      margin: const EdgeInsets.all(52),
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.white, width: 3),
                        borderRadius: BorderRadius.circular(22),
                      ),
                    ),
                    if (processing)
                      const ColoredBox(
                        color: Color(0x99000000),
                        child: Center(
                          child: CircularProgressIndicator(color: Colors.white),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: manualController,
              minLines: 2,
              maxLines: 5,
              decoration: const InputDecoration(
                labelText: 'Contenido QR manual',
                prefixIcon: Icon(Icons.qr_code_2),
              ),
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: processing ? null : onManual,
              icon: const Icon(Icons.settings_input_antenna),
              label: const Padding(
                padding: EdgeInsets.symmetric(vertical: 13),
                child: Text('Provisionar estación'),
              ),
            ),
            if (onCancel != null) ...<Widget>[
              const SizedBox(height: 8),
              TextButton(
                onPressed: processing
                    ? null
                    : () async {
                        await onCancel!();
                      },
                child: const Text('Cancelar'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _MessageBox extends StatelessWidget {
  const _MessageBox({
    required this.message,
    required this.color,
    required this.background,
  });

  final String message;
  final Color color;
  final Color background;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Text(
        message,
        style: TextStyle(color: color, fontWeight: FontWeight.w700),
      ),
    );
  }
}

class _CheckRow extends StatelessWidget {
  const _CheckRow({required this.label, required this.ok});

  final String label;
  final bool ok;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: <Widget>[
          Icon(
            ok ? Icons.check_circle : Icons.cancel,
            color: ok ? const Color(0xFF047857) : const Color(0xFFB91C1C),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }
}

class _Detail extends StatelessWidget {
  const _Detail({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          SizedBox(
            width: 95,
            child: Text(
              label,
              style: const TextStyle(
                color: Color(0xFF64748B),
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w900),
            ),
          ),
        ],
      ),
    );
  }
}
