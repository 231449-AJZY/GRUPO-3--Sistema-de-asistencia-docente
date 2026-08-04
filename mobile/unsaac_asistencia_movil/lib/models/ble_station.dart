import 'dart:convert';

class BleStationProvisionQr {
  const BleStationProvisionQr({
    required this.requestId,
    required this.token,
    required this.stationId,
    required this.stationCode,
    required this.stationName,
    required this.expiresAt,
  });

  final String requestId;
  final String token;
  final int stationId;
  final String stationCode;
  final String stationName;
  final DateTime expiresAt;

  factory BleStationProvisionQr.parse(String rawValue) {
    final Object? decoded = jsonDecode(rawValue);
    if (decoded is! Map<String, dynamic>) {
      throw const FormatException('El QR de estación no es válido.');
    }

    if (decoded['type'] != 'UNSAAC_BLE_STATION_PROVISION' ||
        decoded['version'] != 1) {
      throw const FormatException(
        'El QR no corresponde a una estación Bluetooth UNSAAC.',
      );
    }

    final String requestId = (decoded['requestId'] ?? '').toString();
    final String token = (decoded['token'] ?? '').toString();
    final int? stationId = int.tryParse(
      (decoded['stationId'] ?? '').toString(),
    );
    final String stationCode = (decoded['stationCode'] ?? '').toString();
    final String stationName = (decoded['stationName'] ?? '').toString();
    final DateTime? expiresAt = DateTime.tryParse(
      (decoded['expiresAt'] ?? '').toString(),
    );

    if (requestId.length != 36 ||
        token.length < 30 ||
        stationId == null ||
        stationId <= 0 ||
        stationCode.isEmpty ||
        stationName.isEmpty ||
        expiresAt == null) {
      throw const FormatException('El QR de estación está incompleto.');
    }

    if (expiresAt.isBefore(DateTime.now())) {
      throw const FormatException('El QR de estación ya venció.');
    }

    return BleStationProvisionQr(
      requestId: requestId,
      token: token,
      stationId: stationId,
      stationCode: stationCode,
      stationName: stationName,
      expiresAt: expiresAt,
    );
  }
}

class BleStationProfile {
  const BleStationProfile({
    required this.id,
    required this.code,
    required this.name,
    required this.type,
    required this.minimumRssi,
    required this.minimumSamples,
    required this.rotationSeconds,
    required this.secret,
    required this.state,
    this.classroom,
    this.department,
  });

  final int id;
  final String code;
  final String name;
  final String type;
  final String? classroom;
  final String? department;
  final int minimumRssi;
  final int minimumSamples;
  final int rotationSeconds;
  final String secret;
  final String state;

  factory BleStationProfile.fromApi(Map<String, dynamic> json) {
    return BleStationProfile(
      id: int.tryParse((json['id'] ?? '').toString()) ?? 0,
      code: (json['codigo'] ?? '').toString(),
      name: (json['nombre'] ?? '').toString(),
      type: (json['tipo'] ?? '').toString(),
      classroom: json['aula']?.toString(),
      department: json['departamento']?.toString(),
      minimumRssi: int.tryParse((json['rssi_minimo'] ?? -75).toString()) ?? -75,
      minimumSamples:
          int.tryParse((json['muestras_minimas'] ?? 3).toString()) ?? 3,
      rotationSeconds:
          int.tryParse((json['intervalo_rotacion_seg'] ?? 15).toString()) ?? 15,
      secret: (json['secreto'] ?? '').toString(),
      state: (json['estado'] ?? '').toString(),
    );
  }

  factory BleStationProfile.fromStoredJson(String rawValue) {
    final Object? decoded = jsonDecode(rawValue);
    if (decoded is! Map<String, dynamic>) {
      throw const FormatException('Perfil de estación inválido.');
    }
    return BleStationProfile(
      id: int.tryParse((decoded['id'] ?? '').toString()) ?? 0,
      code: (decoded['code'] ?? '').toString(),
      name: (decoded['name'] ?? '').toString(),
      type: (decoded['type'] ?? '').toString(),
      classroom: decoded['classroom']?.toString(),
      department: decoded['department']?.toString(),
      minimumRssi:
          int.tryParse((decoded['minimumRssi'] ?? -75).toString()) ?? -75,
      minimumSamples:
          int.tryParse((decoded['minimumSamples'] ?? 3).toString()) ?? 3,
      rotationSeconds:
          int.tryParse((decoded['rotationSeconds'] ?? 15).toString()) ?? 15,
      secret: (decoded['secret'] ?? '').toString(),
      state: (decoded['state'] ?? '').toString(),
    );
  }

  String toStoredJson() => jsonEncode(<String, dynamic>{
    'id': id,
    'code': code,
    'name': name,
    'type': type,
    'classroom': classroom,
    'department': department,
    'minimumRssi': minimumRssi,
    'minimumSamples': minimumSamples,
    'rotationSeconds': rotationSeconds,
    'secret': secret,
    'state': state,
  });

  bool get isValid =>
      id > 0 &&
      code.isNotEmpty &&
      name.isNotEmpty &&
      secret.isNotEmpty &&
      rotationSeconds >= 5;
}

class BlePresenceProof {
  const BlePresenceProof({
    required this.stationId,
    required this.timeSlot,
    required this.token,
    required this.rssiAverage,
    required this.rssiMin,
    required this.rssiMax,
    required this.samples,
    required this.address,
    required this.name,
  });

  final int stationId;
  final int timeSlot;
  final String token;
  final double rssiAverage;
  final int rssiMin;
  final int rssiMax;
  final int samples;
  final String address;
  final String name;

  factory BlePresenceProof.fromPlatform(Map<Object?, Object?> json) {
    return BlePresenceProof(
      stationId: int.tryParse((json['stationId'] ?? 0).toString()) ?? 0,
      timeSlot: int.tryParse((json['timeSlot'] ?? 0).toString()) ?? 0,
      token: (json['token'] ?? '').toString(),
      rssiAverage:
          double.tryParse((json['rssiAverage'] ?? -130).toString()) ?? -130,
      rssiMin: int.tryParse((json['rssiMin'] ?? -130).toString()) ?? -130,
      rssiMax: int.tryParse((json['rssiMax'] ?? -130).toString()) ?? -130,
      samples: int.tryParse((json['samples'] ?? 0).toString()) ?? 0,
      address: (json['address'] ?? '').toString(),
      name: (json['name'] ?? 'Estación UNSAAC').toString(),
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
    'stationId': stationId,
    'timeSlot': timeSlot,
    'token': token,
    'rssiAverage': rssiAverage,
    'rssiMin': rssiMin,
    'rssiMax': rssiMax,
    'samples': samples,
    'address': address,
    'name': name,
  };
}

class BleAdvertisingStatus {
  const BleAdvertisingStatus({
    required this.active,
    required this.starting,
    this.stationId,
    this.stationCode,
    this.intervalSeconds = 15,
    this.timeSlot,
  });

  final bool active;
  final bool starting;
  final int? stationId;
  final String? stationCode;
  final int intervalSeconds;
  final int? timeSlot;

  factory BleAdvertisingStatus.fromPlatform(Map<Object?, Object?> json) {
    return BleAdvertisingStatus(
      active: json['active'] == true,
      starting: json['starting'] == true,
      stationId: int.tryParse((json['stationId'] ?? '').toString()),
      stationCode: json['stationCode']?.toString(),
      intervalSeconds:
          int.tryParse((json['intervalSeconds'] ?? 15).toString()) ?? 15,
      timeSlot: int.tryParse((json['timeSlot'] ?? '').toString()),
    );
  }
}
