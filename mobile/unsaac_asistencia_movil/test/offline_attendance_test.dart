import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:unsaac_asistencia_movil/models/ble_station.dart';
import 'package:unsaac_asistencia_movil/models/offline_attendance.dart';

void main() {
  group('Credencial offline', () {
    late OfflineCredential credential;

    setUp(() {
      credential = OfflineCredential.fromApi(<String, dynamic>{
        'id': '11111111-2222-4333-8444-555555555555',
        'issuedAt': '2026-07-22T18:00:00.000Z',
        'expiresAt': '2026-07-23T18:00:00.000Z',
        'serverEpochMs': 1753207200000,
        'anchorElapsedRealtimeMs': 100000,
        'bootCount': 8,
        'maxAgeHours': 12,
        'maxPending': 50,
        'clockToleranceSeconds': 180,
        'installationId': 'installation-demo-1234567890',
        'deviceId': 10,
        'keyFingerprint': List<String>.filled(64, 'a').join(),
        'teacher': <String, dynamic>{
          'id': 5,
          'code': 'DOC-001',
          'names': 'Pedro',
          'surnames': 'Quispe Mamani',
          'email': 'pedro@unsaac.edu.pe',
          'department': 'Arquitectura',
        },
        'attendance': <String, dynamic>{
          'beforeMinutes': 15,
          'afterMinutes': 10,
        },
        'schedules': <Map<String, dynamic>>[
          <String, dynamic>{
            'id': 99,
            'dayOfWeek': 2,
            'startTime': '13:00:00',
            'endTime': '14:30:00',
            'classroom': 'ARQ-101',
            'courseCode': 'ARQ-101',
            'courseName': 'Taller de Diseño',
            'semester': '2026-I',
            'semesterStart': '2026-03-01',
            'semesterEnd': '2026-07-31',
          },
        ],
      });
    });

    test('estima el tiempo con elapsedRealtime', () {
      const TrustedClock clock = TrustedClock(
        wallClockMs: 999,
        elapsedRealtimeMs: 160000,
        bootCount: 8,
      );

      expect(
        credential.estimatedEpochMs(clock),
        credential.serverEpochMs + 60000,
      );
      expect(credential.isClockTrusted(clock), isTrue);
    });

    test('detecta reinicio del dispositivo', () {
      const TrustedClock clock = TrustedClock(
        wallClockMs: 999,
        elapsedRealtimeMs: 5000,
        bootCount: 9,
      );

      expect(credential.isClockTrusted(clock), isFalse);
    });

    test('serializa y recupera la credencial', () {
      final OfflineCredential restored = OfflineCredential.fromStoredJson(
        credential.toStoredJson(),
      );

      expect(restored.teacher.fullName, 'Pedro Quispe Mamani');
      expect(restored.schedules.single.courseName, 'Taller de Diseño');
      expect(restored.keyFingerprint.length, 64);
    });

    test('construye una carga firmable estable', () {
      const TrustedClock clock = TrustedClock(
        wallClockMs: 1753207260000,
        elapsedRealtimeMs: 160000,
        bootCount: 8,
      );
      const BlePresenceProof proof = BlePresenceProof(
        stationId: 4,
        timeSlot: 100,
        token: '0123456789abcdef',
        rssiAverage: -62.5,
        rssiMin: -70,
        rssiMax: -55,
        samples: 4,
        address: '00:11:22:33:44:55',
        name: 'UNSAAC-BLE-4',
      );

      final Map<String, dynamic> payload = buildOfflinePayload(
        credential: credential,
        schedule: credential.schedules.single,
        localId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
        sequence: 1,
        estimatedEpochMs: credential.estimatedEpochMs(clock),
        clock: clock,
        bleProofs: const <BlePresenceProof>[proof],
      );

      final Map<String, dynamic> decoded =
          jsonDecode(jsonEncode(payload)) as Map<String, dynamic>;
      expect(decoded['type'], 'UNSAAC_OFFLINE_ATTENDANCE');
      expect(decoded['scheduleId'], 99);
      expect(decoded['stationId'], 4);
      expect((decoded['bleProofs'] as List<Object?>).length, 1);
    });
  });

  test('genera UUID versión 4', () {
    final String value = generateUuidV4();
    expect(
      RegExp(
        r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
      ).hasMatch(value),
      isTrue,
    );
  });
}
