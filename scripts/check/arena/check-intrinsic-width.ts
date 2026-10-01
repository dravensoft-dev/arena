/* A component whose drawn element is inline-level takes its content's width in a row and the
 * container's in a flex column or a grid cell, because a width of auto stretches there: a button
 * with full off, a badge or a tag placed in a card's body drew at the body's width. fit-content is
 * not auto, so it holds in any container and is still clamped to the room available. This
 * resolves the drawn slot of every manifest for every combination of the variant groups that touch
 * it, as the recipe resolves it, and fails an inline-level result whose last width is absent or
 * w-auto. A minimum is not a width. DRAWN names the slot of a component that has no root, and
 * EXEMPT, empty, is where an inline component that has to stretch would argue for it. */

import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import type { ComponentManifest } from '../../lib/tailwind/manifest-shapes.ts';
import { readManifests, utility } from './check-measured-box.ts';

export const node = {
  name: 'check:intrinsic-width',
  reads: ['frameworks/tailwind/components/**/*.manifest.json'],
  writes: [],
  feeds: [],
};

export const INLINE = new Set(['inline', 'inline-block', 'inline-flex', 'inline-grid']);

const DISPLAY = /^(?:inline|inline-block|inline-flex|inline-grid|block|flex|grid|contents|hidden|flow-root|list-item|table(?:-[a-z-]+)?)$/;

const WIDTH = /^(?:w|size)-/;

export const DRAWN = new Map<string, { slot: string; why: string }>([
  ['ArenaSegmentedControl', { slot: 'track',
    why: 'the control has no root slot; the track is the element it draws, and the one a column would stretch' }],
]);

export const EXEMPT = new Map<string, string>([]);

export type Choice = Record<string, string>;

export type Finding = { component: string; slot: string; chosen: Choice; display: string; width: string | null };

export function drawnSlot(manifest: ComponentManifest): string | null {
  const declared = DRAWN.get(manifest.component);
  if (declared) return declared.slot;
  return manifest.slots && 'root' in manifest.slots ? 'root' : null;
}

export function choices(manifest: ComponentManifest, slot: string): Choice[] {
  const compounds = manifest.compoundVariants ?? [];
  const touching = Object.entries(manifest.variants ?? {}).filter(([group, values]) =>
    Object.values(values).some((slots) => slots?.[slot] !== undefined)
    || compounds.some((compound) => group in compound && compound.class?.[slot] !== undefined));
  let all: Choice[] = [{}];
  for (const [group, values] of touching)
    all = all.flatMap((chosen) => Object.keys(values).map((value) => ({ ...chosen, [group]: value })));
  return all;
}

export function resolve(manifest: ComponentManifest, slot: string, chosen: Choice): string[] {
  const parts = [manifest.slots?.[slot] ?? ''];
  for (const [group, values] of Object.entries(manifest.variants ?? {})) {
    const value = chosen[group];
    if (value !== undefined) parts.push(values[value]?.[slot] ?? '');
  }
  for (const compound of manifest.compoundVariants ?? []) {
    const applies = Object.entries(compound)
      .every(([key, want]) => key === 'class' || chosen[key] === String(want));
    if (applies) parts.push(compound.class?.[slot] ?? '');
  }
  return parts.join(' ').split(/\s+/).filter(Boolean);
}

const last = (tokens: string[], rule: RegExp) =>
  [...tokens].reverse().find((token) => utility(token) === token && rule.test(token)) ?? null;

export function manifestFindings(manifest: ComponentManifest): { findings: Finding[]; inline: number } {
  const slot = drawnSlot(manifest);
  const findings: Finding[] = [];
  let inline = 0;
  if (slot === null) return { findings, inline };
  for (const chosen of choices(manifest, slot)) {
    const tokens = resolve(manifest, slot, chosen);
    const display = last(tokens, DISPLAY);
    if (display === null || !INLINE.has(display)) continue;
    inline += 1;
    const width = last(tokens, WIDTH);
    if (width === null || width === 'w-auto')
      findings.push({ component: manifest.component, slot, chosen, display, width });
  }
  return { findings, inline };
}

export function collect(root = repoRoot) {
  const manifests = readManifests(root);
  const problems: string[] = [];
  const found = new Set<string>();
  let inline = 0;
  for (const manifest of manifests.values()) {
    const result = manifestFindings(manifest);
    inline += result.inline;
    for (const finding of result.findings) {
      const key = `${finding.component}.${finding.slot}`;
      found.add(key);
      if (EXEMPT.has(key)) continue;
      problems.push(`${key} with ${JSON.stringify(finding.chosen)} is ${finding.display} and declares `
        + `${finding.width ?? 'no width'}, so a flex column or a grid cell stretches it to the container's width. `
        + 'Declare w-fit on that branch, or a width of its own');
    }
  }
  for (const [name, entry] of DRAWN) {
    const manifest = manifests.get(name);
    if (!manifest || !(entry.slot in (manifest.slots ?? {})) || 'root' in (manifest.slots ?? {}))
      problems.push(`stale DRAWN: ${name}.${entry.slot} is not the drawn slot of a manifest with no root -- ${entry.why}`);
  }
  for (const [key, why] of EXEMPT)
    if (!found.has(key)) problems.push(`stale EXEMPT: ${key} declares a width on every branch now -- ${why}`);
  if (inline === 0) problems.push('resolved no inline-level slot in any manifest; the gate looked at nothing, '
    + 'which is a failure rather than a clean pass');
  return { problems, inline };
}

function main() {
  const { problems, inline } = collect();
  if (problems.length) {
    for (const problem of problems) console.error(`check-intrinsic-width: ${problem}`);
    process.exit(1);
  }
  console.log(`check-intrinsic-width: clean -- ${inline} inline-level branch(es), each with a width of its own`);
}

if (isMainModule(import.meta.url)) main();
