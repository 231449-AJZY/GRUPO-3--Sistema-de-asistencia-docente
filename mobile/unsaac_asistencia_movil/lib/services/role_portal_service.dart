import 'dart:convert';

import 'package:http/http.dart' as http;

import '../core/server_url.dart';
import '../models/role_portal.dart';
import 'trusted_http_client.dart';

class RolePortalException implements Exception {
  const RolePortalException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class RolePortalService {
  RolePortalService({http.Client? client})
    : _client = client ?? TrustedHttpClient();

  final http.Client _client;

  Future<AdminDashboardData> loadAdminDashboard({
    required String serverUrl,
    required String token,
  }) async {
    final Map<String, dynamic> json = await _request(
      serverUrl: serverUrl,
      path: '/api/dashboard/admin',
      token: token,
    );
    return AdminDashboardData.fromJson(json);
  }

  Future<SupervisorDashboardData> loadSupervisorDashboard({
    required String serverUrl,
    required String token,
  }) async {
    final Map<String, dynamic> json = await _request(
      serverUrl: serverUrl,
      path: '/api/dashboard/supervisor',
      token: token,
    );
    return SupervisorDashboardData.fromJson(json);
  }

  Future<TeacherDashboardData> loadTeacherDashboard({
    required String serverUrl,
    required String token,
  }) async {
    final Map<String, dynamic> json = await _request(
      serverUrl: serverUrl,
      path: '/api/dashboard/docente',
      token: token,
    );
    return TeacherDashboardData.fromJson(json);
  }

  Future<AlertBundle> loadAlerts({
    required String serverUrl,
    required String token,
    String? status,
    String? priority,
    String? query,
    int limit = 100,
  }) async {
    final Map<String, String> parameters = <String, String>{'limit': '$limit'};

    if (status != null && status.isNotEmpty && status != 'TODAS') {
      parameters['estado'] = status;
    }
    if (priority != null && priority.isNotEmpty && priority != 'TODAS') {
      parameters['prioridad'] = priority;
    }
    if (query != null && query.trim().isNotEmpty) {
      parameters['q'] = query.trim();
    }

    final String queryString = Uri(queryParameters: parameters).query;
    final Map<String, dynamic> json = await _request(
      serverUrl: serverUrl,
      path: '/api/alertas?$queryString',
      token: token,
    );
    return AlertBundle.fromJson(json);
  }

  Future<void> generateAlerts({
    required String serverUrl,
    required String token,
  }) async {
    await _request(
      serverUrl: serverUrl,
      path: '/api/alertas/generar',
      token: token,
      method: 'POST',
      payload: const <String, dynamic>{},
    );
  }

  Future<void> updateAlertStatus({
    required String serverUrl,
    required String token,
    required int alertId,
    required String status,
    String comment = '',
  }) async {
    await _request(
      serverUrl: serverUrl,
      path: '/api/alertas/$alertId/estado',
      token: token,
      method: 'PATCH',
      payload: <String, dynamic>{
        'estado': status,
        'comentario': comment.trim(),
      },
    );
  }

  Future<Map<String, dynamic>> _request({
    required String serverUrl,
    required String path,
    required String token,
    String method = 'GET',
    Map<String, dynamic>? payload,
  }) async {
    final Uri uri = Uri.parse('${normalizeServerUrl(serverUrl)}$path');
    final Map<String, String> headers = <String, String>{
      'Accept': 'application/json',
      'Authorization': 'Bearer $token',
    };

    if (payload != null) {
      headers['Content-Type'] = 'application/json; charset=utf-8';
    }

    http.Response response;
    try {
      response = switch (method) {
        'POST' =>
          await _client
              .post(
                uri,
                headers: headers,
                body: jsonEncode(payload ?? const {}),
              )
              .timeout(const Duration(seconds: 20)),
        'PATCH' =>
          await _client
              .patch(
                uri,
                headers: headers,
                body: jsonEncode(payload ?? const {}),
              )
              .timeout(const Duration(seconds: 20)),
        _ =>
          await _client
              .get(uri, headers: headers)
              .timeout(const Duration(seconds: 20)),
      };
    } on Object {
      throw const RolePortalException(
        'No fue posible comunicarse con el servidor institucional.',
      );
    }

    Map<String, dynamic> body = <String, dynamic>{};
    if (response.body.trim().isNotEmpty) {
      try {
        final Object? decoded = jsonDecode(response.body);
        if (decoded is Map<String, dynamic>) {
          body = decoded;
        } else if (decoded is Map) {
          body = decoded.map(
            (Object? key, Object? value) => MapEntry(key.toString(), value),
          );
        }
      } on FormatException {
        throw RolePortalException(
          'El servidor devolvió una respuesta no válida.',
          statusCode: response.statusCode,
        );
      }
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final String message =
          (body['error'] ??
                  body['message'] ??
                  'La operación no pudo completarse.')
              .toString();
      throw RolePortalException(message, statusCode: response.statusCode);
    }

    return body;
  }

  void close() {
    _client.close();
  }
}
