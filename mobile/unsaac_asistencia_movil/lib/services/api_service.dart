import 'dart:convert';

import 'package:http/http.dart' as http;
import 'trusted_http_client.dart';
import '../core/server_url.dart';
import '../models/ble_station.dart';
import '../models/device_status.dart';
import '../models/mobile_attendance.dart';
import '../models/mobile_device.dart';
import '../models/offline_attendance.dart';
import '../models/user_session.dart';

class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class LoginResult {
  const LoginResult({required this.token, required this.user});

  final String token;
  final UserSession user;
}

class ApiService {
  ApiService({http.Client? client}) : _client = client ?? TrustedHttpClient();

  final http.Client _client;

  Future<LoginResult> login({
    required String serverUrl,
    required String username,
    required String password,
  }) async {
    final Map<String, dynamic> body = await _request(
      serverUrl: serverUrl,
      method: 'POST',
      path: '/api/auth/login',
      payload: <String, dynamic>{
        'username': username.trim(),
        'password': password,
      },
      timeout: const Duration(seconds: 12),
      connectionError:
          'No fue posible conectar con el servidor. Verifique la IP, el Wi-Fi y el backend.',
    );

    final Object? rawUser = body['user'];
    if (body['token'] is! String || rawUser is! Map<String, dynamic>) {
      throw const ApiException(
        'El servidor devolvió una respuesta incompleta.',
      );
    }

    return LoginResult(
      token: body['token'] as String,
      user: UserSession.fromJson(rawUser),
    );
  }

  Future<UserSession> me({
    required String serverUrl,
    required String token,
  }) async {
    final Map<String, dynamic> body = await _request(
      serverUrl: serverUrl,
      method: 'GET',
      path: '/api/auth/me',
      token: token,
      connectionError: 'No se pudo validar la sesión con el servidor.',
    );

    final Object? rawUser = body['user'] ?? body;
    if (rawUser is! Map<String, dynamic>) {
      throw const ApiException('No se pudo leer la identidad del usuario.');
    }

    return UserSession.fromJson(rawUser);
  }

  Future<bool> health(String serverUrl) async {
    final Uri uri = Uri.parse('${normalizeServerUrl(serverUrl)}/api/health');
    try {
      final http.Response response = await _client
          .get(
            uri,
            headers: const <String, String>{'Accept': 'application/json'},
          )
          .timeout(const Duration(seconds: 6));
      return response.statusCode >= 200 && response.statusCode < 300;
    } on Object {
      return false;
    }
  }

  Future<LinkedMobileDevice?> myMobileDevice({
    required String serverUrl,
    required String token,
    required String installationId,
  }) async {
    final String query = Uri.encodeQueryComponent(installationId);
    final Map<String, dynamic> body = await _request(
      serverUrl: serverUrl,
      method: 'GET',
      path: '/api/dispositivos/mio?installationId=$query',
      token: token,
      connectionError: 'No se pudo consultar el estado de este celular.',
    );

    final Object? raw = body['dispositivo'];
    if (raw == null) {
      return null;
    }
    if (raw is! Map<String, dynamic>) {
      throw const ApiException(
        'El servidor devolvió un dispositivo incompleto.',
      );
    }

    return LinkedMobileDevice.fromJson(raw);
  }

  Future<LinkedMobileDevice> requestDeviceLink({
    required String serverUrl,
    required String token,
    required DeviceLinkQrPayload qr,
    required DeviceIdentity identity,
    required DeviceStatus device,
    required List<String> biometricTypes,
  }) async {
    final Map<String, dynamic> body = await _request(
      serverUrl: serverUrl,
      method: 'POST',
      path: '/api/dispositivos/sincronizacion/completar',
      token: token,
      payload: <String, dynamic>{
        'token': qr.token,
        'installationId': identity.installationId,
        'publicKey': identity.publicKey,
        'keyFingerprint': identity.keyFingerprint,
        'manufacturer': device.manufacturer,
        'model': device.model,
        'platform': 'ANDROID',
        'systemVersion': device.androidVersion,
        'sdkInt': device.sdkInt,
        'appVersion': '0.10.0+24',
        'biometricAvailable': biometricTypes.isNotEmpty,
        'biometricTypes': biometricTypes,
      },
      timeout: const Duration(seconds: 18),
      connectionError:
          'No se pudo enviar la solicitud de vinculación al servidor.',
    );

    final Object? raw = body['dispositivo'];
    if (raw is! Map<String, dynamic>) {
      throw const ApiException(
        'El servidor no devolvió el dispositivo registrado.',
      );
    }

    return LinkedMobileDevice.fromJson(raw);
  }

