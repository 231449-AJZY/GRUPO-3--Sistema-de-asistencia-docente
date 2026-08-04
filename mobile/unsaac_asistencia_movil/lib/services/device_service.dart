import 'package:flutter/services.dart';

import '../models/ble_station.dart';
import '../models/device_status.dart';
import '../models/offline_attendance.dart';

class DeviceService {
  static const MethodChannel _channel = MethodChannel(
    'pe.edu.unsaac.asistencia/device',
  );

  Future<DeviceStatus> getStatus() async {
    final Map<Object?, Object?>? response = await _channel
        .invokeMapMethod<Object?, Object?>('getStatus');
    return DeviceStatus.fromJson(response ?? <Object?, Object?>{});
  }

  Future<TrustedClock> getTrustedClock() async {
    final Map<Object?, Object?>? response = await _channel
        .invokeMapMethod<Object?, Object?>('getTrustedClock');

    return TrustedClock.fromPlatform(response ?? <Object?, Object?>{});
  }

  Future<bool> requestBluetoothPermissions() async {
    return await _channel.invokeMethod<bool>('requestBluetoothPermissions') ??
        false;
  }

  Future<void> openBluetoothSettings() async {
    await _channel.invokeMethod<void>('openBluetoothSettings');
  }

  Future<List<BleDeviceResult>> scanBleStations() async {
    final List<Object?>? response = await _channel.invokeListMethod<Object?>(
      'scanBleStations',
    );

    return (response ?? <Object?>[])
        .whereType<Map<Object?, Object?>>()
        .map(BleDeviceResult.fromJson)
        .toList();
  }

  Future<List<BlePresenceProof>> scanAttendanceStations() async {
    final List<Object?>? response = await _channel.invokeListMethod<Object?>(
      'scanAttendanceStations',
    );

    return (response ?? <Object?>[])
        .whereType<Map<Object?, Object?>>()
        .map(BlePresenceProof.fromPlatform)
        .where(
          (BlePresenceProof proof) =>
              proof.stationId > 0 &&
              proof.token.length == 16 &&
              proof.samples > 0,
        )
        .toList();
  }

  Future<BleAdvertisingStatus> startBleStationAdvertising(
    BleStationProfile station,
  ) async {
    final Map<Object?, Object?>? response = await _channel
        .invokeMapMethod<Object?, Object?>(
          'startBleStationAdvertising',
          <String, Object>{
            'stationId': station.id,
            'stationCode': station.code,
            'secret': station.secret,
            'intervalSeconds': station.rotationSeconds,
          },
        );

    return BleAdvertisingStatus.fromPlatform(response ?? <Object?, Object?>{});
  }

  Future<void> stopBleStationAdvertising() async {
    await _channel.invokeMethod<void>('stopBleStationAdvertising');
  }

  Future<BleAdvertisingStatus> getBleStationAdvertisingStatus() async {
    final Map<Object?, Object?>? response = await _channel
        .invokeMapMethod<Object?, Object?>('getBleStationAdvertisingStatus');

    return BleAdvertisingStatus.fromPlatform(response ?? <Object?, Object?>{});
  }
}
