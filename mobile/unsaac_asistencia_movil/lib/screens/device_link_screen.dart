import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../controllers/app_controller.dart';
import '../core/app_theme.dart';

class DeviceLinkScreen extends StatefulWidget {
  const DeviceLinkScreen({required this.controller, super.key});

  final AppController controller;

  @override
  State<DeviceLinkScreen> createState() => _DeviceLinkScreenState();
}

class _DeviceLinkScreenState extends State<DeviceLinkScreen> {
  final MobileScannerController _scannerController = MobileScannerController(
    formats: <BarcodeFormat>[BarcodeFormat.qrCode],
  );

  bool _processing = false;
  bool _scannerEnabled = true;
  String? _localError;

  @override
  void dispose() {
    _scannerController.dispose();
    super.dispose();
  }

  Future<void> _process(String value) async {
    if (_processing || value.trim().isEmpty) {
      return;
    }

    setState(() {
      _processing = true;
      _scannerEnabled = false;
      _localError = null;
    });

    widget.controller.clearError();
    await _scannerController.stop();

    final bool success = await widget.controller.linkDeviceFromQr(value);

    if (!mounted) {
      return;
    }

    if (success) {
      await showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (BuildContext context) => AlertDialog(
          icon: const Icon(
            Icons.verified_user,
            color: Color(0xFF047857),
            size: 46,
          ),
          title: const Text('Celular sincronizado'),
          content: Text(
            widget.controller.lastLinkMessage ??
                'La página autorizó correctamente este celular.',
          ),
          actions: <Widget>[
            FilledButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Continuar'),
            ),
          ],
        ),
      );

      if (mounted) {
        Navigator.of(context).pop(true);
      }
      return;
    }

    setState(() {
      _processing = false;
      _scannerEnabled = true;
      _localError =
          widget.controller.errorMessage ??
          'No se pudo sincronizar el celular con la página.';
    });
    await _scannerController.start();
  }

  void _onDetect(BarcodeCapture capture) {
    if (!_scannerEnabled || _processing) {
      return;
    }

    for (final Barcode barcode in capture.barcodes) {
      final String? rawValue = barcode.rawValue;
      if (rawValue != null && rawValue.isNotEmpty) {
        _process(rawValue);
        return;
      }
    }
  }

  Future<void> _retry() async {
    widget.controller.clearError();
    setState(() {
      _localError = null;
      _processing = false;
      _scannerEnabled = true;
    });
    await _scannerController.start();
  }

  @override
  Widget build(BuildContext context) {
    final bool authorized =
        widget.controller.linkedDevice?.isAuthorized == true;

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Sincronizar con la página',
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(18, 18, 18, 32),
          children: <Widget>[
            Container(
              padding: const EdgeInsets.all(18),
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
                      Icon(Icons.sync_alt, color: unsaacOrange, size: 30),
                      SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Sincronización y autorización por QR',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 19,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Abra la página administrativa, ingrese a Biometría → Móviles y genere el QR para este docente. Al escanearlo, el celular quedará autorizado automáticamente.',
                    style: TextStyle(
                      color: Color(0xFFDCEAFF),
                      height: 1.45,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 7,
                    ),
                    decoration: BoxDecoration(
                      color: authorized
                          ? const Color(0xFFDCFCE7)
                          : const Color(0xFFFFF0D8),
                      borderRadius: BorderRadius.circular(30),
                    ),
                    child: Text(
                      authorized
                          ? 'Estado actual: AUTORIZADO'
                          : 'Estado actual: SIN AUTORIZAR',
                      style: TextStyle(
                        color: authorized
                            ? const Color(0xFF166534)
                            : const Color(0xFF9A4D00),
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            const Card(
              child: Padding(
                padding: EdgeInsets.all(17),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      'Pasos en la página',
                      style: TextStyle(fontWeight: FontWeight.w900),
                    ),
                    SizedBox(height: 10),
                    Text('1. Abra Administración → Biometría → Móviles.'),
                    Text('2. Busque al docente y pulse “Generar QR”.'),
                    Text('3. Mantenga el QR visible y escanéelo aquí.'),
                    Text('4. La autorización se completa en un solo paso.'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            ClipRRect(
              borderRadius: BorderRadius.circular(24),
              child: SizedBox(
                height: 360,
                child: Stack(
                  fit: StackFit.expand,
                  children: <Widget>[
                    MobileScanner(
                      controller: _scannerController,
                      onDetect: _onDetect,
                    ),
                    IgnorePointer(
                      child: Container(
                        margin: const EdgeInsets.all(54),
                        decoration: BoxDecoration(
                          border: Border.all(
                            color: unsaacOrange,
                            width: 4,
                          ),
                          borderRadius: BorderRadius.circular(24),
                        ),
                      ),
                    ),
                    if (_processing)
                      const ColoredBox(
                        color: Color(0xAA061B34),
                        child: Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: <Widget>[
                              CircularProgressIndicator(color: Colors.white),
                              SizedBox(height: 14),
                              Text(
                                'Sincronizando y autorizando…',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            if (_localError != null) ...<Widget>[
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(15),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFFCA5A5)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    Text(
                      _localError!,
                      style: const TextStyle(
                        color: Color(0xFFB91C1C),
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 10),
                    OutlinedButton.icon(
                      onPressed: _retry,
                      icon: const Icon(Icons.refresh),
                      label: const Text('Volver a escanear'),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 14),
            const Text(
              'El QR es temporal, de un solo uso y está asociado a la cuenta docente seleccionada en la página. No se permite pegar códigos manualmente.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: unsaacMuted,
                fontSize: 12,
                height: 1.4,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
