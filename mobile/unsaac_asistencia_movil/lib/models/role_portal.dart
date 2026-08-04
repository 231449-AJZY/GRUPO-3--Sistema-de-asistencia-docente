int _asInt(Object? value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? 0;
}

String _asString(Object? value, [String fallback = '']) {
  final String result = value?.toString().trim() ?? '';
  return result.isEmpty ? fallback : result;
}

Map<String, dynamic> _asMap(Object? value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) {
    return value.map(
      (Object? key, Object? item) => MapEntry(key.toString(), item),
    );
  }
  return <String, dynamic>{};
}

List<Map<String, dynamic>> _asMapList(Object? value) {
  if (value is! List) return <Map<String, dynamic>>[];
  return value.map(_asMap).toList(growable: false);
}

class HourlyPoint {
  const HourlyPoint({required this.label, required this.value});

  final String label;
  final int value;

  factory HourlyPoint.fromAdminJson(Map<String, dynamic> json) {
    return HourlyPoint(
      label: _asString(json['hour'], '—'),
      value: _asInt(json['value']),
    );
  }

  factory HourlyPoint.fromSupervisorJson(Map<String, dynamic> json) {
    return HourlyPoint(
      label: _asString(json['hora'], '—'),
      value: _asInt(json['total']),
    );
  }
}

class AdminMetric {
  const AdminMetric({
    required this.title,
    required this.value,
    required this.description,
    required this.color,
    required this.icon,
  });

  final String title;
  final int value;
  final String description;
  final String color;
  final String icon;

  factory AdminMetric.fromJson(Map<String, dynamic> json) {
    return AdminMetric(
      title: _asString(json['title'], 'Indicador'),
      value: _asInt(json['value']),
      description: _asString(json['description']),
      color: _asString(json['color'], 'blue'),
      icon: _asString(json['icon'], 'analytics'),
    );
  }
}

class AdminRecentAlert {
  const AdminRecentAlert({
    required this.id,
    required this.type,
    required this.title,
    required this.description,
    required this.time,
  });

  final int id;
  final String type;
  final String title;
  final String description;
  final String time;

  factory AdminRecentAlert.fromJson(Map<String, dynamic> json) {
    return AdminRecentAlert(
      id: _asInt(json['id']),
      type: _asString(json['type'], 'docente'),
      title: _asString(json['title'], 'Alerta operativa'),
      description: _asString(json['description']),
      time: _asString(json['time'], '—'),
    );
  }
}

class AdminRecentAttendance {
  const AdminRecentAttendance({
    required this.id,
    required this.teacher,
    required this.record,
    required this.time,
    required this.status,
    required this.classroom,
    required this.method,
    required this.result,
  });

  final String id;
  final String teacher;
  final String record;
  final String time;
  final String status;
  final String classroom;
  final String method;
  final String result;

  factory AdminRecentAttendance.fromJson(Map<String, dynamic> json) {
    return AdminRecentAttendance(
      id: _asString(json['id']),
      teacher: _asString(json['docente'], 'Docente'),
      record: _asString(json['registro'], 'Ingreso institucional'),
      time: _asString(json['hora'], '—'),
      status: _asString(json['estado'], 'Sin estado'),
      classroom: _asString(json['aula'], '—'),
      method: _asString(json['metodo'], 'Manual'),
      result: _asString(json['resultado'], 'REGISTRADA'),
    );
  }
}

class VerificationSummary {
  const VerificationSummary({
    required this.totalAttempts,
    required this.registered,
    required this.duplicate,
    required this.rejected,
    required this.dynamicQr,
    required this.mobileBiometric,
    required this.offline,
    required this.other,
  });

  final int totalAttempts;
  final int registered;
  final int duplicate;
  final int rejected;
  final int dynamicQr;
  final int mobileBiometric;
  final int offline;
  final int other;

  const VerificationSummary.empty()
    : totalAttempts = 0,
      registered = 0,
      duplicate = 0,
      rejected = 0,
      dynamicQr = 0,
      mobileBiometric = 0,
      offline = 0,
      other = 0;

