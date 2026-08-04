import 'package:flutter/services.dart';


class AndroidNotificationService {
  static const MethodChannel _channel = MethodChannel(
    'pe.edu.unsaac.asistencia/notifications',
  );


  Future<bool> initialize() async {
    return await _channel.invokeMethod<bool>('initialize') ?? false;
  }


  Future<bool> requestPermission() async {
    return await _channel.invokeMethod<bool>('requestPermission') ?? false;
  }


  Future<bool> show({
    required int id,
    required String title,
    required String message,
  }) async {
    return await _channel.invokeMethod<bool>('show', <String, Object?>{
          'id': id & 0x7FFFFFFF,
          'title': title,
          'message': message,
        }) ??
        false;
  }


  Future<bool> schedule({
    required int id,
    required String title,
    required String message,
    required DateTime visibleAt,
  }) async {
    return await _channel.invokeMethod<bool>('schedule', <String, Object?>{
          'id': id & 0x7FFFFFFF,
          'title': title,
          'message': message,
          'timestampMs': visibleAt.toUtc().millisecondsSinceEpoch,
        }) ??
        false;
  }
}