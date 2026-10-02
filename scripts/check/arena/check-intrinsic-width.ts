/* A component whose drawn element is inline-level takes its content's width in a row and the
 * container's in a flex column or a grid cell, because a width of auto stretches there. An inline
 * root a sensible adopter would fill answers fill and reads --arena-fill-width with fit-content as
 * its fallback, on every branch the recipe resolves; one that keeps a width of its own is in
 * OWN_WIDTH with its reason and still declares a width that is not auto. A minimum is not a width.
 * DRAWN names the slot of a component that has no root. A root neither answering fill nor listed
 * fails, as does an entry of either map that the tree no longer bears out. */

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

export const FILL_READ = 'w-[var(--arena-fill-width,fit-content)]';

export const OWN_WIDTH = new Map<string, string>([
  ['ArenaAppLogo', 'a mark drawn at its own size; stretching it would only add air beside the wordmark'],
  ['ArenaAvatar', 'a portrait sized by its own avatar step, square by construction'],
  ['ArenaBadge', 'a marker whose width is its content; a full-width badge reads as a banner'],
  ['ArenaTag', 'a marker whose width is its content; a full-width tag reads as a banner'],
  ['ArenaSpinner', 'a glyph, whose box is the glyph'],
  ['ArenaCheckbox', 'a tick and its label; stretching it widens the pressable area to the whole row'],
  ['ArenaRadio', 'a dot and its label; stretching it widens the pressable area to the whole row'],
  ['ArenaSwitch', 'a track and its label; stretching it widens the pressable area to the whole row'],
  ['ArenaPagination', 'a row of page controls whose width is the pages it shows'],
]);

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
  const fills = (manifest.answers ?? []).includes('fill');
  for (const chosen of choices(manifest, slot)) {
    const tokens = resolve(manifest, slot, chosen);
    const display = last(tokens, DISPLAY);
    if (display === null || !INLINE.has(display)) continue;
    inline += 1;
    const width = last(tokens, WIDTH);
    if (fills ? width !== FILL_READ : (width === null || width === 'w-auto'))
      findings.push({ component: manifest.component, slot, chosen, display, width });
  }
  return { findings, inline };
}

export function collect(root = repoRoot, own = OWN_WIDTH, manifests = readManifests(root)) {
  const problems: string[] = [];
  let inline = 0;
  const inlineRoots = new Set<string>();
  for (const manifest of manifests.values()) {
    const result = manifestFindings(manifest);
    inline += result.inline;
    if (result.inline === 0) continue;
    inlineRoots.add(manifest.component);
    const fills = (manifest.answers ?? []).includes('fill');
    if (!fills && !own.has(manifest.component)) {
      problems.push(`${manifest.component}.${drawnSlot(manifest)} is inline-level, answers no fill and is not in OWN_WIDTH, `
        + `so whether it fills its container is decided by nobody. Answer fill and read ${FILL_READ}, or list it with why `
        + 'it keeps its own width');
    }
    for (const finding of result.findings) {
      problems.push(fills
        ? `${finding.component}.${finding.slot} with ${JSON.stringify(finding.chosen)} answers fill and its last width is `
          + `${finding.width ?? 'none'}, so arena-fill reaches a box that never reads it. Read ${FILL_READ} on every branch`
        : `${finding.component}.${finding.slot} with ${JSON.stringify(finding.chosen)} is ${finding.display} and declares `
          + `${finding.width ?? 'no width'}, so a flex column or a grid cell stretches it to the container's width. `
          + 'Declare w-fit on that branch, or a width of its own');
    }
  }
  for (const [name, why] of own) {
    const manifest = manifests.get(name);
    if (manifest && (manifest.answers ?? []).includes('fill'))
      problems.push(`stale OWN_WIDTH: ${name} answers fill, so it no longer keeps a width of its own -- ${why}`);
    else if (!inlineRoots.has(name)) problems.push(`stale OWN_WIDTH: ${name} has no inline-level root -- ${why}`);
  }
  for (const [name, entry] of DRAWN) {
    const manifest = manifests.get(name);
    if (!manifest || !(entry.slot in (manifest.slots ?? {})) || 'root' in (manifest.slots ?? {}))
      problems.push(`stale DRAWN: ${name}.${entry.slot} is not the drawn slot of a manifest with no root -- ${entry.why}`);
  }
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
