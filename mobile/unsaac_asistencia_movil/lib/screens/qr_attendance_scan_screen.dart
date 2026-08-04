import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../controllers/app_controller.dart';
import '../core/app_theme.dart';
import '../models/mobile_device.dart';
import '../models/teacher_portal.dart';
import '../services/teacher_portal_service.dart';

class QrAttendanceScanScreen extends StatefulWidget {
  const QrAttendanceScanScreen({required this.controller, super.key});

  final AppController controller;

  @override
  State<QrAttendanceScanScreen> createState() =>
      _QrAttendanceScanScreenState();
}

class _QrAttendanceScanScreenState extends State<QrAttendanceScanScreen> {
  final MobileScannerController _scanner = MobileScannerController(
    formats: <BarcodeFormat>[BarcodeFormat.qrCode],
  );
  final TeacherPortalService _service = TeacherPortalService();

  bool _processing = false;
  String? _error;
  QrAttendanceOutcome? _outcome;

  @override
  void dispose() {
    _scanner.dispose();
    _service.close();
    super.dispose();
  }

  Future<void> _process(String rawValue) async {
    if (_processing || rawValue.trim().isEmpty) {
      return;
    }

    setState(() {
      _processing = true;
      _error = null;
      _outcome = null;
    });
    await _scanner.stop();

    try {
      if (widget.controller.linkedDevice?.isAuthorized != true) {
        throw const TeacherPortalException(
          'Este celular debe estar autorizado antes de usar el QR.',
        );
      }

      DeviceIdentity? identity = widget.controller.deviceIdentity;
      if (identity == null) {
        await widget.controller.refreshAll();
        identity = widget.controller.deviceIdentity;
      }

      final String? token = widget.controller.sessionToken;
      if (identity == null || token == null || token.isEmpty) {
        throw const TeacherPortalException(
          'No se encontró una sesión o identidad móvil válida.',
        );
      }

      final QrAttendanceOutcome result = await _service.markWithQr(
        serverUrl: widget.controller.serverUrl,
        token: token,
        installationId: identity.installationId,
        qrPayload: rawValue,
      );

      if (!mounted) {
        return;
      }
      setState(() => _outcome = result);
    } on TeacherPortalException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _error = error.message);
    } on Object {
      if (!mounted) {
        return;
      }
      setState(() => _error = 'No se pudo procesar el QR institucional.');
    } finally {
      if (mounted) {
        setState(() => _processing = false);
      }
    }
  }

  void _onDetect(BarcodeCapture capture) {
    if (_processing || _outcome != null) {
      return;
    }
    for (final Barcode barcode in capture.barcodes) {
      final String? value = barcode.rawValue;
      if (value != null && value.isNotEmpty) {
        _process(value);
        return;
      }
    }
  }

  Future<void> _retry() async {
    setState(() {
      _error = null;
      _outcome = null;
    });
    await _scanner.start();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Marcar mediante QR')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            children: <Widget>[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF3E0),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: const Color(0xFFFFC878)),
                ),
                child: const Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Icon(Icons.qr_code_scanner, color: unsaacOrange),
                    SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Este modo no solicita huella. Exige sesión docente, celular autorizado y un QR dinámico vigente mostrado por la estación.',
                        style: TextStyle(
                          color: unsaacText,
                          height: 1.35,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Expanded(child: _buildContent()),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildContent() {
    final QrAttendanceOutcome? outcome = _outcome;
    if (outcome != null) {
      return _ResultCard(
        outcome: outcome,
        onRetry: _retry,
        onViewHistory: () => Navigator.of(context).pop(true),
      );
    }

    if (_error != null) {
      return Center(
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                const Icon(Icons.error_outline, size: 54, color: Colors.red),
                const SizedBox(height: 14),
                Text(
                  _error!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 18),
                FilledButton.icon(
                  onPressed: _retry,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Escanear otro QR'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: Stack(
        fit: StackFit.expand,
        children: <Widget>[
          MobileScanner(controller: _scanner, onDetect: _onDetect),
          IgnorePointer(
            child: Container(
              decoration: BoxDecoration(
                border: Border.all(color: unsaacOrange, width: 4),
                borderRadius: BorderRadius.circular(24),
              ),
              margin: const EdgeInsets.all(42),
            ),
          ),
          if (_processing)
            Container(
              color: Colors.black54,
              alignment: Alignment.center,
              child: const Column(
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  CircularProgressIndicator(color: Colors.white),
                  SizedBox(height: 14),
                  Text(
                    'Verificando QR…',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _ResultCard extends StatelessWidget {
  const _ResultCard({
    required this.outcome,
    required this.onRetry,
    required this.onViewHistory,
  });

  final QrAttendanceOutcome outcome;
  final VoidCallback onRetry;
  final VoidCallback onViewHistory;

  @override
  Widget build(BuildContext context) {
    final bool ok = outcome.registered || outcome.duplicate;
    return Center(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Icon(
                ok ? Icons.check_circle : Icons.error,
                size: 62,
                color: ok ? Colors.green : Colors.red,
              ),
              const SizedBox(height: 14),
              Text(
                outcome.duplicate
                    ? '${outcome.message} No se creó una segunda asistencia porque el registro institucional ya existía.'
                    : outcome.message,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 12),
              Text('${outcome.date} · ${outcome.serverTime}'),
              Text('Estado: ${outcome.state}'),
              if (outcome.courseName?.isNotEmpty == true)
                Text('${outcome.courseName} · Aula ${outcome.classroom ?? '-'}'),
              const SizedBox(height: 10),
              const Chip(
                avatar: Icon(Icons.qr_code_2, size: 18),
                label: Text('QR dinámico sin biometría'),
              ),
              const SizedBox(height: 18),
              FilledButton.icon(
                onPressed: onViewHistory,
                icon: const Icon(Icons.history),
                label: const Text('Ver en historial'),
              ),
              const SizedBox(height: 10),
              OutlinedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.qr_code_scanner),
                label: const Text('Escanear otro QR'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
