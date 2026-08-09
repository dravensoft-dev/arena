/* Which operating systems Arena is developed on, declared here rather than only in a matrix.
 * A routing rule that lives in YAML alone is a rule nothing tests, which is the argument
 * changed-layers.ts already makes about the layer filter; check:portability holds the matrix in
 * pr.yml equal to this list AND holds each leg's blocking flag to what is claimed here, so a leg
 * cannot quietly stop counting. Each entry carries its reason, because a matrix row is otherwise
 * indistinguishable from a habit. `blocking: false` is a platform whose branches are written and
 * whose runner has not yet confirmed them: it reports and does not gate, and the flag flipping to
 * true is the whole definition of that platform being supported. It is the only thing that
 * decides it, and pr-gate holds no second copy: the leg runs under continue-on-error, which hands
 * the gate a success whatever that platform said. */

export type SupportedOs = { blocking: boolean; why: string };

export const SUPPORTED_OS: Record<string, SupportedOs> = {
  'ubuntu-latest': {
    blocking: true,
    why: 'the platform every line of this tooling was written on. It stays in the matrix although '
      + 'three other workflows already cover it, so this list is the single spelling of what is '
      + 'supported rather than one of two that can disagree.',
  },
  'macos-latest': {
    blocking: true,
    why: 'the second platform, and arm64, so it is also the only leg that runs the prebuilt '
      + 'oxide, rollup and lightningcss binaries on an architecture no other job does. A bun '
      + 'install that cannot resolve them is the first thing that would fail.',
  },
  'windows-latest': {
    blocking: false,
    why: 'the one platform whose branches are carried by unit tests with the platform injected '
      + 'and by no runner: PATHEXT resolution, junctions instead of directory symlinks, taskkill '
      + 'instead of a process group, and backslashes through every path comparison. It reports '
      + 'and does not gate until it is green, because a leg expected to be red either blocks '
      + 'every pull request or teaches everyone to ignore a red mark, and both end the same way.',
  },
};

export const SUPPORTED_OS_NAMES = Object.keys(SUPPORTED_OS);

export const BLOCKING_OS = SUPPORTED_OS_NAMES.filter((name) => SUPPORTED_OS[name]?.blocking);
