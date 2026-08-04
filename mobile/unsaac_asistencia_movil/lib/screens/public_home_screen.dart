import 'package:flutter/material.dart';

import '../controllers/app_controller.dart';
import '../core/app_theme.dart';
import 'login_screen.dart';
import 'quick_attendance_screen.dart';
import 'settings_screen.dart';

class PublicHomeScreen extends StatelessWidget {
  const PublicHomeScreen({required this.controller, super.key});

  final AppController controller;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: controller.refreshCapabilities,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(22, 30, 22, 28),
            children: <Widget>[
              const SizedBox(height: 12),
              const Align(
                child: CircleAvatar(
                  radius: 45,
                  backgroundColor: unsaacBurgundy,
                  child: Icon(Icons.fingerprint, size: 52, color: Colors.white),
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'UNSAAC Asistencia Móvil',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF172033),
                ),
              ),
              const SizedBox(height: 7),
              const Text(
                'Autenticación institucional y asistencia docente',
                textAlign: TextAlign.center,
                style: TextStyle(color: Color(0xFF64748B)),
              ),
              const SizedBox(height: 30),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: <Widget>[
                      FilledButton.icon(
                        onPressed: controller.busy
                            ? null
                            : () async {
                                await Navigator.of(context).push<void>(
                                  MaterialPageRoute<void>(
                                    builder: (_) => QuickAttendanceScreen(
                                      controller: controller,
                                    ),
                                  ),
                                );
                              },
                        icon: const Icon(Icons.how_to_reg),
                        label: const Padding(
                          padding: EdgeInsets.symmetric(vertical: 15),
                          child: Text('Marcar asistencia rápida'),
                        ),
                      ),
                      const SizedBox(height: 12),
                      OutlinedButton.icon(
                        onPressed: controller.busy
                            ? null
                            : () async {
                                controller.clearError();
                                await Navigator.of(context).push<void>(
                                  MaterialPageRoute<void>(
                                    builder: (_) =>
                                        LoginScreen(controller: controller),
                                  ),
                                );
                              },
                        icon: const Icon(Icons.login),
                        label: const Padding(
                          padding: EdgeInsets.symmetric(vertical: 14),
                          child: Text('Ingresar al sistema'),
                        ),
                      ),
                      const SizedBox(height: 10),
                      TextButton.icon(
                        onPressed: controller.busy
                            ? null
                            : () async {
                                await Navigator.of(context).push<void>(
                                  MaterialPageRoute<void>(
                                    builder: (_) =>
                                        SettingsScreen(controller: controller),
                                  ),
                                );
                              },
                        icon: const Icon(Icons.settings_ethernet),
                        label: const Text('Configurar servidor'),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              _ConnectionCard(controller: controller),
              const SizedBox(height: 12),
              const Card(
                child: Padding(
                  padding: EdgeInsets.all(17),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Icon(Icons.info_outline, color: Color(0xFF1D4ED8)),
                      SizedBox(width: 11),
                      Expanded(
                        child: Text(
                          'La marcación rápida de esta versión verifica el código y la biometría local. El registro definitivo se activará después de vincular el celular en el Paso 8B.',
                          style: TextStyle(
                            color: Color(0xFF475569),
                            height: 1.35,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 18),
              const Text(
                'Paso 8A.1 Mobile · versión de desarrollo',
                textAlign: TextAlign.center,
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ConnectionCard extends StatelessWidget {
  const _ConnectionCard({required this.controller});

  final AppController controller;

  @override
  Widget build(BuildContext context) {
    final bool online = controller.serverOnline;
    final Color color = online
        ? const Color(0xFF047857)
        : const Color(0xFFB45309);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: <Widget>[
            Icon(
              online ? Icons.cloud_done_outlined : Icons.cloud_off_outlined,
              color: color,
            ),
            const SizedBox(width: 11),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    online ? 'Servidor conectado' : 'Servidor sin respuesta',
                    style: TextStyle(color: color, fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    controller.serverUrl,
                    style: const TextStyle(
                      color: Color(0xFF64748B),
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            IconButton(
              tooltip: 'Actualizar conexión',
              onPressed: controller.busy
                  ? null
                  : controller.refreshCapabilities,
              icon: const Icon(Icons.refresh),
            ),
          ],
        ),
      ),
    );
  }
}
