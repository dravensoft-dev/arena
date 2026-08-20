/* What never ships, kept apart from the assembler that honours it. The rule and the copy used to
 * live in one file, and that file imports typescript, tailwind and the token generator, so the
 * only way to ask "would this file ship?" was to load all of them. The publish guard asks exactly
 * that and runs in a job with no install, where Bun answers a bare specifier from the registry at
 * whatever major it serves rather than the one bun.lock pins: the import threw, the guard read an
 * empty list of paths, and git reads no path as every path. Nothing here imports anything, so the
 * question is answerable wherever it is asked. package-assembly.ts re-exports all three names, so
 * a caller that wants the copy still finds the rule beside it. */

export const EXCLUDED_NAMES = new Set(['node_modules', 'dist', 'vendor', 'test', 'build']);

export const EXCLUDED_PATTERNS = [
  /\.test\.(mjs|[jt]sx?)$/,
  /\.card\.html$/,
  /\.card\.entry\.[jt]sx?$/,
  /\.demo\.generated\.html$/,
  /\.demo\.entry\.generated\.[jt]sx?$/,
  /\.behaviour\.json$/,
  /\.prompt\.md$/,
  /\.generated\.js$/,
  /^tsconfig\..*\.json$/,
  /^BehaviourDelegated\.json$/,
];

export function excluded(name: string) {
  return EXCLUDED_NAMES.has(name) || EXCLUDED_PATTERNS.some((p) => p.test(name));
}
