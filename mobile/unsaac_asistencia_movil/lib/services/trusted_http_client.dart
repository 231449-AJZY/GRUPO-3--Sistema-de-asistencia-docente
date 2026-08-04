import 'dart:io';

import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:http/io_client.dart';

class TrustedHttpClient extends http.BaseClient {
  TrustedHttpClient();

  static const String certificateAsset =
      'assets/certificates/unsaac_local_root_ca.pem';

  Future<http.Client>? _delegateFuture;
  http.Client? _delegate;
  bool _closed = false;

  Future<http.Client> _resolveDelegate() {
    if (_closed) {
      return Future<http.Client>.error(
        StateError('El cliente HTTP ya fue cerrado.'),
      );
    }

    return _delegateFuture ??= _createDelegate();
  }

  Future<http.Client> _createDelegate() async {
    final ByteData certificateData = await rootBundle.load(certificateAsset);

    final Uint8List certificateBytes = certificateData.buffer.asUint8List(
      certificateData.offsetInBytes,
      certificateData.lengthInBytes,
    );

    final SecurityContext context = SecurityContext(withTrustedRoots: true);

    context.setTrustedCertificatesBytes(certificateBytes);

    final HttpClient dartClient = HttpClient(context: context)
      ..connectionTimeout = const Duration(seconds: 12)
      ..idleTimeout = const Duration(seconds: 15)
      ..maxConnectionsPerHost = 8
      ..userAgent = 'UNSAAC-Asistencia-Movil/0.9.4';

    final http.Client delegate = IOClient(dartClient);

    if (_closed) {
      delegate.close();
      throw StateError('El cliente HTTP fue cerrado durante su preparación.');
    }

    _delegate = delegate;
    return delegate;
  }

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    final http.Client delegate = await _resolveDelegate();
    return delegate.send(request);
  }

  @override
  void close() {
    if (_closed) {
      return;
    }

    _closed = true;
    _delegate?.close();
    super.close();
  }
}
