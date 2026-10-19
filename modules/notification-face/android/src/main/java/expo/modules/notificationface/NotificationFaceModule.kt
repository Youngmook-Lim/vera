package expo.modules.notificationface

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NotificationFaceModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NotificationFace")

    Function("setTheme") { dark: Boolean ->
      val context = appContext.reactContext ?: return@Function false
      FaceTheme.setDark(context, dark)
      true
    }
  }
}
