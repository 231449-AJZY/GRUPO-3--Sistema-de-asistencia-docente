import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import '../core/server_url.dart';
import '../models/ble_station.dart';
import '../models/device_status.dart';
import '../models/mobile_attendance.dart';
import '../models/mobile_device.dart';
import '../models/offline_attendance.dart';
import '../models/user_session.dart';
import '../services/api_service.dart';
import '../services/biometric_service.dart';
import '../services/device_key_service.dart';
import '../services/device_service.dart';
import '../services/offline_queue_service.dart';
import '../services/secure_storage_service.dart';

enum AppState { loading, signedOut, signedIn }

class QuickAttendanceOutcome {
  const QuickAttendanceOutcome({
    required this.verified,
    required this.registered,
    required this.message,
    this.duplicate = false,
    this.state,
    this.teacherName,
    this.teacherCode,
    this.courseName,
    this.classroom,
    this.date,
    this.serverTime,
    this.target,
    this.stationName,
    this.stationCode,
    this.stationRssi,
    this.stationSamples,
    this.queued = false,
    this.offline = false,
    this.pendingCount,
  });

  final bool verified;
  final bool registered;
  final bool duplicate;
  final String message;
  final String? state;
  final String? teacherName;
  final String? teacherCode;
  final String? courseName;
  final String? classroom;
  final String? date;
  final String? serverTime;
  final String? target;
  final String? stationName;
  final String? stationCode;
  final double? stationRssi;
  final int? stationSamples;
  final bool queued;
  final bool offline;
  final int? pendingCount;
}

class AppController extends ChangeNotifier {
  AppController({
    ApiService? apiService,
    SecureStorageService? storageService,
    DeviceService? deviceService,
    BiometricService? biometricService,
    DeviceKeyService? keyService,
    OfflineQueueService? offlineQueueService,
  }) : _api = apiService ?? ApiService(),
       _storage = storageService ?? SecureStorageService(),
       _device = deviceService ?? DeviceService(),
       _biometric = biometricService ?? BiometricService(),
       _keys = keyService ?? DeviceKeyService(),
       _offline = offlineQueueService ?? OfflineQueueService();

  static const String _tokenKey = 'auth_token';
  static const String _serverKey = 'server_url';
  static const String _bleStationProfileKey = 'ble_station_profile_v1';

  final ApiService _api;
  final SecureStorageService _storage;
  final DeviceService _device;
  final BiometricService _biometric;
  final DeviceKeyService _keys;
  final OfflineQueueService _offline;

  AppState state = AppState.loading;
  UserSession? user;
  String serverUrl = defaultServerUrl;
  String? errorMessage;
  bool busy = false;
  bool serverOnline = false;
  DeviceStatus deviceStatus = DeviceStatus.empty();
  BiometricStatus biometricStatus = const BiometricStatus(
    supported: false,
    enrolled: false,
    types: <String>[],
  );
  List<BleDeviceResult> bleDevices = <BleDeviceResult>[];
  bool scanningBle = false;
  bool lastBiometricTestPassed = false;
  LinkedMobileDevice? linkedDevice;
  DeviceIdentity? deviceIdentity;
  String? lastLinkMessage;
  bool attendanceSigningReady = false;
  String? attendanceSigningMessage;
  BleStationProfile? bleStationProfile;
  BleAdvertisingStatus bleAdvertisingStatus = const BleAdvertisingStatus(
    active: false,
    starting: false,
  );
  String? bleStationMessage;
  bool scanningAttendanceBle = false;
  List<BlePresenceProof> lastAttendanceBleProofs = <BlePresenceProof>[];
  OfflineCredential? offlineCredential;
  List<OfflineQueueItem> offlineQueue = <OfflineQueueItem>[];
  bool offlineSyncing = false;
  String? offlineMessage;

  String? _token;

  String? get sessionToken => _token;
  int get pendingOfflineCount =>
      offlineQueue.where((OfflineQueueItem item) => item.isPending).length;

  bool get offlineReady =>
      offlineCredential != null &&
      !offlineCredential!.isExpired &&
      offlineCredential!.schedules.isNotEmpty;

