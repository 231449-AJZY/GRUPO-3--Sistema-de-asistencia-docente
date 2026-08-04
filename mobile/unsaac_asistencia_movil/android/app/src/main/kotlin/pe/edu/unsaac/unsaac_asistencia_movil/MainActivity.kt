package pe.edu.unsaac.unsaac_asistencia_movil

import android.Manifest
import android.app.Activity
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.provider.Settings
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyPermanentlyInvalidatedException
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import io.flutter.embedding.android.FlutterFragmentActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.charset.StandardCharsets
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.MessageDigest
import java.security.PrivateKey
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.Mac
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

class MainActivity : FlutterFragmentActivity() {
    companion object {
        private const val SECURE_CHANNEL = "pe.edu.unsaac.asistencia/secure_storage"
        private const val DEVICE_CHANNEL = "pe.edu.unsaac.asistencia/device"
        private const val DEVICE_KEYS_CHANNEL = "pe.edu.unsaac.asistencia/device_keys"
        private const val REQUEST_BLUETOOTH_PERMISSIONS = 8101
        private const val KEY_ALIAS = "unsaac_asistencia_mobile_key"
        private const val SIGNING_KEY_ALIAS = "unsaac_mobile_signing_key_v1"
        private const val ATTENDANCE_KEY_ALIAS = "unsaac_mobile_attendance_key_v1"
        private const val INSTALLATION_ID_KEY = "mobile_installation_id"
        private const val PREFS_NAME = "unsaac_mobile_secure_prefs"
        private const val ANDROID_KEY_STORE = "AndroidKeyStore"
        private const val SCAN_DURATION_MS = 6000L
        private const val ATTENDANCE_SCAN_DURATION_MS = 5500L
        private const val BLE_MANUFACTURER_ID = 0x554E
        private const val BLE_PROTOCOL_VERSION: Byte = 1
        private const val BLE_TOKEN_LENGTH = 8
        private const val BLE_PAYLOAD_LENGTH = 17
    }

    private data class BleAttendanceAggregate(
        val stationId: Int,
        val timeSlot: Long,
        val token: String,
        var rssiSum: Int,
        var rssiMin: Int,
        var rssiMax: Int,
        var samples: Int,
        var address: String,
        var name: String,
    )

    private var pendingPermissionResult: MethodChannel.Result? = null
    private lateinit var notificationBridge: NotificationBridge
    private var pendingScanResult: MethodChannel.Result? = null
    private var pendingAttendanceSignatureResult: MethodChannel.Result? = null
    private var pendingAdvertiseStartResult: MethodChannel.Result? = null
    private var scanCallback: ScanCallback? = null
    private var attendanceScanMode = false
    private val scanDevices = linkedMapOf<String, MutableMap<String, Any>>()
    private val attendanceScanDevices = linkedMapOf<String, BleAttendanceAggregate>()
    private val mainHandler = Handler(Looper.getMainLooper())

    private var stationAdvertiseCallback: AdvertiseCallback? = null
    private var stationRotationRunnable: Runnable? = null
    private var stationAdvertisingActive = false
    private var stationAdvertisingStarting = false
    private var stationIdForAdvertising: Int? = null
    private var stationCodeForAdvertising: String? = null
    private var stationSecretForAdvertising: ByteArray? = null
    private var stationIntervalSeconds = 15
    private var stationCurrentSlot: Long? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        notificationBridge = NotificationBridge(
            this,
            flutterEngine.dartExecutor.binaryMessenger,
        )
        notificationBridge.configure()

        MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            SECURE_CHANNEL,
        ).setMethodCallHandler(::handleSecureCall)

        MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            DEVICE_CHANNEL,
        ).setMethodCallHandler(::handleDeviceCall)

        MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            DEVICE_KEYS_CHANNEL,
        ).setMethodCallHandler(::handleDeviceKeyCall)
    }

    override fun onDestroy() {
        stopBleScan(returnResults = false)
        stopBleStationAdvertisingInternal()
        pendingAttendanceSignatureResult?.error(
            "ACTIVITY_DESTROYED",
            "La confirmación biométrica fue interrumpida.",
            null,
        )
        pendingAttendanceSignatureResult = null
        super.onDestroy()
    }

    private fun handleSecureCall(call: MethodCall, result: MethodChannel.Result) {
        try {
            when (call.method) {
                "write" -> {
                    val key = call.argument<String>("key")
                    val value = call.argument<String>("value")
                    if (key.isNullOrBlank() || value == null) {
                        result.error("INVALID_ARGUMENT", "Se requieren key y value.", null)
                        return
                    }
                    securePreferences().edit().putString(key, encrypt(value)).apply()
                    result.success(null)
                }
                "read" -> {
                    val key = call.argument<String>("key")
                    if (key.isNullOrBlank()) {
                        result.error("INVALID_ARGUMENT", "Se requiere key.", null)
                        return
                    }
                    val encrypted = securePreferences().getString(key, null)
                    result.success(encrypted?.let(::decrypt))
                }
                "delete" -> {
                    val key = call.argument<String>("key")
                    if (key.isNullOrBlank()) {
                        result.error("INVALID_ARGUMENT", "Se requiere key.", null)
                        return
                    }
                    securePreferences().edit().remove(key).apply()
                    result.success(null)
                }
                "clear" -> {
                    securePreferences().edit().clear().apply()
                    result.success(null)
                }
                else -> result.notImplemented()
            }
        } catch (error: Exception) {
            result.error("SECURE_STORAGE_ERROR", error.message, null)
        }
    }

    private fun handleDeviceCall(call: MethodCall, result: MethodChannel.Result) {
        when (call.method) {
            "getStatus" -> result.success(deviceStatus())
            "getTrustedClock" -> result.success(trustedClock())
            "requestBluetoothPermissions" -> requestBluetoothPermissions(result)
            "openBluetoothSettings" -> {
                startActivity(Intent(Settings.ACTION_BLUETOOTH_SETTINGS))
                result.success(null)
            }
            "scanBleStations" -> startBleScan(result, attendanceOnly = false)
            "scanAttendanceStations" -> startBleScan(result, attendanceOnly = true)
            "startBleStationAdvertising" -> startBleStationAdvertising(call, result)
            "stopBleStationAdvertising" -> {
                stopBleStationAdvertisingInternal()
                result.success(true)
            }
            "getBleStationAdvertisingStatus" -> result.success(
                bleStationAdvertisingStatus(),
            )
            else -> result.notImplemented()
        }
    }

    private fun handleDeviceKeyCall(
        call: MethodCall,
        result: MethodChannel.Result,
    ) {
        try {
            when (call.method) {
                "getOrCreateIdentity" -> result.success(
                    getOrCreateDeviceIdentity(),
                )
                "getIdentity" -> result.success(
                    getExistingDeviceIdentity(),
                )
                "getOrCreateAttendanceIdentity" -> result.success(
                    getOrCreateAttendanceIdentity(),
                )
                "getAttendanceIdentity" -> result.success(
                    getExistingAttendanceIdentity(),
                )
                "signAttendancePayload" -> {
                    val payload = call.argument<String>("payload")
                    if (payload.isNullOrBlank() || payload.length > 16384) {
                        result.error(
                            "INVALID_ARGUMENT",
                            "El desafío de asistencia no es válido.",
                            null,
                        )
                        return
                    }
                    signAttendancePayload(payload, result)
                }
                else -> result.notImplemented()
            }
        } catch (error: Exception) {
            result.error(
                "DEVICE_IDENTITY_ERROR",
                error.message ?: "No se pudo preparar la identidad del dispositivo.",
                null,
            )
        }
    }

    private fun getOrCreateInstallationId(): String {
        val preferences = getSharedPreferences(
            "unsaac_mobile_device_identity",
            Context.MODE_PRIVATE,
        )
        val existing = preferences.getString(INSTALLATION_ID_KEY, null)
        if (!existing.isNullOrBlank()) {
            return existing
        }

        val created = "UNSAAC-${UUID.randomUUID()}"
        preferences.edit().putString(INSTALLATION_ID_KEY, created).apply()
        return created
    }

    private fun signingKeyStore(): KeyStore =
        KeyStore.getInstance(ANDROID_KEY_STORE).apply { load(null) }

    private fun getOrCreateDeviceIdentity(): Map<String, Any> {
        val keyStore = signingKeyStore()
        if (!keyStore.containsAlias(SIGNING_KEY_ALIAS)) {
            val generator = KeyPairGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_EC,
                ANDROID_KEY_STORE,
            )
            generator.initialize(
                KeyGenParameterSpec.Builder(
                    SIGNING_KEY_ALIAS,
                    KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY,
                )
                    .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
                    .setDigests(KeyProperties.DIGEST_SHA256)
                    .build(),
            )
            generator.generateKeyPair()
        }

        return buildIdentityMap(
            keyStore,
            SIGNING_KEY_ALIAS,
            "EC_P256_SHA256",
        )
    }

    private fun getExistingDeviceIdentity(): Map<String, Any>? {
        val keyStore = signingKeyStore()
        if (!keyStore.containsAlias(SIGNING_KEY_ALIAS)) {
            return null
        }
        return buildIdentityMap(
            keyStore,
            SIGNING_KEY_ALIAS,
            "EC_P256_SHA256",
        )
    }

    private fun buildIdentityMap(
        keyStore: KeyStore,
        alias: String,
        algorithm: String,
    ): Map<String, Any> {
        val certificate = keyStore.getCertificate(alias)
            ?: error("No se encontró el certificado de la clave móvil.")
        val encodedPublicKey = certificate.publicKey.encoded
        val publicKeyBase64 = Base64.encodeToString(
            encodedPublicKey,
            Base64.NO_WRAP,
        )
        val fingerprint = MessageDigest.getInstance("SHA-256")
            .digest(encodedPublicKey)
            .joinToString("") { byte -> "%02x".format(byte) }

        return mapOf(
            "installationId" to getOrCreateInstallationId(),
            "publicKey" to publicKeyBase64,
            "keyFingerprint" to fingerprint,
            "algorithm" to algorithm,
        )
    }

    private fun getOrCreateAttendanceIdentity(): Map<String, Any> {
        val biometricStatus = BiometricManager.from(this).canAuthenticate(
            BiometricManager.Authenticators.BIOMETRIC_STRONG,
        )
        if (biometricStatus != BiometricManager.BIOMETRIC_SUCCESS) {
            error("El celular requiere una biometría fuerte configurada.")
        }

        val keyStore = signingKeyStore()
        if (!keyStore.containsAlias(ATTENDANCE_KEY_ALIAS)) {
            val generator = KeyPairGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_EC,
                ANDROID_KEY_STORE,
            )
            val builder = KeyGenParameterSpec.Builder(
                ATTENDANCE_KEY_ALIAS,
                KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY,
            )
                .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
                .setDigests(KeyProperties.DIGEST_SHA256)
                .setUserAuthenticationRequired(true)
                .setInvalidatedByBiometricEnrollment(true)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                builder.setUserAuthenticationParameters(
                    0,
                    KeyProperties.AUTH_BIOMETRIC_STRONG,
                )
            } else {
                @Suppress("DEPRECATION")
                builder.setUserAuthenticationValidityDurationSeconds(-1)
            }

            generator.initialize(builder.build())
            generator.generateKeyPair()
        }

        return buildIdentityMap(
            keyStore,
            ATTENDANCE_KEY_ALIAS,
            "EC_P256_SHA256_BIOMETRIC_PER_USE",
        )
    }

    private fun getExistingAttendanceIdentity(): Map<String, Any>? {
        val keyStore = signingKeyStore()
        if (!keyStore.containsAlias(ATTENDANCE_KEY_ALIAS)) {
            return null
        }
        return buildIdentityMap(
            keyStore,
            ATTENDANCE_KEY_ALIAS,
            "EC_P256_SHA256_BIOMETRIC_PER_USE",
        )
    }

    private fun signAttendancePayload(
        payload: String,
        result: MethodChannel.Result,
    ) {
        if (pendingAttendanceSignatureResult != null) {
            result.error(
                "BIOMETRIC_BUSY",
                "Ya existe una confirmación biométrica en curso.",
                null,
            )
            return
        }

        val identity = getOrCreateAttendanceIdentity()
        val keyStore = signingKeyStore()
        val privateKey = keyStore.getKey(
            ATTENDANCE_KEY_ALIAS,
            null,
        ) as? PrivateKey ?: error(
            "No se encontró la clave privada de asistencia.",
        )

        val signature = try {
            Signature.getInstance("SHA256withECDSA").apply {
                initSign(privateKey)
            }
        } catch (error: KeyPermanentlyInvalidatedException) {
            keyStore.deleteEntry(ATTENDANCE_KEY_ALIAS)
            throw IllegalStateException(
                "La clave quedó invalidada por un cambio biométrico. Inicie sesión para prepararla nuevamente.",
                error,
            )
        }

        pendingAttendanceSignatureResult = result
        val executor = ContextCompat.getMainExecutor(this)
        val biometricPrompt = BiometricPrompt(
            this,
            executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationError(
                    errorCode: Int,
                    errString: CharSequence,
                ) {
                    super.onAuthenticationError(errorCode, errString)
                    pendingAttendanceSignatureResult?.error(
                        "BIOMETRIC_ERROR_$errorCode",
                        errString.toString(),
                        null,
                    )
                    pendingAttendanceSignatureResult = null
                }

                override fun onAuthenticationSucceeded(
                    authenticationResult: BiometricPrompt.AuthenticationResult,
                ) {
                    super.onAuthenticationSucceeded(authenticationResult)
                    try {
                        val unlockedSignature =
                            authenticationResult.cryptoObject?.signature
                                ?: signature
                        unlockedSignature.update(
                            payload.toByteArray(StandardCharsets.UTF_8),
                        )
                        val signedBytes = unlockedSignature.sign()
                        pendingAttendanceSignatureResult?.success(
                            mapOf(
                                "signature" to Base64.encodeToString(
                                    signedBytes,
                                    Base64.NO_WRAP,
                                ),
                                "keyFingerprint" to identity["keyFingerprint"],
                                "algorithm" to "SHA256withECDSA",
                            ),
                        )
                    } catch (error: Exception) {
                        pendingAttendanceSignatureResult?.error(
                            "SIGNATURE_ERROR",
                            error.message ?: "No se pudo firmar la asistencia.",
                            null,
                        )
                    } finally {
                        pendingAttendanceSignatureResult = null
                    }
                }
            },
        )

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle("Confirmar asistencia UNSAAC")
            .setSubtitle("Use su huella o biometría fuerte para firmar esta marcación")
            .setAllowedAuthenticators(
                BiometricManager.Authenticators.BIOMETRIC_STRONG,
            )
            .setNegativeButtonText("Cancelar")
            .build()

        biometricPrompt.authenticate(
            promptInfo,
            BiometricPrompt.CryptoObject(signature),
        )
    }

    private fun securePreferences() =
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    private fun getOrCreateSecretKey(): SecretKey {
        val keyStore = KeyStore.getInstance(ANDROID_KEY_STORE).apply { load(null) }
        val existing = keyStore.getKey(KEY_ALIAS, null)
        if (existing is SecretKey) {
            return existing
        }

        val generator = KeyGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_AES,
            ANDROID_KEY_STORE,
        )
        generator.init(
            KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .build(),
        )
        return generator.generateKey()
    }

    private fun encrypt(value: String): String {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateSecretKey())
        val cipherText = cipher.doFinal(value.toByteArray(StandardCharsets.UTF_8))
        val iv = Base64.encodeToString(cipher.iv, Base64.NO_WRAP)
        val payload = Base64.encodeToString(cipherText, Base64.NO_WRAP)
        return "$iv:$payload"
    }

    private fun decrypt(value: String): String {
        val parts = value.split(":", limit = 2)
        require(parts.size == 2) { "Formato cifrado inválido." }

        val iv = Base64.decode(parts[0], Base64.NO_WRAP)
        val payload = Base64.decode(parts[1], Base64.NO_WRAP)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(
            Cipher.DECRYPT_MODE,
            getOrCreateSecretKey(),
            GCMParameterSpec(128, iv),
        )
        return String(cipher.doFinal(payload), StandardCharsets.UTF_8)
    }

    private fun requiredBluetoothPermissions(): Array<String> {
        return when {
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> arrayOf(
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.BLUETOOTH_ADVERTISE,
                Manifest.permission.ACCESS_FINE_LOCATION,
            )
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.M -> arrayOf(
                Manifest.permission.ACCESS_FINE_LOCATION,
            )
            else -> emptyArray()
        }
    }

    private fun hasBluetoothPermissions(): Boolean {
        return requiredBluetoothPermissions().all { permission ->
            ContextCompat.checkSelfPermission(this, permission) ==
                PackageManager.PERMISSION_GRANTED
        }
    }

    private fun requestBluetoothPermissions(result: MethodChannel.Result) {
        val missing = requiredBluetoothPermissions().filter { permission ->
            ContextCompat.checkSelfPermission(this, permission) !=
                PackageManager.PERMISSION_GRANTED
        }

        if (missing.isEmpty()) {
            result.success(true)
            return
        }

        if (pendingPermissionResult != null) {
            result.error("PERMISSION_BUSY", "Ya existe una solicitud de permisos.", null)
            return
        }

        pendingPermissionResult = result
        ActivityCompat.requestPermissions(
            this,
            missing.toTypedArray(),
            REQUEST_BLUETOOTH_PERMISSIONS,
        )
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray,
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)

        if (::notificationBridge.isInitialized &&
            notificationBridge.onRequestPermissionsResult(
                requestCode,
                grantResults,
            )
        ) {
            return
        }

        if (requestCode == REQUEST_BLUETOOTH_PERMISSIONS) {
            val granted = grantResults.isNotEmpty() &&
                grantResults.all { it == PackageManager.PERMISSION_GRANTED }
            pendingPermissionResult?.success(granted)
            pendingPermissionResult = null
        }
    }

    private fun bluetoothAdapter(): BluetoothAdapter? {
        val manager = getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        return manager?.adapter
    }

    private fun trustedClock(): Map<String, Any> {
        val bootCount = try {
            Settings.Global.getInt(contentResolver, Settings.Global.BOOT_COUNT)
        } catch (_: Exception) {
            0
        }

        return mapOf(
            "wallClockMs" to System.currentTimeMillis(),
            "elapsedRealtimeMs" to SystemClock.elapsedRealtime(),
            "bootCount" to bootCount,
        )
    }

    private fun deviceStatus(): Map<String, Any> {
        val adapter = bluetoothAdapter()
        val permissionsGranted = hasBluetoothPermissions()
        val enabled = try {
            adapter != null && permissionsGranted && adapter.isEnabled
        } catch (_: SecurityException) {
            false
        }

        return mapOf(
            "manufacturer" to Build.MANUFACTURER,
            "model" to Build.MODEL,
            "androidVersion" to Build.VERSION.RELEASE,
            "sdkInt" to Build.VERSION.SDK_INT,
            "bluetoothSupported" to (adapter != null),
            "bluetoothEnabled" to enabled,
            "bluetoothPermissionGranted" to permissionsGranted,
            "bleAdvertisingSupported" to (
                adapter?.isMultipleAdvertisementSupported == true &&
                    adapter.bluetoothLeAdvertiser != null
                ),
            "bleAdvertisingActive" to stationAdvertisingActive,
        )
    }

    private fun startBleScan(
        result: MethodChannel.Result,
        attendanceOnly: Boolean,
    ) {
        if (pendingScanResult != null) {
            result.error("SCAN_BUSY", "Ya existe una búsqueda Bluetooth en curso.", null)
            return
        }

        if (!hasBluetoothPermissions()) {
            result.error("PERMISSION_REQUIRED", "Autorice los permisos Bluetooth.", null)
            return
        }

        val adapter = bluetoothAdapter()
        if (adapter == null) {
            result.error("BLUETOOTH_UNAVAILABLE", "Bluetooth no está disponible.", null)
            return
        }

        val enabled = try {
            adapter.isEnabled
        } catch (_: SecurityException) {
            false
        }
        if (!enabled) {
            result.error("BLUETOOTH_DISABLED", "Bluetooth está desactivado.", null)
            return
        }

        val scanner = adapter.bluetoothLeScanner
        if (scanner == null) {
            result.error("SCANNER_UNAVAILABLE", "El escáner BLE no está disponible.", null)
            return
        }

        pendingScanResult = result
        attendanceScanMode = attendanceOnly
        scanDevices.clear()
        attendanceScanDevices.clear()

        val callback = object : ScanCallback() {
            override fun onScanResult(callbackType: Int, scanResult: ScanResult) {
                addScanResult(scanResult)
            }

            override fun onBatchScanResults(results: MutableList<ScanResult>) {
                results.forEach(::addScanResult)
            }

            override fun onScanFailed(errorCode: Int) {
                pendingScanResult?.error(
                    "SCAN_FAILED",
                    "La búsqueda BLE falló con código $errorCode.",
                    null,
                )
                pendingScanResult = null
                scanCallback = null
            }
        }

        scanCallback = callback
        try {
            if (attendanceOnly) {
                val manufacturerPrefix = byteArrayOf(BLE_PROTOCOL_VERSION)
                val manufacturerMask = byteArrayOf(0xFF.toByte())
                val filter = ScanFilter.Builder()
                    .setManufacturerData(
                        BLE_MANUFACTURER_ID,
                        manufacturerPrefix,
                        manufacturerMask,
                    )
                    .build()
                val settings = ScanSettings.Builder()
                    .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
                    .setReportDelay(0L)
                    .build()
                scanner.startScan(listOf(filter), settings, callback)
            } else {
                scanner.startScan(callback)
            }
            mainHandler.postDelayed(
                { stopBleScan(returnResults = true) },
                if (attendanceOnly) {
                    ATTENDANCE_SCAN_DURATION_MS
                } else {
                    SCAN_DURATION_MS
                },
            )
        } catch (error: SecurityException) {
            pendingScanResult = null
            scanCallback = null
            result.error("SCAN_SECURITY", error.message, null)
        }
    }

    private fun addScanResult(result: ScanResult) {
        if (attendanceScanMode) {
            addAttendanceScanResult(result)
            return
        }

        val device: BluetoothDevice = result.device
        val address = try {
            device.address
        } catch (_: SecurityException) {
            "BLE-${device.hashCode()}"
        }
        val name = try {
            device.name
                ?: result.scanRecord?.deviceName
                ?: "Dispositivo sin nombre"
        } catch (_: SecurityException) {
            result.scanRecord?.deviceName ?: "Dispositivo sin nombre"
        }

        scanDevices[address] = mutableMapOf(
            "name" to name,
            "address" to address,
            "rssi" to result.rssi,
        )
    }

    private fun stopBleScan(returnResults: Boolean) {
        val callback = scanCallback
        val adapter = bluetoothAdapter()
        if (callback != null && adapter != null) {
            try {
                adapter.bluetoothLeScanner?.stopScan(callback)
            } catch (_: SecurityException) {
                // La búsqueda ya no puede detenerse por un cambio de permisos.
            }
        }

        scanCallback = null
        if (returnResults) {
            if (attendanceScanMode) {
                val ordered = attendanceScanDevices.values
                    .map { aggregate ->
                        mapOf(
                            "stationId" to aggregate.stationId,
                            "timeSlot" to aggregate.timeSlot,
                            "token" to aggregate.token,
                            "rssiAverage" to (
                                aggregate.rssiSum.toDouble() /
                                    aggregate.samples.toDouble()
                                ),
                            "rssiMin" to aggregate.rssiMin,
                            "rssiMax" to aggregate.rssiMax,
                            "samples" to aggregate.samples,
                            "address" to aggregate.address,
                            "name" to aggregate.name,
                        )
                    }
                    .sortedByDescending {
                        (it["rssiAverage"] as? Double) ?: -999.0
                    }
                pendingScanResult?.success(ordered)
            } else {
                val ordered = scanDevices.values
                    .sortedByDescending {
                        (it["rssi"] as? Int) ?: Int.MIN_VALUE
                    }
                pendingScanResult?.success(ordered)
            }
        }
        pendingScanResult = null
        attendanceScanMode = false
        scanDevices.clear()
        attendanceScanDevices.clear()
    }

    private fun addAttendanceScanResult(result: ScanResult) {
        val data = result.scanRecord
            ?.getManufacturerSpecificData(BLE_MANUFACTURER_ID)
            ?: return

        if (data.size != BLE_PAYLOAD_LENGTH || data[0] != BLE_PROTOCOL_VERSION) {
            return
        }

        val buffer = ByteBuffer.wrap(data).order(ByteOrder.BIG_ENDIAN)
        buffer.get()
        val stationId = buffer.int
        val timeSlot = buffer.int.toLong() and 0xFFFFFFFFL
        val tokenBytes = ByteArray(BLE_TOKEN_LENGTH)
        buffer.get(tokenBytes)
        val token = tokenBytes.joinToString("") { byte ->
            "%02x".format(byte.toInt() and 0xFF)
        }

        if (stationId <= 0 || token.length != 16) {
            return
        }

        val device = result.device
        val address = try {
            device.address
        } catch (_: SecurityException) {
            "BLE-${device.hashCode()}"
        }
        val name = try {
            device.name
                ?: result.scanRecord?.deviceName
                ?: "Estación UNSAAC"
        } catch (_: SecurityException) {
            result.scanRecord?.deviceName ?: "Estación UNSAAC"
        }
        val key = "$stationId|$timeSlot|$token"
        val existing = attendanceScanDevices[key]

        if (existing == null) {
            attendanceScanDevices[key] = BleAttendanceAggregate(
                stationId = stationId,
                timeSlot = timeSlot,
                token = token,
                rssiSum = result.rssi,
                rssiMin = result.rssi,
                rssiMax = result.rssi,
                samples = 1,
                address = address,
                name = name,
            )
        } else {
            existing.rssiSum += result.rssi
            existing.rssiMin = minOf(existing.rssiMin, result.rssi)
            existing.rssiMax = maxOf(existing.rssiMax, result.rssi)
            existing.samples += 1
            existing.address = address
            existing.name = name
        }
    }

    private fun startBleStationAdvertising(
        call: MethodCall,
        result: MethodChannel.Result,
    ) {
        if (stationAdvertisingStarting || pendingAdvertiseStartResult != null) {
            result.error(
                "ADVERTISE_BUSY",
                "La estación Bluetooth ya está iniciándose.",
                null,
            )
            return
        }

        if (!hasBluetoothPermissions()) {
            result.error(
                "PERMISSION_REQUIRED",
                "Autorice Bluetooth, dispositivos cercanos y ubicación.",
                null,
            )
            return
        }

        val stationId = call.argument<Int>("stationId")
            ?: call.argument<Number>("stationId")?.toInt()
        val stationCode = call.argument<String>("stationCode")?.trim()
        val secretBase64 = call.argument<String>("secret")
        val intervalSeconds = call.argument<Int>("intervalSeconds")
            ?: call.argument<Number>("intervalSeconds")?.toInt()
            ?: 15

        if (
            stationId == null ||
            stationId <= 0 ||
            stationCode.isNullOrBlank() ||
            secretBase64.isNullOrBlank() ||
            intervalSeconds !in 5..120
        ) {
            result.error(
                "INVALID_STATION",
                "La configuración de la estación BLE es inválida.",
                null,
            )
            return
        }

        val secret = try {
            Base64.decode(secretBase64, Base64.NO_WRAP)
        } catch (_: IllegalArgumentException) {
            byteArrayOf()
        }
        if (secret.size != 32) {
            result.error(
                "INVALID_SECRET",
                "La credencial BLE no tiene el tamaño requerido.",
                null,
            )
            return
        }

        val adapter = bluetoothAdapter()
        if (adapter == null || !adapter.isEnabled) {
            result.error(
                "BLUETOOTH_DISABLED",
                "Bluetooth está desactivado o no está disponible.",
                null,
            )
            return
        }
        if (
            adapter.isMultipleAdvertisementSupported != true ||
            adapter.bluetoothLeAdvertiser == null
        ) {
            result.error(
                "ADVERTISE_UNSUPPORTED",
                "Este teléfono no admite publicidad Bluetooth LE.",
                null,
            )
            return
        }

        stopBleStationAdvertisingInternal()
        stationIdForAdvertising = stationId
        stationCodeForAdvertising = stationCode.take(40)
        stationSecretForAdvertising = secret
        stationIntervalSeconds = intervalSeconds
        pendingAdvertiseStartResult = result
        stationAdvertisingStarting = true
        startOrRotateBleAdvertising(firstStart = true)
    }

    private fun startOrRotateBleAdvertising(firstStart: Boolean) {
        val stationId = stationIdForAdvertising ?: return
        val secret = stationSecretForAdvertising ?: return
        val adapter = bluetoothAdapter() ?: return
        val advertiser = adapter.bluetoothLeAdvertiser ?: return

        stationAdvertiseCallback?.let { callback ->
            try {
                advertiser.stopAdvertising(callback)
            } catch (_: Exception) {
                // El ciclo anterior ya estaba detenido.
            }
        }

        val timeSlot = System.currentTimeMillis() /
            1000L /
            stationIntervalSeconds.toLong()
        stationCurrentSlot = timeSlot
        val payload = buildBleAdvertisementPayload(
            stationId,
            timeSlot,
            secret,
        )
        val settings = AdvertiseSettings.Builder()
            .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
            .setConnectable(false)
            .setTimeout(0)
            .build()
        val advertiseData = AdvertiseData.Builder()
            .setIncludeDeviceName(false)
            .setIncludeTxPowerLevel(false)
            .addManufacturerData(BLE_MANUFACTURER_ID, payload)
            .build()
        val callback = object : AdvertiseCallback() {
            override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {
                stationAdvertisingStarting = false
                stationAdvertisingActive = true
                if (firstStart) {
                    pendingAdvertiseStartResult?.success(
                        bleStationAdvertisingStatus(),
                    )
                    pendingAdvertiseStartResult = null
                }
                scheduleBleRotation()
            }

            override fun onStartFailure(errorCode: Int) {
                stationAdvertisingStarting = false
                stationAdvertisingActive = false
                stationRotationRunnable?.let(mainHandler::removeCallbacks)
                stationRotationRunnable = null
                if (firstStart) {
                    pendingAdvertiseStartResult?.error(
                        "ADVERTISE_FAILED",
                        advertiseFailureMessage(errorCode),
                        errorCode,
                    )
                    pendingAdvertiseStartResult = null
                }
            }
        }
        stationAdvertiseCallback = callback

        try {
            advertiser.startAdvertising(settings, advertiseData, callback)
        } catch (error: SecurityException) {
            stationAdvertisingStarting = false
            stationAdvertisingActive = false
            if (firstStart) {
                pendingAdvertiseStartResult?.error(
                    "ADVERTISE_SECURITY",
                    error.message,
                    null,
                )
                pendingAdvertiseStartResult = null
            }
        } catch (error: IllegalArgumentException) {
            stationAdvertisingStarting = false
            stationAdvertisingActive = false
            if (firstStart) {
                pendingAdvertiseStartResult?.error(
                    "ADVERTISE_DATA",
                    error.message,
                    null,
                )
                pendingAdvertiseStartResult = null
            }
        }
    }

    private fun scheduleBleRotation() {
        stationRotationRunnable?.let(mainHandler::removeCallbacks)
        val runnable = Runnable {
            if (stationAdvertisingActive) {
                startOrRotateBleAdvertising(firstStart = false)
            }
        }
        stationRotationRunnable = runnable
        mainHandler.postDelayed(
            runnable,
            stationIntervalSeconds * 1000L,
        )
    }

    private fun buildBleAdvertisementPayload(
        stationId: Int,
        timeSlot: Long,
        secret: ByteArray,
    ): ByteArray {
        val message = "UNSAAC_BLE|1|$stationId|$timeSlot"
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(secret, "HmacSHA256"))
        val token = mac.doFinal(
            message.toByteArray(StandardCharsets.UTF_8),
        ).copyOfRange(0, BLE_TOKEN_LENGTH)

        return ByteBuffer.allocate(BLE_PAYLOAD_LENGTH)
            .order(ByteOrder.BIG_ENDIAN)
            .put(BLE_PROTOCOL_VERSION)
            .putInt(stationId)
            .putInt((timeSlot and 0xFFFFFFFFL).toInt())
            .put(token)
            .array()
    }

    private fun bleStationAdvertisingStatus(): Map<String, Any?> = mapOf(
        "active" to stationAdvertisingActive,
        "starting" to stationAdvertisingStarting,
        "stationId" to stationIdForAdvertising,
        "stationCode" to stationCodeForAdvertising,
        "intervalSeconds" to stationIntervalSeconds,
        "timeSlot" to stationCurrentSlot,
    )

    private fun stopBleStationAdvertisingInternal() {
        stationRotationRunnable?.let(mainHandler::removeCallbacks)
        stationRotationRunnable = null
        val adapter = bluetoothAdapter()
        val callback = stationAdvertiseCallback
        if (adapter != null && callback != null) {
            try {
                adapter.bluetoothLeAdvertiser?.stopAdvertising(callback)
            } catch (_: Exception) {
                // La publicidad ya estaba detenida o cambió el permiso.
            }
        }
        stationAdvertiseCallback = null
        stationAdvertisingActive = false
        stationAdvertisingStarting = false
        stationCurrentSlot = null
        stationIdForAdvertising = null
        stationCodeForAdvertising = null
        stationSecretForAdvertising?.fill(0)
        stationSecretForAdvertising = null
        pendingAdvertiseStartResult?.error(
            "ADVERTISE_STOPPED",
            "La estación fue detenida antes de completar el inicio.",
            null,
        )
        pendingAdvertiseStartResult = null
    }

    private fun advertiseFailureMessage(errorCode: Int): String = when (errorCode) {
        AdvertiseCallback.ADVERTISE_FAILED_DATA_TOO_LARGE ->
            "Los datos BLE exceden el tamaño permitido."
        AdvertiseCallback.ADVERTISE_FAILED_TOO_MANY_ADVERTISERS ->
            "Android no tiene un espacio de publicidad BLE disponible."
        AdvertiseCallback.ADVERTISE_FAILED_ALREADY_STARTED ->
            "La publicidad BLE ya estaba iniciada."
        AdvertiseCallback.ADVERTISE_FAILED_FEATURE_UNSUPPORTED ->
            "Este teléfono no admite publicidad Bluetooth LE."
        else -> "La estación BLE no pudo iniciarse. Código $errorCode."
    }
}
