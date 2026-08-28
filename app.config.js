// app.json is still the whole config. This overlays the two fields that have
// to differ between a build you iterate on and one you carry around, so both
// can sit on the phone at once with separate data:
//
//   development  com.youngmookk.thefacility.dev   "V.E.R.A. dev"
//   everything else  com.youngmookk.thefacility   "V.E.R.A."
//
// Expo reads app.json first and hands the normalised result in as `config`,
// so nothing here restates it. EAS Build sets EAS_BUILD_PROFILE to the profile
// name from eas.json.
//
// The default when it is unset — a local `expo prebuild`, `expo run:android`,
// or Metro — is deliberately the SHIPPING identity, not the dev one. It is the
// safer way round: a local build landing on top of the installed app is an
// annoyance, whereas a cloud build that somehow missed the variable and went
// out under `.dev` would be the wrong package id on a real release, which no
// later build can take back.
const DEV_PROFILE = 'development';

module.exports = ({ config }) => {
  if (process.env.EAS_BUILD_PROFILE !== DEV_PROFILE) return config;

  return {
    ...config,
    // Distinguishable on the home screen, where the two are otherwise the same
    // dark optic. No trailing dot: gradle rejects one, which is what
    // plugins/withGradleSafeName.js exists to work around.
    name: 'V.E.R.A. dev',
    android: {
      ...config.android,
      package: `${config.android.package}.dev`,
    },
  };
};