  Future<void> initialize() async {
    try {
      final String storedServerUrl =
          await _storage.read(_serverKey) ?? defaultServerUrl;
      serverUrl = migrateServerUrl(storedServerUrl);

      if (normalizeServerUrl(storedServerUrl) != serverUrl) {
        await _storage.write(_serverKey, serverUrl);
      }

      _token = await _storage.read(_tokenKey);
      await loadOfflineState(notify: false);
      await refreshCapabilities();

      if (serverOnline && pendingOfflineCount > 0) {
        await syncOfflineQueue(notify: false);
      }

      if (_token == null || _token!.isEmpty) {
        state = AppState.signedOut;
        notifyListeners();
        return;
      }

      user = await _api.me(serverUrl: serverUrl, token: _token!);
      if (user?.isMobileRole != true) {
        await _storage.delete(_tokenKey);
        _token = null;
        user = null;
        state = AppState.signedOut;
        errorMessage =
            'La aplicación móvil está habilitada para Administradores, Supervisores y Docentes.';
      } else {
        state = AppState.signedIn;
        if (user?.isDocente == true) {
          await refreshLinkedDevice(notify: false);
          await prepareAttendanceSigning(notify: false);
          if (serverOnline && pendingOfflineCount > 0) {
            await syncOfflineQueue(notify: false);
          }
          await prepareOfflineMode(notify: false);
        }
        if (user?.isAdmin == true) {
          await loadBleStationProfile(notify: false);
        }
      }
    } on Object {
      await _storage.delete(_tokenKey);
      _token = null;
      user = null;
      state = AppState.signedOut;
    }

    notifyListeners();
  }