  factory VerificationSummary.fromJson(Map<String, dynamic> json) {
    return VerificationSummary(
      totalAttempts: _asInt(json['totalAttempts']),
      registered: _asInt(json['registered']),
      duplicate: _asInt(json['duplicate']),
      rejected: _asInt(json['rejected']),
      dynamicQr: _asInt(json['dynamicQr']),
      mobileBiometric: _asInt(json['mobileBiometric']),
      offline: _asInt(json['offline']),
      other: _asInt(json['other']),
    );
  }
}

class BiometricOverview {
  const BiometricOverview({
    required this.connectedDevices,
    required this.syncStatus,
    required this.lastRecord,
    required this.serverStatus,
  });

  final String connectedDevices;
  final String syncStatus;
  final String lastRecord;
  final String serverStatus;

  const BiometricOverview.empty()
    : connectedDevices = '0',
      syncStatus = 'Sin información',
      lastRecord = '—',
      serverStatus = 'Sin conexión';

  factory BiometricOverview.fromJson(Map<String, dynamic> json) {
    return BiometricOverview(
      connectedDevices: _asString(json['connectedDevices'], '0'),
      syncStatus: _asString(json['syncStatus'], 'Sin información'),
      lastRecord: _asString(json['lastRecord'], '—'),
      serverStatus: _asString(json['serverStatus'], 'Sin conexión'),
    );
  }
}

class AdminDashboardData {
  const AdminDashboardData({
    required this.activeTeachers,
    required this.todayAttendance,
    required this.todayLate,
    required this.todayAbsences,
    required this.metrics,
    required this.hourlyActivity,
    required this.recentAlerts,
    required this.recentAttendances,
    required this.verification,
    required this.biometric,
  });

  final int activeTeachers;
  final int todayAttendance;
  final int todayLate;
  final int todayAbsences;
  final List<AdminMetric> metrics;
  final List<HourlyPoint> hourlyActivity;
  final List<AdminRecentAlert> recentAlerts;
  final List<AdminRecentAttendance> recentAttendances;
  final VerificationSummary verification;
  final BiometricOverview biometric;

  const AdminDashboardData.empty()
    : activeTeachers = 0,
      todayAttendance = 0,
      todayLate = 0,
      todayAbsences = 0,
      metrics = const <AdminMetric>[],
      hourlyActivity = const <HourlyPoint>[],
      recentAlerts = const <AdminRecentAlert>[],
      recentAttendances = const <AdminRecentAttendance>[],
      verification = const VerificationSummary.empty(),
      biometric = const BiometricOverview.empty();

  factory AdminDashboardData.fromJson(Map<String, dynamic> json) {
    final Map<String, dynamic> summary = _asMap(json['summary']);
    return AdminDashboardData(
      activeTeachers: _asInt(summary['docentesActivos']),
      todayAttendance: _asInt(summary['asistenciasHoy']),
      todayLate: _asInt(summary['tardanzasHoy']),
      todayAbsences: _asInt(summary['inasistenciasHoy']),
      metrics: _asMapList(
        json['metrics'],
      ).map(AdminMetric.fromJson).toList(growable: false),
      hourlyActivity: _asMapList(
        json['hourlyActivity'],
      ).map(HourlyPoint.fromAdminJson).toList(growable: false),
      recentAlerts: _asMapList(
        json['recentAlerts'],
      ).map(AdminRecentAlert.fromJson).toList(growable: false),
      recentAttendances: _asMapList(
        json['recentAttendances'],
      ).map(AdminRecentAttendance.fromJson).toList(growable: false),
      verification: VerificationSummary.fromJson(
        _asMap(json['verificationSummary']),
      ),
      biometric: BiometricOverview.fromJson(_asMap(json['biometricStatus'])),
    );
  }
}

class SupervisorStats {
  const SupervisorStats({
    required this.monitoredTeachers,
    required this.presentTeachers,
    required this.newAlerts,
    required this.inconsistencies,
    required this.validatedRecords,
    required this.onTime,
    required this.late,
    required this.courseRecords,
    required this.institutionalEntries,
    required this.duplicates,
    required this.rejected,
  });

