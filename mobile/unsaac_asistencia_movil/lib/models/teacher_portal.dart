class TeacherSchedule {
  const TeacherSchedule({
    required this.id,
    required this.courseCode,
    required this.courseName,
    required this.classroom,
    required this.dayOfWeek,
    required this.startTime,
    required this.endTime,
    required this.semester,
    required this.active,
  });

  final int id;
  final String courseCode;
  final String courseName;
  final String classroom;
  final int dayOfWeek;
  final String startTime;
  final String endTime;
  final String semester;
  final bool active;

  String get dayName => switch (dayOfWeek) {
    1 => 'Lunes',
    2 => 'Martes',
    3 => 'Miércoles',
    4 => 'Jueves',
    5 => 'Viernes',
    6 => 'Sábado',
    7 => 'Domingo',
    _ => 'Día no definido',
  };

  factory TeacherSchedule.fromJson(Map<String, dynamic> json) {
    return TeacherSchedule(
      id: int.tryParse((json['id'] ?? '').toString()) ?? 0,
      courseCode: (json['curso_codigo'] ?? '').toString(),
      courseName: (json['curso'] ?? '').toString(),
      classroom: (json['aula'] ?? '').toString(),
      dayOfWeek:
          int.tryParse((json['dia_semana'] ?? '').toString()) ?? 0,
      startTime: _compactTime(json['hora_inicio']),
      endTime: _compactTime(json['hora_fin']),
      semester: (json['semestre'] ?? '').toString(),
      active: json['activo'] == true,
    );
  }
}

class TeacherAttendanceItem {
  const TeacherAttendanceItem({
    required this.kind,
    required this.date,
    required this.time,
    required this.state,
    required this.verificationMethod,
    this.operationResult,
    this.course,
    this.classroom,
  });

  final String kind;
  final String date;
  final String time;
  final String state;
  final String verificationMethod;
  final String? operationResult;
  final String? course;
  final String? classroom;

  bool get isCourse => kind == 'CURSO';

  DateTime get sortValue {
    final String normalizedDate = date.length >= 10
        ? date.substring(0, 10)
        : date;
    return DateTime.tryParse('${normalizedDate}T${_compactTime(time)}:00') ??
        DateTime.fromMillisecondsSinceEpoch(0);
  }

  factory TeacherAttendanceItem.entry(Map<String, dynamic> json) {
    return TeacherAttendanceItem(
      kind: 'INGRESO',
      date: _compactDate(json['fecha']),
      time: _compactTime(json['hora_registro']),
      state: (json['estado'] ?? '').toString(),
      verificationMethod:
          (json['metodo_verificacion'] ?? 'LECTOR_O_MANUAL').toString(),
    );
  }

  factory TeacherAttendanceItem.course(Map<String, dynamic> json) {
    return TeacherAttendanceItem(
      kind: 'CURSO',
      date: _compactDate(json['fecha']),
      time: _compactTime(json['hora_registro']),
      state: (json['estado'] ?? '').toString(),
      verificationMethod:
          (json['metodo_verificacion'] ?? 'LECTOR_O_MANUAL').toString(),
      course: json['curso']?.toString(),
      classroom: json['aula']?.toString(),
    );
  }


