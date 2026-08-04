import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';

import '../controllers/app_controller.dart';
import '../core/app_theme.dart';
import '../models/teacher_portal.dart';
import '../services/teacher_portal_service.dart';

class QrAttendanceStationScreen extends StatefulWidget {
  const QrAttendanceStationScreen({required this.controller, super.key});

  final AppController controller;

  @override
  State<QrAttendanceStationScreen> createState() =>
      _QrAttendanceStationScreenState();
}

class _QrAttendanceStationScreenState
    extends State<QrAttendanceStationScreen> {
  final TeacherPortalService _service = TeacherPortalService();
  Timer? _timer;
  AttendanceQrSession? _session;
  Uint8List? _image;
  bool _loading = false;
  String? _error;
  int _remainingSeconds = 0;

  @override
  void initState() {
    super.initState();
    _generate();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
  }

  @override
  void dispose() {
    _timer?.cancel();
    _service.close();
    super.dispose();
  }

  void _tick() {
    final AttendanceQrSession? session = _session;
    if (!mounted || session == null) {
      return;
    }
    final int remaining = session.expiresAt
        .difference(DateTime.now().toUtc())
        .inSeconds;
    setState(() => _remainingSeconds = remaining < 0 ? 0 : remaining);
    if (remaining <= 5 && !_loading) {
      _generate();
    }
  }

  Future<void> _generate() async {
    final String? token = widget.controller.sessionToken;
    if (token == null || token.isEmpty) {
      setState(() => _error = 'No existe una sesión administradora válida.');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final AttendanceQrSession session = await _service.emitAttendanceQr(
        serverUrl: widget.controller.serverUrl,
        token: token,
      );
      final int comma = session.imageDataUrl.indexOf(',');
      if (comma < 0) {
        throw const FormatException('Imagen QR incompleta.');
      }
      final Uint8List image = base64Decode(
        session.imageDataUrl.substring(comma + 1),
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _session = session;
        _image = image;
        _remainingSeconds = session.expiresAt
            .difference(DateTime.now().toUtc())
            .inSeconds;
      });
    } on TeacherPortalException catch (error) {
      if (mounted) {
        setState(() => _error = error.message);
      }
    } on Object {
      if (mounted) {
        setState(() => _error = 'No se pudo generar el QR dinámico.');
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Estación QR de asistencia'),
        actions: <Widget>[
          IconButton(
            tooltip: 'Renovar QR',
            onPressed: _loading ? null : _generate,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: <Widget>[
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: <Color>[unsaacPrimary, unsaacTop],
                ),
                borderRadius: BorderRadius.circular(22),
              ),
              child: const Row(
                children: <Widget>[
                  Icon(Icons.qr_code_2, color: unsaacOrange, size: 42),
                  SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(
                          'QR presencial y rotativo',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        SizedBox(height: 5),
                        Text(
                          'Válido para varios docentes durante un periodo corto; cada docente solo puede usarlo una vez.',
                          style: TextStyle(color: Color(0xFFDCEAFF), height: 1.3),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(22),
                child: Column(
                  children: <Widget>[
                    if (_loading && _image == null)
                      const Padding(
                        padding: EdgeInsets.all(70),
                        child: CircularProgressIndicator(),
                      )
                    else if (_error != null)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 42),
                        child: Column(
                          children: <Widget>[
                            const Icon(Icons.error_outline, color: Colors.red, size: 50),
                            const SizedBox(height: 12),
                            Text(
                              _error!,
                              textAlign: TextAlign.center,
                              style: const TextStyle(fontWeight: FontWeight.w800),
                            ),
                            const SizedBox(height: 16),
                            FilledButton.icon(
                              onPressed: _generate,
                              icon: const Icon(Icons.refresh),
                              label: const Text('Reintentar'),
                            ),
                          ],
                        ),
                      )
                    else if (_image != null) ...<Widget>[
                      Image.memory(_image!, width: 300, height: 300),
                      const SizedBox(height: 16),
                      Text(
                        'Renovación en $_remainingSeconds s',
                        style: TextStyle(
                          color: _remainingSeconds <= 10
                              ? unsaacOrange
                              : unsaacBlue,
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Mantenga esta pantalla visible en el punto de control.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: unsaacMuted),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            const Card(
              child: Padding(
                padding: EdgeInsets.all(18),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Icon(Icons.security, color: unsaacBlue),
                    SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'El QR no contiene huellas. El servidor valida vigencia, sesión, celular autorizado, horario, duplicidad y deja auditoría del método utilizado.',
                        style: TextStyle(height: 1.4, fontWeight: FontWeight.w700),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