  final int monitoredTeachers;
  final int presentTeachers;
  final int newAlerts;
  final int inconsistencies;
  final int validatedRecords;
  final int onTime;
  final int late;
  final int courseRecords;
  final int institutionalEntries;
  final int duplicates;
  final int rejected;

  const SupervisorStats.empty()
    : monitoredTeachers = 0,
      presentTeachers = 0,
      newAlerts = 0,
      inconsistencies = 0,
      validatedRecords = 0,
      onTime = 0,
      late = 0,
      courseRecords = 0,
      institutionalEntries = 0,
      duplicates = 0,
      rejected = 0;

  factory SupervisorStats.fromJson(Map<String, dynamic> json) {
    return SupervisorStats(
      monitoredTeachers: _asInt(json['docentesMonitoreados']),
      presentTeachers: _asInt(json['docentesPresentes']),
      newAlerts: _asInt(json['alertasNuevas']),
      inconsistencies: _asInt(json['inconsistencias']),
      validatedRecords: _asInt(json['registrosValidados']),
      onTime: _asInt(json['puntuales']),
      late: _asInt(json['tardanzas']),
      courseRecords: _asInt(json['registrosCurso']),
      institutionalEntries: _asInt(json['ingresosInstitucionales']),
      duplicates: _asInt(json['duplicadas']),
      rejected: _asInt(json['rechazadas']),
    );
  }
}

class SupervisorRecord {
  const SupervisorRecord({
    required this.id,
    required this.teacher,
    required this.code,
    required this.department,
    required this.record,
    required this.courseCode,
    required this.classroom,
    required this.time,
    required this.status,
    required this.result,
    required this.method,
    required this.source,
  });

  final String id;
  final String teacher;
  final String code;
  final String department;
  final String record;
  final String courseCode;
  final String classroom;
  final String time;
  final String status;
  final String result;
  final String method;
  final String source;

  bool get isLate => status.toUpperCase().contains('TARDANZA');
  bool get isRejected => result.toUpperCase() == 'RECHAZADA';
  bool get isDuplicate => result.toUpperCase() == 'DUPLICADA';

  factory SupervisorRecord.fromJson(Map<String, dynamic> json) {
    return SupervisorRecord(
      id: _asString(json['id']),
      teacher: _asString(json['docente'], 'Docente'),
      code: _asString(json['codigo'], '—'),
      department: _asString(json['departamento'], 'Sin departamento'),
      record: _asString(json['registro'], 'Ingreso institucional'),
      courseCode: _asString(json['curso_codigo']),
      classroom: _asString(json['aula'], '—'),
      time: _asString(json['hora_registro'], '—'),
      status: _asString(json['estado'], 'SIN_ESTADO'),
      result: _asString(json['resultado'], 'REGISTRADA'),
      method: _asString(json['metodo'], 'MANUAL'),
      source: _asString(json['fuente'], '—'),
    );
  }
}

class MethodCount {
  const MethodCount({required this.method, required this.total});

  final String method;
  final int total;

  factory MethodCount.fromJson(Map<String, dynamic> json) {
    return MethodCount(
      method: _asString(json['metodo'], 'MANUAL'),
      total: _asInt(json['total']),
    );
  }
}

class SupervisorDashboardData {
  const SupervisorDashboardData({
    required this.generatedAt,
    required this.date,
    required this.stats,
    required this.records,
    required this.hourlyActivity,
    required this.methods,
  });

  final DateTime? generatedAt;
  final String date;
  final SupervisorStats stats;
  final List<SupervisorRecord> records;
  final List<HourlyPoint> hourlyActivity;
  final List<MethodCount> methods;

  const SupervisorDashboardData.empty()
    : generatedAt = null,
      date = '',
      stats = const SupervisorStats.empty(),
      records = const <SupervisorRecord>[],
      hourlyActivity = const <HourlyPoint>[],
      methods = const <MethodCount>[];

