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
  ['--bw', '--bw-surface, --bw-control, --bw-field, --bw-marker or --bw-separator'],
  ['--dur-fast', '--dur-hover'],
  ['--dur-mid', '--dur-state'],
]);

export const SCALE_USES = new Map<string, string>([
  ['ArenaTooltip:bubble:rounded-sm', 'a tooltip is a label with a background rather than a surface: nothing is placed inside it, and its corner follows the text it wraps'],
  ['ArenaCalendar:panel:rounded-sm', 'the day/week/month switcher is a floating panel drawn at the control radius on purpose, because it sits flush against the control that opens it'],
  ['ArenaCalendar:chip:rounded-sm', 'an event chip is a block of content positioned on a grid, neither a control nor a surface'],
  ['ArenaSkeleton:root:rounded-sm', 'a placeholder takes the shape of the thing it stands in for, so its corner is the shape being faked rather than a role'],
  ['ArenaSkeleton:root:rounded-xs', 'the same, for the line variant of that placeholder'],
  ['ArenaSkeleton:line:rounded-xs', 'the same, for a line of text'],
  ['ArenaSkeleton:lastLine:rounded-xs', 'the same, for the short last line'],
  ['ArenaCalendar:chip:--bw', 'arithmetic rather than a border: the chip reserves room for the kebab beside it with calc(--dz-ctl-h-sm + --bw*2), so the token is a length being added up and not an edge this slot draws'],
  ['ArenaAvatar:box:rounded-md', 'one branch of a shape variant whose other branches are pill and none, so the value is the shape the caller asked for rather than a surface tier'],
  ['ArenaSegmentedControl:segment:shadow-1', 'the lift that tells the selected segment from its track, and the one place a control carries depth at rest rather than under a pointer'],
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
