/* A slot pinned to a viewport edge pays that edge's inset itself. The specification once said Arena
 * drew nothing that needed these while four components drew them, which hid the one that should
 * have: a top bar sits under a phone's status bar. The subject is derived from the manifests, so a
 * new pinned surface is covered the day it lands. A slot is read composed, base with every variant,
 * because `fixed` on the base and `bottom-0` on a placement make one pinned slot. UNPINNED is for a
 * surface that covers an edge on purpose, like a scrim, and a stale entry fails. The claim covers
 * the notch and home-indicator edges; a landscape cutout is a question this gate does not ask. A
 * slot that reads a family's channel for an edge pays the inset when every option pinning that edge
 * names it. */

import { basename } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { readJson } from '../../utils/read-file.ts';
import { manifestFiles } from '../../lib/tailwind/tailwind-compile.ts';
import { classStringsBySlot } from '../arena/check-manifest-states.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { join } from 'node:path';
import { readFamilies, channelPrefix } from '../../lib/tailwind/vocabulary.ts';
import type { Family } from '../../lib/tailwind/vocabulary.ts';

export const COMPONENTS_DIR = join(repoRoot, 'frameworks/tailwind/components');

export const node = {
  name: 'check:safe-area',
  reads: ['frameworks/tailwind/components/**'],
  writes: [],
  feeds: [],
};

export const PINNED = /(?:^|:)(?:fixed|sticky)$/;

export const EDGES = [
  { name: 'top', owes: '--pad-safe-top', pins: [/^(?:\w+:)*top-0$/, /^(?:\w+:)*inset-y-0$/] },
  { name: 'bottom', owes: '--pad-safe-bottom', pins: [/^(?:\w+:)*bottom-0$/, /^(?:\w+:)*inset-y-0$/] },
];

export const COVERS_EVERY_EDGE = /^(?:\w+:)*inset-0$/;

export const UNPINNED = new Map<string, string>([
  ['ArenaDialog.scrim', 'a scrim covers the viewport rather than sitting against it. Insetting one '
    + 'would leave a lit strip under the notch, which is the opposite of what it is for'],
  ['ArenaConfirmDialog.root', 'the same surface and the same reason'],
  ['ArenaOnboarding.root', 'the same'],
  ['ArenaCommandPalette.root', 'the same, and its panel is pushed down from the top by its own '
    + 'offset rather than pinned to the edge'],
]);

export type Pin = { component: string; slot: string; edge: string; owes: string; names: boolean };

export function paidByFamily(classes: string, edge: string, owes: string, families: Map<string, Family>) {
  for (const [name, family] of families) {
    if (!classes.includes(`var(${channelPrefix(name)}`)) continue;
    const pinning = Object.values(family.variants)
      .filter((value) => [...value.matchAll(new RegExp(`\\[${channelPrefix(name)}${edge}:([^\\]]*)\\]`, 'g'))].some((one) => one[1] !== 'auto'));
    if (pinning.length > 0 && pinning.every((value) => value.includes(owes))) return true;
  }
  return false;
}

export function pinsIn(component: string, manifest: unknown, families: Map<string, Family> = new Map()) {
  const found: Pin[] = [];
  const covered: string[] = [];
  for (const [slot, classList] of classStringsBySlot(manifest as never)) {
    const all = (classList as string[]).join(' ');
    const tokens = all.split(/\s+/).filter(Boolean);
    if (!tokens.some((one) => PINNED.test(one))) continue;
    if (tokens.some((one) => COVERS_EVERY_EDGE.test(one))) { covered.push(`${component}.${slot}`); continue; }
    for (const edge of EDGES) {
      const pinned = tokens.some((one) => edge.pins.some((re) => re.test(one)))
        || tokens.some((one) => one.startsWith(`${edge.name}-[`));
      if (!pinned) continue;
      found.push({ component, slot, edge: edge.name, owes: edge.owes, names: all.includes(edge.owes) || paidByFamily(all, edge.name, edge.owes, families) });
    }
  }
  return { found, covered };
}

export function unpaidProblems(pins: Pin[], unpinned = UNPINNED) {
  return pins
    .filter((pin) => !pin.names && !unpinned.has(`${pin.component}.${pin.slot}`))
    .map((pin) => `${pin.component}.${pin.slot} pins to the ${pin.edge} of the viewport and names no `
      + `${pin.owes}. A component sitting against an edge pays that edge's inset itself: on a device `
      + 'reporting none the token resolves to its fallback and nothing moves, and on one reporting an '
      + 'inset this is the difference between a bar beside the notch and a bar under it');
}

export function staleUnpinnedProblems(covered: string[], pins: Pin[], unpinned = UNPINNED) {
  const seen = new Set([...covered, ...pins.map((p) => `${p.component}.${p.slot}`)]);
  return [...unpinned.keys()]
    .filter((at) => !seen.has(at))
    .map((at) => `UNPINNED excuses ${at} and no pinned slot by that name was walked, so the entry `
      + 'outlived what it excused');
}

export function zeroWalkProblems(manifests: number, pins: number) {
  const problems: string[] = [];
  if (manifests === 0) {
    problems.push('walked 0 manifests, so no slot was examined; a walk that finds no component is a '
      + 'failure rather than a clean pass');
  }
  if (pins === 0) {
    problems.push('found 0 slots pinned to a viewport edge. A bottom bar, a sheet and a toast host '
      + 'are all pinned, so none at all means this gate is reading the wrong shape rather than that '
      + 'the library stopped drawing them');
  }
  return problems;
}

export function collect(dir = COMPONENTS_DIR) {
  const files = manifestFiles(dir);
  const pins: Pin[] = [];
  const covered: string[] = [];
  const families = readFamilies();
  for (const p of files) {
    const component = basename(p).replace(/\.manifest\.json$/, '');
    const result = pinsIn(component, readJson(p), families);
    pins.push(...result.found);
    covered.push(...result.covered);
  }
  return {
    files,
    pins,
    covered,
    problems: [
      ...zeroWalkProblems(files.length, pins.length),
      ...unpaidProblems(pins),
      ...staleUnpinnedProblems(covered, pins),
    ],
  };
}

function main() {
  const { files, pins, covered, problems } = collect();
  if (problems.length) {
    console.error(`check-safe-area: ${problems.length} problem(s)\n`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`check-safe-area: ${pins.length} pinned edge(s) across ${files.length} manifest(s) each `
    + `name the inset they owe, and ${covered.length} surface(s) cover every edge on purpose`);
}

if (isMainModule(import.meta.url)) main();
