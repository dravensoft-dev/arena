/* How scripts/ names its own parts: the five domains it sorts by, which of them a test file
 * belongs to, and what counts as a script or a suite. It opens no file, so a caller can classify
 * a path absent from this machine: a junit report names files a runner wrote, and may name them
 * absolutely, so the anchor is searched for and the LAST one wins, or a checkout under a directory
 * called scripts decides every path. The extensions live here and not in each scanner, because a
 * suffix one stops recognising is a file that quietly leaves its scope. A suite is TypeScript and
 * can earn no exception, nothing loading one; a script may be JavaScript only if STAYS_JAVASCRIPT
 * names it, and is still scanned, since those have specifiers that must resolve like any other's.
 * FLAT is its own list and not PHASES inverted, because graph/ is a phase and utils/ is not; both
 * are arena, a util speaking no vocabulary and a graph module naming every layer at once. */

export const DOMAINS = ['core', 'react', 'angular', 'tailwind', 'arena'];

const PHASES = ['build', 'generate', 'check', 'lib', 'ci', 'graph'];

const FLAT = ['utils', 'graph'];

export const SUITE_EXTENSIONS = ['.ts'];

export const SCRIPT_EXTENSIONS = ['.ts', '.mjs'];

export const STAYS_JAVASCRIPT = new Map([
  ['scripts/lib/core/validate-palette.mjs',
   'vendored verbatim from the dataviz Agent Skill and re-vendored rather than patched, so it '
   + 'can carry no annotation: editing one threshold invalidates published measurements'],
  ['scripts/generate/core/arena-cli/validate-palette.mjs',
   'the copy that ships inside both npm packages, which palette-keys.test.ts holds byte-equal '
   + 'to the one above, so it is the same file and takes the same answer'],
]);

export const isSuite = (name: string) => SUITE_EXTENSIONS.some((ext) => name.endsWith(`.test${ext}`));

export const isScript = (name: string) =>
  SCRIPT_EXTENSIONS.some((ext) => name.endsWith(ext)) && !isSuite(name);

function classify(segments: string[], i: number) {
  if (segments[i] === 'scripts' && PHASES.includes(segments[i + 1] ?? '') && DOMAINS.includes(segments[i + 2] ?? '')) {
    return segments[i + 2];
  }
  if (segments[i] === 'scripts' && FLAT.includes(segments[i + 1] ?? '')) return 'arena';
  if (segments[i] === 'frameworks' && DOMAINS.includes(segments[i + 1] ?? '')) return segments[i + 1];
  return null;
}

export function domainOfTestPath(path: string) {
  const segments = String(path).split(/[\\/]+/).filter((s) => s !== '' && s !== '.');
  for (let i = segments.length - 1; i >= 0; i--) {
    const domain = classify(segments, i);
    if (domain) return domain;
  }
  return null;
}
