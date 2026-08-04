import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:unsaac_asistencia_movil/models/mobile_device.dart';

void main() {
  test('interpreta un QR institucional válido', () {
    final String raw = jsonEncode(<String, dynamic>{
      'version': 1,
      'type': 'UNSAAC_DEVICE_LINK',
      'token': 'abcdefghijklmnopqrstuvwxyz1234567890',
      'teacherCode': 'DOC-00025',
      'expiresAt': '2099-07-22T12:00:00.000Z',
    });

    final DeviceLinkQrPayload payload = DeviceLinkQrPayload.parse(raw);

    expect(payload.teacherCode, 'DOC-00025');
    expect(payload.token, contains('abcdef'));
  });

  test('rechaza un QR ajeno al sistema', () {
    expect(
      () => DeviceLinkQrPayload.parse(
        jsonEncode(<String, dynamic>{
          'version': 1,
          'type': 'OTRO_SISTEMA',
          'token': 'abcdefghijklmnopqrstuvwxyz1234567890',
          'teacherCode': 'DOC-00025',
          'expiresAt': '2099-07-22T12:00:00.000Z',
        }),
      ),
      throwsFormatException,
    );
  });
}
