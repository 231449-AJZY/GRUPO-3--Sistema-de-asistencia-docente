import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:unsaac_asistencia_movil/models/mobile_device.dart';

void main() {
  test('acepta QR administrativo de sincronización y autorización', () {
    final String payload = jsonEncode(<String, Object>{
      'version': 1,
      'type': 'UNSAAC_DEVICE_LINK',
      'purpose': 'SYNC_AND_AUTHORIZE',
      'token': 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG',
      'expiresAt': DateTime.now()
          .toUtc()
          .add(const Duration(minutes: 5))
          .toIso8601String(),
      'teacherCode': 'DOC001',
    });

    final DeviceLinkQrPayload qr = DeviceLinkQrPayload.parse(payload);

    expect(qr.teacherCode, 'DOC001');
    expect(qr.token, isNotEmpty);
  });
}