  Future<void> registerAttendanceKey({
    required String serverUrl,
    required String token,
    required DeviceIdentity identity,
  }) async {
    await _request(
      serverUrl: serverUrl,
      method: 'POST',
      path: '/api/asistencia-movil/clave',
      token: token,
      payload: <String, dynamic>{
        'installationId': identity.installationId,
        'publicKey': identity.publicKey,
        'keyFingerprint': identity.keyFingerprint,
      },
      timeout: const Duration(seconds: 15),
      connectionError:
          'No se pudo preparar la firma biométrica con el servidor.',
    );
  }

  Future<BleStationProfile> provisionBleStation({
    required String serverUrl,
    required String token,
    required BleStationProvisionQr qr,
    required String installationId,
  }) async {
    final Map<String, dynamic> body = await _request(
      serverUrl: serverUrl,
      method: 'POST',
      path: '/api/estaciones-ble/provisionar',
      token: token,
      payload: <String, dynamic>{
        'requestId': qr.requestId,
        'token': qr.token,
        'installationId': installationId,
      },
      timeout: const Duration(seconds: 15),
      connectionError:
          'No se pudo provisionar la estación Bluetooth con el servidor.',
    );

    final Object? raw = body['estacion'];
    if (raw is! Map<String, dynamic>) {
      throw const ApiException(
        'El servidor no devolvió una estación Bluetooth válida.',
      );
    }

    final BleStationProfile profile = BleStationProfile.fromApi(raw);
    if (!profile.isValid) {
      throw const ApiException(
        'La credencial de la estación Bluetooth está incompleta.',
      );
    }

    return profile;
  }

  Future<MobileAttendanceChallenge> createAttendanceChallenge({
    required String serverUrl,
    required String code,
    required String installationId,
    required List<BlePresenceProof> bleProofs,
  }) async {
    final Map<String, dynamic> body = await _request(
      serverUrl: serverUrl,
      method: 'POST',
      path: '/api/asistencia-movil/desafios',
      payload: <String, dynamic>{
        'code': code.trim().toUpperCase(),
        'installationId': installationId,
        'bleProofs': bleProofs
            .map((BlePresenceProof proof) => proof.toJson())
            .toList(),
      },
      timeout: const Duration(seconds: 12),
      connectionError:
          'No se pudo solicitar el desafío de asistencia al servidor.',
    );

    final Object? raw = body['desafio'];
    if (raw is! Map<String, dynamic>) {
      throw const ApiException(
        'El servidor no devolvió un desafío de asistencia válido.',
      );
    }

    return MobileAttendanceChallenge.fromJson(raw);
  }

  Future<MobileAttendanceResult> submitAttendance({
    required String serverUrl,
    required String challengeId,
    required String installationId,
    required String signature,
  }) async {
    final Map<String, dynamic> body = await _request(
      serverUrl: serverUrl,
      method: 'POST',
      path: '/api/asistencia-movil/marcar',
      payload: <String, dynamic>{
        'challengeId': challengeId,
        'installationId': installationId,
        'signature': signature,
      },
      timeout: const Duration(seconds: 15),
      connectionError: 'No se pudo enviar la asistencia firmada al servidor.',
      acceptedStatusCodes: const <int>{409},
    );

    if (body['duplicada'] != true && body['registrada'] != true) {
      throw ApiException(
        (body['error'] ?? 'La asistencia no pudo registrarse.').toString(),
        statusCode: 409,
      );
    }

    return MobileAttendanceResult.fromJson(body);
  }

