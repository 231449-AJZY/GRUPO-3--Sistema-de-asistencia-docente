class DeviceStatus {
  const DeviceStatus({
    required this.manufacturer,
    required this.model,
    required this.androidVersion,
    required this.sdkInt,
    required this.bluetoothSupported,
    required this.bluetoothEnabled,
    required this.bluetoothPermissionGranted,
    required this.bleAdvertisingSupported,
    required this.bleAdvertisingActive,
  });

  final String manufacturer;
  final String model;
  final String androidVersion;
  final int sdkInt;
  final bool bluetoothSupported;
  final bool bluetoothEnabled;
  final bool bluetoothPermissionGranted;
  final bool bleAdvertisingSupported;
  final bool bleAdvertisingActive;

  String get deviceLabel => '$manufacturer $model'.trim();

  factory DeviceStatus.empty() {
    return const DeviceStatus(
      manufacturer: 'Dispositivo',
      model: 'Android',
      androidVersion: '-',
      sdkInt: 0,
      bluetoothSupported: false,
      bluetoothEnabled: false,
      bluetoothPermissionGranted: false,
      bleAdvertisingSupported: false,
      bleAdvertisingActive: false,
    );
  }

  factory DeviceStatus.fromJson(Map<Object?, Object?> json) {
    return DeviceStatus(
      manufacturer: (json['manufacturer'] ?? 'Dispositivo').toString(),
      model: (json['model'] ?? 'Android').toString(),
      androidVersion: (json['androidVersion'] ?? '-').toString(),
      sdkInt: int.tryParse((json['sdkInt'] ?? 0).toString()) ?? 0,
      bluetoothSupported: json['bluetoothSupported'] == true,
      bluetoothEnabled: json['bluetoothEnabled'] == true,
      bluetoothPermissionGranted: json['bluetoothPermissionGranted'] == true,
      bleAdvertisingSupported: json['bleAdvertisingSupported'] == true,
      bleAdvertisingActive: json['bleAdvertisingActive'] == true,
    );
  }
}

class BleDeviceResult {
  const BleDeviceResult({
    required this.name,
    required this.address,
    required this.rssi,
  });

  final String name;
  final String address;
  final int rssi;

  bool get isInstitutional => name.toUpperCase().startsWith('UNSAAC');

  factory BleDeviceResult.fromJson(Map<Object?, Object?> json) {
    return BleDeviceResult(
      name: (json['name'] ?? 'Dispositivo sin nombre').toString(),
      address: (json['address'] ?? '').toString(),
      rssi: int.tryParse((json['rssi'] ?? 0).toString()) ?? 0,
    );
  }
}
