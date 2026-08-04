import 'dart:async';


import 'package:flutter/material.dart';


import '../controllers/app_controller.dart';
import '../controllers/teacher_notification_controller.dart';
import '../screens/notifications_screen.dart';


class TeacherNotificationButton extends StatefulWidget {
  const TeacherNotificationButton({required this.appController, super.key});


  final AppController appController;


  @override
  State<TeacherNotificationButton> createState() =>
      _TeacherNotificationButtonState();
}


class _TeacherNotificationButtonState extends State<TeacherNotificationButton> {
  late final TeacherNotificationController controller;
  Timer? timer;


  @override
  void initState() {
    super.initState();
    controller = TeacherNotificationController();
    WidgetsBinding.instance.addPostFrameCallback((_) => _initialize());
  }


  Future<void> _initialize() async {
    final int? teacherId = widget.appController.user?.docenteId;
    if (teacherId == null || teacherId <= 0) return;


    await controller.initialize(
      teacherId: teacherId,
      serverUrl: widget.appController.serverUrl,
      pendingOfflineCount: widget.appController.pendingOfflineCount,
    );


    timer?.cancel();
    timer = Timer.periodic(const Duration(minutes: 1), (_) async {
      await controller.updateContext(
        serverUrl: widget.appController.serverUrl,
        pendingOfflineCount: widget.appController.pendingOfflineCount,
      );
      await controller.synchronize(showSystemNotifications: true);
    });
  }


  @override
  void didUpdateWidget(covariant TeacherNotificationButton oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.appController.pendingOfflineCount !=
            widget.appController.pendingOfflineCount ||
        oldWidget.appController.serverUrl != widget.appController.serverUrl) {
      unawaited(
        controller.updateContext(
          serverUrl: widget.appController.serverUrl,
          pendingOfflineCount: widget.appController.pendingOfflineCount,
        ),
      );
    }
  }


  @override
  void dispose() {
    timer?.cancel();
    controller.dispose();
    super.dispose();
  }


  Future<void> _openNotifications() async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (_) => NotificationsScreen(controller: controller),
      ),
    );
    await controller.synchronize(showSystemNotifications: false);
  }


  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (BuildContext context, Widget? child) {
        final int unread = controller.unreadCount;
        final int visible = unread > 99 ? 99 : unread;


        return IconButton(
          tooltip: unread > 0
              ? '$unread notificación(es) sin leer'
              : 'Notificaciones',
          onPressed: _openNotifications,
          icon: Stack(
            clipBehavior: Clip.none,
            children: <Widget>[
              Icon(
                unread > 0
                    ? Icons.notifications_active
                    : Icons.notifications_outlined,
              ),
              if (unread > 0)
                Positioned(
                  right: -8,
                  top: -7,
                  child: Container(
                    constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    decoration: BoxDecoration(
                      color: controller.urgentCount > 0
                          ? const Color(0xFFB91C1C)
                          : const Color(0xFF7A1631),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white, width: 1.5),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      visible == 99 && unread > 99 ? '99+' : '$visible',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 9,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}