  factory TeacherAttendanceItem.mobileOperation(Map<String, dynamic> json) {
    final String target = (json['tipo_objetivo'] ?? '').toString();
    final bool isCourseTarget = target == 'CURSO';
    final String createdAt = (json['creado_en'] ?? '').toString();
    final String fallbackDate = createdAt.length >= 10
        ? createdAt.substring(0, 10)
        : createdAt;
    final DateTime? created = DateTime.tryParse(createdAt)?.toLocal();
    final String fallbackTime = created == null
        ? ''
        : '${created.hour.toString().padLeft(2, '0')}:${created.minute.toString().padLeft(2, '0')}';

    final Object? dateValue = isCourseTarget
        ? (json['fecha_curso'] ?? json['fecha_ingreso'])
        : (json['fecha_ingreso'] ?? json['fecha_curso']);
    final Object? timeValue = isCourseTarget
        ? (json['hora_curso'] ?? json['hora_ingreso'])
        : (json['hora_ingreso'] ?? json['hora_curso']);
    final Object? stateValue = isCourseTarget
        ? (json['estado_curso'] ?? json['estado_ingreso'])
        : (json['estado_ingreso'] ?? json['estado_curso']);

    return TeacherAttendanceItem(
      kind: isCourseTarget ? 'CURSO' : 'INGRESO',
      date: _compactDate(dateValue).isNotEmpty
          ? _compactDate(dateValue)
          : fallbackDate,
      time: _compactTime(timeValue).isNotEmpty
          ? _compactTime(timeValue)
          : fallbackTime,
      state: (stateValue ?? json['resultado'] ?? '').toString(),
      verificationMethod:
          (json['metodo_verificacion'] ?? 'BIOMETRIA_MOVIL').toString(),
      operationResult: json['resultado']?.toString(),
      course: json['curso']?.toString(),
      classroom: json['aula']?.toString(),
    );
  }
}

class TeacherPortalData {
  const TeacherPortalData({
    required this.schedules,
    required this.history,
  });

  final List<TeacherSchedule> schedules;
  final List<TeacherAttendanceItem> history;
}

class AttendanceQrSession {
  const AttendanceQrSession({
    required this.id,
    required this.payload,
    required this.imageDataUrl,
    required this.issuedAt,
    required this.expiresAt,
    required this.ttlSeconds,
  });

  final String id;
  final String payload;
  final String imageDataUrl;
  final DateTime issuedAt;
  final DateTime expiresAt;
  final int ttlSeconds;

  factory AttendanceQrSession.fromJson(Map<String, dynamic> json) {
    return AttendanceQrSession(
      id: (json['id'] ?? '').toString(),
      payload: (json['contenido'] ?? '').toString(),
      imageDataUrl: (json['imagen'] ?? '').toString(),
      issuedAt: DateTime.parse((json['emitido_en'] ?? '').toString()),
      expiresAt: DateTime.parse((json['expira_en'] ?? '').toString()),
      ttlSeconds:
          int.tryParse((json['vigencia_segundos'] ?? 60).toString()) ?? 60,
    );
  }
}

class QrAttendanceOutcome {
  const QrAttendanceOutcome({
    required this.registered,
    required this.duplicate,
    required this.target,
    required this.state,
    required this.date,
    required this.serverTime,
    required this.message,
    this.courseName,
    this.classroom,
  });

  final bool registered;
  final bool duplicate;
  final String target;
  final String state;
  final String date;
  final String serverTime;
  final String message;
  final String? courseName;
  final String? classroom;

  factory QrAttendanceOutcome.fromJson(Map<String, dynamic> json) {
    final Object? rawCourse = json['curso'];
    final Map<String, dynamic> course = rawCourse is Map<String, dynamic>
        ? rawCourse
        : <String, dynamic>{};

    return QrAttendanceOutcome(
      registered: json['registrada'] == true,
      duplicate: json['duplicada'] == true,
      target: (json['objetivo'] ?? '').toString(),
      state: (json['estado'] ?? '').toString(),
      date: _compactDate(json['fecha']),
      serverTime: _compactTime(json['hora_servidor']),
      message: (json['mensaje'] ?? '').toString(),
      courseName: course['nombre']?.toString(),
      classroom: course['aula']?.toString(),
    );
  }
}

String _compactDate(Object? value) {
  final String text = (value ?? '').toString();
  return text.length >= 10 ? text.substring(0, 10) : text;
}

String _compactTime(Object? value) {
  final String text = (value ?? '').toString();
  return text.length >= 5 ? text.substring(0, 5) : text;
}
