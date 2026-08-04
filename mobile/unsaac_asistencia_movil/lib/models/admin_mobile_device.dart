class AdminMobileDevice {
  const AdminMobileDevice({
    required this.id,
    required this.teacherCode,
    required this.teacherName,
    required this.manufacturer,
    required this.model,
    required this.systemVersion,
    required this.appVersion,
    required this.state,
    required this.biometricAvailable,
    this.email,
    this.department,
    this.keyFingerprint,
    this.biometricTypes,
    this.stateReason,
    this.createdAt,
    this.updatedAt,
    this.authorizedAt,
  });

  final int id;
  final String teacherCode;
  final String teacherName;
  final String manufacturer;
  final String model;
  final String systemVersion;
  final String appVersion;
  final String state;
  final bool biometricAvailable;
  final String? email;
  final String? department;
  final String? keyFingerprint;
  final String? biometricTypes;
  final String? stateReason;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final DateTime? authorizedAt;

  bool get isPending => state == 'PENDIENTE';
  bool get isAuthorized => state == 'AUTORIZADO';
  bool get isSuspended => state == 'SUSPENDIDO';

  String get deviceLabel {
    final String value = '$manufacturer $model'.trim();
    return value.isEmpty ? 'Dispositivo Android' : value;
  }

  factory AdminMobileDevice.fromJson(Map<String, dynamic> json) {
    int parseInt(Object? value) {
      if (value is int) {
        return value;
      }
      return int.tryParse(value?.toString() ?? '') ?? 0;
    }

    DateTime? parseDate(Object? value) {
      return DateTime.tryParse(value?.toString() ?? '');
    }

    final String names = (json['nombres'] ?? '').toString().trim();
    final String surnames = (json['apellidos'] ?? '').toString().trim();

    return AdminMobileDevice(
      id: parseInt(json['id']),
      teacherCode: (json['codigo_docente'] ?? '').toString(),
      teacherName: '$names $surnames'.trim(),
      manufacturer: (json['fabricante'] ?? '').toString(),
      model: (json['modelo'] ?? '').toString(),
      systemVersion: (json['version_sistema'] ?? '').toString(),
      appVersion: (json['version_aplicacion'] ?? '').toString(),
      state: (json['estado'] ?? '').toString().toUpperCase(),
      biometricAvailable: json['biometria_disponible'] == true,
      email: json['email']?.toString(),
      department: json['departamento']?.toString(),
      keyFingerprint: json['huella_clave']?.toString(),
      biometricTypes: json['tipos_biometria']?.toString(),
      stateReason: json['motivo_estado']?.toString(),
      createdAt: parseDate(json['creado_en']),
      updatedAt: parseDate(json['actualizado_en']),
      authorizedAt: parseDate(json['autorizado_en']),
    );
  }
}

class AdminDeviceSummary {
  const AdminDeviceSummary({
    required this.total,
    required this.pending,
    required this.authorized,
    required this.suspended,
    required this.rejected,
    required this.revoked,
  });

  final int total;
  final int pending;
  final int authorized;
  final int suspended;
  final int rejected;
  final int revoked;

  factory AdminDeviceSummary.empty() {
    return const AdminDeviceSummary(
      total: 0,
      pending: 0,
      authorized: 0,
      suspended: 0,
      rejected: 0,
      revoked: 0,
    );
  }

  factory AdminDeviceSummary.fromJson(Map<String, dynamic> json) {
    int parseInt(Object? value) {
      if (value is int) {
        return value;
      }
      return int.tryParse(value?.toString() ?? '') ?? 0;
    }

    return AdminDeviceSummary(
      total: parseInt(json['total']),
      pending: parseInt(json['pendientes']),
      authorized: parseInt(json['autorizados']),
      suspended: parseInt(json['suspendidos']),
      rejected: parseInt(json['rechazados']),
      revoked: parseInt(json['revocados']),
    );
  }
}

class AdminDevicePortalData {
  const AdminDevicePortalData({
    required this.devices,
    required this.summary,
  });

  final List<AdminMobileDevice> devices;
  final AdminDeviceSummary summary;
}
