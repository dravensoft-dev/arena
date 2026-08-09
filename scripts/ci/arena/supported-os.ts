/* Which operating systems Arena is developed on, declared here rather than only in a matrix.
 * A routing rule that lives in YAML alone is a rule nothing tests, which is the argument
 * changed-layers.ts already makes about the layer filter; check:portability holds the matrix
 * in portability.yml equal to this list, so adding a leg to the workflow without saying what
 * it buys, or naming one here that no runner covers, both fail. Each entry carries its reason
 * because a matrix row is otherwise indistinguishable from a habit. Windows joins when a
 * runner has proven the win32 branches that unit tests currently carry alone. */

export const SUPPORTED_OS: Record<string, string> = {
  'ubuntu-latest': 'the platform every line of this tooling was written on. It stays in the '
    + 'matrix although three other workflows already cover it, so this list is the single '
    + 'spelling of what is supported rather than one of two that can disagree.',
  'macos-latest': 'the second platform, and arm64, so it is also the only leg that runs the '
    + 'prebuilt oxide, rollup and lightningcss binaries on an architecture no other job does. '
    + 'A bun install that cannot resolve them is the first thing that would fail.',
};

export const SUPPORTED_OS_NAMES = Object.keys(SUPPORTED_OS);