  Future<OfflineCredential> prepareOfflineCredential({
    required String serverUrl,
    required String token,
    required String installationId,
    required TrustedClock clock,
  }) async {
    final Map<String, dynamic> body = await _request(
      serverUrl: serverUrl,
      method: 'POST',
      path: '/api/asistencia-offline/preparar',
      token: token,
      payload: <String, dynamic>{
        'installationId': installationId,
        'elapsedRealtimeMs': clock.elapsedRealtimeMs,
        'wallClockMs': clock.wallClockMs,
        'bootCount': clock.bootCount,
      },
      timeout: const Duration(seconds: 18),
      connectionError:
          'No se pudo descargar la credencial y los horarios offline.',
    );

    final Object? raw = body['credencial'];
    if (raw is! Map<String, dynamic>) {
      throw const ApiException(
        'El servidor no devolvió una credencial offline válida.',
      );
    }

    final OfflineCredential credential = OfflineCredential.fromApi(raw);
    if (credential.id.length != 36 ||
        credential.installationId.isEmpty ||
        credential.teacher.code.isEmpty ||
        credential.schedules.isEmpty) {
      throw const ApiException('La credencial offline está incompleta.');
    }

    return credential;
  }

  Future<OfflineSyncResponse> syncOfflineQueue({
    required String serverUrl,
    required String installationId,
    required String credentialId,
    required String batchId,
    required List<OfflineQueueItem> records,
  }) async {
    final Map<String, dynamic> body = await _request(
      serverUrl: serverUrl,
      method: 'POST',
      path: '/api/asistencia-offline/sincronizar',
      payload: <String, dynamic>{
        'installationId': installationId,
        'credentialId': credentialId,
        'batchId': batchId,
        'records': records
            .map((OfflineQueueItem item) => item.toSyncJson())
            .toList(),
      },
      timeout: const Duration(seconds: 30),
      connectionError:
          'No se pudo sincronizar la cola offline con el servidor.',
    );

    return OfflineSyncResponse.fromJson(body);
  }

  Future<QuickDeviceValidation> validateQuickDevice({
    required String serverUrl,
    required String code,
    required String installationId,
  }) async {
    final Map<String, dynamic> body = await _request(
      serverUrl: serverUrl,
      method: 'POST',
      path: '/api/dispositivos/validar-vinculo-rapido',
      payload: <String, dynamic>{
        'code': code.trim().toUpperCase(),
        'installationId': installationId,
      },
      timeout: const Duration(seconds: 10),
      connectionError:
          'No se pudo validar este celular con el servidor institucional.',
    );

    if (body['vinculado'] != true) {
      throw const ApiException(
        'Este celular no tiene una vinculación autorizada.',
      );
    }

    return QuickDeviceValidation.fromJson(body);
  }

  Future<Map<String, dynamic>> _request({
    required String serverUrl,
    required String method,
    required String path,
    String? token,
    Map<String, dynamic>? payload,
    Duration timeout = const Duration(seconds: 12),
    String connectionError = 'No fue posible conectar con el servidor.',
    Set<int> acceptedStatusCodes = const <int>{},
  }) async {
    final Uri uri = Uri.parse('${normalizeServerUrl(serverUrl)}$path');
    final Map<String, String> headers = <String, String>{
      'Content-Type': 'application/json; charset=utf-8',
      'Accept': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };

    final http.Response response;
    try {
      if (method == 'GET') {
        response = await _client.get(uri, headers: headers).timeout(timeout);
      } else if (method == 'POST') {
        response = await _client
            .post(
              uri,
              headers: headers,
              body: jsonEncode(payload ?? <String, dynamic>{}),
            )
            .timeout(timeout);
      } else {
        throw ApiException('Método HTTP no admitido: $method');
      }
    } on ApiException {
      rethrow;
    } on Object {
      throw ApiException(connectionError);
    }

    final Map<String, dynamic> body = _decodeBody(response);

    if ((response.statusCode < 200 || response.statusCode >= 300) &&
        !acceptedStatusCodes.contains(response.statusCode)) {
      throw ApiException(
        (body['error'] ??
                body['message'] ??
                'La operación no pudo completarse.')
            .toString(),
        statusCode: response.statusCode,
      );
    }

    return body;
  }

  Map<String, dynamic> _decodeBody(http.Response response) {
    if (response.body.trim().isEmpty) {
      return <String, dynamic>{};
    }

    try {
      final Object? decoded = jsonDecode(utf8.decode(response.bodyBytes));
      if (decoded is Map<String, dynamic>) {
        return decoded;
      }
      return <String, dynamic>{'data': decoded};
    } on Object {
      return <String, dynamic>{'message': response.body};
    }
  }
}
