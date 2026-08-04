package pe.edu.unsaac.unsaac_asistencia_movil


import android.Manifest
import android.app.Activity
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import io.flutter.plugin.common.BinaryMessenger
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel


class NotificationBridge(
    private val activity: Activity,
    private val messenger: BinaryMessenger,
) {
    companion object {
        const val CHANNEL_NAME = "pe.edu.unsaac.asistencia/notifications"
        const val CHANNEL_ID = "unsaac_docente_alertas"
        const val REQUEST_NOTIFICATION_PERMISSION = 8102
    }


    private var pendingPermissionResult: MethodChannel.Result? = null


    fun configure() {
        UnsaacNotifications.createChannel(activity)
        MethodChannel(messenger, CHANNEL_NAME).setMethodCallHandler(::handleCall)
    }


    private fun handleCall(call: MethodCall, result: MethodChannel.Result) {
        when (call.method) {
            "initialize" -> {
                UnsaacNotifications.createChannel(activity)
                result.success(areEnabled())
            }
            "requestPermission" -> requestPermission(result)
            "show" -> {
                val id = call.argument<Number>("id")?.toInt() ?: 0
                val title = call.argument<String>("title").orEmpty()
                val message = call.argument<String>("message").orEmpty()
                if (id <= 0 || title.isBlank() || message.isBlank()) {
                    result.error("INVALID_NOTIFICATION", "La notificación está incompleta.", null)
                    return
                }
                result.success(
                    UnsaacNotifications.show(activity, id, title, message),
                )
            }
            "schedule" -> {
                val id = call.argument<Number>("id")?.toInt() ?: 0
                val title = call.argument<String>("title").orEmpty()
                val message = call.argument<String>("message").orEmpty()
                val timestamp = call.argument<Number>("timestampMs")?.toLong() ?: 0L
                if (id <= 0 || title.isBlank() || message.isBlank() || timestamp <= 0L) {
                    result.error("INVALID_SCHEDULE", "El aviso programado está incompleto.", null)
                    return
                }
                result.success(schedule(id, title, message, timestamp))
            }
            else -> result.notImplemented()
        }
    }


    private fun areEnabled(): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(
                activity,
                Manifest.permission.POST_NOTIFICATIONS,
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            return false
        }
        return NotificationManagerCompat.from(activity).areNotificationsEnabled()
    }


    private fun requestPermission(result: MethodChannel.Result) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            result.success(areEnabled())
            return
        }


        if (ContextCompat.checkSelfPermission(
                activity,
                Manifest.permission.POST_NOTIFICATIONS,
            ) == PackageManager.PERMISSION_GRANTED
        ) {
            result.success(true)
            return
        }


        if (pendingPermissionResult != null) {
            result.error("PERMISSION_BUSY", "Ya existe una solicitud de permiso.", null)
            return
        }


        pendingPermissionResult = result
        ActivityCompat.requestPermissions(
            activity,
            arrayOf(Manifest.permission.POST_NOTIFICATIONS),
            REQUEST_NOTIFICATION_PERMISSION,
        )
    }


    fun onRequestPermissionsResult(
        requestCode: Int,
        grantResults: IntArray,
    ): Boolean {
        if (requestCode != REQUEST_NOTIFICATION_PERMISSION) return false
        val granted = grantResults.isNotEmpty() &&
            grantResults.all { it == PackageManager.PERMISSION_GRANTED }
        pendingPermissionResult?.success(granted)
        pendingPermissionResult = null
        return true
    }


    private fun schedule(
        id: Int,
        title: String,
        message: String,
        timestampMs: Long,
    ): Boolean {
        if (timestampMs <= System.currentTimeMillis()) {
            return UnsaacNotifications.show(activity, id, title, message)
        }


        val intent = Intent(activity, NotificationPublisher::class.java).apply {
            putExtra("notificationId", id)
            putExtra("title", title)
            putExtra("message", message)
        }
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_IMMUTABLE
            } else {
                0
            }
        val pendingIntent = PendingIntent.getBroadcast(activity, id, intent, flags)
        val alarmManager = activity.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarmManager.setAndAllowWhileIdle(
            AlarmManager.RTC_WAKEUP,
            timestampMs,
            pendingIntent,
        )
        return true
    }
}


object UnsaacNotifications {
    fun createChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE)
            as NotificationManager
        val channel = NotificationChannel(
            NotificationBridge.CHANNEL_ID,
            "Asistencia docente UNSAAC",
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = "Tardanzas, rechazos, clases y avisos del sistema de asistencia."
            lockscreenVisibility = NotificationCompat.VISIBILITY_PRIVATE
            enableVibration(true)
        }
        manager.createNotificationChannel(channel)
    }


    fun show(
        context: Context,
        id: Int,
        title: String,
        message: String,
    ): Boolean {
        createChannel(context)


        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS,
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            return false
        }


        val launchIntent = context.packageManager
            .getLaunchIntentForPackage(context.packageName)
            ?.apply {
                flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            }
        val pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT or
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_IMMUTABLE
            } else {
                0
            }
        val contentIntent = launchIntent?.let {
            PendingIntent.getActivity(context, id, it, pendingFlags)
        }


        val publicVersion = NotificationCompat.Builder(
            context,
            NotificationBridge.CHANNEL_ID,
        )
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("UNSAAC Asistencia")
            .setContentText("Tiene una notificación institucional.")
            .build()


        val notification = NotificationCompat.Builder(
            context,
            NotificationBridge.CHANNEL_ID,
        )
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title.take(100))
            .setContentText(message.take(180))
            .setStyle(NotificationCompat.BigTextStyle().bigText(message.take(500)))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setAutoCancel(true)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setPublicVersion(publicVersion)
            .setContentIntent(contentIntent)
            .build()


        return try {
            NotificationManagerCompat.from(context).notify(id, notification)
            true
        } catch (_: SecurityException) {
            false
        }
    }
}