class MobileAttendanceChallenge {
  const MobileAttendanceChallenge({
    required this.id,
    required this.content,
    required this.expiresAt,
    required this.target,
    required this.teacherCode,
    required this.teacherName,
    this.courseCode,
    this.courseName,
    this.classroom,
    this.bleRequired = false,
    this.bleValidated = false,
    this.stationCode,
    this.stationName,
    this.stationRssi,
    this.stationSamples,
  });

  final String id;
  final String content;
  final DateTime expiresAt;
  final String target;
  final String teacherCode;
  final String teacherName;
  final String? courseCode;
  final String? courseName;
  final String? classroom;
  final bool bleRequired;
  final bool bleValidated;
  final String? stationCode;
  final String? stationName;
  final double? stationRssi;
  final int? stationSamples;

  factory MobileAttendanceChallenge.fromJson(Map<String, dynamic> json) {
    final Object? rawTeacher = json['docente'];
    final Object? rawCourse = json['curso'];
    final Object? rawPresence = json['presencia_ble'];
    final Map<String, dynamic> teacher = rawTeacher is Map<String, dynamic>
        ? rawTeacher
        : <String, dynamic>{};
    final Map<String, dynamic> course = rawCourse is Map<String, dynamic>
        ? rawCourse
        : <String, dynamic>{};
    final Map<String, dynamic> presence = rawPresence is Map<String, dynamic>
        ? rawPresence
        : <String, dynamic>{};
    final Object? rawStation = presence['estacion'];
    final Map<String, dynamic> station = rawStation is Map<String, dynamic>
        ? rawStation
        : <String, dynamic>{};

    final String names = (teacher['nombres'] ?? '').toString().trim();
    final String surnames = (teacher['apellidos'] ?? '').toString().trim();

    return MobileAttendanceChallenge(
      id: (json['id'] ?? '').toString(),
      content: (json['contenido'] ?? '').toString(),
      expiresAt: DateTime.parse((json['expira_en'] ?? '').toString()),
      target: (json['objetivo'] ?? '').toString(),
      teacherCode: (teacher['codigo'] ?? '').toString(),
      teacherName: '$names $surnames'.trim(),
      courseCode: course['codigo']?.toString(),
      courseName: course['nombre']?.toString(),
      classroom: course['aula']?.toString(),
      bleRequired: presence['requerida'] == true,
      bleValidated: presence['validada'] == true,
      stationCode: station['codigo']?.toString(),
      stationName: station['nombre']?.toString(),
      stationRssi: double.tryParse(
        (presence['rssi_promedio'] ?? '').toString(),
      ),
      stationSamples: int.tryParse((presence['muestras'] ?? '').toString()),
    );
  }
}

class AttendanceSignatureResult {
  const AttendanceSignatureResult({
    required this.signature,
    required this.keyFingerprint,
    required this.algorithm,
  });

  final String signature;
  final String keyFingerprint;
  final String algorithm;

  factory AttendanceSignatureResult.fromPlatform(Map<Object?, Object?> value) {
    return AttendanceSignatureResult(
      signature: (value['signature'] ?? '').toString(),
      keyFingerprint: (value['keyFingerprint'] ?? '').toString(),
      algorithm: (value['algorithm'] ?? '').toString(),
    );
  }
}

class MobileAttendanceResult {
  const MobileAttendanceResult({
    required this.registered,
    required this.duplicate,
    required this.signatureVerified,
    required this.target,
    required this.state,
    required this.date,
    required this.serverTime,
    required this.teacherCode,
    required this.teacherName,
    required this.message,
    this.courseCode,
    this.courseName,
    this.classroom,
    this.institutionalEntryCreated = false,
    this.courseAttendanceCreated = false,
  });

  final bool registered;
  final bool duplicate;
  final bool signatureVerified;
  final String target;
  final String state;
  final String date;
  final String serverTime;
  final String teacherCode;
  final String teacherName;
  final String message;
  final String? courseCode;
  final String? courseName;
  final String? classroom;
  final bool institutionalEntryCreated;
  final bool courseAttendanceCreated;

  factory MobileAttendanceResult.fromJson(Map<String, dynamic> json) {
    final Object? rawTeacher = json['docente'];
    final Object? rawCourse = json['curso'];
    final Object? rawEntry = json['ingreso_institucional'];
    final Object? rawAttendance = json['asistencia_curso'];

    final Map<String, dynamic> teacher = rawTeacher is Map<String, dynamic>
        ? rawTeacher
        : <String, dynamic>{};
    final Map<String, dynamic> course = rawCourse is Map<String, dynamic>
        ? rawCourse
        : <String, dynamic>{};
    final Map<String, dynamic> entry = rawEntry is Map<String, dynamic>
        ? rawEntry
        : <String, dynamic>{};
    final Map<String, dynamic> attendance =
        rawAttendance is Map<String, dynamic>
        ? rawAttendance
        : <String, dynamic>{};

    final String names = (teacher['nombres'] ?? '').toString().trim();
    final String surnames = (teacher['apellidos'] ?? '').toString().trim();

    return MobileAttendanceResult(
      registered: json['registrada'] == true,
      duplicate: json['duplicada'] == true,
      signatureVerified: json['firma_verificada'] == true,
      target: (json['objetivo'] ?? '').toString(),
      state: (json['estado'] ?? '').toString(),
      date: (json['fecha'] ?? '').toString(),
      serverTime: (json['hora_servidor'] ?? '').toString(),
      teacherCode: (teacher['codigo'] ?? '').toString(),
      teacherName: '$names $surnames'.trim(),
      message: (json['mensaje'] ?? '').toString(),
      courseCode: course['codigo']?.toString(),
      courseName: course['nombre']?.toString(),
      classroom: course['aula']?.toString(),
      institutionalEntryCreated: entry['nuevo'] == true,
      courseAttendanceCreated: attendance['nueva'] == true,
    );
  }
}
