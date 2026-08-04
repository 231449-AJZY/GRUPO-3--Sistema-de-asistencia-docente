import 'package:flutter/foundation.dart';


import '../models/teacher_notification.dart';
import '../services/android_notification_service.dart';
import '../services/teacher_notification_repository.dart';


class TeacherNotificationController extends ChangeNotifier {
  TeacherNotificationController({
    TeacherNotificationRepository? repository,
    AndroidNotificationService? androidNotifications,
  }) : _repository = repository ?? TeacherNotificationRepository(),
       _android = androidNotifications ?? AndroidNotificationService();


  final TeacherNotificationRepository _repository;
  final AndroidNotificationService _android;


  List<TeacherNotification> items = <TeacherNotification>[];
  bool loading = false;
  bool initialized = false;
  bool permissionGranted = false;
  String? message;
  DateTime? lastSyncAt;


  late int _teacherId;
  late String _serverUrl;
  int _pendingOfflineCount = 0;


  int get unreadCount => items
      .where(
        (TeacherNotification item) =>
            item.isVisible && !item.isRead,
      )
      .length;


  int get urgentCount => items
      .where(
        (TeacherNotification item) =>
            item.isVisible && !item.isRead && item.isUrgent,
      )
      .length;


  int get scheduledCount =>
      items.where((TeacherNotification item) => item.isScheduled).length;


  List<TeacherNotification> get visibleItems => items
      .where((TeacherNotification item) => item.isVisible)
      .toList()
    ..sort(
      (TeacherNotification a, TeacherNotification b) =>
          b.visibleAt.compareTo(a.visibleAt),
    );


  List<TeacherNotification> get scheduledItems => items
      .where((TeacherNotification item) => item.isScheduled)
      .toList()
    ..sort(
      (TeacherNotification a, TeacherNotification b) =>
          a.visibleAt.compareTo(b.visibleAt),
    );


  Future<void> initialize({
    required int teacherId,
    required String serverUrl,
    required int pendingOfflineCount,
  }) async {
    _teacherId = teacherId;
    _serverUrl = serverUrl;
    _pendingOfflineCount = pendingOfflineCount;


    items = await _repository.readLocal(_teacherId);
    _applyLocalOfflineNotification();
    permissionGranted = await _android.initialize();


    if (!permissionGranted) {
      permissionGranted = await _android.requestPermission();
    }


    initialized = true;
    notifyListeners();
    await synchronize(showSystemNotifications: true);
  }


  Future<void> updateContext({
    required String serverUrl,
    required int pendingOfflineCount,
  }) async {
    _serverUrl = serverUrl;
    _pendingOfflineCount = pendingOfflineCount;
    _applyLocalOfflineNotification();
    await _repository.writeLocal(_teacherId, items);
    notifyListeners();
  }


  Future<void> requestPermission() async {
    permissionGranted = await _android.requestPermission();
    message = permissionGranted
        ? 'Notificaciones Android habilitadas.'
        : 'Android no autorizó las notificaciones.';
    notifyListeners();
  }


  Future<void> synchronize({bool showSystemNotifications = false}) async {
    if (!initialized || loading) return;


    loading = true;
    message = null;
    notifyListeners();


    final Set<int> previousVisibleIds = items
        .where((TeacherNotification item) => item.isVisible)
        .map((TeacherNotification item) => item.id)
        .toSet();


    try {
      final String? token = await _repository.readToken();
      if (token == null || token.isEmpty) {
        throw const TeacherNotificationException(
          'La sesión docente no está disponible.',
        );
      }


      final TeacherNotificationBundle bundle = await _repository.synchronize(
        serverUrl: _serverUrl,
        token: token,
      );


      final Map<int, TeacherNotification> merged = <int, TeacherNotification>{
        for (final TeacherNotification item in items)
          if (item.localOnly) item.id: item,
        for (final TeacherNotification item in bundle.all) item.id: item,
      };


      items = merged.values.toList();
      _applyLocalOfflineNotification();
      await _repository.writeLocal(_teacherId, items);


      if (permissionGranted) {
        final List<TeacherNotification> newVisible = items
            .where(
              (TeacherNotification item) =>
                  item.isVisible &&
                  !item.isRead &&
                  !item.localOnly &&
                  !previousVisibleIds.contains(item.id),
            )
            .take(3)
            .toList();


        if (showSystemNotifications) {
          for (final TeacherNotification item in newVisible) {
            await _android.show(
              id: item.id,
              title: item.title,
              message: item.message,
            );
          }
        }


        for (final TeacherNotification item in scheduledItems) {
          await _android.schedule(
            id: item.id,
            title: item.title,
            message: item.message,
            visibleAt: item.visibleAt,
          );
        }


        if (_pendingOfflineCount > 0) {
          await _android.show(
            id: 7001,
            title: 'Marcaciones pendientes',
            message:
                '$_pendingOfflineCount marcación(es) deben sincronizarse con la UNSAAC.',
          );
        }
      }


      lastSyncAt = DateTime.now();
      message = 'Notificaciones sincronizadas.';
    } on TeacherNotificationException catch (error) {
      message = '${error.message} Se muestra el historial local cifrado.';
    } on Object {
      message = 'No se pudo actualizar. Se muestra el historial local cifrado.';
    } finally {
      loading = false;
      notifyListeners();
    }
  }


  Future<void> markRead(TeacherNotification item) async {
    if (item.isRead || item.isScheduled) return;


    final DateTime readAt = DateTime.now();
    items = items
        .map(
          (TeacherNotification current) => current.id == item.id
              ? current.copyWith(readAt: readAt)
              : current,
        )
        .toList();
    await _repository.writeLocal(_teacherId, items);
    notifyListeners();


    if (item.localOnly) return;


    try {
      final String? token = await _repository.readToken();
      if (token == null || token.isEmpty) return;
      final DateTime serverReadAt = await _repository.markRead(
        serverUrl: _serverUrl,
        token: token,
        notificationId: item.id,
      );
      items = items
          .map(
            (TeacherNotification current) => current.id == item.id
                ? current.copyWith(readAt: serverReadAt)
                : current,
          )
          .toList();
      await _repository.writeLocal(_teacherId, items);
      notifyListeners();
    } on Object {
      message = 'La lectura quedó guardada localmente y se reintentará después.';
      notifyListeners();
    }
  }


  Future<void> markAllRead() async {
    final DateTime readAt = DateTime.now();
    items = items
        .map(
          (TeacherNotification item) =>
              item.isVisible && !item.isRead ? item.copyWith(readAt: readAt) : item,
        )
        .toList();
    await _repository.writeLocal(_teacherId, items);
    notifyListeners();


    try {
      final String? token = await _repository.readToken();
      if (token == null || token.isEmpty) return;
      final DateTime serverReadAt = await _repository.markAllRead(
        serverUrl: _serverUrl,
        token: token,
      );
      items = items
          .map(
            (TeacherNotification item) => item.isVisible
                ? item.copyWith(readAt: serverReadAt)
                : item,
          )
          .toList();
      await _repository.writeLocal(_teacherId, items);
      message = 'Todas las notificaciones fueron marcadas como leídas.';
      notifyListeners();
    } on Object {
      message = 'La lectura quedó guardada localmente.';
      notifyListeners();
    }
  }


  void _applyLocalOfflineNotification() {
    items = items
        .where((TeacherNotification item) => item.id != -7001)
        .toList();
    if (_pendingOfflineCount > 0) {
      items.add(TeacherNotification.offlinePending(_pendingOfflineCount));
    }
  }
}