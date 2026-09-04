/**
 * Resolve hook so verify.mjs can import the engine with the same
 * extensionless specifiers the Next.js bundler uses.
 *
 * Node's ESM resolver requires a file extension; tsconfig's
 * moduleResolution: "bundler" requires its absence. Rather than keep a second
 * copy of the engine with different imports, we append ".ts" on the way
 * through. Node >= 22.6 does the type stripping itself.
 */

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier)) {
    try {
      return await nextResolve(`${specifier}.ts`, context);
    } catch {
      // Fall through to the default resolution and let it report the error.
    }
  }
  return nextResolve(specifier, context);
}
