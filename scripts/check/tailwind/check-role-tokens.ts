/* Fails on a scale utility standing where a role belongs. A scale says how round a corner is or
 * how deep a shadow is; a role says WHICH corner or depth is being asked about, and only a
 * question can be answered differently by a design extension. Radius and depth are banned by
 * utility name because they have a Tailwind namespace; a border width and a duration are banned
 * by TOKEN name, which catches border-[length:var(--bw)] and the var(--dur-fast) buried in an
 * arbitrary [transition:...] property with one entry rather than one per spelling. SCALE_USES
 * records the places that genuinely mean the length, one entry per case with its reason. */

import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { readJson } from '../../utils/read-file.ts';
import { manifestFiles } from '../../lib/tailwind/tailwind-compile.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { classStringsBySlot } from '../arena/check-manifest-states.ts';
import type { ComponentManifest } from '../../lib/tailwind/manifest-shapes.ts';
import { MANIFESTS } from '../../build/tailwind/build-tailwind.ts';

export const node = {
  name: 'check:roles',
  reads: [MANIFESTS],
  writes: [],
  feeds: [],
};

const COMPONENTS_DIR = join(repoRoot, 'frameworks/tailwind/components');

export const SCALE_UTILITIES = new Map<string, string>([
  ['rounded-lg', 'rounded-surface'],
  ['rounded-md', 'rounded-surface-floating'],
  ['rounded-sm', 'rounded-control or rounded-field'],
  ['rounded-xs', 'rounded-control-sm or rounded-marker'],
  ['shadow-1', 'a depth role'],
  ['shadow-2', 'shadow-surface-floating or shadow-control-raised'],
  ['shadow-3', 'shadow-surface-deep'],
  ['shadow-none', 'nothing at all, when the branch means the depth the slot already paints'],
  ['bg-base-200', 'bg-surface or bg-surface-floating, when the slot IS the surface'],
  ['p-5', 'p-surface, when the slot is the room a surface gives its own content'],
  ['px-5', 'px-surface, for the same reason'],
  ['font-extrabold', 'font-heading, when the slot IS a heading in the display face'],
  ['tracking-tight', 'tracking-heading, for the same reason'],
  ['leading-body', 'leading-prose, when the slot is text somebody reads'],
  ['--bw', '--bw-surface, --bw-control, --bw-field, --bw-marker or --bw-separator'],
  ['--dur-fast', '--dur-hover'],
  ['--dur-mid', '--dur-state'],
]);

export const SCALE_USES = new Map<string, string>([
  ['ArenaAvatar:box:rounded-md', 'one branch of a shape variant whose other branches are pill and none, so the value is the shape the caller asked for rather than a surface tier'],
  ['ArenaSegmentedControl:segment:shadow-1', 'the lift that tells the selected segment from its track, and the one place a control carries depth at rest rather than under a pointer'],
  ['ArenaCalendar:chip:--bw', 'arithmetic rather than a border: the chip reserves room for the kebab beside it with calc(--dz-ctl-h-sm + --bw*2), so the token is a length being added up and not an edge this slot draws'],
  ['ArenaTabs:tab:shadow-none', 'cancels the inset rule the selected branch draws under a tab, and the slot paints no depth role for it to override. A tab has no resting depth to restore, so the literal is the whole answer here rather than a value written over a role'],
  ['ArenaButton:root:bg-base-200', 'the fill of a secondary button, and the hover of a ghost one: a control the user presses rather than a region something is placed inside. A voice that flattens its surfaces onto the page is saying its regions are carried by air, and a button that went with them would stop looking pressable'],
  ['ArenaIconButton:root:bg-base-200', 'the same, as the hover fill of a control with no resting one'],
  ['ArenaBulkActionBar:action:bg-base-200', 'the same, as the hover fill of a control INSIDE a floating surface, which is why it must not follow that surface when a voice moves it'],
  ['ArenaInput:field:bg-base-200', 'the readonly state of a field, which says a control cannot be typed into by matching the surface it sits on. It is a state of a control, not the surface itself, and a voice that moved it would be re-answering readonly rather than re-answering grouping'],
  ['ArenaTextarea:field:bg-base-200', 'the same readonly state, for the same reason'],
  ['ArenaSheet:head:px-5', 'a sheet is pinned to the viewport edge, so its padding is a fit constraint rather than a statement about air. A voice with a lever here could push its content off the screen, which is why the floating tier has no padding role'],
  ['ArenaSheet:body:px-5', 'the same sheet, the same constraint'],
  ['ArenaSheet:foot:px-5', 'the same sheet, the same constraint'],
  ['ArenaAvatar:box:font-extrabold', 'a monogram rather than a heading: two letters standing in for a face, weighted to read at 12px inside a circle. A voice that lightened its headings has said nothing about initials'],
  ['ArenaAppLogo:name:tracking-tight', 'the wordmark, which is the brand set as artwork rather than a heading in the document outline. It tracks with the mark beside it and follows no voice'],
  ['ArenaTextarea:field:leading-body', 'the leading of text a user TYPES, which follows the control the caret sits in rather than the prose a page sets. Moving it with a reading voice would reflow a form field under somebody mid-sentence'],
  ['ArenaOnboarding:panel:p-5', 'a coachmark is pinned to the element it points at and sized against the viewport in JS, so its padding is a fit constraint for the same reason a sheet\'s is'],
]);