  Future<bool> login({
    required String username,
    required String password,
  }) async {
    busy = true;
    errorMessage = null;
    notifyListeners();

    try {
      final LoginResult result = await _api.login(
        serverUrl: serverUrl,
        username: username,
        password: password,
      );

      if (!result.user.isMobileRole) {
        throw const ApiException(
          'La aplicación móvil admite cuentas Administrador, Supervisor y Docente.',
        );
      }

      await _storage.write(_tokenKey, result.token);
      _token = result.token;
      user = result.user;
      state = AppState.signedIn;
      serverOnline = true;
      await refreshCapabilities();

      if (user?.isDocente == true) {
        await refreshLinkedDevice(notify: false);
        await prepareAttendanceSigning(notify: false);
        await loadOfflineState(notify: false);
        if (serverOnline && pendingOfflineCount > 0) {
          await syncOfflineQueue(notify: false);
        }
        await prepareOfflineMode(notify: false);
      }
      if (user?.isAdmin == true) {
        await loadBleStationProfile(notify: false);
      }

      return true;
    } on ApiException catch (error) {
      errorMessage = error.message.toString();
      return false;
    } on Object {
      errorMessage = 'No se pudo completar el inicio de sesión.';
      return false;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    try {
      await _device.stopBleStationAdvertising();
    } on Object {
      // La aplicación puede cerrar sesión aunque Android ya haya detenido BLE.
    }
    await _storage.delete(_tokenKey);
    _token = null;
    user = null;
    linkedDevice = null;
    bleDevices = <BleDeviceResult>[];
    lastBiometricTestPassed = false;
    lastLinkMessage = null;
    attendanceSigningReady = false;
    attendanceSigningMessage = null;
    bleStationProfile = null;
    bleAdvertisingStatus = const BleAdvertisingStatus(
      active: false,
      starting: false,
    );
    bleStationMessage = null;
    lastAttendanceBleProofs = <BlePresenceProof>[];
    errorMessage = null;
    state = AppState.signedOut;
    notifyListeners();
  }

  void clearError() {
    errorMessage = null;
    notifyListeners();
  }

  Future<bool> saveServerUrl(String value) async {
    final String normalized = normalizeServerUrl(value);
    busy = true;
    errorMessage = null;
    notifyListeners();

    try {
      final bool online = await _api.health(normalized);
      serverUrl = normalized;
      serverOnline = online;
      await _storage.write(_serverKey, normalized);
      return online;
    } on Object {
      errorMessage = 'No se pudo guardar la dirección del servidor.';
      return false;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<void> refreshCapabilities() async {
    try {
      final List<Object> values = await Future.wait<Object>(<Future<Object>>[
        _api.health(serverUrl),
        _device.getStatus(),
        _biometric.status(),
      ]);
      serverOnline = values[0] as bool;
      deviceStatus = values[1] as DeviceStatus;
      biometricStatus = values[2] as BiometricStatus;
      deviceIdentity = await _keys.getIdentity();
      bleAdvertisingStatus = await _device.getBleStationAdvertisingStatus();
    } on Object {
      serverOnline = false;
    }
    notifyListeners();
  }

  Future<void> refreshAll() async {
    await loadOfflineState(notify: false);
    await refreshCapabilities();
    if (serverOnline && pendingOfflineCount > 0) {
      await syncOfflineQueue(notify: false);
    }
    if (user?.isDocente == true) {
      await refreshLinkedDevice(notify: false);
      await prepareAttendanceSigning(notify: false);
      await prepareOfflineMode(notify: false);
    }
    if (user?.isAdmin == true) {
      await loadBleStationProfile(notify: false);
    }
    notifyListeners();
  }

  Future<void> refreshLinkedDevice({bool notify = true}) async {
    if (user?.isDocente != true || _token == null || _token!.isEmpty) {
      linkedDevice = null;
      if (notify) {
        notifyListeners();
      }
      return;
    }

    try {
      deviceIdentity ??= await _keys.getIdentity();

      if (deviceIdentity == null) {
        linkedDevice = null;
      } else {
        linkedDevice = await _api.myMobileDevice(
          serverUrl: serverUrl,
          token: _token!,
          installationId: deviceIdentity!.installationId,
        );
      }
    } on ApiException catch (error) {
      if (error.statusCode == 401) {
        await logout();
        return;
      }
      errorMessage = error.message;
    } on Object {
      errorMessage = 'No se pudo consultar la vinculación de este celular.';
    }

    if (notify) {
      notifyListeners();
    }
  }

  Future<bool> linkDeviceFromQr(String rawValue) async {
    if (user?.isDocente != true || _token == null) {
      errorMessage =
          'Inicie sesión con la cuenta docente antes de sincronizar el celular.';
      notifyListeners();
      return false;
    }

    busy = true;
    errorMessage = null;
    lastLinkMessage = null;
    notifyListeners();

    try {
      final DeviceLinkQrPayload qr = DeviceLinkQrPayload.parse(rawValue);

      if (user!.codigo.isNotEmpty &&
          qr.teacherCode != user!.codigo.trim().toUpperCase()) {
        throw const ApiException(
          'El código QR fue generado para otro docente.',
        );
      }

      await refreshCapabilities();

      if (!serverOnline) {
        throw ApiException('El servidor $serverUrl no está disponible.');
      }

      final DeviceIdentity identity = await _keys.getOrCreateIdentity();
      deviceIdentity = identity;

      linkedDevice = await _api.requestDeviceLink(
        serverUrl: serverUrl,
        token: _token!,
        qr: qr,
        identity: identity,
        device: deviceStatus,
        biometricTypes: biometricStatus.types,
      );

      await refreshLinkedDevice(notify: false);

      if (linkedDevice?.isAuthorized != true) {
        throw const ApiException(
          'La página recibió la sincronización, pero el celular no quedó autorizado.',
        );
      }

      if (biometricStatus.supported && biometricStatus.enrolled) {
        await prepareAttendanceSigning(notify: false);
        if (attendanceSigningReady && pendingOfflineCount == 0) {
          await prepareOfflineMode(notify: false, forceRefresh: true);
        }
      } else {
        attendanceSigningReady = false;
        attendanceSigningMessage =
            'El celular está autorizado para QR. Configure biometría fuerte para habilitar la firma por huella y el modo offline.';
      }

      lastLinkMessage =
          'Sincronización completada. Este celular quedó autorizado desde la página.';
      return true;
    } on FormatException catch (error) {
      errorMessage = error.message.toString();
      return false;
    } on ApiException catch (error) {
      errorMessage = error.message;
      return false;
    } on Object {
      errorMessage = 'No se pudo sincronizar y autorizar el dispositivo.';
      return false;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<bool> prepareAttendanceSigning({bool notify = true}) async {
    if (user?.isDocente != true ||
        _token == null ||
        _token!.isEmpty ||
        linkedDevice?.isAuthorized != true) {
      attendanceSigningReady = false;
      attendanceSigningMessage = linkedDevice?.isAuthorized == true
          ? 'No existe una sesión docente válida.'
          : 'El celular debe estar autorizado antes de preparar la firma.';
      if (notify) {
        notifyListeners();
      }
      return false;
    }

    try {
      final DeviceIdentity identity = await _keys
          .getOrCreateAttendanceIdentity();
      await _api.registerAttendanceKey(
        serverUrl: serverUrl,
        token: _token!,
        identity: identity,
      );
      attendanceSigningReady = true;
      attendanceSigningMessage =
          'Firma biométrica por operación preparada correctamente.';
      return true;
    } on PlatformException catch (error) {
      attendanceSigningReady = false;
      attendanceSigningMessage =
          error.message ??
          'No se pudo preparar la clave biométrica de asistencia.';
      return false;
    } on ApiException catch (error) {
      attendanceSigningReady = false;
      attendanceSigningMessage = error.message;
      return false;
    } on Object {
      attendanceSigningReady = false;
      attendanceSigningMessage =
          'No se pudo preparar la firma biométrica de asistencia.';
      return false;
    } finally {
      if (notify) {
        notifyListeners();
      }
    }
  }

  Future<void> loadOfflineState({bool notify = true}) async {
    try {
      offlineCredential = await _offline.readCredential();
      offlineQueue = await _offline.readQueue();
    } on Object {
      offlineCredential = null;
      offlineQueue = <OfflineQueueItem>[];
      offlineMessage =
          'No se pudo leer la credencial o la cola offline cifrada.';
    }

    if (notify) {
      notifyListeners();
    }
  }

  Future<bool> prepareOfflineMode({
    bool notify = true,
    bool forceRefresh = false,
  }) async {
    if (user?.isDocente != true ||
        _token == null ||
        _token!.isEmpty ||
        linkedDevice?.isAuthorized != true ||
        !attendanceSigningReady ||
        !serverOnline) {
      if (notify) {
        notifyListeners();
      }
      return false;
    }

    try {
      await loadOfflineState(notify: false);
      deviceIdentity ??= await _keys.getIdentity();
      final DeviceIdentity? identity = deviceIdentity;
      final DeviceIdentity? attendanceIdentity = await _keys
          .getAttendanceIdentity();

      if (identity == null || attendanceIdentity == null) {
        offlineMessage =
            'Prepare primero la identidad y la firma biométrica del celular.';
        return false;
      }

      final OfflineCredential? current = offlineCredential;
      final bool currentMatches =
          current != null &&
          !current.isExpired &&
          current.installationId == identity.installationId &&
          current.keyFingerprint == attendanceIdentity.keyFingerprint &&
          current.teacher.code.toUpperCase() ==
              (user?.codigo ?? '').toUpperCase();

      if (currentMatches && !forceRefresh) {
        offlineMessage =
            'Modo offline disponible con ${current.schedules.length} horarios cifrados.';
        return true;
      }

      if (pendingOfflineCount > 0) {
        offlineMessage =
            'Sincronice las marcaciones pendientes antes de renovar la credencial offline.';
        return false;
      }

      final TrustedClock clock = await _device.getTrustedClock();
      final OfflineCredential credential = await _api.prepareOfflineCredential(
        serverUrl: serverUrl,
        token: _token!,
        installationId: identity.installationId,
        clock: clock,
      );

      if (credential.keyFingerprint != attendanceIdentity.keyFingerprint) {
        throw const ApiException(
          'La credencial offline no corresponde a la clave biométrica local.',
        );
      }

      await _offline.writeCredential(credential);
      offlineCredential = credential;
      offlineMessage =
          'Modo offline preparado con ${credential.schedules.length} horarios.';
      return true;
    } on ApiException catch (error) {
      offlineMessage = error.message;
      return false;
    } on PlatformException catch (error) {
      offlineMessage =
          error.message ?? 'Android no pudo preparar el reloj seguro.';
      return false;
    } on Object {
      offlineMessage = 'No se pudo preparar el funcionamiento sin conexión.';
      return false;
    } finally {
      if (notify) {
        notifyListeners();
      }
    }
  }

  Future<bool> syncOfflineQueue({bool notify = true}) async {
    if (offlineSyncing) {
      return false;
    }

    await loadOfflineState(notify: false);
    final List<OfflineQueueItem> pending = offlineQueue
        .where((OfflineQueueItem item) => item.isPending)
        .toList();

    if (pending.isEmpty) {
      offlineMessage = 'No existen marcaciones pendientes.';
      if (notify) {
        notifyListeners();
      }
      return true;
    }

    if (!serverOnline) {
      offlineMessage =
          'La cola permanece cifrada hasta recuperar conexión con el servidor.';
      if (notify) {
        notifyListeners();
      }
      return false;
    }

    final DeviceIdentity? identity =
        deviceIdentity ?? await _keys.getIdentity();
    if (identity == null) {
      offlineMessage =
          'No se encontró la identidad institucional del dispositivo.';
      if (notify) {
        notifyListeners();
      }
      return false;
    }

    offlineSyncing = true;
    if (notify) {
      notifyListeners();
    }

    bool allGroupsCompleted = true;
    final Map<String, List<OfflineQueueItem>> groups =
        <String, List<OfflineQueueItem>>{};

    for (final OfflineQueueItem item in pending) {
      groups
          .putIfAbsent(item.credentialId, () => <OfflineQueueItem>[])
          .add(item);
    }

    try {
      for (final MapEntry<String, List<OfflineQueueItem>> group
          in groups.entries) {
        final Set<String> groupIds = group.value
            .map((OfflineQueueItem item) => item.localId)
            .toSet();

        offlineQueue = offlineQueue
            .map(
              (OfflineQueueItem item) => groupIds.contains(item.localId)
                  ? item.copyWith(
                      status: OfflineQueueStatus.syncing,
                      attempts: item.attempts + 1,
                    )
                  : item,
            )
            .toList();
        await _offline.writeQueue(offlineQueue);

        try {
          final OfflineSyncResponse response = await _api.syncOfflineQueue(
            serverUrl: serverUrl,
            installationId: identity.installationId,
            credentialId: group.key,
            batchId: generateUuidV4(),
            records: group.value,
          );

          final Map<String, OfflineSyncItemResult> byId =
              <String, OfflineSyncItemResult>{
                for (final OfflineSyncItemResult result in response.results)
                  result.localId: result,
              };

          offlineQueue = offlineQueue.map((OfflineQueueItem item) {
            final OfflineSyncItemResult? result = byId[item.localId];
            if (result == null) {
              return groupIds.contains(item.localId)
                  ? item.copyWith(
                      status: OfflineQueueStatus.pending,
                      message:
                          'El servidor no devolvió resultado para esta marcación.',
                    )
                  : item;
            }

            return item.copyWith(
              status: result.status,
              message: result.message,
              syncedAt: DateTime.now().toUtc(),
            );
          }).toList();

          offlineMessage = response.message;
        } on ApiException catch (error) {
          allGroupsCompleted = false;
          offlineQueue = offlineQueue
              .map(
                (OfflineQueueItem item) => groupIds.contains(item.localId)
                    ? item.copyWith(
                        status: OfflineQueueStatus.pending,
                        message: error.message.toString(),
                      )
                    : item,
              )
              .toList();
          offlineMessage = error.message;
        }

        await _offline.writeQueue(offlineQueue);
      }

      await loadOfflineState(notify: false);
      return allGroupsCompleted;
    } on Object {
      offlineMessage =
          'La sincronización se interrumpió. Los registros siguen cifrados en el celular.';
      return false;
    } finally {
      offlineSyncing = false;
      if (notify) {
        notifyListeners();
      }
    }
  }

  Future<bool> testBiometric() async {
    busy = true;
    errorMessage = null;
    lastBiometricTestPassed = false;
    notifyListeners();

    try {
      lastBiometricTestPassed = await _biometric.authenticate();
      if (!lastBiometricTestPassed) {
        errorMessage = 'La autenticación biométrica no fue aprobada.';
      }
      return lastBiometricTestPassed;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<QuickAttendanceOutcome> verifyQuickAttendance(String code) async {
    final String normalizedCode = code.trim().toUpperCase();

    if (normalizedCode.length < 3) {
      return const QuickAttendanceOutcome(
        verified: false,
        registered: false,
        message: 'Ingrese un código institucional válido.',
      );
    }

    busy = true;
    errorMessage = null;
    notifyListeners();

    try {
      await loadOfflineState(notify: false);
      await refreshCapabilities();

      if (serverOnline) {
        final QuickAttendanceOutcome result =
            await _verifyQuickAttendanceOnline(normalizedCode);
        if (pendingOfflineCount > 0) {
          await syncOfflineQueue(notify: false);
        }
        return result;
      }

      return await _queueOfflineAttendance(normalizedCode);
    } on PlatformException catch (error) {
      return QuickAttendanceOutcome(
        verified: false,
        registered: false,
        message:
            error.message ??
            'La huella o biometría no fue aprobada por Android.',
      );
    } on ApiException catch (error) {
      return QuickAttendanceOutcome(
        verified: false,
        registered: false,
        message: error.message.toString(),
      );
    } on StateError catch (error) {
      return QuickAttendanceOutcome(
        verified: false,
        registered: false,
        message: error.message.toString(),
      );
    } on Object {
      return const QuickAttendanceOutcome(
        verified: false,
        registered: false,
        message: 'No se pudo completar la marcación de asistencia.',
      );
    } finally {
      busy = false;
      scanningAttendanceBle = false;
      notifyListeners();
    }
  }

  Future<QuickAttendanceOutcome> _verifyQuickAttendanceOnline(
    String normalizedCode,
  ) async {
    final DeviceIdentity? deviceIdentityValue =
        deviceIdentity ?? await _keys.getIdentity();

    if (deviceIdentityValue == null) {
      return const QuickAttendanceOutcome(
        verified: false,
        registered: false,
        message:
            'Este celular todavía no tiene una identidad institucional. Inicie sesión como docente y vincúlelo mediante QR.',
      );
    }

    final DeviceIdentity? attendanceIdentity = await _keys
        .getAttendanceIdentity();
    if (attendanceIdentity == null) {
      return const QuickAttendanceOutcome(
        verified: false,
        registered: false,
        message:
            'La firma biométrica no está preparada. Inicie sesión una vez como docente y pulse Actualizar estado.',
      );
    }

    final List<BlePresenceProof>? bleProofs = await _scanAttendanceBle();
    if (bleProofs == null) {
      return const QuickAttendanceOutcome(
        verified: false,
        registered: false,
        message:
            'Active Bluetooth y autorice dispositivos cercanos para comprobar la presencia.',
      );
    }

    final MobileAttendanceChallenge challenge = await _api
        .createAttendanceChallenge(
          serverUrl: serverUrl,
          code: normalizedCode,
          installationId: deviceIdentityValue.installationId,
          bleProofs: bleProofs,
        );

    final AttendanceSignatureResult signed = await _keys.signAttendancePayload(
      challenge.content,
    );

    if (signed.keyFingerprint != attendanceIdentity.keyFingerprint) {
      return const QuickAttendanceOutcome(
        verified: false,
        registered: false,
        message:
            'La clave usada por Android no coincide con la firma institucional preparada.',
      );
    }

    final MobileAttendanceResult result = await _api.submitAttendance(
      serverUrl: serverUrl,
      challengeId: challenge.id,
      installationId: deviceIdentityValue.installationId,
      signature: signed.signature,
    );

    return QuickAttendanceOutcome(
      verified: result.signatureVerified,
      registered: result.registered,
      duplicate: result.duplicate,
      message: result.message,
      state: result.state,
      teacherName: result.teacherName,
      teacherCode: result.teacherCode,
      courseName: result.courseName,
      classroom: result.classroom,
      date: result.date,
      serverTime: result.serverTime,
      target: result.target,
      stationName: challenge.stationName,
      stationCode: challenge.stationCode,
      stationRssi: challenge.stationRssi,
      stationSamples: challenge.stationSamples,
      pendingCount: pendingOfflineCount,
    );
  }

  Future<QuickAttendanceOutcome> _queueOfflineAttendance(
    String normalizedCode,
  ) async {
    final OfflineCredential? credential = offlineCredential;

    if (credential == null) {
      return const QuickAttendanceOutcome(
        verified: false,
        registered: false,
        offline: true,
        message:
            'El modo offline no fue preparado. Conéctese una vez, inicie sesión como docente y pulse Actualizar estado.',
      );
    }

    if (credential.teacher.code.toUpperCase() != normalizedCode) {
      return const QuickAttendanceOutcome(
        verified: false,
        registered: false,
        offline: true,
        message:
            'El código ingresado no corresponde a la credencial offline guardada en este celular.',
      );
    }

    final DeviceIdentity? identity =
        deviceIdentity ?? await _keys.getIdentity();
    final DeviceIdentity? attendanceIdentity = await _keys
        .getAttendanceIdentity();

    if (identity == null ||
        attendanceIdentity == null ||
        identity.installationId != credential.installationId ||
        attendanceIdentity.keyFingerprint != credential.keyFingerprint) {
      return const QuickAttendanceOutcome(
        verified: false,
        registered: false,
        offline: true,
        message:
            'La identidad o la clave biométrica local no coinciden con la credencial offline.',
      );
    }

    final List<BlePresenceProof>? scanned = await _scanAttendanceBle();
    if (scanned == null || scanned.isEmpty) {
      return const QuickAttendanceOutcome(
        verified: false,
        registered: false,
        offline: true,
        message:
            'No se detectó una estación Bluetooth institucional. La marcación offline exige presencia BLE.',
      );
    }

    final List<BlePresenceProof> bleProofs = <BlePresenceProof>[...scanned]
      ..sort(
        (BlePresenceProof left, BlePresenceProof right) =>
            right.rssiAverage.compareTo(left.rssiAverage),
      );
    final TrustedClock clock = await _device.getTrustedClock();
    final bool trustedBeforeSigning = credential.isClockTrusted(clock);
    final int estimatedEpochMs = trustedBeforeSigning
        ? credential.estimatedEpochMs(clock)
        : clock.wallClockMs;

    if (estimatedEpochMs > credential.expiresAt.millisecondsSinceEpoch ||
        estimatedEpochMs < credential.issuedAt.millisecondsSinceEpoch) {
      return const QuickAttendanceOutcome(
        verified: false,
        registered: false,
        offline: true,
        message:
            'La credencial offline venció. Recupere conexión y actualice el estado del celular.',
      );
    }

    final OfflineSchedule? schedule = credential.eligibleSchedule(
      estimatedEpochMs,
    );
    if (schedule == null) {
      return const QuickAttendanceOutcome(
        verified: false,
        registered: false,
        offline: true,
        message:
            'No existe una clase dentro de la ventana offline. Por seguridad, el ingreso institucional sin clase requiere conexión.',
      );
    }

    final int highestSequence = offlineQueue
        .where((OfflineQueueItem item) => item.credentialId == credential.id)
        .fold<int>(
          0,
          (int value, OfflineQueueItem item) =>
              item.sequence > value ? item.sequence : value,
        );
    final int sequence = highestSequence + 1;
    final String localId = generateUuidV4();
    final Map<String, dynamic> payload = buildOfflinePayload(
      credential: credential,
      schedule: schedule,
      localId: localId,
      sequence: sequence,
      estimatedEpochMs: estimatedEpochMs,
      clock: clock,
      bleProofs: bleProofs,
    );
    final String content = jsonEncode(payload);
    final AttendanceSignatureResult signed = await _keys.signAttendancePayload(
      content,
    );

    if (signed.keyFingerprint != credential.keyFingerprint) {
      return const QuickAttendanceOutcome(
        verified: false,
        registered: false,
        offline: true,
        message: 'La firma biométrica no corresponde a la credencial offline.',
      );
    }

    final BlePresenceProof strongest = bleProofs.first;
    final OfflineQueueItem item = OfflineQueueItem(
      localId: localId,
      credentialId: credential.id,
      sequence: sequence,
      content: content,
      signature: signed.signature,
      keyFingerprint: signed.keyFingerprint,
      createdAt: DateTime.now().toUtc(),
      estimatedEpochMs: estimatedEpochMs,
      scheduleId: schedule.id,
      courseName: schedule.courseName,
      classroom: schedule.classroom,
      stationName: strongest.name,
      stationCode: 'BLE-${strongest.stationId}',
      status: OfflineQueueStatus.pending,
      attempts: 0,
      message: trustedBeforeSigning
          ? 'Pendiente de sincronización.'
          : 'El celular fue reiniciado o el reloj cambió; el servidor solicitará revisión.',
    );

    await _offline.add(item, maxPending: credential.maxPending);
    await loadOfflineState(notify: false);
    offlineMessage = item.message;

    final DateTime limaTime = credential.limaDateTimeFromEpoch(
      estimatedEpochMs,
    );
    final String hour = limaTime.hour == 0
        ? '12'
        : limaTime.hour > 12
        ? (limaTime.hour - 12).toString().padLeft(2, '0')
        : limaTime.hour.toString().padLeft(2, '0');
    final String suffix = limaTime.hour >= 12 ? 'PM' : 'AM';
    final String visibleTime =
        '$hour:${limaTime.minute.toString().padLeft(2, '0')} $suffix';

    return QuickAttendanceOutcome(
      verified: true,
      registered: false,
      queued: true,
      offline: true,
      message: trustedBeforeSigning
          ? 'Marcación firmada y guardada en la cola cifrada. Se sincronizará al recuperar internet.'
          : 'Marcación firmada y guardada, pero requerirá revisión del administrador por cambio de reloj o reinicio.',
      state: trustedBeforeSigning
          ? 'PENDIENTE DE SINCRONIZACIÓN'
          : 'REQUIERE REVISIÓN',
      teacherName: credential.teacher.fullName,
      teacherCode: credential.teacher.code,
      courseName: schedule.courseName,
      classroom: schedule.classroom,
      date:
          '${limaTime.year.toString().padLeft(4, '0')}-${limaTime.month.toString().padLeft(2, '0')}-${limaTime.day.toString().padLeft(2, '0')}',
      serverTime: visibleTime,
      target: 'CURSO_OFFLINE',
      stationName: strongest.name,
      stationCode: 'BLE-${strongest.stationId}',
      stationRssi: strongest.rssiAverage,
      stationSamples: strongest.samples,
      pendingCount: pendingOfflineCount,
    );
  }

  Future<List<BlePresenceProof>?> _scanAttendanceBle() async {
    final bool permissionsGranted = await _device.requestBluetoothPermissions();
    if (!permissionsGranted) {
      return null;
    }

    await refreshCapabilities();
    if (!deviceStatus.bluetoothEnabled) {
      return null;
    }

    scanningAttendanceBle = true;
    notifyListeners();
    final List<BlePresenceProof> bleProofs = await _device
        .scanAttendanceStations();
    scanningAttendanceBle = false;
    lastAttendanceBleProofs = bleProofs;
    notifyListeners();
    return bleProofs;
  }

  Future<void> loadBleStationProfile({bool notify = true}) async {
    try {
      final String? stored = await _storage.read(_bleStationProfileKey);
      bleStationProfile = stored == null || stored.isEmpty
          ? null
          : BleStationProfile.fromStoredJson(stored);
      bleAdvertisingStatus = await _device.getBleStationAdvertisingStatus();
    } on Object {
      bleStationProfile = null;
      bleStationMessage =
          'No se pudo leer el perfil seguro de la estación Bluetooth.';
    }

    if (notify) {
      notifyListeners();
    }
  }

  Future<bool> provisionBleStationFromQr(String rawValue) async {
    if (user?.isAdmin != true || _token == null || _token!.isEmpty) {
      errorMessage =
          'Inicie sesión con una cuenta Administrador para provisionar una estación.';
      notifyListeners();
      return false;
    }

    busy = true;
    errorMessage = null;
    bleStationMessage = null;
    notifyListeners();

    try {
      final BleStationProvisionQr qr = BleStationProvisionQr.parse(rawValue);
      final DeviceIdentity identity = await _keys.getOrCreateIdentity();
      final BleStationProfile profile = await _api.provisionBleStation(
        serverUrl: serverUrl,
        token: _token!,
        qr: qr,
        installationId: identity.installationId,
      );
      await _storage.write(_bleStationProfileKey, profile.toStoredJson());
      bleStationProfile = profile;
      bleStationMessage =
          'Estación provisionada. Ya puede iniciar la emisión Bluetooth.';
      return true;
    } on FormatException catch (error) {
      errorMessage = error.message.toString();
      return false;
    } on ApiException catch (error) {
      errorMessage = error.message;
      return false;
    } on Object {
      errorMessage = 'No se pudo provisionar la estación Bluetooth.';
      return false;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<bool> startBleStation() async {
    final BleStationProfile? profile = bleStationProfile;
    if (user?.isAdmin != true || profile == null || !profile.isValid) {
      errorMessage =
          'Escanee primero el QR de una estación con una cuenta Administrador.';
      notifyListeners();
      return false;
    }

    busy = true;
    errorMessage = null;
    bleStationMessage = null;
    notifyListeners();

    try {
      final bool permission = await _device.requestBluetoothPermissions();
      if (!permission) {
        throw PlatformException(
          code: 'PERMISSION_REQUIRED',
          message:
              'Debe autorizar Bluetooth, dispositivos cercanos y ubicación.',
        );
      }
      bleAdvertisingStatus = await _device.startBleStationAdvertising(profile);
      bleStationMessage = bleAdvertisingStatus.active
          ? 'La estación está emitiendo desafíos Bluetooth rotativos.'
          : 'Android inició el modo estación.';
      await refreshCapabilities();
      return bleAdvertisingStatus.active;
    } on PlatformException catch (error) {
      errorMessage =
          error.message ?? 'Android no pudo iniciar la publicidad Bluetooth.';
      return false;
    } on Object {
      errorMessage = 'No se pudo iniciar el modo estación Bluetooth.';
      return false;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<void> stopBleStation() async {
    busy = true;
    notifyListeners();
    try {
      await _device.stopBleStationAdvertising();
      bleAdvertisingStatus = const BleAdvertisingStatus(
        active: false,
        starting: false,
      );
      bleStationMessage = 'La emisión Bluetooth fue detenida.';
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<void> forgetBleStationProfile() async {
    await stopBleStation();
    await _storage.delete(_bleStationProfileKey);
    bleStationProfile = null;
    bleStationMessage = 'El perfil local de estación fue eliminado.';
    notifyListeners();
  }

  Future<void> requestBluetoothPermissions() async {
    await _device.requestBluetoothPermissions();
    await refreshCapabilities();
  }

  Future<void> openBluetoothSettings() async {
    await _device.openBluetoothSettings();
  }

  Future<void> scanBleStations() async {
    scanningBle = true;
    errorMessage = null;
    bleDevices = <BleDeviceResult>[];
    notifyListeners();

    try {
      bleDevices = await _device.scanBleStations();
    } on Object {
      errorMessage =
          'No fue posible buscar estaciones. Revise Bluetooth y sus permisos.';
    } finally {
      scanningBle = false;
      await refreshCapabilities();
      notifyListeners();
    }
  }
}
