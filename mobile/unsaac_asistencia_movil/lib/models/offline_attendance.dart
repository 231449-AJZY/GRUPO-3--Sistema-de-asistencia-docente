import 'dart:convert';
import 'dart:math';

import 'ble_station.dart';

class TrustedClock {
  const TrustedClock({
    required this.wallClockMs,
    required this.elapsedRealtimeMs,
    required this.bootCount,
  });

  final int wallClockMs;
  final int elapsedRealtimeMs;
  final int bootCount;

  factory TrustedClock.fromPlatform(Map<Object?, Object?> json) {
    return TrustedClock(
      wallClockMs: int.tryParse((json['wallClockMs'] ?? 0).toString()) ?? 0,
      elapsedRealtimeMs:
          int.tryParse((json['elapsedRealtimeMs'] ?? 0).toString()) ?? 0,
      bootCount: int.tryParse((json['bootCount'] ?? 0).toString()) ?? 0,
    );
  }
}

class OfflineTeacher {
  const OfflineTeacher({
    required this.id,
    required this.code,
    required this.names,
    required this.surnames,
    required this.email,
    this.department,
  });

  final int id;
  final String code;
  final String names;
  final String surnames;
  final String email;
  final String? department;

  String get fullName => '$names $surnames'.trim();

  factory OfflineTeacher.fromJson(Map<String, dynamic> json) {
    return OfflineTeacher(
      id: int.tryParse((json['id'] ?? 0).toString()) ?? 0,
      code: (json['code'] ?? '').toString(),
      names: (json['names'] ?? '').toString(),
      surnames: (json['surnames'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      department: json['department']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'code': code,
    'names': names,
    'surnames': surnames,
    'email': email,
    'department': department,
  };
}

class OfflineSchedule {
  const OfflineSchedule({
    required this.id,
    required this.dayOfWeek,
    required this.startTime,
    required this.endTime,
    required this.classroom,
    required this.courseCode,
    required this.courseName,
    required this.semester,
    required this.semesterStart,
    required this.semesterEnd,
  });

  final int id;
  final int dayOfWeek;
  final String startTime;
  final String endTime;
  final String classroom;
  final String courseCode;
  final String courseName;
  final String semester;
  final String semesterStart;
  final String semesterEnd;

  factory OfflineSchedule.fromJson(Map<String, dynamic> json) {
    return OfflineSchedule(
      id: int.tryParse((json['id'] ?? 0).toString()) ?? 0,
      dayOfWeek: int.tryParse((json['dayOfWeek'] ?? 0).toString()) ?? 0,
      startTime: (json['startTime'] ?? '').toString(),
      endTime: (json['endTime'] ?? '').toString(),
      classroom: (json['classroom'] ?? '').toString(),
      courseCode: (json['courseCode'] ?? '').toString(),
      courseName: (json['courseName'] ?? '').toString(),
      semester: (json['semester'] ?? '').toString(),
      semesterStart: (json['semesterStart'] ?? '').toString(),
      semesterEnd: (json['semesterEnd'] ?? '').toString(),
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
    'id': id,
    'dayOfWeek': dayOfWeek,
    'startTime': startTime,
    'endTime': endTime,
    'classroom': classroom,
    'courseCode': courseCode,
    'courseName': courseName,
    'semester': semester,
    'semesterStart': semesterStart,
    'semesterEnd': semesterEnd,
  };

  int? get startMinutes => _timeToMinutes(startTime);

  bool containsWindow(
    DateTime limaTime, {
    required int beforeMinutes,
    required int afterMinutes,
  }) {
    if (limaTime.weekday != dayOfWeek) {
      return false;
    }

    final int? start = startMinutes;
    if (start == null) {
      return false;
    }

    final int current = limaTime.hour * 60 + limaTime.minute;
    return current >= start - beforeMinutes && current <= start + afterMinutes;
  }

  static int? _timeToMinutes(String value) {
    final List<String> parts = value.split(':');
    if (parts.length < 2) {
      return null;
    }
    final int? hour = int.tryParse(parts[0]);
    final int? minute = int.tryParse(parts[1]);
    if (hour == null || minute == null) {
      return null;
    }
    return hour * 60 + minute;
  }
}

class OfflineCredential {
  const OfflineCredential({
    required this.id,
    required this.issuedAt,
    required this.expiresAt,
    required this.serverEpochMs,
    required this.anchorElapsedRealtimeMs,
    required this.bootCount,
    required this.maxAgeHours,
    required this.maxPending,
    required this.clockToleranceSeconds,
    required this.installationId,
    required this.deviceId,
    required this.keyFingerprint,
    required this.teacher,
    required this.beforeMinutes,
    required this.afterMinutes,
    required this.schedules,
  });

  final String id;
  final DateTime issuedAt;
  final DateTime expiresAt;
  final int serverEpochMs;
  final int anchorElapsedRealtimeMs;
  final int bootCount;
  final int maxAgeHours;
  final int maxPending;
  final int clockToleranceSeconds;
  final String installationId;
  final int deviceId;
  final String keyFingerprint;
  final OfflineTeacher teacher;
  final int beforeMinutes;
  final int afterMinutes;
  final List<OfflineSchedule> schedules;

  bool get isExpired => DateTime.now().toUtc().isAfter(expiresAt.toUtc());

  factory OfflineCredential.fromApi(Map<String, dynamic> json) {
    final Object? rawTeacher = json['teacher'];
    final Object? rawAttendance = json['attendance'];
    final Object? rawSchedules = json['schedules'];

    if (rawTeacher is! Map<String, dynamic> ||
        rawAttendance is! Map<String, dynamic> ||
        rawSchedules is! List<Object?>) {
      throw const FormatException('La credencial offline está incompleta.');
    }

    return OfflineCredential(
      id: (json['id'] ?? '').toString(),
      issuedAt: DateTime.parse((json['issuedAt'] ?? '').toString()),
      expiresAt: DateTime.parse((json['expiresAt'] ?? '').toString()),
      serverEpochMs: int.tryParse((json['serverEpochMs'] ?? 0).toString()) ?? 0,
      anchorElapsedRealtimeMs:
          int.tryParse((json['anchorElapsedRealtimeMs'] ?? 0).toString()) ?? 0,
      bootCount: int.tryParse((json['bootCount'] ?? 0).toString()) ?? 0,
      maxAgeHours: int.tryParse((json['maxAgeHours'] ?? 12).toString()) ?? 12,
      maxPending: int.tryParse((json['maxPending'] ?? 50).toString()) ?? 50,
      clockToleranceSeconds:
          int.tryParse((json['clockToleranceSeconds'] ?? 180).toString()) ??
          180,
      installationId: (json['installationId'] ?? '').toString(),
      deviceId: int.tryParse((json['deviceId'] ?? 0).toString()) ?? 0,
      keyFingerprint: (json['keyFingerprint'] ?? '').toString(),
      teacher: OfflineTeacher.fromJson(rawTeacher),
      beforeMinutes:
          int.tryParse((rawAttendance['beforeMinutes'] ?? 15).toString()) ?? 15,
      afterMinutes:
          int.tryParse((rawAttendance['afterMinutes'] ?? 10).toString()) ?? 10,
      schedules: rawSchedules
          .whereType<Map<String, dynamic>>()
          .map(OfflineSchedule.fromJson)
          .toList(),
    );
  }

  factory OfflineCredential.fromStoredJson(String rawValue) {
    final Object? decoded = jsonDecode(rawValue);
    if (decoded is! Map<String, dynamic>) {
      throw const FormatException('Credencial offline almacenada inválida.');
    }
    return OfflineCredential.fromApi(decoded);
  }

  String toStoredJson() => jsonEncode(<String, dynamic>{
    'id': id,
    'issuedAt': issuedAt.toIso8601String(),
    'expiresAt': expiresAt.toIso8601String(),
    'serverEpochMs': serverEpochMs,
    'anchorElapsedRealtimeMs': anchorElapsedRealtimeMs,
    'bootCount': bootCount,
    'maxAgeHours': maxAgeHours,
    'maxPending': maxPending,
    'clockToleranceSeconds': clockToleranceSeconds,
    'installationId': installationId,
    'deviceId': deviceId,
    'keyFingerprint': keyFingerprint,
    'teacher': teacher.toJson(),
    'attendance': <String, dynamic>{
      'beforeMinutes': beforeMinutes,
      'afterMinutes': afterMinutes,
    },
    'schedules': schedules
        .map((OfflineSchedule schedule) => schedule.toJson())
        .toList(),
  });

  int estimatedEpochMs(TrustedClock clock) {
    return serverEpochMs + (clock.elapsedRealtimeMs - anchorElapsedRealtimeMs);
  }

  bool isClockTrusted(TrustedClock clock) {
    return clock.bootCount == bootCount &&
        clock.elapsedRealtimeMs >= anchorElapsedRealtimeMs;
  }

  DateTime limaDateTimeFromEpoch(int epochMs) {
    return DateTime.fromMillisecondsSinceEpoch(
      epochMs,
      isUtc: true,
    ).subtract(const Duration(hours: 5));
  }

  OfflineSchedule? eligibleSchedule(int epochMs) {
    final DateTime limaTime = limaDateTimeFromEpoch(epochMs);
    for (final OfflineSchedule schedule in schedules) {
      if (schedule.containsWindow(
        limaTime,
        beforeMinutes: beforeMinutes,
        afterMinutes: afterMinutes,
      )) {
        return schedule;
      }
    }
    return null;
  }
}

enum OfflineQueueStatus {
  pending,
  syncing,
  registered,
  duplicated,
  rejected,
  review,
}

extension OfflineQueueStatusValue on OfflineQueueStatus {
  String get apiValue {
    switch (this) {
      case OfflineQueueStatus.pending:
        return 'PENDIENTE';
      case OfflineQueueStatus.syncing:
        return 'SINCRONIZANDO';
      case OfflineQueueStatus.registered:
        return 'REGISTRADA';
      case OfflineQueueStatus.duplicated:
        return 'DUPLICADA';
      case OfflineQueueStatus.rejected:
        return 'RECHAZADA';
      case OfflineQueueStatus.review:
        return 'REQUIERE_REVISION';
    }
  }

  static OfflineQueueStatus parse(String value) {
    switch (value.toUpperCase()) {
      case 'SINCRONIZANDO':
        return OfflineQueueStatus.syncing;
      case 'REGISTRADA':
        return OfflineQueueStatus.registered;
      case 'DUPLICADA':
        return OfflineQueueStatus.duplicated;
      case 'RECHAZADA':
        return OfflineQueueStatus.rejected;
      case 'REQUIERE_REVISION':
        return OfflineQueueStatus.review;
      default:
        return OfflineQueueStatus.pending;
    }
  }
}

class OfflineQueueItem {
  const OfflineQueueItem({
    required this.localId,
    required this.credentialId,
    required this.sequence,
    required this.content,
    required this.signature,
    required this.keyFingerprint,
    required this.createdAt,
    required this.estimatedEpochMs,
    required this.scheduleId,
    required this.courseName,
    required this.classroom,
    required this.stationName,
    required this.stationCode,
    required this.status,
    required this.attempts,
    this.message,
    this.syncedAt,
  });

  final String localId;
  final String credentialId;
  final int sequence;
  final String content;
  final String signature;
  final String keyFingerprint;
  final DateTime createdAt;
  final int estimatedEpochMs;
  final int scheduleId;
  final String courseName;
  final String classroom;
  final String stationName;
  final String stationCode;
  final OfflineQueueStatus status;
  final int attempts;
  final String? message;
  final DateTime? syncedAt;

  bool get isPending =>
      status == OfflineQueueStatus.pending ||
      status == OfflineQueueStatus.syncing;

  factory OfflineQueueItem.fromJson(Map<String, dynamic> json) {
    return OfflineQueueItem(
      localId: (json['localId'] ?? '').toString(),
      credentialId: (json['credentialId'] ?? '').toString(),
      sequence: int.tryParse((json['sequence'] ?? 0).toString()) ?? 0,
      content: (json['content'] ?? '').toString(),
      signature: (json['signature'] ?? '').toString(),
      keyFingerprint: (json['keyFingerprint'] ?? '').toString(),
      createdAt: DateTime.parse((json['createdAt'] ?? '').toString()),
      estimatedEpochMs:
          int.tryParse((json['estimatedEpochMs'] ?? 0).toString()) ?? 0,
      scheduleId: int.tryParse((json['scheduleId'] ?? 0).toString()) ?? 0,
      courseName: (json['courseName'] ?? '').toString(),
      classroom: (json['classroom'] ?? '').toString(),
      stationName: (json['stationName'] ?? '').toString(),
      stationCode: (json['stationCode'] ?? '').toString(),
      status: OfflineQueueStatusValue.parse(
        (json['status'] ?? 'PENDIENTE').toString(),
      ),
      attempts: int.tryParse((json['attempts'] ?? 0).toString()) ?? 0,
      message: json['message']?.toString(),
      syncedAt: json['syncedAt'] == null
          ? null
          : DateTime.tryParse(json['syncedAt'].toString()),
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
    'localId': localId,
    'credentialId': credentialId,
    'sequence': sequence,
    'content': content,
    'signature': signature,
    'keyFingerprint': keyFingerprint,
    'createdAt': createdAt.toIso8601String(),
    'estimatedEpochMs': estimatedEpochMs,
    'scheduleId': scheduleId,
    'courseName': courseName,
    'classroom': classroom,
    'stationName': stationName,
    'stationCode': stationCode,
    'status': status.apiValue,
    'attempts': attempts,
    'message': message,
    'syncedAt': syncedAt?.toIso8601String(),
  };

  Map<String, dynamic> toSyncJson() => <String, dynamic>{
    'localId': localId,
    'content': content,
    'signature': signature,
    'keyFingerprint': keyFingerprint,
  };

  OfflineQueueItem copyWith({
    OfflineQueueStatus? status,
    int? attempts,
    String? message,
    DateTime? syncedAt,
  }) {
    return OfflineQueueItem(
      localId: localId,
      credentialId: credentialId,
      sequence: sequence,
      content: content,
      signature: signature,
      keyFingerprint: keyFingerprint,
      createdAt: createdAt,
      estimatedEpochMs: estimatedEpochMs,
      scheduleId: scheduleId,
      courseName: courseName,
      classroom: classroom,
      stationName: stationName,
      stationCode: stationCode,
      status: status ?? this.status,
      attempts: attempts ?? this.attempts,
      message: message ?? this.message,
      syncedAt: syncedAt ?? this.syncedAt,
    );
  }
}

class OfflineSyncItemResult {
  const OfflineSyncItemResult({
    required this.localId,
    required this.status,
    required this.message,
    this.code,
  });

  final String localId;
  final OfflineQueueStatus status;
  final String message;
  final String? code;

  factory OfflineSyncItemResult.fromJson(Map<String, dynamic> json) {
    return OfflineSyncItemResult(
      localId: (json['localId'] ?? '').toString(),
      status: OfflineQueueStatusValue.parse(
        (json['status'] ?? 'RECHAZADA').toString(),
      ),
      message: (json['message'] ?? '').toString(),
      code: json['code']?.toString(),
    );
  }
}

class OfflineSyncResponse {
  const OfflineSyncResponse({
    required this.batchId,
    required this.state,
    required this.message,
    required this.results,
  });

  final String batchId;
  final String state;
  final String message;
  final List<OfflineSyncItemResult> results;

  factory OfflineSyncResponse.fromJson(Map<String, dynamic> json) {
    final Object? rawResults = json['results'];
    return OfflineSyncResponse(
      batchId: (json['batchId'] ?? '').toString(),
      state: (json['state'] ?? '').toString(),
      message: (json['message'] ?? '').toString(),
      results: rawResults is List<Object?>
          ? rawResults
                .whereType<Map<String, dynamic>>()
                .map(OfflineSyncItemResult.fromJson)
                .toList()
          : <OfflineSyncItemResult>[],
    );
  }
}

String generateUuidV4() {
  final Random random = Random.secure();
  final List<int> bytes = List<int>.generate(16, (_) => random.nextInt(256));
  bytes[6] = (bytes[6] & 0x0F) | 0x40;
  bytes[8] = (bytes[8] & 0x3F) | 0x80;
  final String hex = bytes
      .map((int value) => value.toRadixString(16).padLeft(2, '0'))
      .join();
  return '${hex.substring(0, 8)}-'
      '${hex.substring(8, 12)}-'
      '${hex.substring(12, 16)}-'
      '${hex.substring(16, 20)}-'
      '${hex.substring(20)}';
}

Map<String, dynamic> buildOfflinePayload({
  required OfflineCredential credential,
  required OfflineSchedule schedule,
  required String localId,
  required int sequence,
  required int estimatedEpochMs,
  required TrustedClock clock,
  required List<BlePresenceProof> bleProofs,
}) {
  final BlePresenceProof? strongest = bleProofs.isEmpty
      ? null
      : bleProofs.first;

  return <String, dynamic>{
    'version': 1,
    'type': 'UNSAAC_OFFLINE_ATTENDANCE',
    'localId': localId,
    'credentialId': credential.id,
    'installationId': credential.installationId,
    'deviceId': credential.deviceId,
    'teacherId': credential.teacher.id,
    'teacherCode': credential.teacher.code,
    'scheduleId': schedule.id,
    'stationId': strongest?.stationId,
    'sequence': sequence,
    'estimatedEpochMs': estimatedEpochMs,
    'estimatedAt': DateTime.fromMillisecondsSinceEpoch(
      estimatedEpochMs,
      isUtc: true,
    ).toIso8601String(),
    'currentElapsedRealtimeMs': clock.elapsedRealtimeMs,
    'wallClockMs': clock.wallClockMs,
    'bootCount': clock.bootCount,
    'clock': <String, dynamic>{
      'anchorServerEpochMs': credential.serverEpochMs,
      'anchorElapsedRealtimeMs': credential.anchorElapsedRealtimeMs,
      'trustedBeforeSigning': credential.isClockTrusted(clock),
    },
    'bleProofs': bleProofs
        .map((BlePresenceProof proof) => proof.toJson())
        .toList(),
  };
}
