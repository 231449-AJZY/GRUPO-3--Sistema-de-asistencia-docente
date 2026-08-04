import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/admin_mobile_device.dart';
import 'trusted_http_client.dart';

class MobileDeviceAdminException implements Exception {
  const MobileDeviceAdminException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class MobileDeviceAdminService {
  MobileDeviceAdminService({http.Client? client})
      : _client = client ?? TrustedHttpClient();

  final http.Client _client;

  Future<AdminDevicePortalData> loadDevices({
    required String serverUrl,
    required String token,
  }) async {
    final Map<String, dynamic> response = await _request(
      serverUrl: serverUrl,
      path: '/api/dispositivos',
      token: token,
    );

    final Object? rawDevices = response['dispositivos'];
    final List<AdminMobileDevice> devices = rawDevices is List<Object?>
        ? rawDevices
            .whereType<Map<String, dynamic>>()
            .map(AdminMobileDevice.fromJson)
            .where((AdminMobileDevice item) => item.id > 0)
            .toList()
        : <AdminMobileDevice>[];

    final Object? rawSummary = response['resumen'];
    final AdminDeviceSummary summary = rawSummary is Map<String, dynamic>
        ? AdminDeviceSummary.fromJson(rawSummary)
        : AdminDeviceSummary.empty();

    return AdminDevicePortalData(devices: devices, summary: summary);
  }

  Future<AdminMobileDevice> approveDevice({
    required String serverUrl,
    required String token,
    required int deviceId,
  }) async {
    final Map<String, dynamic> response = await _request(
      serverUrl: serverUrl,
      path: '/api/dispositivos/$deviceId/aprobar',
      token: token,
      method: 'PATCH',
      body: const <String, dynamic>{},
    );

    final Object? rawDevice = response['dispositivo'];
    if (rawDevice is! Map<String, dynamic>) {
      throw const MobileDeviceAdminException(
        'El servidor no devolvió el dispositivo autorizado.',
      );
    }

    return AdminMobileDevice.fromJson(rawDevice);
  }

  Future<Map<String, dynamic>> _request({
    required String serverUrl,
    required String path,
    required String token,
    String method = 'GET',
    Map<String, dynamic>? body,
  }) async {
    final Uri uri = Uri.parse('${serverUrl.replaceAll(RegExp(r'/+$'), '')}$path');
    final Map<String, String> headers = <String, String>{
      'Accept': 'application/json',
      'Authorization': 'Bearer $token',
      if (body != null) 'Content-Type': 'application/json',
    };

    final http.Response response;
    try {
      response = switch (method) {
        'PATCH' => await _client
            .patch(uri, headers: headers, body: jsonEncode(body))
            .timeout(const Duration(seconds: 20)),
        _ => await _client
            .get(uri, headers: headers)
            .timeout(const Duration(seconds: 20)),
      };
    } on Object {
      throw const MobileDeviceAdminException(
        'No se pudo conectar con el servidor institucional.',
      );
    }

    Object? decoded;
    try {
      decoded = response.body.trim().isEmpty
          ? <String, dynamic>{}
          : jsonDecode(response.body);
    } on FormatException {
      decoded = <String, dynamic>{};
    }

    final Map<String, dynamic> json = decoded is Map<String, dynamic>
        ? decoded
        : <String, dynamic>{};

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return json;
    }

    throw MobileDeviceAdminException(
      (json['error'] ?? json['mensaje'] ?? 'La operación no pudo completarse.')
          .toString(),
      statusCode: response.statusCode,
    );
  }

  void close() => _client.close();
}
