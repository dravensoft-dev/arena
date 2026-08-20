/* Fails on a scale utility standing where a role belongs. A scale says how round a corner is; a
 * role says WHICH corner is being asked about, and only a question can be answered differently by
 * a style plugin. The ban covers ink, edges, faces, case and internal air as well as geometry,
 * since the role tier grew to reach them. A family with a Tailwind namespace is banned by utility
 * name; a border width and a duration are banned by TOKEN name, which catches
 * border-[length:var(--bw)] and the var(--dur-fast) buried in an arbitrary [transition:...] with
 * one entry rather than one per spelling. An easing is banned BOTH ways and the two never collide,
 * since the utility entry cannot match inside var(--ease-out) where a hyphen precedes it.
 * SCALE_USES records the places that genuinely mean the value, one entry per case with its reason,
 * and its largest group is the mono face standing for figures rather than for a register. */

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
  ['bg-base-300', 'bg-track, when the slot is the ground a value or a segment sits in, or bg-edge-separator when it is a rule drawn as a filled strip'],
  ['p-5', 'p-surface, when the slot is the room a surface gives its own content'],
  ['px-5', 'px-surface, for the same reason'],
  ['font-extrabold', 'font-heading, when the slot IS a heading in the display face'],
  ['tracking-tight', 'tracking-heading, for the same reason'],
  ['leading-body', 'leading-prose, when the slot is text somebody reads'],
  ['ease-out', 'ease-hover or ease-state, whichever duration the same transition names'],
  ['text-base-content', 'text-ink-heading, text-ink-body or text-ink-muted, whichever text this is'],
  ['border-base-300', 'an edge role: border-edge-surface, -field, -separator or -control-quiet'],
  ['border-neutral', 'an edge role: border-edge-surface-floating, -control or -marker'],
  ['uppercase', 'case-eyebrow or case-label, so a style plugin can set the register in sentence case'],
  ['font-mono', 'font-face-eyebrow or font-face-label, when the slot is a register rather than a figure'],
  ['font-display', 'font-face-heading, when the slot is a heading rather than the brand itself'],
  ['text-h1', 'text-title-page, when the slot is the one heading that names the screen'],
  ['text-h2', 'text-title-page or text-title-section, whichever this title is titling'],
  ['text-h3', 'text-title-section, when the slot is the head of a region on a page'],
  ['text-h4', 'text-title-surface, when the slot is the head of a card, a panel or a tile'],
  ['text-ctl-2xs', 'text-label, when the slot is in the label register'],
  ['tracking-label', 'tracking-eyebrow, when the slot IS an eyebrow'],
  ['tracking-field-label', 'tracking-label-role, the tracking of the label register'],
  ['tracking-column-header', 'tracking-label-role, since a column header is the register\'s own text'],
  ['tracking-badge', 'tracking-label-role, when the slot is in the label register rather than a figure'],
  ['tracking-uppercase-status', 'tracking-label-role, when the slot names a thing rather than reports a state'],
  ['text-neutral', 'an ink role: text-ink-muted, text-ink-body or text-ink-heading, whichever text this is'],
  ['--bw', '--bw-surface, --bw-control, --bw-field, --bw-marker or --bw-separator'],
  ['--dur-fast', '--dur-hover'],
  ['--dur-mid', '--dur-state'],
  ['--ease-out', '--ease-hover or --ease-state, inside an arbitrary [transition:...] property'],
]);

