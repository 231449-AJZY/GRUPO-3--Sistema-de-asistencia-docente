import 'package:flutter/material.dart';

class StatusCard extends StatelessWidget {
  const StatusCard({
    required this.icon,
    required this.title,
    required this.detail,
    required this.ok,
    this.action,
    super.key,
  });

  final IconData icon;
  final String title;
  final String detail;
  final bool ok;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final Color color = ok ? const Color(0xFF047857) : const Color(0xFFB45309);
    final Color background = ok
        ? const Color(0xFFECFDF5)
        : const Color(0xFFFFFBEB);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: background,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icon, color: color),
            ),
            const SizedBox(width: 13),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Row(
                    children: <Widget>[
                      Expanded(
                        child: Text(
                          title,
                          style: const TextStyle(fontWeight: FontWeight.w900),
                        ),
                      ),
                      Icon(
                        ok ? Icons.check_circle : Icons.info_outline,
                        color: color,
                        size: 20,
                      ),
                    ],
                  ),
                  const SizedBox(height: 5),
                  Text(
                    detail,
                    style: const TextStyle(
                      color: Color(0xFF64748B),
                      fontSize: 13,
                    ),
                  ),
                  if (action != null) ...<Widget>[
                    const SizedBox(height: 10),
                    action!,
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
