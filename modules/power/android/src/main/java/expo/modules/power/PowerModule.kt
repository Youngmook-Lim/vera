package expo.modules.power

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.PowerManager
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Samsung freezes background apps and defers their alarms — its own layer,
// called Freecess, which sits outside AOSP and answers to nothing in this app.
// A scheduled card was held past its hour and delivered whenever Freecess felt
// like unfreezing us: a ten o'clock story at 03:00, a nine o'clock card at
// 11:17. No permission, channel, standby bucket or appop reports any of it;
// only logcat names it, and only after the fact.
//
// What lifts it is Settings → Apps → … → Battery → Unrestricted, and the one
// piece of luck here is that Samsung's "Unrestricted" writes to the ordinary
// AOSP battery-optimisation whitelist — verified on the device, which listed
// `user,com.youngmookk.thefacility,10692` the moment it was set and nothing at
// all before. So a standard PowerManager read tells the truth about an OEM
// setting we would otherwise have no way to see.
class PowerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("Power")

    // False when it cannot be read at all, which the JS side is careful to
    // tell apart from a genuine false — a row that cannot see the setting must
    // not accuse the subject of not having set it.
    Function("isIgnoringBatteryOptimizations") {
      val context = appContext.reactContext ?: return@Function false
      val power = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
        ?: return@Function false
      power.isIgnoringBatteryOptimizations(context.packageName)
    }

    // The one-tap system dialog, rather than dropping the subject at the top
    // of Settings to find Battery themselves. Needs
    // REQUEST_IGNORE_BATTERY_OPTIMIZATIONS in the manifest or the intent
    // resolves to nothing; app.json declares it.
    //
    // Returns whether the dialog was LAUNCHED, never what was chosen — the
    // answer to that is the next read of isIgnoringBatteryOptimizations, which
    // is why the row reads its state at render rather than trusting a call.
    Function("requestIgnoreBatteryOptimizations") {
      val activity = appContext.currentActivity ?: return@Function false
      val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
        .setData(Uri.parse("package:${activity.packageName}"))
      runCatching {
        activity.startActivity(intent)
        true
      }.getOrDefault(false)
    }
  }
}
