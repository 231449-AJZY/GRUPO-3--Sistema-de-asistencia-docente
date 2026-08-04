import 'package:flutter/material.dart';


import '../controllers/teacher_notification_controller.dart';
import '../core/app_theme.dart';
import '../models/teacher_notification.dart';


class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({required this.controller, super.key});


  final TeacherNotificationController controller;


  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}


class _NotificationsScreenState extends State<NotificationsScreen> {
  bool unreadOnly = false;


  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: widget.controller,
      builder: (BuildContext context, Widget? child) {
        final List<TeacherNotification> visible = widget.controller.visibleItems
            .where(
              (TeacherNotification item) => !unreadOnly || !item.isRead,
            )
            .toList();
        final List<TeacherNotification> scheduled =
            widget.controller.scheduledItems;


        return Scaffold(
          appBar: AppBar(
            title: const Text(
              'Notificaciones',
              style: TextStyle(fontWeight: FontWeight.w900),
            ),
            actions: <Widget>[
              IconButton(
                tooltip: 'Sincronizar',
                onPressed: widget.controller.loading
                    ? null
                    : () => widget.controller.synchronize(
                        showSystemNotifications: true,
                      ),
                icon: widget.controller.loading
                    ? const SizedBox.square(
                        dimension: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.sync),
              ),
              PopupMenuButton<String>(
                onSelected: (String value) {
                  if (value == 'read-all') {
                    widget.controller.markAllRead();
                  }
                  if (value == 'permission') {
                    widget.controller.requestPermission();
                  }
                },
                itemBuilder: (_) => const <PopupMenuEntry<String>>[
                  PopupMenuItem<String>(
                    value: 'read-all',
                    child: Text('Marcar todas como leídas'),
                  ),
                  PopupMenuItem<String>(
                    value: 'permission',
                    child: Text('Autorizar notificaciones Android'),
                  ),
                ],
              ),
            ],
          ),
          body: RefreshIndicator(
            onRefresh: () => widget.controller.synchronize(
              showSystemNotifications: true,
            ),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
              children: <Widget>[
                _Summary(controller: widget.controller),
                const SizedBox(height: 14),
                if (!widget.controller.permissionGranted)
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: <Widget>[
                          const Text(
                            'Avisos de Android desactivados',
                            style: TextStyle(fontWeight: FontWeight.w900),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'El historial seguirá disponible, pero Android no mostrará avisos fuera de esta pantalla.',
                            style: TextStyle(color: Color(0xFF64748B)),
                          ),
                          const SizedBox(height: 12),
                          FilledButton.icon(
                            onPressed: widget.controller.requestPermission,
                            icon: const Icon(Icons.notifications_active_outlined),
                            label: const Text('Autorizar notificaciones'),
                          ),
                        ],
                      ),
                    ),
                  ),
                if (!widget.controller.permissionGranted)
                  const SizedBox(height: 14),
                SegmentedButton<bool>(
                  segments: const <ButtonSegment<bool>>[
                    ButtonSegment<bool>(
                      value: false,
                      label: Text('Todas'),
                      icon: Icon(Icons.notifications_outlined),
                    ),
                    ButtonSegment<bool>(
                      value: true,
                      label: Text('No leídas'),
                      icon: Icon(Icons.mark_email_unread_outlined),
                    ),
                  ],
                  selected: <bool>{unreadOnly},
                  onSelectionChanged: (Set<bool> value) {
                    setState(() => unreadOnly = value.first);
                  },
                ),
                if (widget.controller.message != null) ...<Widget>[
                  const SizedBox(height: 12),
                  Text(
                    widget.controller.message!,
                    style: const TextStyle(
                      color: Color(0xFF64748B),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
                const SizedBox(height: 16),
                const Text(
                  'Avisos e historial',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 10),
                if (visible.isEmpty)
                  const _EmptyCard(
                    icon: Icons.notifications_none,
                    text: 'No hay notificaciones en este filtro.',
                  )
                else
                  ...visible.map(
                    (TeacherNotification item) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: _NotificationCard(
                        item: item,
                        onTap: () => widget.controller.markRead(item),
                      ),
                    ),
                  ),
                const SizedBox(height: 10),
                Row(
                  children: <Widget>[
                    const Expanded(
                      child: Text(
                        'Próximas clases',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                    Text(
                      '${scheduled.length}',
                      style: const TextStyle(
                        color: unsaacBurgundy,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                if (scheduled.isEmpty)
                  const _EmptyCard(
                    icon: Icons.event_available_outlined,
                    text: 'No existen clases programadas para los próximos días.',
                  )
                else
                  ...scheduled.map(
                    (TeacherNotification item) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: _NotificationCard(item: item),
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }
}


class _Summary extends StatelessWidget {
  const _Summary({required this.controller});


  final TeacherNotificationController controller;


  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: <Color>[unsaacBurgundy, unsaacNavy],
        ),
        borderRadius: BorderRadius.circular(22),
      ),
      child: Row(
        children: <Widget>[
          _SummaryValue(value: controller.unreadCount, label: 'No leídas'),
          const _Divider(),
          _SummaryValue(value: controller.urgentCount, label: 'Urgentes'),
          const _Divider(),
          _SummaryValue(value: controller.scheduledCount, label: 'Programadas'),
        ],
      ),
    );
  }
}


class _SummaryValue extends StatelessWidget {
  const _SummaryValue({required this.value, required this.label});


  final int value;
  final String label;


  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: <Widget>[
          Text(
            '$value',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.w900,
            ),
          ),
          Text(
            label,
            style: const TextStyle(
              color: Color(0xFFDCE7F1),
              fontSize: 11,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}


class _Divider extends StatelessWidget {
  const _Divider();


  @override
  Widget build(BuildContext context) {
    return Container(
      width: 1,
      height: 38,
      color: Colors.white24,
    );
  }
}


class _NotificationCard extends StatelessWidget {
  const _NotificationCard({required this.item, this.onTap});


  final TeacherNotification item;
  final VoidCallback? onTap;


  @override
  Widget build(BuildContext context) {
    final Color color = _priorityColor(item.priority);


    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(22),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Container(
                width: 45,
                height: 45,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.11),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(_typeIcon(item.type), color: color),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Row(
                      children: <Widget>[
                        Expanded(
                          child: Text(
                            item.title,
                            style: TextStyle(
                              fontWeight: FontWeight.w900,
                              color: item.isRead
                                  ? const Color(0xFF64748B)
                                  : const Color(0xFF172033),
                            ),
                          ),
                        ),
                        if (!item.isRead && !item.isScheduled)
                          Container(
                            width: 9,
                            height: 9,
                            decoration: const BoxDecoration(
                              color: unsaacBurgundy,
                              shape: BoxShape.circle,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      item.message,
                      style: const TextStyle(
                        color: Color(0xFF64748B),
                        height: 1.35,
                      ),
                    ),
                    const SizedBox(height: 9),
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: <Widget>[
                        _Tag(text: item.priority, color: color),
                        _Tag(
                          text: item.isScheduled ? 'PROGRAMADA' : 'HISTORIAL',
                          color: const Color(0xFF1D4ED8),
                        ),
                        Text(
                          _formatDate(item.visibleAt),
                          style: const TextStyle(
                            color: Color(0xFF64748B),
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }


  static Color _priorityColor(String priority) => switch (priority) {
    'CRITICA' => const Color(0xFFB91C1C),
    'ALTA' => const Color(0xFFDC2626),
    'BAJA' => const Color(0xFF047857),
    _ => const Color(0xFFB45309),
  };


  static IconData _typeIcon(String type) {
    if (type.contains('CLASE')) return Icons.event_outlined;
    if (type.contains('OFFLINE')) return Icons.cloud_off_outlined;
    if (type.contains('DISPOSITIVO')) return Icons.phonelink_lock_outlined;
    if (type.contains('BIOMETRIC')) return Icons.fingerprint;
    if (type.contains('RECHAZADA')) return Icons.cancel_outlined;
    if (type.contains('TARDANZA')) return Icons.schedule;
    if (type.contains('RESUELTA')) return Icons.task_alt;
    return Icons.notifications_outlined;
  }


  static String _formatDate(DateTime value) {
    final DateTime local = value.toLocal();
    return '${local.day.toString().padLeft(2, '0')}/'
        '${local.month.toString().padLeft(2, '0')}/'
        '${local.year} · '
        '${local.hour.toString().padLeft(2, '0')}:'
        '${local.minute.toString().padLeft(2, '0')}';
  }
}


class _Tag extends StatelessWidget {
  const _Tag({required this.text, required this.color});


  final String text;
  final Color color;


  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}


class _EmptyCard extends StatelessWidget {
  const _EmptyCard({required this.icon, required this.text});


  final IconData icon;
  final String text;


  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(22),
        child: Row(
          children: <Widget>[
            Icon(icon, color: const Color(0xFF64748B)),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                text,
                style: const TextStyle(
                  color: Color(0xFF64748B),
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}