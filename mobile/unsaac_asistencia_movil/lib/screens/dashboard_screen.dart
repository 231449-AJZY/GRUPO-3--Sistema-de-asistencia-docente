import 'package:flutter/material.dart';

import '../controllers/app_controller.dart';
import '../core/app_theme.dart';
import '../models/device_status.dart';
import '../widgets/status_card.dart';
import '../widgets/teacher_notification_button.dart';
import 'device_link_screen.dart';
import 'settings_screen.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({required this.controller, super.key});

  final AppController controller;

  @override
  Widget build(BuildContext context) {
    final String biometricTypes = controller.biometricStatus.types.isEmpty
        ? 'No se identificaron modalidades enroladas.'
        : controller.biometricStatus.types.join(', ');

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'UNSAAC Asistencia',
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
        actions: <Widget>[
          TeacherNotificationButton(appController: controller),
          IconButton(
            tooltip: 'Actualizar',
            onPressed: controller.busy ? null : controller.refreshAll,
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
        onRefresh: controller.refreshAll,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(18, 18, 18, 32),
          children: <Widget>[
            _WelcomeCard(controller: controller),
            const SizedBox(height: 18),
            _MobileLinkCard(controller: controller),
            const SizedBox(height: 18),
            const Text(
              'Estado del dispositivo',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 12),
            StatusCard(
              icon: Icons.cloud_done_outlined,
              title: 'Servidor institucional',
              detail: controller.serverOnline
                  ? 'Conectado a ${controller.serverUrl}'
                  : 'Sin respuesta desde ${controller.serverUrl}',
              ok: controller.serverOnline,
            ),
            const SizedBox(height: 10),
            StatusCard(
              icon: Icons.fingerprint,
              title: 'Biometría local',
              detail: controller.biometricStatus.enrolled
                  ? 'Disponible: $biometricTypes'
                  : 'Configure huella o biometría segura en Android.',
              ok: controller.biometricStatus.enrolled,
              action: Align(
                alignment: Alignment.centerLeft,
                child: OutlinedButton.icon(
                  onPressed: controller.busy ? null : controller.testBiometric,
                  icon: const Icon(Icons.verified_user_outlined),
                  label: const Text('Probar biometría'),
                ),
              ),
            ),
            if (controller.lastBiometricTestPassed) ...<Widget>[
              const SizedBox(height: 8),
              const _SuccessBanner(
                text: 'Identidad verificada correctamente en el celular.',
              ),
            ],
            const SizedBox(height: 10),
            StatusCard(
              icon: Icons.bluetooth,
              title: 'Bluetooth',
              detail: _bluetoothDetail(controller.deviceStatus),
              ok:
                  controller.deviceStatus.bluetoothEnabled &&
                  controller.deviceStatus.bluetoothPermissionGranted,
              action: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: <Widget>[
                  if (!controller.deviceStatus.bluetoothPermissionGranted)
                    OutlinedButton(
                      onPressed: controller.requestBluetoothPermissions,
                      child: const Text('Autorizar'),
                    ),
                  if (!controller.deviceStatus.bluetoothEnabled)
                    OutlinedButton(
                      onPressed: controller.openBluetoothSettings,
                      child: const Text('Activar Bluetooth'),
                    ),
                  FilledButton.tonalIcon(
                    onPressed:
                        controller.scanningBle ||
                            !controller.deviceStatus.bluetoothEnabled
                        ? null
                        : controller.scanBleStations,
                    icon: controller.scanningBle
                        ? const SizedBox.square(
                            dimension: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.radar),
                    label: const Text('Buscar estaciones BLE'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            _BleResults(controller: controller),
            if (controller.errorMessage != null) ...<Widget>[
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF1F2),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFFDA4AF)),
                ),
                child: Text(
                  controller.errorMessage!,
                  style: const TextStyle(
                    color: Color(0xFF9F1239),
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
            const SizedBox(height: 18),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    const Text(
                      'Marcación móvil',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      controller.attendanceSigningReady
                          ? 'La clave de asistencia está protegida por biometría por operación. Ya puede marcar sin iniciar sesión.'
                          : controller.attendanceSigningMessage ??
                                'Autorice este celular y prepare la firma biométrica antes de usar la asistencia rápida.',
                      style: const TextStyle(color: Color(0xFF64748B)),
                    ),
                    const SizedBox(height: 14),
                    FilledButton.icon(
                      onPressed:
                          controller.linkedDevice?.isAuthorized == true &&
                              !controller.busy
                          ? controller.prepareAttendanceSigning
                          : null,
                      icon: Icon(
                        controller.attendanceSigningReady
                            ? Icons.verified_user
                            : Icons.key,
                      ),
                      label: Text(
                        controller.attendanceSigningReady
                            ? 'Firma biométrica preparada'
                            : 'Preparar firma biométrica',
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),
            _OfflineSyncCard(controller: controller),
          ],
        ),
      ),
    );
  }

  static String _bluetoothDetail(DeviceStatus status) {
    if (!status.bluetoothSupported) {
      return 'El dispositivo no reporta soporte Bluetooth.';
    }
    if (!status.bluetoothPermissionGranted) {
      return 'Falta autorizar búsqueda y conexión Bluetooth.';
    }
    if (!status.bluetoothEnabled) {
      return 'Bluetooth está desactivado.';
    }
    return 'Bluetooth activo y autorizado.';
  }
}

class _OfflineSyncCard extends StatelessWidget {
  const _OfflineSyncCard({required this.controller});

  final AppController controller;

  @override
  Widget build(BuildContext context) {
    final credential = controller.offlineCredential;
    final bool ready = controller.offlineReady;
    final int pending = controller.pendingOfflineCount;
    final String detail;

    if (credential == null) {
      detail =
          'Conéctese una vez para descargar la credencial y los horarios cifrados.';
    } else if (credential.isExpired) {
      detail =
          'La credencial offline venció. Actualice el estado con conexión.';
    } else {
      detail =
          '${credential.schedules.length} horarios disponibles · vence ${_formatCredentialDate(credential.expiresAt)}.';
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: ready
                        ? const Color(0xFFECFDF5)
                        : const Color(0xFFFFFBEB),
                    borderRadius: BorderRadius.circular(15),
                  ),
                  child: Icon(
                    ready ? Icons.offline_bolt : Icons.cloud_off_outlined,
                    color: ready
                        ? const Color(0xFF047857)
                        : const Color(0xFFB45309),
                  ),
                ),
                const SizedBox(width: 13),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      const Text(
                        'Modo sin conexión',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 5),
                      Text(
                        detail,
                        style: const TextStyle(
                          color: Color(0xFF64748B),
                          height: 1.35,
                        ),
                      ),
                      if (controller.offlineMessage != null) ...<Widget>[
                        const SizedBox(height: 6),
                        Text(
                          controller.offlineMessage!,
                          style: const TextStyle(
                            color: Color(0xFF475569),
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: pending > 0
                    ? const Color(0xFFEFF6FF)
                    : const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(
                children: <Widget>[
                  Icon(
                    pending > 0
                        ? Icons.sync_problem
                        : Icons.cloud_done_outlined,
                    color: pending > 0
                        ? const Color(0xFF1D4ED8)
                        : const Color(0xFF047857),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      pending > 0
                          ? '$pending marcación(es) pendiente(s) de sincronización.'
                          : 'No existen marcaciones pendientes.',
                      style: const TextStyle(fontWeight: FontWeight.w800),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 9,
              runSpacing: 9,
              children: <Widget>[
                OutlinedButton.icon(
                  onPressed:
                      controller.busy ||
                          !controller.serverOnline ||
                          controller.linkedDevice?.isAuthorized != true
                      ? null
                      : () async {
                          await controller.prepareOfflineMode(
                            forceRefresh: ready,
                          );
                        },
                  icon: const Icon(Icons.download_for_offline_outlined),
                  label: Text(ready ? 'Renovar horarios' : 'Preparar offline'),
                ),
                FilledButton.icon(
                  onPressed:
                      controller.busy ||
                          controller.offlineSyncing ||
                          !controller.serverOnline ||
                          pending == 0
                      ? null
                      : () async {
                          await controller.syncOfflineQueue();
                        },
                  icon: controller.offlineSyncing
                      ? const SizedBox.square(
                          dimension: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.sync),
                  label: const Text('Sincronizar ahora'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  static String _formatCredentialDate(DateTime value) {
    final DateTime local = value.toLocal();
    final int hour = local.hour == 0
        ? 12
        : local.hour > 12
        ? local.hour - 12
        : local.hour;
    final String suffix = local.hour >= 12 ? 'PM' : 'AM';
    return '${local.day.toString().padLeft(2, '0')}/'
        '${local.month.toString().padLeft(2, '0')} '
        '${hour.toString().padLeft(2, '0')}:'
        '${local.minute.toString().padLeft(2, '0')} $suffix';
  }
}

class _MobileLinkCard extends StatelessWidget {
  const _MobileLinkCard({required this.controller});

  final AppController controller;

  @override
  Widget build(BuildContext context) {
    final device = controller.linkedDevice;
    final String title;
    final String detail;
    final Color color;
    final IconData icon;

    if (device == null) {
      title = 'Celular sin vincular';
      detail = 'Escanee el QR generado por el administrador.';
      color = const Color(0xFFB45309);
      icon = Icons.phonelink_lock_outlined;
    } else if (device.isAuthorized) {
      title = 'Celular autorizado';
      detail = '${device.deviceLabel} · vinculación institucional activa.';
      color = const Color(0xFF047857);
      icon = Icons.verified_user_outlined;
    } else if (device.isPending) {
      title = 'Autorización pendiente';
      detail = 'La solicitud fue enviada y espera aprobación administrativa.';
      color = const Color(0xFFB45309);
      icon = Icons.hourglass_top;
    } else if (device.isSuspended) {
      title = 'Celular suspendido';
      detail = device.stateReason ?? 'Consulte al administrador.';
      color = const Color(0xFFB91C1C);
      icon = Icons.pause_circle_outline;
    } else {
      title = 'Vinculación no vigente';
      detail = device.stateReason ?? 'Genere una nueva vinculación.';
      color = const Color(0xFFB91C1C);
      icon = Icons.mobile_off_outlined;
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.10),
                    borderRadius: BorderRadius.circular(15),
                  ),
                  child: Icon(icon, color: color),
                ),
                const SizedBox(width: 13),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        title,
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 5),
                      Text(
                        detail,
                        style: const TextStyle(
                          color: Color(0xFF64748B),
                          height: 1.35,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            if (device == null || device.isRejected || device.isRevoked)
              FilledButton.icon(
                onPressed: controller.busy
                    ? null
                    : () async {
                        controller.clearError();
                        await Navigator.of(context).push<void>(
                          MaterialPageRoute<void>(
                            builder: (_) =>
                                DeviceLinkScreen(controller: controller),
                          ),
                        );
                        await controller.refreshAll();
                      },
                icon: const Icon(Icons.qr_code_scanner),
                label: const Text('Vincular este celular'),
              )
            else
              OutlinedButton.icon(
                onPressed: controller.busy ? null : controller.refreshAll,
                icon: const Icon(Icons.refresh),
                label: const Text('Actualizar estado'),
              ),
          ],
        ),
      ),
    );
  }
}

class _WelcomeCard extends StatelessWidget {
  const _WelcomeCard({required this.controller});

  final AppController controller;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: <Color>[unsaacBurgundy, unsaacNavy],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          const Text(
            'Panel docente móvil',
            style: TextStyle(
              color: Color(0xFFFFDFA0),
              fontWeight: FontWeight.w800,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 7),
          Text(
            'Hola, ${controller.user?.nombres ?? 'Docente'}',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 25,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            '${controller.deviceStatus.deviceLabel} · Android ${controller.deviceStatus.androidVersion}',
            style: const TextStyle(color: Color(0xFFDCE7F1)),
          ),
          const SizedBox(height: 4),
          Text(
            controller.user?.codigo ?? '',
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _BleResults extends StatelessWidget {
  const _BleResults({required this.controller});

  final AppController controller;

  @override
  Widget build(BuildContext context) {
    if (controller.scanningBle) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(18),
          child: Row(
            children: <Widget>[
              CircularProgressIndicator(),
              SizedBox(width: 14),
              Expanded(child: Text('Buscando dispositivos BLE cercanos...')),
            ],
          ),
        ),
      );
    }

    if (controller.bleDevices.isEmpty) {
      return const SizedBox.shrink();
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            const Text(
              'Dispositivos BLE detectados',
              style: TextStyle(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 10),
            ...controller.bleDevices
                .take(12)
                .map(
                  (BleDeviceResult device) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: CircleAvatar(
                      backgroundColor: device.isInstitutional
                          ? const Color(0xFFDCFCE7)
                          : const Color(0xFFEFF6FF),
                      child: Icon(
                        device.isInstitutional
                            ? Icons.verified
                            : Icons.bluetooth_searching,
                        color: device.isInstitutional
                            ? const Color(0xFF047857)
                            : const Color(0xFF1D4ED8),
                      ),
                    ),
                    title: Text(
                      device.name,
                      style: const TextStyle(fontWeight: FontWeight.w800),
                    ),
                    subtitle: Text(
                      '${device.address} · RSSI ${device.rssi} dBm',
                    ),
                  ),
                ),
          ],
        ),
      ),
    );
  }
}

class _SuccessBanner extends StatelessWidget {
  const _SuccessBanner({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFECFDF5),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF6EE7B7)),
      ),
      child: Row(
        children: <Widget>[
          const Icon(Icons.check_circle, color: Color(0xFF047857)),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                color: Color(0xFF065F46),
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
