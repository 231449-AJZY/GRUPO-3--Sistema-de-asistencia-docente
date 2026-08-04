class TeacherNotification {
  const TeacherNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.message,
    required this.priority,
    required this.eventKey,
    required this.visibleAt,
    required this.createdAt,
    required this.scheduled,
    this.referenceType,
    this.referenceId,
    this.expiresAt,
    this.readAt,
    this.localOnly = false,
  });


  final int id;
  final String type;
  final String title;
  final String message;
  final String priority;
  final String eventKey;
  final String? referenceType;
  final int? referenceId;
  final DateTime visibleAt;
  final DateTime? expiresAt;
  final DateTime? readAt;
  final DateTime createdAt;
  final bool scheduled;
  final bool localOnly;


  bool get isRead => readAt != null;
  bool get isScheduled => scheduled || visibleAt.isAfter(DateTime.now());
  bool get isVisible => !isScheduled;
  bool get isUrgent => priority == 'ALTA' || priority == 'CRITICA';


  TeacherNotification copyWith({DateTime? readAt}) {
    return TeacherNotification(
      id: id,
      type: type,
      title: title,
      message: message,
      priority: priority,
      eventKey: eventKey,
      referenceType: referenceType,
      referenceId: referenceId,
      visibleAt: visibleAt,
      expiresAt: expiresAt,
      readAt: readAt ?? this.readAt,
      createdAt: createdAt,
      scheduled: scheduled,
      localOnly: localOnly,
    );
  }


  factory TeacherNotification.fromJson(Map<String, dynamic> json) {
    DateTime parseDate(Object? value, {DateTime? fallback}) {
      return DateTime.tryParse(value?.toString() ?? '')?.toLocal() ??
          fallback ??
          DateTime.now();
    }


    int? parseOptionalInt(Object? value) {
      if (value == null) return null;
      if (value is int) return value;
      return int.tryParse(value.toString());
    }


    return TeacherNotification(
      id: parseOptionalInt(json['id']) ?? 0,
      type: (json['type'] ?? json['tipo'] ?? 'AVISO').toString(),
      title: (json['title'] ?? json['titulo'] ?? 'Aviso UNSAAC').toString(),
      message: (json['message'] ?? json['mensaje'] ?? '').toString(),
      priority: (json['priority'] ?? json['prioridad'] ?? 'MEDIA')
          .toString()
          .toUpperCase(),
      eventKey: (json['eventKey'] ?? json['clave_evento'] ?? '').toString(),
      referenceType:
          (json['referenceType'] ?? json['referencia_tipo'])?.toString(),
      referenceId: parseOptionalInt(
        json['referenceId'] ?? json['referencia_id'],
      ),
      visibleAt: parseDate(json['visibleAt'] ?? json['visible_desde']),
      expiresAt: json['expiresAt'] == null && json['expira_en'] == null
          ? null
          : parseDate(json['expiresAt'] ?? json['expira_en']),
      readAt: json['readAt'] == null && json['leida_en'] == null
          ? null
          : parseDate(json['readAt'] ?? json['leida_en']),
      createdAt: parseDate(
        json['createdAt'] ?? json['creada_en'],
        fallback: DateTime.now(),
      ),
      scheduled: json['scheduled'] == true,
      localOnly: json['localOnly'] == true,
    );
  }


  factory TeacherNotification.offlinePending(int pending) {
    final DateTime now = DateTime.now();
    return TeacherNotification(
      id: -7001,
      type: 'REGISTRO_OFFLINE_LOCAL',
      title: 'Marcaciones pendientes',
      message:
          '$pending marcación(es) permanecen cifradas en este celular y deben sincronizarse.',
      priority: 'ALTA',
      eventKey: 'OFFLINE_LOCAL:$pending',
      visibleAt: now,
      createdAt: now,
      scheduled: false,
      localOnly: true,
    );
  }


  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'type': type,
    'title': title,
    'message': message,
    'priority': priority,
    'eventKey': eventKey,
    'referenceType': referenceType,
    'referenceId': referenceId,
    'visibleAt': visibleAt.toUtc().toIso8601String(),
    'expiresAt': expiresAt?.toUtc().toIso8601String(),
    'readAt': readAt?.toUtc().toIso8601String(),
    'createdAt': createdAt.toUtc().toIso8601String(),
    'scheduled': scheduled,
    'localOnly': localOnly,
  };
}


class TeacherNotificationBundle {
  const TeacherNotificationBundle({
    required this.notifications,
    required this.scheduled,
    required this.unread,
    required this.urgent,
  });


  final List<TeacherNotification> notifications;
  final List<TeacherNotification> scheduled;
  final int unread;
  final int urgent;


  List<TeacherNotification> get all => <TeacherNotification>[
    ...notifications,
    ...scheduled,
  ];


  factory TeacherNotificationBundle.fromJson(Map<String, dynamic> json) {
    List<TeacherNotification> parseList(Object? raw) {
      if (raw is! List<Object?>) return <TeacherNotification>[];
      return raw
          .whereType<Map<String, dynamic>>()
          .map(TeacherNotification.fromJson)
          .where((TeacherNotification item) => item.id != 0)
          .toList();
    }


    final Object? rawSummary = json['summary'];
    final Map<String, dynamic> summary = rawSummary is Map<String, dynamic>
        ? rawSummary
        : <String, dynamic>{};


    int parseCount(Object? value) {
      if (value is int) return value;
      return int.tryParse(value?.toString() ?? '') ?? 0;
    }


    return TeacherNotificationBundle(
      notifications: parseList(json['notifications']),
      scheduled: parseList(json['scheduled']),
      unread: parseCount(summary['no_leidas'] ?? summary['unread']),
      urgent: parseCount(summary['urgentes'] ?? summary['urgent']),
    );
  }
}