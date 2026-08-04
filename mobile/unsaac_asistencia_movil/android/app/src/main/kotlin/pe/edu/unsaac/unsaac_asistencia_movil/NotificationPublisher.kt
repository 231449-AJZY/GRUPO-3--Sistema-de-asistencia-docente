package pe.edu.unsaac.unsaac_asistencia_movil


import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent


class NotificationPublisher : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getIntExtra("notificationId", 0)
        val title = intent.getStringExtra("title").orEmpty()
        val message = intent.getStringExtra("message").orEmpty()
        if (id <= 0 || title.isBlank() || message.isBlank()) return
        UnsaacNotifications.show(context, id, title, message)
    }
}