package expo.modules.notificationface

import android.content.Context

// Which finish her face on a notification is drawn in. Written by the JS side
// on every theme switch and at hydrate; read by the receiver when a card
// arrives. Never written means dark, which is the app's own default.
object FaceTheme {
  private const val PREFS = "notification-face"
  private const val KEY = "dark"

  fun isDark(context: Context): Boolean =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY, true)

  fun setDark(context: Context, dark: Boolean) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean(KEY, dark).apply()
  }
}
