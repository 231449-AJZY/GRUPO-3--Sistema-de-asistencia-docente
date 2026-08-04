import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:unsaac_asistencia_movil/models/ble_station.dart';

void main() {
  test('interpreta un QR de provisionamiento BLE vigente', () {
    final String rawValue = jsonEncode(<String, dynamic>{
      'type': 'UNSAAC_BLE_STATION_PROVISION',
      'version': 1,
      'requestId': 'cbe2da50-9021-4d7d-a884-5550bdb602a6',
      'token': 'token_de_prueba_con_longitud_suficiente_123456',
      'stationId': 7,
      'stationCode': 'UNSAAC-AULA-101',
      'stationName': 'Aula 101',
      'expiresAt': DateTime.now()
          .add(const Duration(minutes: 5))
          .toUtc()
          .toIso8601String(),
    });

    final BleStationProvisionQr qr = BleStationProvisionQr.parse(rawValue);

    expect(qr.stationId, 7);
    expect(qr.stationCode, 'UNSAAC-AULA-101');
  });

  test('serializa una prueba de presencia BLE', () {
    const BlePresenceProof proof = BlePresenceProof(
      stationId: 7,
      timeSlot: 117000000,
      token: '0011223344556677',
      rssiAverage: -62.5,
      rssiMin: -70,
      rssiMax: -58,
      samples: 8,
      address: 'AA:BB:CC:DD:EE:FF',
      name: 'Estación UNSAAC',
    );

    final Map<String, dynamic> json = proof.toJson();

    expect(json['stationId'], 7);
    expect(json['token'], '0011223344556677');
    expect(json['samples'], 8);
  });

  test('interpreta el perfil almacenado de una estación', () {
    const BleStationProfile original = BleStationProfile(
      id: 7,
      code: 'UNSAAC-AULA-101',
      name: 'Aula 101',
      type: 'AULA',
      classroom: 'A-101',
      department: 'Ingeniería de Sistemas',
      minimumRssi: -75,
      minimumSamples: 3,
      rotationSeconds: 15,
      secret: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
      state: 'ACTIVA',
    );

    final BleStationProfile restored = BleStationProfile.fromStoredJson(
      original.toStoredJson(),
    );

    expect(restored.id, original.id);
    expect(restored.classroom, 'A-101');
    expect(restored.isValid, isTrue);
  });
}
