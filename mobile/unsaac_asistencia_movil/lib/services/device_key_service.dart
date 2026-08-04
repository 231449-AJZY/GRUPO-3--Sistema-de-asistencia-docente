import 'package:flutter/services.dart';

import '../models/mobile_attendance.dart';
import '../models/mobile_device.dart';

class DeviceKeyService {
  static const MethodChannel _channel = MethodChannel(
    'pe.edu.unsaac.asistencia/device_keys',
  );

  Future<DeviceIdentity> getOrCreateIdentity() async {
    final Map<Object?, Object?>? result = await _channel
        .invokeMapMethod<Object?, Object?>('getOrCreateIdentity');

    return _parseIdentity(result, 'Android no devolvió la identidad.');
  }

  Future<DeviceIdentity?> getIdentity() async {
    final Map<Object?, Object?>? result = await _channel
        .invokeMapMethod<Object?, Object?>('getIdentity');

    if (result == null) {
      return null;
    }

    return _parseIdentity(result, 'La identidad del celular está incompleta.');
  }

  Future<DeviceIdentity> getOrCreateAttendanceIdentity() async {
    final Map<Object?, Object?>? result = await _channel
        .invokeMapMethod<Object?, Object?>('getOrCreateAttendanceIdentity');

    return _parseIdentity(
      result,
      'Android no devolvió la clave biométrica de asistencia.',
    );
  }

  Future<DeviceIdentity?> getAttendanceIdentity() async {
    final Map<Object?, Object?>? result = await _channel
        .invokeMapMethod<Object?, Object?>('getAttendanceIdentity');

    if (result == null) {
      return null;
    }

    return _parseIdentity(
      result,
      'La clave biométrica de asistencia está incompleta.',
    );
  }

  Future<AttendanceSignatureResult> signAttendancePayload(
    String payload,
  ) async {
    final Map<Object?, Object?>? result = await _channel
        .invokeMapMethod<Object?, Object?>(
          'signAttendancePayload',
          <String, Object?>{'payload': payload},
        );

    if (result == null) {
      throw PlatformException(
        code: 'SIGNATURE_EMPTY',
        message: 'Android no devolvió la firma de asistencia.',
      );
    }

    final AttendanceSignatureResult signature =
        AttendanceSignatureResult.fromPlatform(result);

    if (signature.signature.isEmpty ||
        signature.keyFingerprint.length != 64 ||
        signature.algorithm.isEmpty) {
      throw PlatformException(
        code: 'SIGNATURE_INVALID',
        message: 'La firma biométrica quedó incompleta.',
      );
    }

    return signature;
  }

  DeviceIdentity _parseIdentity(Map<Object?, Object?>? result, String message) {
    if (result == null) {
      throw PlatformException(code: 'IDENTITY_EMPTY', message: message);
    }

    final DeviceIdentity identity = DeviceIdentity.fromPlatform(result);

    if (identity.installationId.isEmpty ||
        identity.publicKey.isEmpty ||
        identity.keyFingerprint.length != 64) {
      throw PlatformException(code: 'IDENTITY_INVALID', message: message);
    }

    return identity;
  }
}