export const SCALE_USES = new Map<string, string>([
  ['ArenaSideNav:badge:tracking-badge', 'a nav counter, which is a figure in the mono face carrying no case role: the label register\'s tracking would open a number that is read one glyph at a time'],
  ['ArenaBottomNav:badge:tracking-badge', 'the same counter on the other bar, for the same reason'],
  ['ArenaAlert:action:tracking-uppercase-status', 'the word a reader presses to answer an alert, which is status text rather than a label: it says what happens next instead of what kind of thing this is'],
  ['ArenaToast:action:tracking-uppercase-status', 'the same word on a toast'],
  ['ArenaOnboarding:text:tracking-uppercase-status', 'the step a coachmark reports, which is a reading of where somebody is in a sequence'],
  ['ArenaCalendar:hourLabel:tracking-uppercase-status', 'the hour down the side of a day, which is a clock being read rather than a column being named'],
  ['ArenaAlert:icon:text-neutral', 'one branch of a tone variant whose other branches are the status colours, so the value is the tone the caller asked for rather than a colour this slot chose'],
  ['ArenaAlert:action:text-neutral', 'the same tone on the word beside that glyph'],
  ['ArenaAvatar:box:rounded-md', 'one branch of a shape variant whose other branches are pill and none, so the value is the shape the caller asked for rather than a surface tier'],
  ['ArenaSegmentedControl:segment:shadow-1', 'the lift that tells the selected segment from its track, and the one place a control carries depth at rest rather than under a pointer'],
  ['ArenaCalendar:chip:--bw', 'arithmetic rather than a border: the chip reserves room for the kebab beside it with calc(--dz-ctl-h-sm + --bw*2), so the token is a length being added up and not an edge this slot draws'],
  ['ArenaTabs:tab:shadow-none', 'cancels the inset rule the selected branch draws under a tab, and the slot paints no depth role for it to override. A tab has no resting depth to restore, so the literal is the whole answer here rather than a value written over a role'],
  ['ArenaButton:root:bg-base-200', 'the fill of a secondary button, and the hover of a ghost one: a control the user presses rather than a region something is placed inside. A style plugin that flattens its surfaces onto the page is saying its regions are carried by air, and a button that went with them would stop looking pressable'],
  ['ArenaIconButton:root:bg-base-200', 'the same, as the hover fill of a control with no resting one'],
  ['ArenaBulkActionBar:action:bg-base-200', 'the same, as the hover fill of a control INSIDE a floating surface, which is why it must not follow that surface when a style plugin moves it'],
  ['ArenaInput:field:bg-base-200', 'the readonly state of a field, which says a control cannot be typed into by matching the surface it sits on. It is a state of a control, not the surface itself, and a style plugin that moved it would be re-answering readonly rather than re-answering grouping'],
  ['ArenaTextarea:field:bg-base-200', 'the same readonly state, for the same reason'],
  ['ArenaCheckbox:box:bg-base-300', 'the ground of a control that is not set yet, which is the fill of a thing the user presses rather than of a region something is placed inside. It is the reason ArenaButton:root:bg-base-200 carries one step over, and a style plugin re-answering its tracks has said nothing about whether an unchecked box reads as empty'],
  ['ArenaRadio:ring:bg-base-300', 'the same unset ground, one control over'],
  ['ArenaBadge:root:bg-base-300', 'the ground of a MARKER in its neutral tone, which is neither a surface nor a control by the argument r-marker and bw-marker already stand on'],
  ['ArenaSideNav:badge:bg-base-300', 'the same marker ground, on the count beside a navigation row that is not current'],
  ['ArenaAvatar:box:bg-base-300', 'the ground a monogram or a missing photograph sits on, which is a marker ground for the reason above and is the same slot that keeps font-display and font-extrabold for standing in for a face'],

  ['ArenaSheet:head:px-5', 'a sheet is pinned to the viewport edge, so its padding is a fit constraint rather than a statement about air. A style plugin with a lever here could push its content off the screen, which is why the floating tier has no padding role'],
  ['ArenaSheet:body:px-5', 'the same sheet, the same constraint'],
  ['ArenaSheet:foot:px-5', 'the same sheet, the same constraint'],
  ['ArenaAvatar:box:font-extrabold', 'a monogram rather than a heading: two letters standing in for a face, weighted to read at 12px inside a circle. A style plugin that lightened its headings has said nothing about initials'],
  ['ArenaAppLogo:name:tracking-tight', 'the wordmark, which is the brand set as artwork rather than a heading in the document outline. It tracks with the mark beside it and follows no style plugin'],
  ['ArenaTextarea:field:leading-body', 'the leading of text a user TYPES, which follows the control the caret sits in rather than the prose a page sets. Moving it with a reading style plugin would reflow a form field under somebody mid-sentence'],
  ['ArenaOnboarding:panel:p-5', 'a coachmark is pinned to the element it points at and sized against the viewport in JS, so its padding is a fit constraint for the same reason a sheet\'s is'],

  ['ArenaActivityFeed:time:font-mono', 'a timestamp, read as a figure. This entry and the twenty-three under it are the mono face standing for FIGURES or CODE rather than for a register: a column of digits aligns by digit and a string read character by character has to be monospaced whatever the page sounds like, so a style plugin that sets its labels in the display face has said nothing about any of them. It is the half .arena-num ships for a figure a consumer draws themselves'],
  ['ArenaCalendar:dayNumber:font-mono', 'a day of the month, read as a figure'],
  ['ArenaCalendar:time:font-mono', 'a clock time, read as a figure'],
  ['ArenaTable:tdMono:font-mono', 'the mono column of a table, which is what the face is for'],
  ['ArenaTable:cardValueMono:font-mono', 'the same column in the card layout the table falls back to'],
  ['ArenaBoard:count:font-mono', 'how many cards a column holds, read as a figure beside its name, and a row of columns whose counts do not align by digit reads as a jumble'],
  ['ArenaBoard:summary:font-mono', 'the total a column adds up to, read as a figure under its name rather than as a register'],
  ['ArenaPeopleList:rank:font-mono', 'a position in a standings list, read as a figure, and a column of them has to align by digit or the list stops reading as a ranking'],
  ['ArenaPeopleList:figure:font-mono', 'the quantity a row of people is sorted by, read as a figure beside the name rather than as a register'],
  ['ArenaProgressBar:value:font-mono', 'a percentage that must not jitter as it counts'],
  ['ArenaTextarea:counter:font-mono', 'a character count that must not jitter as it counts'],
  ['ArenaTextarea:counterNear:font-mono', 'the same count at its warning threshold'],
  ['ArenaBulkActionBar:count:font-mono', 'a selection count that must not jitter as it counts'],
  ['ArenaPagination:page:font-mono', 'a page number, and the row of them has to align'],
  ['ArenaPagination:ellipsis:font-mono', 'the gap between two page numbers, which sits on their grid'],
  ['ArenaBottomNav:badge:font-mono', 'a count on a badge'],
  ['ArenaSideNav:badge:font-mono', 'the same count in the side navigation'],
  ['ArenaErrorState:code:font-mono', 'an error code, read character by character'],
  ['ArenaConfirmDialog:input:font-mono', 'the field a user retypes a name into, where every character has to be distinguishable from the one it looks like'],
  ['ArenaInput:prefix:font-mono', 'a unit or a currency sitting on the field\'s own baseline grid'],
  ['ArenaCommandPalette:shortcut:font-mono', 'a keyboard shortcut, which is a key cap rather than a label'],
  ['ArenaCommandPalette:esc:font-mono', 'the same, for the escape cap'],
  ['ArenaMenu:shortcut:font-mono', 'the same, in a menu'],
  ['ArenaTooltip:bubble:font-mono', 'a tooltip carries a shortcut or a value often enough that the bubble is set in mono outright'],
  ['ArenaActivityFeed:target:font-mono', 'the object an activity happened to, which is an identifier rather than a name'],
  ['ArenaKeyValue:valueNumeric:font-mono', 'a figure in a summary, and a column of them has to align by digit or it jitters as the basket changes. It is the same claim .arena-num ships for a figure a consumer draws themselves, made once here for the figures this component draws'],

  ['ArenaAppLogo:name:font-display', 'the wordmark, which is the brand set as artwork rather than a heading in the document outline. It follows the mark beside it and no style plugin'],
  ['ArenaAvatar:box:font-display', 'a monogram: two letters standing in for a face, which is the same reason the slot keeps font-extrabold'],
  ['ArenaSheet:trigger:font-display', 'the trigger repeats the title of the sheet it opens, so it follows that title rather than the heading tier'],
  ['ArenaSheet:trigger:text-h3', 'the same trigger and the same reason one axis over: the size follows the title it repeats, not the register the title tier is pitched at. The two entries move together or the slot is half on the tier'],
  ['ArenaStatCard:value:text-h2', 'the figure a stat card exists to show, which is data set large and not a title of anything. A style plugin re-pitching the titles on a page has said nothing about how big a number is, and binding this would have moved every dashboard the first time one did'],


  ['ArenaSideNav:badge:text-ctl-2xs', 'a nav counter, which is at the smallest control step because it is the smallest control text and not because it is a label: it carries the mono face and no case role, so text-label would pitch a figure at whatever a product decided its column headers should be'],
  ['ArenaBottomNav:badge:text-ctl-2xs', 'the same counter on the other bar, for the same reason'],
  ['ArenaBottomNav:item:text-ctl-2xs', 'the words under a bar icon, which are the control\'s own label in the body face rather than the label register, and are held at the smallest step by the room the bar has'],
  ['ArenaCalendar:time:text-ctl-2xs', 'a timestamp on an event, set in mono as a figure'],
  ['ArenaPeopleList:rank:text-ctl-2xs', 'a position in a list, which is a figure'],
  ['ArenaPeopleList:secondary:text-ctl-2xs', 'the second line under a name, which is held small by the row it shares rather than by a register'],
  ['ArenaPeopleList:figure:text-ctl-2xs', 'the number beside that name, for the reason rank is'],
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
  console.log(`check-role-tokens: ${files.length} manifest(s) -- every radius, border, depth, duration, easing, ink, edge, face, case and internal-air decision names a role, ${SCALE_USES.size} recorded scale use(s)`);
}

if (isMainModule(import.meta.url)) main();
