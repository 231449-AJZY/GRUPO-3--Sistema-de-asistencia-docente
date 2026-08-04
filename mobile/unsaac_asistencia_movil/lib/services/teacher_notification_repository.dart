import 'dart:convert';


import 'package:http/http.dart' as http;


import '../core/server_url.dart';
import '../models/teacher_notification.dart';
import 'secure_storage_service.dart';


class TeacherNotificationRepository {
  TeacherNotificationRepository({
    http.Client? client,
    SecureStorageService? storage,
  }) : _client = client ?? http.Client(),
       _storage = storage ?? SecureStorageService();


  static const String tokenKey = 'auth_token';


  final http.Client _client;
  final SecureStorageService _storage;


  String _cacheKey(int teacherId) => 'teacher_notifications_v1_$teacherId';


  Future<String?> readToken() => _storage.read(tokenKey);


  Future<List<TeacherNotification>> readLocal(int teacherId) async {
    final String? raw = await _storage.read(_cacheKey(teacherId));
    if (raw == null || raw.trim().isEmpty) {
      return <TeacherNotification>[];
    }


    try {
      final Object? decoded = jsonDecode(raw);
      if (decoded is! List<Object?>) return <TeacherNotification>[];
      return decoded
          .whereType<Map<String, dynamic>>()
          .map(TeacherNotification.fromJson)
          .where((TeacherNotification item) => item.id != 0)
          .toList();
    } on Object {
      return <TeacherNotification>[];
    }
  }


  Future<void> writeLocal(
    int teacherId,
    List<TeacherNotification> items,
  ) async {
    final List<TeacherNotification> ordered = List<TeacherNotification>.from(
      items,
    )..sort(
        (TeacherNotification a, TeacherNotification b) =>
            b.visibleAt.compareTo(a.visibleAt),
      );


    await _storage.write(
      _cacheKey(teacherId),
      jsonEncode(
        ordered.take(220).map((TeacherNotification item) => item.toJson()).toList(),
      ),
    );
  }


  Future<TeacherNotificationBundle> synchronize({
    required String serverUrl,
    required String token,
  }) async {
    final Uri uri = Uri.parse(
      '${normalizeServerUrl(serverUrl)}/api/notificaciones-movil/sincronizar',
    );


    final http.Response response;
    try {
      response = await _client
          .post(
            uri,
            headers: <String, String>{
              'Accept': 'application/json',
              'Content-Type': 'application/json; charset=utf-8',
              'Authorization': 'Bearer $token',
            },
            body: '{}',
          )
          .timeout(const Duration(seconds: 16));
    } on Object {
      throw const TeacherNotificationException(
        'No se pudo conectar con el centro de notificaciones.',
      );
    }


    final Map<String, dynamic> body = _decode(response);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw TeacherNotificationException(
        (body['error'] ?? 'No se pudieron sincronizar las notificaciones.')
            .toString(),
        statusCode: response.statusCode,
      );
    }


    return TeacherNotificationBundle.fromJson(body);
  }


  Future<DateTime> markRead({
    required String serverUrl,
    required String token,
    required int notificationId,
  }) async {
    final Map<String, dynamic> body = await _post(
      serverUrl: serverUrl,
      token: token,
      path: '/api/notificaciones-movil/$notificationId/leer',
    );


    return DateTime.tryParse(body['readAt']?.toString() ?? '')?.toLocal() ??
        DateTime.now();
  }


  Future<DateTime> markAllRead({
    required String serverUrl,
    required String token,
  }) async {
    final Map<String, dynamic> body = await _post(
      serverUrl: serverUrl,
      token: token,
      path: '/api/notificaciones-movil/leer-todas',
    );


    return DateTime.tryParse(body['readAt']?.toString() ?? '')?.toLocal() ??
        DateTime.now();
  }


  Future<Map<String, dynamic>> _post({
    required String serverUrl,
    required String token,
    required String path,
  }) async {
    final Uri uri = Uri.parse('${normalizeServerUrl(serverUrl)}$path');
    final http.Response response;


    try {
      response = await _client
          .post(
            uri,
            headers: <String, String>{
              'Accept': 'application/json',
              'Content-Type': 'application/json; charset=utf-8',
              'Authorization': 'Bearer $token',
            },
            body: '{}',
          )
          .timeout(const Duration(seconds: 12));
    } on Object {
      throw const TeacherNotificationException(
        'No se pudo actualizar la notificación en el servidor.',
      );
    }


    final Map<String, dynamic> body = _decode(response);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw TeacherNotificationException(
        (body['error'] ?? 'No se pudo actualizar la notificación.').toString(),
        statusCode: response.statusCode,
      );
    }
    return body;
  }


  Map<String, dynamic> _decode(http.Response response) {
    if (response.body.trim().isEmpty) return <String, dynamic>{};
    try {
      final Object? decoded = jsonDecode(utf8.decode(response.bodyBytes));
      return decoded is Map<String, dynamic>
          ? decoded
          : <String, dynamic>{};
    } on Object {
      return <String, dynamic>{'error': response.body};
    }
  }
}


class TeacherNotificationException implements Exception {
  const TeacherNotificationException(this.message, {this.statusCode});


  final String message;
  final int? statusCode;


  @override
  String toString() => message;
}