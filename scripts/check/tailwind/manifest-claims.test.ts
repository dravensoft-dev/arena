/* What each manifest MEANS: which tone paints which token, which size is which height, which
 * branch a responsive layout takes. Every claim here was asserted inside a layer suite against
 * the class string a recipe resolved, in both layers, about the same one manifest. A component
 * renders its own class names now, so a layer suite can no longer see a utility, and Angular
 * may not import a manifest to look: that is the edge this whole change removes. So the claims
 * live once, beside the manifests, resolved through the same recipe they were resolved through
 * before, which is what makes them the same claims and not weaker ones. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaTv } from '../../../frameworks/tailwind/Tv.ts';
import { layerManifests } from '../../lib/tailwind/tailwind-compile.ts';

const manifests = new Map([...layerManifests().values()].map((m) => [m.component, m]));

export function resolve(component: string, chosen: Record<string, string | boolean>, slot: string) {
  const manifest = manifests.get(component);
  if (!manifest) throw new Error(`manifest-claims: no manifest called ${component}`);
  const styles = (arenaTv as any)(manifest)(chosen) as Record<string, () => string>;
  if (!styles[slot]) throw new Error(`manifest-claims: ${component} has no slot called ${slot}`);
  return styles[slot]().split(/\s+/).filter(Boolean);
}

type Claim = { chosen?: Record<string, string>; slot: string; has?: string[]; hasNot?: string[]; why: string };

export function claimProblems(claims: Record<string, Claim[]>) {
  const problems = [];
  for (const [component, entries] of Object.entries(claims) as [string, Claim[]][]) {
    for (const { chosen = {}, slot, has = [], hasNot = [], why } of entries) {
      const resolved = resolve(component, chosen, slot);
      const where = `${component}.${slot} with ${JSON.stringify(chosen)}`;
      for (const cls of has) {
        if (!resolved.includes(cls)) problems.push(`${where}: ${cls} is missing, and ${why}. Resolved: ${resolved.join(' ')}`);
      }
      for (const cls of hasNot) {
        if (resolved.includes(cls)) problems.push(`${where}: ${cls} is present, and ${why}. Resolved: ${resolved.join(' ')}`);
      }
    }
  }
  return problems;
}

test('every claim names a manifest that exists, so a renamed component fails here', () => {
  for (const component of Object.keys(CLAIMS)) {
    assert.ok(manifests.has(component), `CLAIMS names ${component}, which is no manifest`);
  }
});

test('every claim carries a reason, because one that cannot be judged stale is not a claim', () => {
  for (const [component, entries] of Object.entries(CLAIMS) as [string, Claim[]][]) {
    assert.ok(entries.length > 0, `${component} carries an empty claim list`);
    for (const entry of entries) {
      assert.ok(entry.why && entry.why.length > 10, `${component}.${entry.slot} has no usable reason`);
      assert.ok((entry.has ?? []).length + (entry.hasNot ?? []).length > 0,
        `${component}.${entry.slot} asserts nothing`);
    }
  }
});

test('every manifest claim holds', () => {
  const problems = claimProblems(CLAIMS as unknown as Record<string, Claim[]>);
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('the tab draws its focus ring with a ring utility, because its shadow slot is the selected mark', () => {
  for (const selected of [true, false]) {
    const carried = resolve('ArenaTabs', { selected }, 'tab')
      .filter((cls) => /^focus(-visible)?:shadow-/.test(cls));
    assert.deepEqual(carried, [],
      `the tab carries ${carried.join(' ')}. shadow-* writes --tw-shadow, and this slot spends that `
      + 'on the inset underline marking the selected tab, so a focus ring written as a shadow '
      + 'replaces the mark that says which tab you are on for exactly as long as you are on it. A '
      + 'ring utility writes --tw-ring-shadow, which composes with it.');
  }
});

test('no ArenaSideNav slot hard-codes an indent bracket, because a static utility holds no runtime multiplier', () => {
  for (const slot of ['item', 'trigger', 'sectionLabel']) {
    const carried = resolve('ArenaSideNav', {}, slot).filter((cls) => cls.startsWith('ps-['));
    assert.deepEqual(carried, [], `${slot} hard-codes ${carried.join(' ')}; the depth-0 inline start is all a slot may carry`);
  }
});

export const CLAIMS = {
  ArenaSection: [
    { slot: 'title', has: ['text-title-section'], hasNot: ['text-h1', 'text-h2', 'text-h3', 'text-h4'], why: 'a scale step here is a title no style plugin can re-pitch, which is the defect the role tier exists to prevent' },
    { slot: 'head', has: ['flex-wrap', 'items-baseline', 'justify-between'], why: 'the head puts its action at the far end on the title\'s own baseline, and wraps rather than squeezing' },
    { chosen: { rhythm: 'none' }, slot: 'root', has: ['gap-0'], why: 'none closes the distance for a body that carries its own top edge' },
    { chosen: { rhythm: 'sm' }, slot: 'root', has: ['gap-group'], why: 'the four steps are the page rhythm scale itself, never a length this manifest chose' },
    { chosen: { rhythm: 'md' }, slot: 'root', has: ['gap-component'], why: 'the four steps are the page rhythm scale itself, never a length this manifest chose' },
    { chosen: { rhythm: 'lg' }, slot: 'root', has: ['gap-section'], why: 'the four steps are the page rhythm scale itself, never a length this manifest chose' },
  ],
  ArenaScroller: [
    { slot: 'root', has: ['overflow-x-auto'], hasNot: ['overflow-y-auto', 'overflow-y-scroll'], why: 'a row that scrolls downwards as well is a grid nobody asked for' },
    { slot: 'root', hasNot: ['*:basis-[var(--arena-scroller-item)]', '*:shrink-0', '*:snap-start'], why: 'a rule aimed at the row\'s own children lands on an element with no box wherever that child takes its host out of layout, so the width and the snap point sit on ArenaScrollerItem, which has one in both layers' },
    { chosen: { behaviour: 'snap' }, slot: 'root', has: ['snap-x'], why: 'snap lands on an item, and the axis is the half the row owns' },
    { chosen: { behaviour: 'flow' }, slot: 'root', hasNot: ['snap-x'], why: 'flow lands wherever the reader left it, which is the whole difference between the two' },
    { chosen: { behaviour: 'snap' }, slot: 'root', hasNot: ['animate-spin', 'animate-pulse'], why: 'a row that moved on its own would owe a pause control under WCAG 2.2.2, and neither behaviour moves' },
  ],
  ArenaFigure: [
    { slot: 'frame', has: ['rounded-media', 'overflow-hidden', 'bg-surface-sunken'], hasNot: ['rounded-surface', 'rounded-lg'], why: 'a figure is the thing being looked at rather than a container the reader looks past, so its corner is its own role and not the surface one' },
    { slot: 'media', has: ['[&>img]:fit-media', '[&>video]:fit-media'], why: 'how the picture meets the frame is a role, and it is scoped to the media box so an image in the overlay or the fallback is not cropped with it' },
    { slot: 'overlay', has: ['bg-overlay-media/72'], why: 'the wash is a colour role with the opacity in the manifest, so which colour and how held back stay two decisions and the contrast is measurable' },
    { slot: 'frame', hasNot: ['aspect-square', 'aspect-video'], why: 'the shape is a member the component writes inline, because a consumer pinning a video is answering about one figure and not about the appearance' },
  ],
  ArenaHero: [
    { chosen: { layout: 'split', align: 'start' }, slot: 'title', has: ['text-title-hero'], hasNot: ['text-display', 'text-hero', 'text-h1'], why: 'the top rung of the title ladder is a role, so a style plugin re-pitches a hero with the three registers under it rather than around them' },
    { chosen: { layout: 'split', align: 'start' }, slot: 'lede', has: ['max-w-prose'], why: 'a line that runs the whole width of a hero loses its return sweep, and the reading width is the role that already answers how long a line may be' },
    { chosen: { layout: 'bleed', align: 'center' }, slot: 'words', has: ['col-start-1', 'row-start-1', 'items-center'], why: 'bleed lays the words ON the figure, which is one grid cell carrying both, and centring is the alignment that arrangement usually wants' },
    { chosen: { layout: 'split', align: 'start' }, slot: 'root', hasNot: ['grid-cols-1'], why: 'split is the only layout whose track list comes from the room, so it is the only one the recipe leaves alone' },
  ],
  ArenaScrollerItem: [
    { slot: 'root', has: ['basis-[var(--arena-scroller-item)]', 'shrink-0', 'grow-0', 'snap-start'], why: 'the cell is the box the row sizes and settles on, and it carries both on itself rather than inheriting either from a rule aimed at somebody else\'s children' },
    { slot: 'root', hasNot: ['bg-surface', 'border-edge-surface', 'p-surface'], why: 'the cell draws no surface, no line and no padding: everything visible in it is what was put inside' },
  ],
  ArenaAppLogo: [
    ...['sm', 'md', 'lg', 'xl'].flatMap((s) => [
      { chosen: { size: s }, slot: 'mark', has: [`size-logo-mark-${s}`], why: 'each size step pairs a mark box with its wordmark step' },
      { chosen: { size: s }, slot: 'name', has: [`text-logo-${s}`], why: 'each size step pairs a mark box with its wordmark step' },
    ]),
    { chosen: { orientation: 'horizontal' }, slot: 'root', has: ['flex-row', 'gap-2.5'], why: 'orientation changes the axis and the gap, nothing else' },
    { chosen: { orientation: 'vertical' }, slot: 'root', has: ['flex-col', 'gap-items'], why: 'orientation changes the axis and the gap, nothing else' },
    { slot: 'mark', has: ['*:w-full', '*:h-full', '*:block'], why: 'the mark slot stretches its projected child rather than sizing it' },
  ],
  ArenaChartCard: [
    { slot: 'root', has: ['flex', 'bg-surface', 'border-[length:var(--bw-surface)]', 'border-edge-surface', 'rounded-surface'], why: 'a chart tile is a bordered tile off the surface scale, not a heading-bearing panel' },
    { slot: 'title', has: ['font-face-label', 'case-label', 'tracking-label-role'], hasNot: ['font-display', 'text-h1', 'text-h2', 'text-h3', 'text-h4'], why: 'a microlabel carries neither the display font nor a heading size, which would fabricate a document outline' },
    { slot: 'head', has: ['justify-between', 'items-center', 'flex-wrap'], why: 'the head row spaces title and actions to opposite ends and wraps, since the slot projects one element per control' },
  ],
  ArenaActivityFeed: [
    { slot: 'dot', has: ['bg-current'], hasNot: ['bg-error', 'bg-success', 'bg-warning', 'bg-info', 'bg-primary', 'bg-secondary'], why: 'the dot carries the tone as a colour, never as a fill of its own' },
    { chosen: { divided: true }, slot: 'item', has: ['border-t-[length:var(--bw-separator)]'], why: 'divided draws the rule between rows' },
    { chosen: { divided: false }, slot: 'item', has: ['border-t-0'], why: 'the first row carries no divider above it' },
  ],
  ArenaAvatar: [
    ...['xs', 'sm', 'md', 'lg'].map((s) => ({
      chosen: { size: s }, slot: 'box', has: [`text-[length:calc(var(--avatar-${s})*0.4)]`],
      why: 'the initials font size is exactly diameter times the ratio spacing.json declares',
    })),
    ...['xs', 'sm', 'md', 'lg'].map((s) => ({
      chosen: { size: s }, slot: 'status', has: [`size-[max(calc(var(--sp-1)*2),calc(var(--avatar-${s})*0.28))]`],
      why: 'the presence dot diameter is exactly the floor-and-ratio spacing.json declares',
    })),
    { chosen: { shape: 'circle' }, slot: 'box', has: ['rounded-pill'], why: 'circle rounds the box fully and rounded takes the medium radius' },
    { chosen: { shape: 'rounded' }, slot: 'box', has: ['rounded-md'], why: 'circle rounds the box fully and rounded takes the medium radius' },
    { chosen: { status: 'online' }, slot: 'status', has: ['bg-success'], why: 'a presence tone maps to the status colour taxonomy, never to a series colour' },
    { chosen: { status: 'busy' }, slot: 'status', has: ['bg-error'], why: 'a presence tone maps to the status colour taxonomy, never to a series colour' },
    { chosen: { status: 'away' }, slot: 'status', has: ['bg-warning'], why: 'a presence tone maps to the status colour taxonomy, never to a series colour' },
    { chosen: { status: 'offline' }, slot: 'status', has: ['bg-base-content/(--level-presence)'], why: 'a presence tone maps to the status colour taxonomy, never to a series colour' },
    { slot: 'image', has: ['w-full', 'h-full', 'object-cover'], why: 'the image fills the box and crops to it, so a non-square source never distorts' },
  ],
  ArenaCard: [
    { slot: 'root', has: ['block', 'bg-surface'], hasNot: ['bg-base-200'], why: 'the card names WHICH surface it is rather than which step of the scale, so a style plugin can flatten it onto the page, and it is never a zero-area inline box' },
    { chosen: { accent: true }, slot: 'root', has: ['border-primary'], hasNot: ['border-edge-surface'], why: 'accent swaps the hairline for the accent border and touches nothing else' },
    { chosen: { accent: false }, slot: 'root', has: ['border-edge-surface'], hasNot: ['border-primary'], why: 'accent swaps the hairline for the accent border and touches nothing else' },
    { chosen: { floating: true }, slot: 'root', has: ['shadow-surface-floating'], why: 'depth is the shadow and the surface scale, never a gradient' },
    { chosen: { floating: false }, slot: 'root', has: ['shadow-surface-rest'], hasNot: ['shadow-none'], why: 'a card that is not floating keeps the RESTING depth role rather than cancelling it: shadow-surface-rest is authored as a transparent shadow so the property is painted and a style plugin can move it, and a literal shadow-none in the default branch made the one role written to trade hairline grouping for elevation unreachable on the one component it was written for' },
    { slot: 'eyebrow', has: ['font-face-eyebrow', 'case-eyebrow', 'text-ink-eyebrow'], why: 'the eyebrow is the accent mono micro-label above the display-weight title' },
    { slot: 'title', has: ['font-face-heading', 'text-title-surface'], why: 'the eyebrow is the accent mono micro-label above the display-weight title' },
  ],
  ArenaSkeleton: [
    { chosen: { variant: 'text' }, slot: 'root', has: ['arena-shimmer'], hasNot: ['hidden'], why: 'the text variant carries no root override; the host reads stack() for it, not root()' },
    { slot: 'stack', has: ['flex-col', 'gap-2.5'], why: 'the stack lays its lines in a column and is unaffected by variant' },
    { slot: 'line', has: ['w-full'], hasNot: ['w-[62%]'], why: 'a full line runs the whole width and only the closing one runs short' },
    { slot: 'lastLine', has: ['w-[62%]'], why: 'the last line is narrower than the rest, the way a paragraph ends' },
  ],
  ArenaStatCard: [
    ...Object.entries({ neutral: 'text-ink-body', accent: 'text-primary', gold: 'text-secondary',
      success: 'text-success', warning: 'text-warning', danger: 'text-error', info: 'text-info' })
      .map(([tone, cls]) => ({ chosen: { tone }, slot: 'value', has: [cls], why: 'every value tone maps to its own text colour and no other survives beside it' })),
    { slot: 'value', has: ['text-ink-body'], why: 'the default value tone is neutral' },
    { chosen: { tone: 'danger' }, slot: 'value', has: ['text-error'], why: 'a danger value tone colours text only, so the value slot carries no background' },
    { chosen: { tone: 'danger', deltaTone: 'positive' }, slot: 'delta', has: ['border-success', 'text-success'], why: 'tone and deltaTone are independent, which is why the contract declares them separately' },
    { chosen: { deltaTone: 'negative' }, slot: 'delta', has: ['border-error', 'text-error', 'bg-transparent'], hasNot: ['bg-error'], why: 'a negative delta is outline: border and text in --error, never a filled background' },
    { chosen: { deltaTone: 'positive' }, slot: 'delta', has: ['border-success', 'text-success'], why: 'a positive delta reads success, not the danger family' },
    { chosen: { deltaTone: 'neutral' }, slot: 'delta', has: ['rounded-marker'], why: 'every delta tone keeps the shared marker base, which is the corner roles.json gives a delta badge' },
  ],
  ArenaTable: [
    ...['th', 'td', 'tdMono'].map((slot) => ({
      slot, has: ['outline-none', 'focus:shadow-[inset_0_0_0_var(--focus-width)_var(--focus-ring)]'],
      why: 'a cell draws its focus ring from the focus tokens and suppresses the UA outline, or a keyboard user cannot see where the cursor is',
    })),
    { slot: 'root', has: ['block'], why: 'a host-bound root is never the UA-default inline box' },
    { chosen: { narrow: false }, slot: 'root', has: ['rounded-surface', 'overflow-hidden'], hasNot: ['flex-col'], why: 'the wide shape is the framed grid, and it is the default because nothing has been measured yet' },
    { chosen: { narrow: false }, slot: 'grid', has: ['table'], why: 'the wide shape is the framed grid' },
    { chosen: { narrow: true }, slot: 'root', has: ['flex', 'flex-col'], hasNot: ['rounded-surface', 'overflow-hidden'], why: 'below the breakpoint the frame goes away and the rows become a stack of cards' },
    { chosen: { narrow: true }, slot: 'grid', has: ['contents'], hasNot: ['table'], why: 'below the breakpoint the frame goes away and the rows become a stack of cards' },
    { slot: 'headRow', has: ['table-row'], why: 'a row and a cell need the table display utilities to work as custom-element hosts' },
    { slot: 'row', has: ['table-row'], why: 'a row and a cell need the table display utilities to work as custom-element hosts' },
    { slot: 'th', has: ['table-cell'], why: 'a row and a cell need the table display utilities to work as custom-element hosts' },
    { slot: 'td', has: ['table-cell'], why: 'a row and a cell need the table display utilities to work as custom-element hosts' },
  ],
  ArenaTag: [
    { chosen: { tone: 'danger' }, slot: 'root', has: ['border-error', 'text-error'], hasNot: ['bg-error'], why: 'danger is outline: border and text in --error, never a filled background' },
    ...['neutral', 'accent', 'gold', 'success', 'warning', 'danger', 'info'].map((tone) => ({
      chosen: { tone }, slot: 'root', has: ['rounded-marker', 'text-ctl-xs'],
      why: 'every tone keeps the shared marker base and its control font size, which an unregistered suffix would lose to the tone colour',
    })),
  ],
  ArenaUnauthCard: [
    { slot: 'root', has: ['block', 'shadow-surface-deep', 'max-w-[calc(var(--sp-1)*95+var(--sp-1)*18+var(--bw-surface)*2)]'], why: 'the width is the derivation and never the literal it computes to' },
  ],
  ArenaAlert: [
    ...Object.entries({ info: 'info', success: 'success', warning: 'warning', danger: 'error', neutral: 'neutral' })
      .flatMap(([tone, family]) => [
        { chosen: { tone }, slot: 'root', has: [family === 'neutral' ? 'border-edge-surface-floating' : `border-${family}`], why: 'every tone colours its root, icon and action from the same status family, never the danger family; the neutral tone is the absence of one, so its edge is the floating surface role rather than a status colour' },
        { chosen: { tone }, slot: 'icon', has: [`text-${family}`], why: 'every tone colours its root, icon and action from the same status family, never the danger family' },
        { chosen: { tone }, slot: 'action', has: [`text-${family}`], why: 'every tone colours its root, icon and action from the same status family, never the danger family' },
      ]),
    { chosen: { tone: 'danger' }, slot: 'root', has: ['border-error', 'bg-error/14'], hasNot: ['bg-error'], why: 'danger is outline at a soft tint rather than the filled danger surface' },
    { slot: 'action', has: ['bg-transparent', 'border-none'], why: 'the close and action controls are text-only chrome, carrying no border or fill of their own' },
    { slot: 'close', has: ['bg-transparent', 'border-none'], why: 'the close and action controls are text-only chrome, carrying no border or fill of their own' },
    { chosen: { titled: true }, slot: 'message', has: ['mt-1'], why: 'the message carries the title-separating margin only when a title is present' },
  ],
  ArenaBottomNav: [
    { slot: 'root', has: ['pb-[var(--pad-safe-bottom)]'], why: 'the bar adds the safe-area inset to its own height rather than eating into the row' },
    { slot: 'root', has: ['flex'], why: 'a host-bound root is never the UA-default inline box' },
    { slot: 'item', has: ['flex-1', 'basis-0', 'min-w-0'], why: 'a column takes an equal share and a zero floor, so a long label cannot push its neighbours out of the bar' },
  ],
  ArenaBreadcrumbs: [
    { slot: 'root', has: ['flex'], why: 'a host-bound breadcrumbs trail has no other way to lay out' },
    { slot: 'current', has: ['font-bold', 'text-ink-body'], why: 'only the current crumb is bold and full-strength; a linked crumb stays muted' },
    { slot: 'crumb', has: ['text-ink-muted/(--level-ink-muted)', 'no-underline', 'cursor-pointer', 'hover:text-ink-body/(--level-ink-body)'], hasNot: ['font-bold'], why: 'a linked crumb stays muted, carries no underline, reads as a pointer target, and takes its hover as a state modifier rather than a variant' },
    { slot: 'separator', has: ['text-ink-muted/(--level-ink-muted)'], why: 'the mark between two crumbs is held back to the level a crumb already sits at, because the muted step is the faintest level that clears AA and a mark under it is a mark nobody sees' },
    { slot: 'crumb', has: ['font-face-label', 'text-trail', 'tracking-trail'], why: 'the trail register, which wears the label face and none of its case, and which default answers at the size and the narrow nav tracking a crumb already had' },
    { slot: 'current', has: ['font-face-label', 'text-trail', 'tracking-trail'], why: 'the same register at the last segment, which is the one drawn bold' },
  ],
  ArenaBulkActionBar: [
    { chosen: { open: true }, slot: 'root', has: ['flex'], why: 'the root carries a display utility in its own base string, independent of the open variant' },
    { slot: 'divider', has: ['w-px'], why: 'the divider uses the one-pixel utility rather than a border-width token, since it is not a border' },
  ],
  ArenaCommandPalette: [
    { chosen: { open: true }, slot: 'root', has: ['flex'], why: 'the root carries a display utility in its own base string, independent of the open variant' },
  ],
  ArenaConfirmDialog: [
    { chosen: { open: true }, slot: 'foot', has: ['flex-wrap'], why: 'the footer wraps the way ArenaDialog, ArenaPageHead and ArenaChartCard all do, and a third action row behaving differently is worse than none' },
    { chosen: { open: true }, slot: 'root', has: ['flex'], why: 'the root carries a display utility in its own base string, independent of the open variant' },
    { chosen: { invalid: true }, slot: 'input', has: ['border-error'], hasNot: ['border-edge-field'], why: 'invalid borders the require-text input in --error and drops the neutral border' },
    { chosen: { invalid: false }, slot: 'input', has: ['border-edge-field'], why: 'a valid require-text input keeps the neutral border' },
  ],
  ArenaDialog: [
    { chosen: { open: true }, slot: 'foot', has: ['flex-wrap'], why: 'the footer wraps because the consumer projects one control per element rather than a wrapper of their own' },
    { chosen: { open: true }, slot: 'scrim', has: ['z-modal'], why: 'the scrim sits on --z-modal, one slot below the nested confirmation it can raise' },
    { chosen: { open: true }, slot: 'panel', has: ['w-120'], why: 'the panel carries its own default width, so the width member is an override rather than a requirement' },
  ],
  ArenaGrid: [
    ...Object.entries({ none: 'gap-0', sm: 'gap-group', md: 'gap-component', lg: 'gap-section' })
      .map(([step, cls]) => ({ chosen: { gap: step }, slot: 'root', has: [cls], why: 'four named gap steps are four visible ones, none really is none, and the three that are not spend the page rhythm scale rather than a step this component picked off the grid' })),
    { chosen: { centred: true }, slot: 'root', has: ['mx-auto'], why: 'centred caps the grid against its own maximum and centres what is left' },
    { chosen: { centred: false }, slot: 'root', hasNot: ['mx-auto'], why: 'without it the grid fills its container' },
  ],
  ArenaEmptyState: [
    { slot: 'root', has: ['flex', 'border-dashed'], why: 'the dashed border is the visual distinction from an error state, whose border is solid' },
    { slot: 'action', has: ['mt-1.5'], why: 'the action slot carries the token spacing that separates a present action from the copy above it' },
  ],
  ArenaErrorState: [
    { slot: 'root', has: ['flex', 'border-error', 'bg-error/14'], hasNot: ['border-dashed', 'bg-error', 'bg-error-fill'], why: 'danger stays a soft resting tint here: this is a non-interactive status surface, not a risk trigger' },
    { slot: 'actions', has: ['mt-1.5'], why: 'the actions slot carries the token spacing that separates the row from the copy above it' },
  ],
  ArenaOnboarding: [
    { chosen: { open: true }, slot: 'root', has: ['block'], why: 'the root carries a display utility in its own base string, independent of the open variant' },
    { slot: 'dot', has: ['duration-[var(--dur-state)]'], why: 'the dot width transition rides the token duration scale, never a literal' },
  ],
  ArenaProgressBar: [
    ...Object.entries({ accent: 'text-primary', gold: 'text-secondary', success: 'text-success', danger: 'text-error', info: 'text-info' })
      .map(([tone, cls]) => ({ chosen: { tone }, slot: 'track', has: [cls], why: 'every tone inks the track, which is what the fill reads through bg-current' })),
    ...Object.entries({ sm: 'h-1', md: 'h-1.5', lg: 'h-2.5' })
      .map(([s, cls]) => ({ chosen: { size: s }, slot: 'track', has: [cls], why: 'size sets the track height and nothing else' })),
    { slot: 'fill', has: ['bg-current'], why: 'the fill reads the tone the track inks rather than naming a colour' },
    { chosen: { tone: 'danger' }, slot: 'track', has: ['text-error', 'bg-track'], hasNot: ['bg-error'], why: 'danger is a tone on the track, and the track stays the neutral rail whatever the tone, which is a role a style plugin answers rather than a palette step this slot names' },
    { slot: 'indeterminate', has: ['arena-prog-indeterminate'], why: 'the sweep is a shared animation utility, so no layer injects keyframes of its own' },
    { slot: 'track', has: ['overflow-hidden', 'rounded-pill'], hasNot: ['rounded-full'], why: 'the track clips its own fill and takes the pill radius' },
    { slot: 'root', has: ['grid', 'w-full'], why: 'w-full on an inline host does nothing, since an unknown element defaults to display inline, and the bar stacks its head over its track' },
    { chosen: { shape: 'radial' }, slot: 'root', has: ['grid', 'w-fit'], hasNot: ['w-full'], why: 'a ring is as wide as it is tall, so the root shrinks to it rather than filling the row the way a bar does' },
    ...Object.entries({ sm: 'size-12', md: 'size-16', lg: 'size-24' })
      .map(([s, cls]) => ({ chosen: { shape: 'radial', size: s }, slot: 'ring', has: [cls], why: 'size sets the ring diameter the way it sets the track height' })),
    { chosen: { tone: 'danger' }, slot: 'ring', has: ['text-error'], why: 'every tone inks the ring, which is what the arc reads through stroke-current' },
    { slot: 'ringFill', has: ['stroke-current', '[stroke-dasharray:100]'], why: 'the arc reads the tone the ring inks, and its length is hundredths of the path, so the percentage is the offset and the radius is free' },
    { slot: 'ringIndeterminate', has: ['arena-prog-ring'], why: 'the turn is a shared animation utility, so no layer injects keyframes of its own' },
  ],
  ArenaSpinner: [
    ...Object.entries({ accent: 'text-primary', gold: 'text-secondary', neutral: 'text-ink-muted/(--level-ink-muted)', 'on-accent': 'text-primary-content' })
      .map(([tone, cls]) => ({ chosen: { tone }, slot: 'root', has: [cls], why: 'tone colours the root and size sizes the circle, so neither axis reaches the other slot' })),
    ...Object.entries({ sm: 'size-icon-sm', md: 'size-5', lg: 'size-8' })
      .map(([s, cls]) => ({ chosen: { size: s }, slot: 'circle', has: [cls], why: 'tone colours the root and size sizes the circle, so neither axis reaches the other slot' })),
    { slot: 'circle', has: ['border-current', 'border-t-transparent', 'rounded-pill', 'arena-spinner'], hasNot: ['rounded-full'], why: 'the ring takes its colour from the root so one tone paints both, and its radius is the pill token' },
    { slot: 'root', has: ['inline-flex'], why: 'a host-bound root is never the UA-default inline box' },
  ],
  ArenaToast: [
    { chosen: { tone: 'danger' }, slot: 'action', has: ['text-secondary'], why: 'danger is the one tone whose action flips to the secondary ink, so it never sits crimson on crimson' },
    { chosen: { tone: 'neutral' }, slot: 'action', has: ['text-primary'], why: 'every other tone leaves the action on the brand ink' },
    { slot: 'root', has: ['flex', 'z-toast'], why: 'the root sits on --z-toast, the one slot above every other overlay' },
  ],
  ArenaTooltip: [
    ...[true, false].map((anchored) => ({ chosen: { anchored }, slot: 'bubble',
      has: ['arena-fade', 'z-tooltip', 'whitespace-nowrap', 'rounded-control', 'shadow-surface-floating', 'bg-base-content', 'text-base-100', 'font-mono', 'text-ctl-xs'],
      why: 'the appearance is identical in both models and only the position moves' })),
    { chosen: { anchored: false }, slot: 'root', has: ['relative', 'inline-flex'], why: 'in flow the bubble is positioned against a relative root' },
    { chosen: { anchored: true }, slot: 'root', has: ['inline-flex'], hasNot: ['relative'], why: 'anchored, the overlay pane owns the position and every wrapper-relative utility is gone' },
  ],
  ArenaButton: [
    { chosen: { variant: 'danger' }, slot: 'root', has: ['border-error', 'text-error', 'bg-transparent'], why: 'danger is outline: border and text in --error, and its only error fill is a hover wash' },
    { chosen: { variant: 'primary' }, slot: 'root', has: ['bg-primary', 'text-primary-content'], why: 'primary is the one filled variant, and it fills with the brand rather than a status colour' },
    ...['primary', 'secondary', 'ghost', 'danger'].map((variant) => ({
      chosen: { variant }, slot: 'root', has: ['rounded-control', 'inline-flex', 'h-ctl-h'],
      why: 'every variant keeps the shared control geometry through the merge',
    })),
    ...Object.entries({ sm: 'h-ctl-h-sm', md: 'h-ctl-h', lg: 'h-ctl-h-lg' })
      .map(([s, cls]) => ({ chosen: { size: s }, slot: 'root', has: [cls], why: 'each size keeps its own density height rather than merging into one' })),
    { chosen: { full: true }, slot: 'root', has: ['w-full'], why: 'full stretches to the container and its absence pins the width to the content' },
    { chosen: { full: false }, slot: 'root', has: ['w-auto'], why: 'full stretches to the container and its absence pins the width to the content' },
    { slot: 'spinner', has: ['arena-btn-spin'], why: 'the spinner slot carries the reduced-motion-aware utility, which is where that answer lives' },
  ],
  ArenaCheckbox: [
    { slot: 'box', has: ['[&:has(~input:focus-visible)]:shadow-[0_0_0_var(--focus-width)_var(--focus-ring)]'], why: 'the focus ring is a selector on the box, so nothing injects a stylesheet and no hook class survives, and it is the full-strength role because the accent at 16% is a wash rather than an edge' },
    { chosen: { checked: true }, slot: 'box', has: ['bg-primary', 'border-primary'], why: 'checked fills with the brand; unchecked is the input surface behind a neutral hairline' },
    { chosen: { checked: false }, slot: 'box', has: ['bg-base-300', 'border-edge-control'], why: 'checked fills with the brand; unchecked is the input surface behind a neutral hairline' },
    { chosen: { checked: true }, slot: 'check', has: ['text-primary-content'], why: 'the tick reads on the filled box, which is the one pairing that has to hold' },
    { chosen: { disabled: true }, slot: 'root', has: ['opacity-50', 'cursor-not-allowed'], why: 'disabled dims the whole control and takes the pointer away; enabled offers it' },
    { chosen: { disabled: false }, slot: 'root', has: ['cursor-pointer'], why: 'disabled dims the whole control and takes the pointer away; enabled offers it' },
    { slot: 'input', has: ['opacity-0', 'size-0'], hasNot: ['hidden'], why: 'the native input is hidden by the recipe rather than by display none, so it stays focusable' },
    ...[true, false].map((checked) => ({
      chosen: { checked }, slot: 'box', has: ['size-5', 'rounded-control-sm', 'inline-flex'],
      why: 'the box keeps its geometry through the merge, in both states',
    })),
  ],
  ArenaIconButton: [
    ...Object.entries({ sm: ['h-ctl-h-sm', 'min-w-ctl-h-sm'], md: ['h-ctl-h', 'min-w-ctl-h'], lg: ['h-ctl-h-lg', 'min-w-ctl-h-lg'] })
      .map(([size, has]) => ({ chosen: { size }, slot: 'root', has, why: 'each size keeps its own density height and a matching minimum width, so the box stays square' })),
    { chosen: { variant: 'ghost' }, slot: 'root', has: ['bg-transparent', 'border-edge-control-quiet'], why: 'ghost is transparent with a hairline; solid is the one filled variant, and it fills with the brand' },
    { chosen: { variant: 'solid' }, slot: 'root', has: ['bg-primary', 'text-primary-content'], why: 'ghost is transparent with a hairline; solid is the one filled variant, and it fills with the brand' },
    { chosen: { showLabel: true }, slot: 'root', has: ['w-auto', 'gap-control'], why: 'showLabel opens the box out and gives the glyph a gap; without it the control has neither' },
    { chosen: { showLabel: false }, slot: 'root', has: ['p-0', 'gap-0'], why: 'showLabel opens the box out and gives the glyph a gap; without it the control has neither' },
    { slot: 'root', has: ['disabled:opacity-45', 'disabled:cursor-not-allowed'], why: 'the disabled treatment is a :disabled variant, which only a real disabled control matches' },
  ],
  ArenaInput: [
    { chosen: { state: 'neutral' }, slot: 'field', has: ['focus-within:border-secondary'], why: 'neutral rings gold only on focus, where error and valid ring at rest and say which they are' },
    { chosen: { state: 'error' }, slot: 'field', has: ['border-error', 'ring-error/14'], why: 'error and valid ring at rest and say which they are, at the soft tint rather than full strength' },
    { chosen: { state: 'error' }, slot: 'statusIcon', has: ['text-error'], why: 'error and valid ring at rest and say which they are' },
    { chosen: { state: 'valid' }, slot: 'field', has: ['border-success', 'focus-within:border-secondary'], why: 'a valid field still takes the focus ring, because being valid is not being focused' },
    { chosen: { state: 'valid' }, slot: 'statusIcon', has: ['text-success'], why: 'error and valid ring at rest and say which they are' },
    { chosen: { disabled: true }, slot: 'root', has: ['opacity-50'], why: 'disabled dims the whole field group and readonly changes the surface, not the border' },
    { chosen: { readonly: true }, slot: 'field', has: ['bg-base-200'], why: 'disabled dims the whole field group and readonly changes the surface, not the border' },
    { chosen: { readonly: true }, slot: 'input', has: ['cursor-default'], why: 'disabled dims the whole field group and readonly changes the surface, not the border' },
    { slot: 'required', has: ['text-primary'], why: 'the required marker is the brand, so a label reads as required without the word' },
  ],
  ArenaRadio: [
    { slot: 'ring', has: ['[&:has(~input:focus-visible)]:shadow-[0_0_0_var(--focus-width)_var(--focus-ring)]'], why: 'the ring finds its own focus through an arbitrary variant, so nothing injects a stylesheet and no hook class survives, and it is the full-strength role because the accent at 16% is a wash rather than an edge' },
    { slot: 'group', has: ['flex', 'flex-col', 'gap-items'], why: 'the group is a column, and it is a display utility because the host binds it' },
  ],
  ArenaMenu: [
    { slot: 'root', has: ['inline-flex'], why: 'a host-bound root is never the UA-default inline box' },
    { chosen: { anchored: true }, slot: 'panel', hasNot: ['absolute', 'top-full', 'left-0', 'mt-1.5'], why: 'anchored, the CDK positions the pane, so every in-flow positioning class is gone' },
    { chosen: { anchored: true }, slot: 'root', hasNot: ['relative'], why: 'nothing is positioned against the host once the panel has left it' },
    { chosen: { anchored: false }, slot: 'panel', has: ['absolute', 'top-full', 'left-0', 'mt-1.5'], why: 'in flow, the panel positions itself against the host, which is the shape the specimen renders' },
  ],
  ArenaPageHead: [
    ...[true, false].map((narrow) => ({ chosen: { narrow }, slot: 'actions', has: ['flex-wrap'],
      why: 'three buttons at 390px overflow the page without it, and the row wraps its own children at every width' })),
    { chosen: { narrow: false }, slot: 'root', has: ['flex', 'flex-row', 'items-start'], hasNot: ['flex-col', 'items-stretch'], why: 'the wide layout is a row, and it is the default because nothing has been measured yet' },
    { chosen: { narrow: false }, slot: 'actions', has: ['w-auto'], hasNot: ['w-full'], why: 'the wide layout pins the actions to their content' },
    { chosen: { narrow: true }, slot: 'root', has: ['flex-col', 'items-stretch'], hasNot: ['flex-row', 'items-start'], why: 'below the breakpoint the row stacks and neither branch leaks the other direction' },
    { chosen: { narrow: true }, slot: 'actions', has: ['w-full'], hasNot: ['w-auto'], why: 'below the breakpoint the actions go full width' },
    { chosen: { align: 'center', narrow: false }, slot: 'root', has: ['items-center'], hasNot: ['items-start'], why: 'align centre, wide, centres the actions block against the title' },
  ],
  ArenaPagination: [
    { slot: 'root', has: ['inline-flex', 'items-center'], why: 'a host-bound root is never the UA-default inline box' },
    { slot: 'nav', has: ['disabled:text-ink-muted/40', 'disabled:cursor-not-allowed'], why: 'an unreachable step says so through a :disabled variant, which only a real disabled control matches' },
    { slot: 'pageCurrent', has: ['bg-primary', 'text-primary-content'], why: 'the current page is the one filled control in the row' },
    { slot: 'pageOther', has: ['bg-transparent'], hasNot: ['bg-primary'], why: 'the current page is the one filled control in the row' },
    { slot: 'page', has: ['h-ctl-h-sm', 'min-w-ctl-h-sm', 'border-[length:var(--bw-control)]'], why: 'the shared box is set once on the page slot, so a state slot never fights it, and it reads the density rather than a step, so a page number is a target a thumb can hit in the density chosen for one' },
  ],
  ArenaSegmentedControl: [
    { chosen: { selected: true }, slot: 'segment', has: ['bg-neutral', 'font-control', 'shadow-1'], why: 'the selected segment reads as a raised neutral chip rather than a brand fill' },
    { chosen: { selected: false }, slot: 'segment', has: ['bg-transparent', 'text-ink-muted/(--level-ink-muted)', 'hover:text-ink-body/(--level-ink-body)'], why: 'an unselected segment is muted and answers hover' },
    { slot: 'track', has: ['inline-flex', 'rounded-control', 'focus-within:border-secondary'], why: 'the track carries the focus ring for the group, since the native inputs are hidden' },
    { slot: 'segment', has: ['rounded-control-sm'], why: 'the segment radius is one step inside the track radius' },
    { slot: 'input', has: ['opacity-0', 'size-0'], hasNot: ['hidden'], why: 'the native input is hidden by the recipe rather than by display none, so it stays focusable' },
  ],
  ArenaSelect: [
    { slot: 'field', has: ['focus:border-secondary'], why: 'the focus ring is the recipe\'s job, not the component\'s, so nothing injects a stylesheet for it' },
    { slot: 'field', has: ['appearance-none', 'pr-9'], why: 'the field strips the platform chrome and reserves the room the caret Arena draws sits in' },
    { slot: 'root', has: ['flex'], why: 'a host-bound root is never the UA-default inline box' },
    { slot: 'caret', has: ['pointer-events-none'], why: 'the caret is decoration over the native control and must not swallow the click' },
    { slot: 'field', has: ['focus:border-secondary', 'focus:outline-none'], why: 'a select takes focus itself, so the ring is focus rather than focus-within' },
  ],
  ArenaSheet: [
    ...['bottom', 'start', 'end'].map((placement) => ({
      chosen: { placement, open: true }, slot: 'root', has: ['flex'],
      why: 'every placement keeps its display utility, since the host binds the root slot',
    })),
  ],
  ArenaSideNav: [
    ...['item', 'trigger'].map((slot) => ({ slot, has: ['flex', 'items-center', 'gap-items', 'py-2.5', 'rounded-control'],
      why: 'the trigger matches the item metrics, or a collapsible header will not line up with its siblings' })),
    { slot: 'root', has: ['flex', 'flex-col'], why: 'the rail is a column, and it is a display utility because the host binds it' },
  ],
  ArenaSwitch: [
    { chosen: { footprint: 'horizontal-md' }, slot: 'track', has: ['w-10', 'h-5.5'], why: 'a horizontal footprint is wider than it is tall, and the vertical one is its transpose' },
    { chosen: { footprint: 'vertical-md' }, slot: 'track', has: ['w-5.5', 'h-10'], why: 'a horizontal footprint is wider than it is tall, and the vertical one is its transpose' },
    { chosen: { thumb: 'on-horizontal' }, slot: 'knob', has: ['translate-x-full'], why: 'the knob travels along the axis its footprint names' },
    { chosen: { thumb: 'off-horizontal' }, slot: 'knob', has: ['translate-x-0'], why: 'the knob travels along the axis its footprint names' },
    { chosen: { thumb: 'on-vertical' }, slot: 'knob', has: ['translate-y-full'], why: 'the knob travels along the axis its footprint names' },
    { chosen: { thumb: 'off-vertical' }, slot: 'knob', has: ['translate-y-0'], why: 'the knob travels along the axis its footprint names' },
    { chosen: { checked: true }, slot: 'track', has: ['bg-primary'], why: 'on fills with the brand and off stays the neutral rail' },
    { chosen: { checked: false }, slot: 'track', has: ['bg-neutral'], why: 'on fills with the brand and off stays the neutral rail' },
    { slot: 'icon', has: ['text-primary'], why: 'the icon reads the brand ink on the knob' },
    { slot: 'knob', has: ['bg-primary-content'], why: 'the knob is the content colour against the filled track' },
    { chosen: { disabled: true }, slot: 'root', has: ['opacity-50'], why: 'disabled dims the whole control' },
  ],
  ArenaTabs: [
    { slot: 'root', has: ['flex', 'border-b-[length:var(--bw-separator)]', 'border-edge-separator'], why: 'the tablist sits on a hairline rule that the selected tab overdraws' },
    { chosen: { selected: true }, slot: 'tab', has: ['font-control', 'text-ink-body', 'shadow-[inset_0_calc(var(--bw-strong)*-1)_0_var(--crimson)]'], why: 'the selected tab is marked by an inset underline rather than a fill' },
    { chosen: { selected: false }, slot: 'tab', has: ['font-medium', 'text-ink-muted/(--level-ink-muted)', 'shadow-none'], why: 'an unselected tab is muted and carries no underline' },
    { slot: 'tab', has: ['px-4', 'focus-visible:outline-none'], why: 'selection never moves the padding, and a directly focused slot removes the browser\'s own outline or that is what a keyboard user sees instead of Arena\'s' },
    {
      slot: 'tab',
      has: ['focus-visible:ring-[length:var(--focus-width)]', 'focus-visible:ring-[color:var(--focus-ring)]'],
      why: 'the ring is a ring utility rather than a shadow one, for the reason the tab focus-ring test in this file carries',
    },
    { chosen: { selected: true }, slot: 'panel', has: ['block'], hasNot: ['hidden'], why: 'exactly one panel is shown, and the other is hidden rather than merely unstyled' },
    { chosen: { selected: false }, slot: 'panel', has: ['hidden'], hasNot: ['block'], why: 'exactly one panel is shown, and the other is hidden rather than merely unstyled' },
  ],
  ArenaTextarea: [
    { slot: 'field', has: ['focus:border-secondary'], why: 'the focus ring is the recipe\'s job, not the component\'s, so nothing injects a stylesheet for it' },
    { chosen: { state: 'neutral' }, slot: 'field', has: ['focus:border-secondary'], hasNot: ['border-success'], why: 'a textarea takes focus itself, so its ring is focus rather than focus-within' },
    { chosen: { state: 'error' }, slot: 'field', has: ['border-error', 'ring-error/14'], hasNot: ['border-success'], why: 'error rings at rest and says which it is' },
    { chosen: { resize: 'vertical' }, slot: 'field', has: ['resize-y'], why: 'resize is the consumer\'s choice and the recipe carries both answers' },
    { chosen: { resize: 'none' }, slot: 'field', has: ['resize-none'], why: 'resize is the consumer\'s choice and the recipe carries both answers' },
    { chosen: { disabled: true }, slot: 'root', has: ['opacity-50'], why: 'disabled dims the whole field group' },
    { chosen: { readonly: true }, slot: 'field', has: ['bg-base-200', 'cursor-default'], why: 'readonly changes the surface, not the border' },
    { slot: 'counter', has: ['font-mono', 'text-ink-muted/(--level-ink-muted)'], why: 'the counter is a muted mono readout' },
    { slot: 'counterNear', has: ['text-warning'], why: 'the counter warns before it refuses, which is a status colour and not a danger one' },
    { slot: 'foot', has: ['justify-between'], why: 'the foot spaces the help text and the counter to opposite ends' },
  ],
  ArenaBadge: [
    { slot: 'dot', has: ['bg-current'], why: 'the dot takes the tone ink from the text colour around it rather than naming one' },
    ...['neutral', 'accent', 'gold', 'success', 'warning', 'danger', 'info'].map((tone) => ({
      chosen: { tone }, slot: 'root', has: ['rounded-marker', 'font-face-label', 'case-label', 'text-ctl-xs', 'tracking-label-role'],
      why: 'every tone keeps the shared chip base, the marker radius roles.json gives a badge, and the mono uppercase micro-label',
    })),
  ],
};

test('every slot that takes a placeholder colours it, rather than inheriting preflight', () => {
  const wanted = 'placeholder:text-ink-muted/(--level-ink-muted)';
  for (const [component, slot] of [
    ['ArenaInput', 'input'],
    ['ArenaTextarea', 'field'],
    ['ArenaCommandPalette', 'input'],
  ] as const) {
    assert.ok(resolve(component, {}, slot).includes(wanted),
      `${component}.${slot} takes a placeholder and colours none, so Tailwind's preflight paints `
      + 'it at 50% of currentcolor: a level nothing in Arena declared, nothing measures, and one '
      + 'that fails AA on six of the ten palettes measured, this skin\'s own light theme included');
  }
});
