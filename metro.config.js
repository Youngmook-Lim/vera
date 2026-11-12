// The real corpora (src/modules/*/*.local.ts) are gitignored and exist only on
// a machine that has built them. Each corpus module requires its local file
// inside a try/catch, and this lets Metro treat that require as optional:
// bundled when the file is there, skipped without an error when it is not.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.transformer.allowOptionalDependencies = true;

module.exports = config;
