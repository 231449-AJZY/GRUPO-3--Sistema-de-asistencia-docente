import 'dart:convert';

class DeviceIdentity {
  const DeviceIdentity({
    required this.installationId,
    required this.publicKey,
    required this.keyFingerprint,
    required this.algorithm,
  });

  final String installationId;
  final String publicKey;
  final String keyFingerprint;
  final String algorithm;

  factory DeviceIdentity.fromPlatform(Map<Object?, Object?> json) {
    return DeviceIdentity(
      installationId: (json['installationId'] ?? '').toString(),
      publicKey: (json['publicKey'] ?? '').toString(),
      keyFingerprint: (json['keyFingerprint'] ?? '').toString(),
      algorithm: (json['algorithm'] ?? 'EC_P256_SHA256').toString(),
    );
  }
}

class DeviceLinkQrPayload {
  const DeviceLinkQrPayload({
    required this.token,
    required this.teacherCode,
    required this.expiresAt,
  });

  final String token;
  final String teacherCode;
  final DateTime expiresAt;

  static DeviceLinkQrPayload parse(String rawValue) {
    final Object? decoded = jsonDecode(rawValue.trim());

    if (decoded is! Map<String, dynamic>) {
      throw const FormatException('El QR no contiene una vinculación válida.');
    }

    if (decoded['type']?.toString() != 'UNSAAC_DEVICE_LINK' ||
        decoded['version']?.toString() != '1') {
      throw const FormatException('El QR no pertenece al sistema UNSAAC.');
    }

    final String token = decoded['token']?.toString().trim() ?? '';
    final String teacherCode =
        decoded['teacherCode']?.toString().trim().toUpperCase() ?? '';
    final DateTime? expiresAt = DateTime.tryParse(
      decoded['expiresAt']?.toString() ?? '',
    );

    if (token.length < 20 || teacherCode.isEmpty || expiresAt == null) {
      throw const FormatException('El QR está incompleto o dañado.');
    }

    if (expiresAt.isBefore(DateTime.now().toUtc())) {
      throw const FormatException('El código QR ya venció.');
    }

    return DeviceLinkQrPayload(
      token: token,
      teacherCode: teacherCode,
      expiresAt: expiresAt,
    );
  }
}

class LinkedMobileDevice {
  const LinkedMobileDevice({
    required this.id,
    required this.installationId,
    required this.manufacturer,
    required this.model,
    required this.systemVersion,
    required this.appVersion,
    required this.keyFingerprint,
    required this.state,
    required this.biometricAvailable,
    required this.biometricTypes,
    this.stateReason,
    this.authorizedAt,
    this.updatedAt,
  });

  final int id;
  final String installationId;
  final String manufacturer;
  final String model;
  final String systemVersion;
  final String appVersion;
  final String keyFingerprint;
  final String state;
  final bool biometricAvailable;
  final String biometricTypes;
  final String? stateReason;
  final DateTime? authorizedAt;
  final DateTime? updatedAt;

  bool get isAuthorized => state == 'AUTORIZADO';
  bool get isPending => state == 'PENDIENTE';
  bool get isSuspended => state == 'SUSPENDIDO';
  bool get isRejected => state == 'RECHAZADO';
  bool get isRevoked => state == 'REVOCADO';

  String get deviceLabel => '$manufacturer $model'.trim();

  factory LinkedMobileDevice.fromJson(Map<String, dynamic> json) {
    int parseInt(Object? value) {
      if (value is int) {
        return value;
      }
      return int.tryParse(value?.toString() ?? '') ?? 0;
    }

    return LinkedMobileDevice(
      id: parseInt(json['id']),
      installationId: (json['uuid_instalacion'] ?? '').toString(),
      manufacturer: (json['fabricante'] ?? '').toString(),
      model: (json['modelo'] ?? '').toString(),
      systemVersion: (json['version_sistema'] ?? '').toString(),
      appVersion: (json['version_aplicacion'] ?? '').toString(),
      keyFingerprint: (json['huella_clave'] ?? '').toString(),
      state: (json['estado'] ?? '').toString().toUpperCase(),
      biometricAvailable: json['biometria_disponible'] == true,
      biometricTypes: (json['tipos_biometria'] ?? '').toString(),
      stateReason: json['motivo_estado']?.toString(),
      authorizedAt: DateTime.tryParse(json['autorizado_en']?.toString() ?? ''),
      updatedAt: DateTime.tryParse(json['actualizado_en']?.toString() ?? ''),
    );
  }
}

class QuickDeviceValidation {
  const QuickDeviceValidation({
    required this.teacherCode,
    required this.teacherName,
    required this.deviceId,
  });

  final String teacherCode;
  final String teacherName;
  final int deviceId;

  factory QuickDeviceValidation.fromJson(Map<String, dynamic> json) {
    final Object? teacherRaw = json['docente'];
    final Object? deviceRaw = json['dispositivo'];
    final Map<String, dynamic> teacher = teacherRaw is Map<String, dynamic>
        ? teacherRaw
        : <String, dynamic>{};
    final Map<String, dynamic> device = deviceRaw is Map<String, dynamic>
        ? deviceRaw
        : <String, dynamic>{};

    return QuickDeviceValidation(
      teacherCode: (teacher['codigo'] ?? '').toString(),
      teacherName: '${teacher['nombres'] ?? ''} ${teacher['apellidos'] ?? ''}'
          .trim(),
      deviceId: int.tryParse(device['id']?.toString() ?? '') ?? 0,
    );
  }
}
