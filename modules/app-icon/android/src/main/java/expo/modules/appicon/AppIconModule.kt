package expo.modules.appicon

import android.content.ComponentName
import android.content.pm.PackageManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Android has no API for changing an app icon. The only mechanism is a set of
// <activity-alias> entries, one per face, all pointing at MainActivity, with
// exactly one enabled at a time. `plugins/withRotatingIcons.js` declares them;
// this flips between them.
//
// MainActivity is never touched. It carries no LAUNCHER filter of its own —
// the aliases carry it — and disabling it would be unrecoverable: an alias
// whose targetActivity is disabled cannot launch, so the app would have no way
// in but adb.
class AppIconModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AppIcon")

    // The face currently showing, or "" if the state cannot be read. Aliases
    // are enumerated from the manifest rather than listed here, so the set
    // stays in one place: the plugin generates them from the asset files.
    Function("getIcon") {
      val pm = packageManager() ?: return@Function ""
      val pkg = packageName() ?: return@Function ""
      aliases(pm, pkg).firstOrNull { isEnabled(pm, pkg, it) }?.let { faceOf(it) } ?: ""
    }

    // Returns true when the launcher was actually changed. A no-op when the
    // face is already showing: setComponentEnabledSetting writes to disk and
    // makes some launchers redraw, so calling it on every background would
    // cost a flicker for nothing.
    Function("setIcon") { face: String ->
      val pm = packageManager() ?: return@Function false
      val pkg = packageName() ?: return@Function false

      val all = aliases(pm, pkg)
      val target = all.firstOrNull { faceOf(it) == face } ?: return@Function false
      if (isEnabled(pm, pkg, target) && all.none { it != target && isEnabled(pm, pkg, it) }) {
        return@Function false
      }

      // Enable the target BEFORE disabling anything. There must never be an
      // instant with no enabled launcher component, or the app disappears from
      // the launcher — and on some devices does not come back.
      enable(pm, pkg, target, true)
      all.forEach { if (it != target) enable(pm, pkg, it, false) }
      true
    }
  }

  private fun packageManager(): PackageManager? = appContext.reactContext?.packageManager

  private fun packageName(): String? = appContext.reactContext?.packageName

  private fun aliases(pm: PackageManager, pkg: String): List<String> =
    runCatching {
      // MATCH_DISABLED_COMPONENTS is required: without it the query returns
      // only the one enabled alias, and every other face is invisible here.
      val flags = PackageManager.GET_ACTIVITIES or PackageManager.MATCH_DISABLED_COMPONENTS
      pm.getPackageInfo(pkg, flags).activities
        ?.map { it.name }
        ?.filter { it.contains(ALIAS_MARKER) }
        ?: emptyList()
    }.getOrDefault(emptyList())

  private fun faceOf(componentName: String): String =
    componentName.substringAfterLast(ALIAS_MARKER)

  private fun isEnabled(pm: PackageManager, pkg: String, name: String): Boolean =
    when (pm.getComponentEnabledSetting(ComponentName(pkg, name))) {
      PackageManager.COMPONENT_ENABLED_STATE_ENABLED -> true
      PackageManager.COMPONENT_ENABLED_STATE_DISABLED -> false
      // DEFAULT means "whatever the manifest says", and the manifest ships
      // Dormant enabled and every other face disabled.
      else -> faceOf(name) == DORMANT
    }

  private fun enable(pm: PackageManager, pkg: String, name: String, on: Boolean) {
    val state =
      if (on) PackageManager.COMPONENT_ENABLED_STATE_ENABLED
      else PackageManager.COMPONENT_ENABLED_STATE_DISABLED
    // DONT_KILL_APP: without it Android tears the process down mid-swap, which
    // the subject would see as the app closing itself.
    pm.setComponentEnabledSetting(ComponentName(pkg, name), state, PackageManager.DONT_KILL_APP)
  }

  companion object {
    private const val ALIAS_MARKER = ".Icon_"
    private const val DORMANT = "Dormant"
  }
}
