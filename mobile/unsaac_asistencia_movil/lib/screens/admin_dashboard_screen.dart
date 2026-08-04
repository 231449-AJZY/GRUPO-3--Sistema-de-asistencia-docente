import 'package:flutter/material.dart';

import '../controllers/app_controller.dart';
import '../core/app_theme.dart';
import '../widgets/status_card.dart';
import 'ble_station_mode_screen.dart';
import 'mobile_device_authorization_screen.dart';
import 'qr_attendance_station_screen.dart';
import 'quick_attendance_screen.dart';
import 'settings_screen.dart';

class AdminDashboardScreen extends StatelessWidget {
  const AdminDashboardScreen({required this.controller, super.key});

  final AppController controller;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Administración móvil',
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
        actions: <Widget>[
          IconButton(
            tooltip: 'Actualizar',
            onPressed: controller.busy ? null : controller.refreshCapabilities,
            icon: const Icon(Icons.refresh),
          ),
          PopupMenuButton<String>(
            onSelected: (String value) async {
              if (value == 'settings') {
                await Navigator.of(context).push<void>(
                  MaterialPageRoute<void>(
                    builder: (_) => SettingsScreen(controller: controller),
                  ),
                );
              }
              if (value == 'logout') {
                await controller.logout();
              }
            },
            itemBuilder: (_) => const <PopupMenuEntry<String>>[
              PopupMenuItem<String>(
                value: 'settings',
                child: Text('Configurar servidor'),
              ),
              PopupMenuItem<String>(
                value: 'logout',
                child: Text('Cerrar sesión'),
              ),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: controller.refreshCapabilities,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(18, 18, 18, 32),
          children: <Widget>[
            Container(
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: <Color>[unsaacPrimary, unsaacTop],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(26),
                boxShadow: const <BoxShadow>[
                  BoxShadow(
                    color: Color(0x22061B34),
                    blurRadius: 18,
                    offset: Offset(0, 8),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  const Row(
                    children: <Widget>[
                      Icon(
                        Icons.admin_panel_settings_outlined,
                        color: unsaacOrange,
                        size: 34,
                      ),
                      SizedBox(width: 11),
                      Text(
                        'Panel administrador móvil',
                        style: TextStyle(
                          color: Color(0xFFFFD7A6),
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Hola, ${controller.user?.nombres ?? 'Administrador'}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 25,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 7),
                  Text(
                    controller.user?.email ?? '',
                    style: const TextStyle(color: Color(0xFFDCEAFF)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            StatusCard(
              icon: Icons.cloud_done_outlined,
              title: 'Servidor institucional',
              detail: controller.serverOnline
                  ? 'Conectado a ${controller.serverUrl}'
                  : 'Sin respuesta desde ${controller.serverUrl}',
              ok: controller.serverOnline,
            ),
            const SizedBox(height: 16),
            const _SectionTitle(
              title: 'Control de acceso móvil',
              subtitle: 'Autorice primero los celulares antes de habilitar la marcación.',
            ),
            const SizedBox(height: 11),
            FilledButton.icon(
              onPressed: controller.busy
                  ? null
                  : () async {
                      await Navigator.of(context).push<void>(
                        MaterialPageRoute<void>(
                          builder: (_) => MobileDeviceAuthorizationScreen(
                            controller: controller,
                          ),
                        ),
                      );
                    },
              icon: const Icon(Icons.phonelink_lock_outlined),
              label: const Padding(
                padding: EdgeInsets.symmetric(vertical: 4),
                child: Text('Autorizar dispositivos móviles'),
              ),
            ),
            const SizedBox(height: 10),
            _AdminActionCard(
              icon: Icons.verified_user_outlined,
              iconColor: unsaacBlue,
              title: 'Solicitudes pendientes',
              description:
                  'Revise el docente, modelo, versión y biometría reportada antes de pulsar Autorizar celular.',
            ),
            const SizedBox(height: 18),
            const _SectionTitle(
              title: 'Estaciones de asistencia',
              subtitle: 'Elija QR dinámico, Bluetooth o asistencia rápida.',
            ),
            const SizedBox(height: 11),
            OutlinedButton.icon(
              onPressed: controller.busy
                  ? null
                  : () async {
                      await Navigator.of(context).push<void>(
                        MaterialPageRoute<void>(
                          builder: (_) => QrAttendanceStationScreen(
                            controller: controller,
                          ),
                        ),
                      );
                    },
              icon: const Icon(Icons.qr_code_2),
              label: const Padding(
                padding: EdgeInsets.symmetric(vertical: 4),
                child: Text('Abrir estación QR'),
              ),
            ),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: controller.busy
                  ? null
                  : () async {
                      await Navigator.of(context).push<void>(
                        MaterialPageRoute<void>(
                          builder: (_) =>
                              BleStationModeScreen(controller: controller),
                        ),
                      );
                    },
              icon: const Icon(Icons.bluetooth_searching),
              label: const Padding(
                padding: EdgeInsets.symmetric(vertical: 4),
                child: Text('Abrir modo estación BLE'),
              ),
            ),
            const SizedBox(height: 10),
            FilledButton.icon(
              onPressed: controller.busy
                  ? null
                  : () async {
                      await Navigator.of(context).push<void>(
                        MaterialPageRoute<void>(
                          builder: (_) =>
                              QuickAttendanceScreen(controller: controller),
                        ),
                      );
                    },
              icon: const Icon(Icons.how_to_reg),
              label: const Padding(
                padding: EdgeInsets.symmetric(vertical: 4),
                child: Text('Abrir asistencia rápida'),
              ),
            ),
            const SizedBox(height: 16),
            _AdminActionCard(
              icon: Icons.manage_history,
              iconColor: unsaacOrange,
              title: 'Auditoría protegida',
              description:
                  'Las autorizaciones, revocaciones, QR emitidos y marcaciones quedan registradas en PostgreSQL.',
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(
          title,
          style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 3),
        Text(
          subtitle,
          style: const TextStyle(color: unsaacMuted, height: 1.35),
        ),
      ],
    );
  }
}

class _AdminActionCard extends StatelessWidget {
  const _AdminActionCard({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.description,
  });

  final IconData icon;
  final Color iconColor;
  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(17),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: iconColor == unsaacOrange
                    ? const Color(0xFFFFF0D8)
                    : const Color(0xFFDCEAFF),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icon, color: iconColor),
            ),
            const SizedBox(width: 13),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    title,
                    style: const TextStyle(fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    description,
                    style: const TextStyle(
                      color: unsaacMuted,
                      height: 1.35,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
