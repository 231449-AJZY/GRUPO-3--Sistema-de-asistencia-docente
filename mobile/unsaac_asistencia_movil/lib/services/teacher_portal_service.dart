import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/teacher_portal.dart';
import 'trusted_http_client.dart';

class TeacherPortalException implements Exception {
  const TeacherPortalException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class TeacherPortalService {
  TeacherPortalService({http.Client? client})
      : _client = client ?? TrustedHttpClient();

  final http.Client _client;

  Future<TeacherPortalData> loadTeacherPortal({
    required String serverUrl,
    required String token,
  }) async {
    final List<Map<String, dynamic>> responses =
        await Future.wait<Map<String, dynamic>>(<Future<Map<String, dynamic>>>[
      _request(
        serverUrl: serverUrl,
        path: '/api/horarios/me',
        token: token,
      ),
      _request(
        serverUrl: serverUrl,
        path: '/api/asistencia/docente/me',
        token: token,
      ),
      _request(
        serverUrl: serverUrl,
        path: '/api/asistencia-movil/mis-marcaciones',
        token: token,
      ),
    ]);

    final Object? rawSchedules = responses[0]['horarios'];
    final List<TeacherSchedule> schedules = rawSchedules is List<Object?>
        ? rawSchedules
            .whereType<Map<String, dynamic>>()
            .map(TeacherSchedule.fromJson)
            .where((TeacherSchedule item) => item.active)
            .toList()
        : <TeacherSchedule>[];

    final Object? rawEntries = responses[1]['ingresos'];
    final Object? rawCourses = responses[1]['cursos'];
    final Object? rawMobileOperations = responses[2]['marcaciones'];

    final List<TeacherAttendanceItem> canonical = <TeacherAttendanceItem>[
      if (rawEntries is List<Object?>)
        ...rawEntries
            .whereType<Map<String, dynamic>>()
            .map(TeacherAttendanceItem.entry),
      if (rawCourses is List<Object?>)
        ...rawCourses
            .whereType<Map<String, dynamic>>()
            .map(TeacherAttendanceItem.course),
    ];

    final List<TeacherAttendanceItem> mobileOperations =
        rawMobileOperations is List<Object?>
            ? rawMobileOperations
                .whereType<Map<String, dynamic>>()
                .map(TeacherAttendanceItem.mobileOperation)
                .toList()
            : <TeacherAttendanceItem>[];

    final List<TeacherAttendanceItem> history = <TeacherAttendanceItem>[
      ...canonical.where(
        (TeacherAttendanceItem item) =>
            item.verificationMethod != 'BIOMETRIA_MOVIL' &&
            item.verificationMethod != 'QR_DINAMICO',
      ),
      ...mobileOperations,
    ]..sort(
        (TeacherAttendanceItem left, TeacherAttendanceItem right) =>
            right.sortValue.compareTo(left.sortValue),
      );

    schedules.sort((TeacherSchedule left, TeacherSchedule right) {
      final int day = left.dayOfWeek.compareTo(right.dayOfWeek);
      return day != 0 ? day : left.startTime.compareTo(right.startTime);
    });

    return TeacherPortalData(schedules: schedules, history: history);
  }

  Future<AttendanceQrSession> emitAttendanceQr({
    required String serverUrl,
    required String token,
  }) async {
    final Map<String, dynamic> response = await _request(
      serverUrl: serverUrl,
      path: '/api/asistencia-movil/qr/emitir',
      token: token,
      method: 'POST',
      body: const <String, dynamic>{},
    );
    final Object? rawQr = response['qr'];
    if (rawQr is! Map<String, dynamic>) {
      throw const TeacherPortalException(
        'El servidor no devolvió un QR institucional válido.',
      );
    }
    return AttendanceQrSession.fromJson(rawQr);
  }

  Future<QrAttendanceOutcome> markWithQr({
    required String serverUrl,
    required String token,
    required String installationId,
    required String qrPayload,
  }) async {
    final Map<String, dynamic> response = await _request(
      serverUrl: serverUrl,
      path: '/api/asistencia-movil/qr/marcar',
      token: token,
      method: 'POST',
      body: <String, dynamic>{
        'contenido': qrPayload,
        'uuid_instalacion': installationId,
      },
      acceptConflictBody: true,
    );
    return QrAttendanceOutcome.fromJson(response);
  }

  Future<Map<String, dynamic>> _request({
    required String serverUrl,
    required String path,
    required String token,
    String method = 'GET',
    Map<String, dynamic>? body,
    bool acceptConflictBody = false,
  }) async {
    final Uri uri = Uri.parse('${serverUrl.replaceAll(RegExp(r'/+$'), '')}$path');
    final Map<String, String> headers = <String, String>{
      'Accept': 'application/json',
      'Authorization': 'Bearer $token',
      if (body != null) 'Content-Type': 'application/json',
    };

    final http.Response response;
    try {
      response = method == 'POST'
          ? await _client
              .post(uri, headers: headers, body: jsonEncode(body))
              .timeout(const Duration(seconds: 20))
          : await _client
              .get(uri, headers: headers)
              .timeout(const Duration(seconds: 20));
    } on Object {
      throw const TeacherPortalException(
        'No se pudo conectar con el servidor institucional.',
      );
    }

    final Object? decoded = response.body.trim().isEmpty
        ? <String, dynamic>{}
        : jsonDecode(response.body);
    final Map<String, dynamic> json = decoded is Map<String, dynamic>
        ? decoded
        : <String, dynamic>{};

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return json;
    }

    if (acceptConflictBody && response.statusCode == 409 && json['duplicada'] == true) {
      return json;
    }

    throw TeacherPortalException(
      (json['error'] ?? json['mensaje'] ?? 'La operación no pudo completarse.')
          .toString(),
      statusCode: response.statusCode,
    );
  }

  void close() => _client.close();
}
