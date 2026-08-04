import 'package:flutter/services.dart';

class SecureStorageService {
  static const MethodChannel _channel = MethodChannel(
    'pe.edu.unsaac.asistencia/secure_storage',
  );

  Future<void> write(String key, String value) async {
    await _channel.invokeMethod<void>('write', <String, String>{
      'key': key,
      'value': value,
    });
  }

  Future<String?> read(String key) {
    return _channel.invokeMethod<String>('read', <String, String>{'key': key});
  }

  Future<void> delete(String key) async {
    await _channel.invokeMethod<void>('delete', <String, String>{'key': key});
  }

  Future<void> clear() async {
    await _channel.invokeMethod<void>('clear');
  }
}
