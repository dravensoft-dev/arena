/* What a machine has to already carry, declared so the setup document can be held against it.
 * The list was never written in one place: bun came from `packageManager`, git and node from
 * whichever gate spawned them, a browser from a candidate table, and the one networked step from
 * a .gitignore comment. A contributor found each by hitting it. check:portability compares this
 * against `scripts/build/AGENTS.md`, which is the shape check-release.ts already uses to hold
 * the README's artifact list: a setup document that FAILS when it goes stale is worth more than
 * a CONTRIBUTING.md nothing reads. `probe` is what a person runs to see whether they have it. */

export type HostBinary = { probe: string; why: string; optional?: string };

export const HOST_BINARIES: Record<string, HostBinary> = {
  bun: {
    probe: 'bun --version',
    why: 'the runtime and the package manager. package.json pins the version under '
      + 'packageManager, and every workflow pins the same one.',
  },
  git: {
    probe: 'git --version',
    why: 'three gates ask it what the tree tracks, and no other tool can answer that: '
      + 'check:generated, check:skills and check:citations.',
  },
  node: {
    probe: 'node --version',
    why: 'check:consumer runs the shipped CLI the way a consumer runs it, which is under node '
      + 'and not under bun. It is the one place the two are not interchangeable.',
  },
  chrome: {
    probe: 'bun run check:focus-trap',
    why: 'the four gates that measure a real render drive a headless Chrome, Chromium or Edge '
      + 'over CDP. Discovery is keyed by platform, so an install in the usual place needs no '
      + 'configuration; CHROME_PATH names one anywhere else, and is terminal.',
  },
  network: {
    probe: 'bun scripts/generate/core/fetch-fonts.ts',
    optional: 'once, and only to rebuild the fonts',
    why: 'fetch-fonts.ts fetches the three webfonts from Google Fonts. It is run by path and has '
      + 'no npm script, the way check-release.ts is, because it is not part of a build: its '
      + 'outputs are tracked precisely because a clone cannot reproduce them.',
  },
};

export const HOST_BINARY_NAMES = Object.keys(HOST_BINARIES);
