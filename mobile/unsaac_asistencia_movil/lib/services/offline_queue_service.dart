import 'dart:convert';

import '../models/offline_attendance.dart';
import 'secure_storage_service.dart';

class OfflineQueueService {
  OfflineQueueService({SecureStorageService? storage})
    : _storage = storage ?? SecureStorageService();

  static const String _credentialKey = 'offline_credential_v1';
  static const String _queueKey = 'offline_attendance_queue_v1';

  final SecureStorageService _storage;

  Future<OfflineCredential?> readCredential() async {
    final String? stored = await _storage.read(_credentialKey);
    if (stored == null || stored.isEmpty) {
      return null;
    }
    return OfflineCredential.fromStoredJson(stored);
  }

  Future<void> writeCredential(OfflineCredential credential) async {
    await _storage.write(_credentialKey, credential.toStoredJson());
  }

  Future<void> deleteCredential() async {
    await _storage.delete(_credentialKey);
  }

  Future<List<OfflineQueueItem>> readQueue() async {
    final String? stored = await _storage.read(_queueKey);
    if (stored == null || stored.isEmpty) {
      return <OfflineQueueItem>[];
    }

    final Object? decoded = jsonDecode(stored);
    if (decoded is! List<Object?>) {
      throw const FormatException('La cola offline cifrada es inválida.');
    }

    return decoded
        .whereType<Map<String, dynamic>>()
        .map(OfflineQueueItem.fromJson)
        .toList()
      ..sort(
        (OfflineQueueItem left, OfflineQueueItem right) =>
            right.createdAt.compareTo(left.createdAt),
      );
  }

  Future<void> writeQueue(List<OfflineQueueItem> items) async {
    final List<OfflineQueueItem> ordered = <OfflineQueueItem>[...items]
      ..sort(
        (OfflineQueueItem left, OfflineQueueItem right) =>
            right.createdAt.compareTo(left.createdAt),
      );

    await _storage.write(
      _queueKey,
      jsonEncode(
        ordered
            .take(100)
            .map((OfflineQueueItem item) => item.toJson())
            .toList(),
      ),
    );
  }

  Future<void> add(OfflineQueueItem item, {required int maxPending}) async {
    final List<OfflineQueueItem> items = await readQueue();
    final int pending = items
        .where((OfflineQueueItem item) => item.isPending)
        .length;

    if (pending >= maxPending) {
      throw StateError(
        'La cola offline alcanzó el máximo de $maxPending marcaciones pendientes.',
      );
    }

    items.removeWhere(
      (OfflineQueueItem current) => current.localId == item.localId,
    );
    items.insert(0, item);
    await writeQueue(items);
  }

  Future<void> clearCompleted() async {
    final List<OfflineQueueItem> items = await readQueue();
    await writeQueue(
      items.where((OfflineQueueItem item) => item.isPending).toList(),
    );
  }
}
