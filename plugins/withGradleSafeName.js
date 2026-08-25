const { withSettingsGradle } = require('expo/config-plugins');

// Gradle refuses a project name that starts or ends with a dot, and Expo's own
// sanitiser does not catch it: `sanitizeNameForGradle` in
// @expo/config-plugins/build/android/Name.js strips only / \ : < > " ? * | —
// the dot rule is not in the list. So `expo.name` of "V.E.R.A." produces
// `rootProject.name = 'V.E.R.A.'` and the build dies at settings.gradle
// evaluation, before a single source file is compiled.
//
// The launcher label and the Gradle project name come from the same config
// field but are written by two different functions: the label goes to
// strings.xml unsanitised, this goes through settings.gradle. Only the latter
// has to be legal, so rewriting it here keeps "V.E.R.A." on the home screen.
//
// This runs after Expo's withNameSettingsGradle, so it overwrites the value
// that plugin just wrote rather than being overwritten by it. Verify with
// `npx expo prebuild -p android --clean` and read android/settings.gradle
// before spending an EAS build on it.
const GRADLE_SAFE_NAME = 'VERA';

module.exports = function withGradleSafeName(config) {
  return withSettingsGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') return cfg;

    cfg.modResults.contents = cfg.modResults.contents.replace(
      /rootProject\.name\s?=\s?(["'])(?:(?=(\\?))\2.)*?\1/g,
      `rootProject.name = '${GRADLE_SAFE_NAME}'`,
    );

    return cfg;
  });
};