  factory SupervisorDashboardData.fromJson(Map<String, dynamic> json) {
    return SupervisorDashboardData(
      generatedAt: DateTime.tryParse(_asString(json['generatedAt'])),
      date: _asString(json['fecha']),
      stats: SupervisorStats.fromJson(_asMap(json['stats'])),
      records: _asMapList(
        json['registrosHoy'],
      ).map(SupervisorRecord.fromJson).toList(growable: false),
      hourlyActivity: _asMapList(
        json['actividadHoraria'],
      ).map(HourlyPoint.fromSupervisorJson).toList(growable: false),
      methods: _asMapList(
        json['metodos'],
      ).map(MethodCount.fromJson).toList(growable: false),
    );
  }
}

class TeacherMonthlyHistoryItem {
  const TeacherMonthlyHistoryItem({
    required this.date,
    required this.time,
    required this.status,
  });

  final String date;
  final String time;
  final String status;

  factory TeacherMonthlyHistoryItem.fromJson(Map<String, dynamic> json) {
    return TeacherMonthlyHistoryItem(
      date: _asString(json['fecha'], '—'),
      time: _asString(json['hora_registro'], '—'),
      status: _asString(json['estado'], 'SIN_ESTADO'),
    );
  }
}

class TeacherDashboardData {
  const TeacherDashboardData({
    required this.attendance,
    required this.late,
    required this.absences,
    required this.history,
  });

  final int attendance;
  final int late;
  final int absences;
  final List<TeacherMonthlyHistoryItem> history;

  const TeacherDashboardData.empty()
    : attendance = 0,
      late = 0,
      absences = 0,
      history = const <TeacherMonthlyHistoryItem>[];

  int get total => attendance + late + absences;

  double get punctualityRate {
    final int denominator = attendance + late;
    if (denominator <= 0) return 0;
    return attendance / denominator;
  }

  factory TeacherDashboardData.fromJson(Map<String, dynamic> json) {
    final Map<String, dynamic> stats = _asMap(json['stats']);
    return TeacherDashboardData(
      attendance: _asInt(stats['asistencias']),
      late: _asInt(stats['tardanzas']),
      absences: _asInt(stats['inasistencias']),
      history: _asMapList(
        json['historial'],
      ).map(TeacherMonthlyHistoryItem.fromJson).toList(growable: false),
    );
  }
}

class OperationalAlert {
  const OperationalAlert({
    required this.id,
    required this.teacher,
    required this.teacherCode,
    required this.department,
    required this.type,
    required this.message,
    required this.priority,
    required this.status,
    required this.source,
    required this.createdAt,
    required this.comment,
  });

  final int id;
  final String teacher;
  final String teacherCode;
  final String department;
  final String type;
  final String message;
  final String priority;
  final String status;
  final String source;
  final DateTime? createdAt;
  final String comment;

  bool get isUrgent => priority == 'CRITICA' || priority == 'ALTA';

  factory OperationalAlert.fromJson(Map<String, dynamic> json) {
    return OperationalAlert(
      id: _asInt(json['id']),
      teacher: _asString(json['teacher'], 'Docente'),
      teacherCode: _asString(json['teacherCode'], '—'),
      department: _asString(json['department'], 'Sin departamento'),
      type: _asString(json['type'], 'ALERTA'),
      message: _asString(json['message']),
      priority: _asString(json['priority'], 'MEDIA').toUpperCase(),
      status: _asString(json['status'], 'NUEVA').toUpperCase(),
      source: _asString(json['source'], 'SISTEMA'),
      createdAt: DateTime.tryParse(_asString(json['createdAt'])),
      comment: _asString(json['comment']),
    );
  }
}

class AlertBundle {
  const AlertBundle({required this.total, required this.alerts});

  final int total;
  final List<OperationalAlert> alerts;

  factory AlertBundle.fromJson(Map<String, dynamic> json) {
    return AlertBundle(
      total: _asInt(json['total']),
      alerts: _asMapList(
        json['alerts'],
      ).map(OperationalAlert.fromJson).toList(growable: false),
    );
  }
}