export function scaleUseKey(component: string, slot: string, utility: string) {
  return `${component}:${slot}:${utility}`;
}

function literal(utility: string) {
  return utility.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function scaleUsesIn(classString: string) {
  return [...SCALE_UTILITIES.keys()]
    .filter((utility) => new RegExp(`(?<![\\w-])${literal(utility)}(?![\\w-])`).test(classString));
}

export function evaluateManifest(manifest: ComponentManifest, allowed = SCALE_USES) {
  const findings = [];
  for (const [slot, classList] of classStringsBySlot(manifest) as Map<string, string[]>)
    for (const utility of new Set(classList.flatMap(scaleUsesIn))) {
      const key = scaleUseKey(manifest.component, slot, utility);
      if (allowed.has(key)) continue;
      findings.push({ component: manifest.component, slot, utility, role: SCALE_UTILITIES.get(utility) });
    }
  return findings;
}

export function seenKeys(manifest: ComponentManifest) {
  const keys = new Set<string>();
  for (const [slot, classList] of classStringsBySlot(manifest) as Map<string, string[]>)
    for (const utility of new Set(classList.flatMap(scaleUsesIn)))
      keys.add(scaleUseKey(manifest.component, slot, utility));
  return keys;
}

export function staleAllowances(seen: Set<string>, allowed = SCALE_USES) {
  return [...allowed.keys()]
    .filter((key) => !seen.has(key))
    .map((key) => `${key} is excused in SCALE_USES but no manifest carries it -- drop the entry`);
}

export function zeroManifestProblem(files: string[]) {
  return files.length === 0
    ? 'found 0 manifests -- an empty result set is a failure, not a clean pass; check the discovery path'
    : null;
}

export function collect(files = manifestFiles(COMPONENTS_DIR)) {
  const findings = [];
  const seen = new Set<string>();
  for (const p of files) {
    const manifest = readJson(p);
    findings.push(...evaluateManifest(manifest));
    for (const key of seenKeys(manifest)) seen.add(key);
  }
  return { findings, stale: staleAllowances(seen) };
}

function main() {
  const files = manifestFiles(COMPONENTS_DIR);
  const zero = zeroManifestProblem(files);
  if (zero) {
    console.error(`check-role-tokens: ${zero}`);
    process.exit(1);
  }
  const { findings, stale } = collect(files);
  if (findings.length || stale.length) {
    console.error(`check-role-tokens: ${findings.length} scale use(s) in a role position, ${stale.length} stale allowance(s)\n`);
    for (const f of findings)
      console.error(`  ${f.component}:${f.slot} carries ${f.utility} where a role belongs -- use ${f.role}, or record the case in SCALE_USES with the reason it means the length`);
    for (const s of stale) console.error(`  ${s}`);
    process.exit(1);
  }
  console.log(`check-role-tokens: ${files.length} manifest(s) -- every radius, border, depth and duration decision names a role, ${SCALE_USES.size} recorded scale use(s)`);
}

if (isMainModule(import.meta.url)) main();
