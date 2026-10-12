// The repo writes extensionless relative imports (`./pitch`), which Metro and
// jest resolve and Node does not. This hook retries a failed relative import
// with `.ts` appended, so Node — which strips the types itself — can run the
// voice chain exactly as the phone does. Registered by voice-lab.mjs.
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.') && !specifier.endsWith('.ts')) {
      return next(`${specifier}.ts`, context);
    }
    throw error;
  }
}
