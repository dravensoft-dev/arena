/* What each manifest MEANS: which tone paints which token, which size is which height, which
 * branch a responsive layout takes. Every claim here was asserted inside a layer suite against
 * the class string a recipe resolved, in both layers, about the same one manifest. A component
 * renders its own class names now, so a layer suite can no longer see a utility, and Angular
 * may not import a manifest to look: that is the edge this whole change removes. So the claims
 * live once, beside the manifests, resolved through classesFor, the function the compiler applies,
 * which concatenates a slot's base and each chosen branch and never merges. */

import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { classesFor } from '../../../frameworks/tailwind/ManifestClasses.js';
import { escapeClass, layerManifests } from '../../lib/tailwind/tailwind-compile.ts';
import { markupDeclarations } from '../../lib/tailwind/vocabulary.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { readJson } from '../../utils/read-file.ts';

const manifests = new Map([...layerManifests().values()].map((m) => [m.component, m]));

export function resolve(component: string, chosen: Record<string, string | boolean>, slot: string) {
  const manifest = manifests.get(component);
  if (!manifest) throw new Error(`manifest-claims: no manifest called ${component}`);
  const slots = classesFor(manifest, chosen) as Record<string, string>;
  if (!(slot in slots)) throw new Error(`manifest-claims: ${component} has no slot called ${slot}`);
  return slots[slot]!.split(/\s+/).filter(Boolean);
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

const HUES = {
  ArenaActivityFeed: { tone: { success: 'success', warning: 'warning', danger: 'danger', info: 'info' } },
  ArenaAvatar: { status: { online: 'success', busy: 'danger', away: 'warning' } },
  ArenaBadge: { tone: { success: 'success', warning: 'warning', danger: 'danger', info: 'info' } },
  ArenaStatCard: { tone: { success: 'success', warning: 'warning', danger: 'danger', info: 'info' }, deltaTone: { positive: 'success', negative: 'danger' } },
  ArenaTag: { tone: { success: 'success', warning: 'warning', danger: 'danger' } },
  ArenaAlert: { tone: { info: 'info', success: 'success', warning: 'warning', danger: 'danger' } },
  ArenaConfirmDialog: { destructive: { true: 'danger' } },
  ArenaProgressBar: { tone: { success: 'success', danger: 'danger', info: 'info' } },
  ArenaToast: { tone: { success: 'success', danger: 'danger' } },
  ArenaButton: { destructive: { true: 'danger' } },
  ArenaInput: { state: { error: 'danger', valid: 'success' } },
  ArenaSelect: { state: { error: 'danger', valid: 'success' } },
  ArenaTextarea: { state: { error: 'danger' }, near: { true: 'warning' } },
  ArenaBulkActionBar: { destructive: { true: 'danger' } },
  ArenaMenu: { destructive: { true: 'danger' } },
} as Record<string, Record<string, Record<string, string>>>;

test('every status value maps to its own hue, and a neutral or editorial value to none', () => {
  for (const [component, groups] of Object.entries(HUES)) {
    const manifest = manifests.get(component);
    assert.ok(manifest, `HUES names ${component}, which is no manifest`);
    for (const [group, values] of Object.entries(groups)) {
      for (const [value, hue] of Object.entries(values))
        assert.equal(manifest.hues?.[group]?.[value], hue, `${component}.hues.${group}.${value} is not ${hue}`);
      for (const [value, hue] of Object.entries(manifest.hues?.[group] ?? {})) {
        if (value === 'on' || hue === null) continue;
        assert.equal(values[value], hue, `${component}.hues.${group}.${value} maps to ${String(hue)}, which no claim here states`);
      }
    }
  }
  for (const [component, group, values] of [
    ['ArenaAlert', 'tone', ['neutral']], ['ArenaBadge', 'tone', ['neutral']],
    ['ArenaToast', 'tone', ['neutral']], ['ArenaAvatar', 'status', ['none', 'offline']],
    ['ArenaConfirmDialog', 'destructive', ['false']], ['ArenaTextarea', 'near', ['false']], ['ArenaTag', 'tone', ['neutral']],
  ] as [string, string, string[]][])
    for (const value of values)
      assert.equal(manifests.get(component)?.hues?.[group]?.[value], null, `${component}.hues.${group}.${value} is not mapped to no hue`);
});

const ALWAYS_HUES = {
  ArenaErrorState: { root: 'danger', icon: 'danger' },
  ArenaInput: { error: 'danger' },
  ArenaSelect: { error: 'danger' },
  ArenaTextarea: { error: 'danger' },
  ArenaConfirmDialog: { input: 'danger' },
} as Record<string, Record<string, string>>;

test('a slot whose meaning no value varies names its hue under always, and no other manifest does', () => {
  for (const manifest of manifests.values())
    assert.deepEqual(manifest.hues?.always ?? {}, ALWAYS_HUES[manifest.component] ?? {}, `${manifest.component}.hues.always is not what ALWAYS_HUES states`);
});

test('every manifest claim holds', () => {
  const problems = claimProblems(CLAIMS as unknown as Record<string, Claim[]>);
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('the band ceiling compiles to the declaration the band family gives .arena-band', () => {
  const declaration = (css: string, selector: string) => {
    const at = css.indexOf(`${selector} {`);
    assert.ok(at !== -1, `no rule for ${selector}`);
    const body = css.slice(at, css.indexOf('}', at));
    return body.match(/padding-inline:\s*([^;]+);/)?.[1]?.trim().replace(/\s+/g, '');
  };
  const family = readJson(join(repoRoot, 'frameworks/tailwind/vocabulary/arena-band/Band.family.json')) as any;
  const familyValue = Object.fromEntries(markupDeclarations(family.variants['arena-band']))['padding-inline']?.replace(/\s+/g, '');
  const utility = declaration(
    readFileSync(join(repoRoot, 'frameworks/tailwind/Utilities.generated.css'), 'utf8'),
    `.${escapeClass(BAND_CEILING)}`,
  );
  assert.ok(familyValue, '.arena-band family carries no padding-inline');
  assert.equal(utility, familyValue,
    'the app bar and the site footer stand off the edge by a different inset than the page column, '
    + 'so their contents stop lining up with it below the width where the ceiling binds');
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

test('selection never moves the tab padding', () => {
  const padding = (selected: boolean) => resolve('ArenaTabs', { selected }, 'tab').filter((cls) => /^p[xy]?-/.test(cls));
  assert.deepEqual(padding(true), padding(false),
    'a tab that changed its padding when selected would shift every tab beside it');
});

const SIDE_NAV_INSET = 'ps-[calc(var(--pad-row-x)*var(--dz-row-scale-x)+var(--pad-row-indent)*var(--arena-side-nav-depth,0))]';

test('every ArenaSideNav slot that indents carries the depth inset while expanded and none while collapsed', () => {
  for (const slot of ['item', 'trigger', 'sectionLabel']) {
    const expanded = resolve('ArenaSideNav', { collapsed: false }, slot).filter((cls) => cls.startsWith('ps-['));
    assert.deepEqual(expanded, [SIDE_NAV_INSET], `${slot} carries ${expanded.join(' ') || 'no inset'} while expanded`);
  }
  for (const slot of ['item', 'sectionLabel']) {
    const collapsed = resolve('ArenaSideNav', { collapsed: true }, slot).filter((cls) => cls.startsWith('ps-['));
    assert.deepEqual(collapsed, [], `${slot} carries ${collapsed.join(' ')} while collapsed`);
  }
});

const BAND_CEILING = 'px-[min(var(--gutter),7%)]';

const INK = 'text-[color:var(--arena-hue-ink)]';
const EDGE = 'border-[color:var(--arena-hue-edge)]';
const SOFT = 'bg-[color:var(--arena-hue-fill-soft)]';
const STRONG = 'bg-[color:var(--arena-hue-fill-strong)]';
const STRONG_INK = 'text-[color:var(--arena-hue-fill-strong)]';
const FILLED_WHY = 'a solid status fill reads the strong fill channel, and danger, whose strong fill is closed to transparent, keeps the mark through its ink';
const STATUS = ['success', 'warning', 'danger', 'info'];
const HUE_WHY = 'a status colour is a read of the hue channel the hue sheet writes on this slot, so the style plugin that answers the hue roles moves every surface wearing it';
const hueClaims = (slot: string, tones: Record<string, string[]>, group = 'tone') =>
  Object.entries(tones).map(([tone, has]) => ({ chosen: { [group]: tone }, slot, has, why: HUE_WHY }));

export const CLAIMS = {
  ArenaSection: [
    { slot: 'title', has: ['text-title-section'], hasNot: ['text-h1', 'text-h2', 'text-h3', 'text-h4'], why: 'a scale step here is a title no style plugin can re-pitch, which is the defect the role tier exists to prevent' },
    { slot: 'head', has: ['flex-wrap', 'items-baseline', 'justify-between'], why: 'the head puts its action at the far end on the title\'s own baseline, and wraps rather than squeezing' },
    { slot: 'root', has: ['gap-[var(--arena-rhythm-gap,var(--arena-rhythm,var(--rhythm-component)))]'], why: 'the distance is read from the rhythm family\'s channel, then from its axis, then from the component step, and never a length this manifest chose' },
  ],
  ArenaSiteFooter: [
    { slot: 'band', has: [BAND_CEILING], hasNot: ['px-gutter'],
      why: 'the footer\'s columns line up with the page column above them only if they stand off the edge by the same ceiling .arena-band does' },
  ],
  ArenaScroller: [
    { slot: 'root', has: ['overflow-x-auto'], hasNot: ['overflow-y-auto', 'overflow-y-scroll'], why: 'a row that scrolls downwards as well is a grid nobody asked for' },
    { slot: 'root', hasNot: ['*:basis-[var(--arena-scroller-item-width,var(--arena-scroller-item,var(--scroller-item-md)))]', '*:shrink-0', '*:snap-start'], why: 'a rule aimed at the row\'s own children lands on an element with no box wherever that child takes its host out of layout, so the width and the snap point sit on ArenaScrollerItem, which has one in both layers' },
    { chosen: { behaviour: 'snap' }, slot: 'root', has: ['snap-x'], why: 'snap lands on an item, and the axis is the half the row owns' },
    { chosen: { behaviour: 'flow' }, slot: 'root', hasNot: ['snap-x'], why: 'flow lands wherever the reader left it, which is the whole difference between the two' },
    { chosen: { behaviour: 'snap' }, slot: 'root', hasNot: ['animate-spin', 'animate-pulse'], why: 'a row that moved on its own would owe a pause control under WCAG 2.2.2, and neither behaviour moves' },
  ],
  ArenaFigure: [
    { slot: 'frame', has: ['rounded-media', 'overflow-hidden', 'bg-surface-sunken'], hasNot: ['rounded-surface', 'rounded-lg'], why: 'a figure is the thing being looked at rather than a container the reader looks past, so its corner is its own role and not the surface one' },
    { slot: 'media', has: ['[&>img]:fit-media', '[&>video]:fit-media'], why: 'how the picture meets the frame is a role, and it is scoped to the media box so an image in the overlay or the fallback is not cropped with it' },
    { slot: 'overlay', has: ['bg-overlay-media/72'], why: 'the wash is a colour role with the opacity in the manifest, so which colour and how held back stay two decisions and the contrast is measurable' },
    { slot: 'frame', has: ['aspect-[var(--arena-ratio-frame,var(--arena-ratio,var(--aspect-media)))]'], hasNot: ['aspect-square', 'aspect-video'], why: 'the shape is read from the ratio family\'s channel, then its axis, then the media role, because a consumer pinning a video is answering about one figure and not about the appearance' },
  ],
  ArenaHero: [
    { slot: 'title', has: ['text-title-hero'], hasNot: ['text-display', 'text-hero', 'text-h1'], why: 'the top rung of the title ladder is a role, so a style plugin re-pitches a hero with the three registers under it rather than around them' },
    { slot: 'lede', has: ['max-w-prose'], why: 'a line that runs the whole width of a hero loses its return sweep, and the reading width is the role that already answers how long a line may be' },
    { slot: 'words', has: ['col-start-[var(--arena-layout-place,auto)]', 'row-start-[var(--arena-layout-place,auto)]', '[align-items:var(--arena-align-items,flex-start)]'], why: 'bleed lays the words ON the figure, which is one grid cell carrying both, and the layout writes that cell as a channel the words and the figure both read' },
    { slot: 'root', has: ['[grid-template-columns:var(--arena-layout-cols,repeat(auto-fit,minmax(min(calc(var(--grid-min)*1.5),100%),1fr)))]'], hasNot: ['grid-cols-1', 'py-section'], why: 'split is the only layout whose track list comes from the room, so the tracks are the fallback of the channel and no other layout is a class on the root' },
  ],
  ArenaBoard: [
    { slot: 'root', has: ['auto-cols-[minmax(var(--arena-board-column-width,var(--arena-board-column,var(--board-column-md))),1fr)]'], why: 'the columns share the room equally above the narrowest width the board-column family names, read from its channel, then its axis, then the medium step, so a board of four fills and a board of twelve scrolls' },
  ],
  ArenaScrollerItem: [
    { slot: 'root', has: ['basis-[var(--arena-scroller-item-width,var(--arena-scroller-item,var(--scroller-item-md)))]', 'shrink-0', 'grow-0', 'snap-start'], why: 'the cell is the box the row sizes and settles on, and it carries both on itself rather than inheriting either from a rule aimed at somebody else\'s children' },
    { slot: 'root', hasNot: ['bg-surface', 'border-edge-surface', 'p-surface'], why: 'the cell draws no surface, no line and no padding: everything visible in it is what was put inside' },
  ],
  ArenaAppLogo: [
    { slot: 'mark', has: ['*:w-full', '*:h-full', '*:block'], why: 'the mark slot stretches its projected child rather than sizing it' },
  ],
  ArenaChartCard: [
    { slot: 'root', has: ['flex', 'bg-surface', 'border-[length:var(--bw-surface)]', 'border-edge-surface', 'rounded-surface'], why: 'a chart tile is a bordered tile off the surface scale, not a heading-bearing panel' },
    { slot: 'title', has: ['font-face-label', 'case-label', 'tracking-label-role'], hasNot: ['font-display', 'text-h1', 'text-h2', 'text-h3', 'text-h4'], why: 'a microlabel carries neither the display font nor a heading size, which would fabricate a document outline' },
    { slot: 'head', has: ['justify-between', 'items-center', 'flex-wrap'], why: 'the head row spaces title and actions to opposite ends and wraps, since the slot projects one element per control' },
  ],
  ArenaActivityFeed: [
    { slot: 'dot', has: ['bg-current'], hasNot: ['bg-error', 'bg-success', 'bg-warning', 'bg-info', 'bg-primary', 'bg-secondary'], why: 'the dot carries the tone as a colour, never as a fill of its own' },
    ...['success', 'warning', 'info'].map((tone) => ({ chosen: { tone }, slot: 'dot', has: [STRONG_INK], hasNot: [INK], why: FILLED_WHY })),
    { chosen: { tone: 'danger' }, slot: 'dot', has: [INK], hasNot: [STRONG_INK], why: FILLED_WHY },
    { chosen: { divided: true }, slot: 'item', has: ['border-t-[length:var(--bw-separator)]'], why: 'divided draws the rule between rows' },
    { chosen: { divided: false }, slot: 'item', has: ['border-t-0'], why: 'the first row carries no divider above it' },
  ],
  ArenaAvatar: [
    { chosen: { kind: 'person' }, slot: 'box', has: ['rounded-pill'], why: 'a person is drawn as a circle and a team as a rounded square, so the two read apart' },
    { chosen: { kind: 'team' }, slot: 'box', has: ['rounded-md'], why: 'a person is drawn as a circle and a team as a rounded square, so the two read apart' },
    ...['online', 'away'].map((status) => ({
      chosen: { status }, slot: 'status', has: [STRONG], hasNot: ['bg-success', 'bg-warning', 'bg-[color:var(--arena-hue-ink)]'],
      why: 'a live presence dot is a solid fill, so it reads the strong fill channel of its status hue',
    })),
    { chosen: { status: 'busy' }, slot: 'status', has: ['bg-[color:var(--arena-hue-ink)]'], hasNot: ['bg-error', STRONG],
      why: 'a busy dot is filled with the ink of the danger hue, whose strong fill is closed to transparent, which is how it still shows' },
    { chosen: { status: 'offline' }, slot: 'status', has: ['bg-base-content/(--level-presence)'], why: 'a presence tone maps to the status colour taxonomy, never to a series colour' },
    { slot: 'image', has: ['w-full', 'h-full', 'object-cover'], why: 'the image fills the box and crops to it, so a non-square source never distorts' },
  ],
  ArenaCard: [
    { slot: 'root', has: ['block', 'bg-surface'], hasNot: ['bg-base-200'], why: 'the card names WHICH surface it is rather than which step of the scale, so a style plugin can flatten it onto the page, and it is never a zero-area inline box' },
    { slot: 'root', hasNot: ['border-primary', 'border-edge-surface', 'shadow-surface-rest', 'shadow-surface-floating', 'shadow-none'], why: 'the edge colour and the depth are the accent and elevation channels, so no accent, no resting shadow and no lifted one is a class of this manifest any more' },
    { slot: 'eyebrow', has: ['font-face-eyebrow', 'case-eyebrow', 'text-ink-eyebrow'], why: 'the eyebrow is the accent mono micro-label above the display-weight title' },
    { slot: 'title', has: ['font-face-heading', 'text-title-surface'], why: 'the eyebrow is the accent mono micro-label above the display-weight title' },
  ],
  ArenaSkeleton: [
    { slot: 'root', has: ['arena-shimmer', 'w-[var(--arena-skeleton-box-width,var(--arena-skeleton-width,100%))]'], hasNot: ['hidden'], why: 'the box reads its width, height and corner from the channels the shape option sets, each falling back to the block option\'s written value' },
    { slot: 'stack', has: ['flex-col', 'w-[var(--arena-skeleton-width,100%)]'], why: 'a stack of lines is a column that reads the width property directly, and decides its own tree by lines rather than by a shape class' },
    { chosen: { last: false }, slot: 'line', has: ['w-full'], hasNot: ['w-[62%]'], why: 'a full line runs the whole width and only the closing one runs short' },
    { chosen: { last: true }, slot: 'line', has: ['w-[62%]'], why: 'the last line is narrower than the rest, the way a paragraph ends' },
  ],
  ArenaStatCard: [
    ...['success', 'warning', 'danger', 'info'].map((tone) => ({ chosen: { tone }, slot: 'value', has: [INK], why: 'every status value tone inks the figure from its hue, and the tone class follows the accent read in the string, so the status is the one that wins' })),
    { chosen: { tone: 'neutral' }, slot: 'value', hasNot: [INK, 'text-ink-body'], why: 'a neutral figure states no status, so the accent channel inks it and the tone adds no class' },
    { chosen: { tone: 'danger' }, slot: 'value', has: [INK], hasNot: ['bg-error'], why: 'a danger value tone colours text only, so the value slot carries no background' },
    { chosen: { tone: 'danger', deltaTone: 'positive' }, slot: 'delta', has: [EDGE, INK], why: 'tone and deltaTone are independent, which is why the contract declares them separately' },
    { chosen: { deltaTone: 'negative' }, slot: 'delta', has: [EDGE, INK, 'bg-transparent'], hasNot: ['bg-error'], why: 'a negative delta is outline: border and text in the danger hue, never a filled background' },
    { chosen: { deltaTone: 'positive' }, slot: 'delta', has: [EDGE, INK], hasNot: ['border-error', 'text-error'], why: 'a positive delta reads the success hue, not the danger family' },
    { chosen: { deltaTone: 'neutral' }, slot: 'delta', has: ['rounded-marker'], why: 'every delta tone keeps the shared marker base, which is the corner roles.json gives a delta badge' },
  ],
  ArenaTable: [
    ...['th', 'td'].map((slot) => ({
      slot, has: ['outline-none', 'focus:shadow-[inset_0_0_0_var(--focus-width)_var(--focus-ring)]'],
      why: 'a cell draws its focus ring from the focus tokens and suppresses the UA outline, or a keyboard user cannot see where the cursor is',
    })),
    { chosen: { numeric: true }, slot: 'td', has: ['font-mono', 'tabular-nums'], hasNot: ['font-body'], why: 'a figure column aligns by digit, and the figure treatment replaces the prose face rather than stacking on it' },
    { chosen: { numeric: false }, slot: 'td', has: ['font-body'], hasNot: ['font-mono'], why: 'a prose column keeps the body face' },
    { slot: 'root', has: ['block'], why: 'a host-bound root is never the UA-default inline box' },
    { chosen: { narrow: false }, slot: 'root', has: ['rounded-surface', 'overflow-hidden'], hasNot: ['flex-col'], why: 'the wide shape is the framed grid, and it is the default because nothing has been measured yet' },
    { chosen: { narrow: false }, slot: 'grid', has: ['table'], why: 'the wide shape is the framed grid' },
    { chosen: { narrow: true }, slot: 'root', has: ['flex', 'flex-col'], hasNot: ['rounded-surface', 'overflow-hidden'], why: 'below the breakpoint the frame goes away and the rows become a stack of cards' },
    { chosen: { narrow: true }, slot: 'grid', has: ['table', 'contents'], why: 'below the breakpoint the frame goes away and the rows become a stack of cards: the base table and the branch contents are both present and the branch is emitted later' },
    { slot: 'headRow', has: ['table-row'], why: 'a row and a cell need the table display utilities to work as custom-element hosts' },
    { slot: 'row', has: ['table-row'], why: 'a row and a cell need the table display utilities to work as custom-element hosts' },
    { slot: 'th', has: ['table-cell'], why: 'a row and a cell need the table display utilities to work as custom-element hosts' },
    { slot: 'td', has: ['table-cell'], why: 'a row and a cell need the table display utilities to work as custom-element hosts' },
  ],
  ArenaTag: [
    { chosen: { tone: 'danger' }, slot: 'root', has: [EDGE, INK], hasNot: ['bg-error'], why: 'danger is outline: border and text in the danger hue, never a filled background' },
    ...hueClaims('root', Object.fromEntries(['success', 'warning'].map((tone) => [tone, [EDGE, INK]]))),
    ...[1, 2, 3, 4, 5, 6, 7, 8].map((id) => ({ chosen: { colorId: String(id) }, slot: 'root', has: [EDGE, INK], why: HUE_WHY })),
    { chosen: { tone: 'neutral' }, slot: 'root', hasNot: [EDGE, INK, 'border-edge-surface', 'text-ink-body/(--level-ink-quiet)', 'border-primary', 'text-primary'], why: 'a neutral tag states no status, so the accent channels paint its edge and its ink and the tone adds no class' },
    ...['neutral', 'success', 'warning', 'danger'].map((tone) => ({
      chosen: { tone }, slot: 'root', has: ['rounded-marker', 'text-ctl-xs'],
      why: 'every tone keeps the shared marker base and its control font size, which an unregistered suffix would lose to the tone colour',
    })),
  ],
  ArenaUnauthCard: [
    { slot: 'root', has: ['block', 'shadow-surface-deep', 'max-w-[calc(var(--sp-1)*95+var(--sp-1)*18+var(--bw-surface)*2)]'], why: 'the width is the derivation and never the literal it computes to' },
  ],
  ArenaAlert: [
    ...STATUS.flatMap((tone) => [
      { chosen: { tone }, slot: 'root', has: [SOFT, EDGE], hasNot: ['bg-error', 'bg-error-fill'], why: 'every status tone colours its root from the hue channels, as a soft wash and an edge, never as the filled danger surface' },
      { chosen: { tone }, slot: 'icon', has: [INK], why: HUE_WHY },
      { chosen: { tone }, slot: 'action', has: [INK], why: HUE_WHY },
    ]),
    { chosen: { tone: 'neutral' }, slot: 'root', has: ['border-edge-surface-floating'], hasNot: [SOFT, EDGE], why: 'the neutral tone is the absence of a hue, so its edge is the floating surface role rather than a status colour' },
    { chosen: { tone: 'neutral' }, slot: 'icon', has: ['text-neutral'], hasNot: [INK], why: 'the neutral tone is the absence of a hue, so its icon is the neutral ink' },
    { slot: 'action', has: ['bg-transparent', 'border-none'], why: 'the close and action controls are text-only chrome, carrying no border or fill of their own' },
    { slot: 'close', has: ['bg-transparent', 'border-none'], why: 'the close and action controls are text-only chrome, carrying no border or fill of their own' },
    { chosen: { titled: true }, slot: 'message', has: ['mt-1'], why: 'the message carries the title-separating margin only when a title is present' },
  ],
  ArenaAppBar: [
    { slot: 'band', has: [BAND_CEILING], hasNot: ['px-gutter'],
      why: 'the bar\'s contents line up with the page column under it only if they stand off the edge by the same ceiling .arena-band does' },
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
    { chosen: { destructive: true }, slot: 'action', has: [EDGE, INK], why: HUE_WHY },
    { chosen: { destructive: false }, slot: 'action', hasNot: [EDGE, INK], why: 'a quiet action is the absence of a hue' },
    { chosen: { open: true }, slot: 'root', has: ['flex'], why: 'the root carries a display utility in its own base string, independent of the open variant' },
    { slot: 'divider', has: ['w-px'], why: 'the divider uses the one-pixel utility rather than a border-width token, since it is not a border' },
  ],
  ArenaCommandPalette: [
    { chosen: { open: true }, slot: 'root', has: ['flex'], why: 'the root carries a display utility in its own base string, independent of the open variant' },
  ],
  ArenaConfirmDialog: [
    { chosen: { destructive: true }, slot: 'eyebrow', has: [INK], why: HUE_WHY },
    { chosen: { destructive: true }, slot: 'confirm', has: ['bg-confirm-final', 'text-ink-confirm-final'], hasNot: ['bg-error', 'bg-error-fill', STRONG], why: 'the final confirmation is the one filled danger surface, and it reads the roles of its own rather than the danger hue, whose fill is closed to transparent' },
    { chosen: { destructive: false }, slot: 'confirm', has: ['bg-primary', 'text-primary-content'], hasNot: ['bg-confirm-final'], why: 'a confirmation that is not destructive fills with the brand' },
    { chosen: { open: true }, slot: 'foot', has: ['flex-wrap'], why: 'the footer wraps the way ArenaDialog, ArenaPageHead and ArenaChartCard all do, and a third action row behaving differently is worse than none' },
    { chosen: { open: true }, slot: 'root', has: ['flex'], why: 'the root carries a display utility in its own base string, independent of the open variant' },
    { slot: 'input', has: ['focus-visible:ring-[color:var(--arena-hue-edge)]'], hasNot: ['focus-visible:ring-error'], why: 'the require-text input confirms a destructive action, so its focus ring is the danger edge channel always gives this slot' },
    { chosen: { invalid: true }, slot: 'input', has: [EDGE], hasNot: ['border-error', 'border-edge-field'], why: 'invalid borders the require-text input in the danger edge channel and drops the neutral border' },
    { chosen: { invalid: false }, slot: 'input', has: ['border-edge-field'], why: 'a valid require-text input keeps the neutral border' },
  ],
  ArenaDialog: [
    { chosen: { open: true }, slot: 'foot', has: ['flex-wrap'], why: 'the footer wraps because the consumer projects one control per element rather than a wrapper of their own' },
    { chosen: { open: true }, slot: 'scrim', has: ['z-modal'], why: 'the scrim sits on --z-modal, one slot below the nested confirmation it can raise' },
    { chosen: { open: true }, slot: 'panel', has: ['w-[var(--arena-dialog-width-size,var(--arena-dialog-width,var(--dialog-width-md)))]'], why: 'the panel reads its width from the dialog-width family\'s channel, then its axis, then the medium step, so a dialog with no class and no property is the width the default names' },
  ],
  ArenaGrid: [
    { slot: 'root', has: ['gap-[var(--arena-grid-gap-size,var(--arena-grid-gap,var(--rhythm-component)))]'], why: 'the gap is read from the grid-gap family\'s channel, then from its axis, then from the component step, so the page rhythm scale is spent and not a step this component picked off the grid' },
    { slot: 'root', has: ['grid-cols-[repeat(auto-fill,minmax(min(var(--arena-grid-min-width,var(--arena-grid-min,var(--grid-min))),100%),1fr))]'], why: 'the track list is the same repeat(auto-fill, minmax(min(min, 100%), 1fr)) in every layer, with the minimum read from the grid-min family, so an unfilled row keeps its empty tracks' },
    { slot: 'root', has: ['max-w-[var(--arena-grid-max-width,var(--arena-grid-max,none))]', 'mx-auto'], why: 'a ceiling from the grid-max family centres what is left, and with none the grid fills its container' },
    { slot: 'root', has: ['content-start'], why: 'a grid given a height keeps its rows at their content height rather than stretching them to fill it' },
  ],
  ArenaEmptyState: [
    { slot: 'root', has: ['flex', 'border-dashed'], why: 'the dashed border is the visual distinction from an error state, whose border is solid' },
    { slot: 'action', has: ['mt-1.5'], why: 'the action slot carries the token spacing that separates a present action from the copy above it' },
  ],
  ArenaErrorState: [
    { slot: 'root', has: ['flex', EDGE, SOFT], hasNot: ['border-dashed', 'border-error', 'bg-error/14', 'bg-error', 'bg-error-fill', STRONG], why: 'danger stays a soft resting tint here, read from the hue channels always gives the slot: this is a non-interactive status surface, not a risk trigger' },
    { slot: 'icon', has: [INK], hasNot: ['text-error'], why: HUE_WHY },
    { slot: 'actions', has: ['mt-1.5'], why: 'the actions slot carries the token spacing that separates the row from the copy above it' },
  ],
  ArenaOnboarding: [
    { chosen: { open: true }, slot: 'root', has: ['block'], why: 'the root carries a display utility in its own base string, independent of the open variant' },
    { slot: 'dot', has: ['duration-[var(--dur-state)]'], why: 'the dot width transition rides the token duration scale, never a literal' },
  ],
  ArenaProgressBar: [
    ...Object.entries({ success: STRONG_INK, danger: INK, info: STRONG_INK })
      .map(([tone, cls]) => ({ chosen: { tone }, slot: 'track', has: [cls], why: 'every tone inks the track, which is what the fill reads through bg-current' })),
    { slot: 'fill', has: ['bg-current'], why: 'the fill reads the tone the track inks rather than naming a colour' },
    { chosen: { tone: 'danger' }, slot: 'track', has: [INK, 'bg-track'], hasNot: ['bg-error'], why: 'danger is a tone on the track, and the track stays the neutral rail whatever the tone, which is a role a style plugin answers rather than a palette step this slot names' },
    { chosen: { indeterminate: true }, slot: 'track', has: ['arena-prog-indeterminate'], why: 'the sweep is a shared animation utility, so no layer injects keyframes of its own' },
    { slot: 'track', has: ['overflow-hidden', 'rounded-pill'], hasNot: ['rounded-full'], why: 'the track clips its own fill and takes the pill radius' },
    { slot: 'root', has: ['grid', 'w-full'], why: 'w-full on an inline host does nothing, since an unknown element defaults to display inline, and the bar stacks its head over its track' },
    { chosen: { shape: 'radial' }, slot: 'root', has: ['grid', 'w-fit'], hasNot: ['w-full'], why: 'a ring is as wide as it is tall, so the root shrinks to it rather than filling the row the way a bar does' },
    { chosen: { tone: 'danger' }, slot: 'ring', has: [INK], why: 'every tone inks the ring, which is what the arc reads through stroke-current' },
    { slot: 'ringFill', has: ['stroke-current', '[stroke-dasharray:100]'], why: 'the arc reads the tone the ring inks, and its length is hundredths of the path, so the percentage is the offset and the radius is free' },
    { chosen: { indeterminate: true }, slot: 'ringFill', has: ['arena-prog-ring'], why: 'the turn is a shared animation utility, so no layer injects keyframes of its own' },
  ],
  ArenaSpinner: [
    { slot: 'root', hasNot: ['text-primary', 'text-secondary', 'text-primary-content', 'text-ink-muted/(--level-ink-muted)'], why: 'the ink of the ring is the accent channel, so no accent is a class of this manifest any more' },
    { slot: 'circle', has: ['border-current', 'border-t-transparent', 'rounded-pill', 'arena-spinner'], hasNot: ['rounded-full'], why: 'the ring takes its colour from the root so one tone paints both, and its radius is the pill token' },
    { slot: 'root', has: ['inline-flex'], why: 'a host-bound root is never the UA-default inline box' },
  ],
  ArenaToast: [
    ...['success', 'danger'].map((tone) => ({ chosen: { tone }, slot: 'root', has: ['border-l-[color:var(--arena-hue-edge)]'], why: HUE_WHY })),
    { chosen: { tone: 'success' }, slot: 'action', has: ['text-primary'], hasNot: [INK], why: 'every action but the danger one is the brand ink, an editorial choice rather than a hue' },
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
    { chosen: { destructive: true }, slot: 'root', has: [EDGE, INK, STRONG], hasNot: ['bg-error', 'bg-error-fill'], why: 'destructive is outline: border and text in the danger hue, and its fill channel is closed to transparent, so its only error fill is a hover wash' },
    { chosen: { destructive: true }, slot: 'root', has: ['hover:shadow-control-rest'], hasNot: ['hover:shadow-[var(--arena-emphasis-shadow-hover,var(--emphasis-primary-shadow-hover))]'],
      why: 'a destructive button never lifts on hover whatever its emphasis, because the raised hover shadow is the emphasis destructive does not govern' },
    { chosen: { destructive: false }, slot: 'root', has: ['hover:shadow-[var(--arena-emphasis-shadow-hover,var(--emphasis-primary-shadow-hover))]'],
      why: 'a button that states no meaning lifts as its emphasis says, through the emphasis channel, and the meaning branch is the only one that overrides it' },
    { chosen: { destructive: false }, slot: 'root', hasNot: ['bg-primary', 'bg-base-200', 'bg-transparent', 'text-primary-content', 'border-primary'],
      why: 'the fill, the ink and the edge are the emphasis channels, so no emphasis is a class of this manifest any more' },
    { slot: 'root', has: ['rounded-control', 'inline-flex'], why: 'the shared control geometry sits in the base, so every emphasis keeps it' },
    { slot: 'root', has: ['w-[var(--arena-fill-width,fit-content)]'], hasNot: ['w-auto', 'w-full', 'w-fit'], why: 'the width is the fill channel, which fits the content until a vocabulary class says otherwise, in a column as in a row' },
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
    { chosen: { pressed: false }, slot: 'root', has: ['hover:bg-[color:var(--arena-emphasis-fill-hover,var(--emphasis-ghost-fill-hover))]'],
      why: 'the hover fill is an emphasis read, and it sits in the unpressed branch so a pressed control keeps its own wash under the pointer' },
    { chosen: { pressed: true }, slot: 'root', has: ['bg-primary/14', 'hover:bg-primary/22'], hasNot: ['hover:bg-[color:var(--arena-emphasis-fill-hover,var(--emphasis-ghost-fill-hover))]'],
      why: 'a pressed control is a state of the control and states its own wash over any emphasis' },
    { chosen: { showLabel: true }, slot: 'root', has: ['w-[var(--arena-fill-width,fit-content)]', 'gap-control'], why: 'showLabel opens the box out to its label through the fill channel and gives the glyph a gap; without it the control has neither' },
    { chosen: { showLabel: false }, slot: 'root', has: ['p-0', 'gap-0'], why: 'showLabel opens the box out and gives the glyph a gap; without it the control has neither' },
    { slot: 'root', has: ['disabled:opacity-45', 'disabled:cursor-not-allowed'], why: 'the disabled treatment is a :disabled variant, which only a real disabled control matches' },
  ],
  ArenaInput: [
    { slot: 'error', has: [INK], hasNot: ['text-error'], why: 'the field error message reads the ink of the danger hue always gives its slot, so a plugin moving the danger ink moves the message with the ring' },
    { chosen: { state: 'neutral' }, slot: 'field', has: ['focus-within:border-secondary'], why: 'neutral rings gold only on focus, where error and valid ring at rest and say which they are' },
    { chosen: { state: 'error' }, slot: 'field', has: [EDGE, 'ring-[color:var(--arena-hue-fill-soft)]'], why: 'error and valid ring at rest and say which they are, at the soft tint rather than full strength' },
    { chosen: { state: 'error' }, slot: 'statusIcon', has: [INK], why: 'error and valid ring at rest and say which they are' },
    { chosen: { state: 'valid' }, slot: 'field', has: [EDGE, 'focus-within:border-secondary'], why: 'a valid field still takes the focus ring, because being valid is not being focused' },
    { chosen: { state: 'valid' }, slot: 'statusIcon', has: [INK], why: 'error and valid ring at rest and say which they are' },
    { chosen: { disabled: true }, slot: 'root', has: ['opacity-50'], why: 'disabled dims the whole field group and readonly changes the surface, not the border' },
    { chosen: { readOnly: true }, slot: 'field', has: ['bg-base-200'], why: 'disabled dims the whole field group and readonly changes the surface, not the border' },
    { chosen: { readOnly: true }, slot: 'input', has: ['cursor-default'], why: 'disabled dims the whole field group and readonly changes the surface, not the border' },
    { slot: 'required', has: ['text-primary'], why: 'the required marker is the brand, so a label reads as required without the word' },
  ],
  ArenaRadio: [
    { slot: 'ring', has: ['[&:has(~input:focus-visible)]:shadow-[0_0_0_var(--focus-width)_var(--focus-ring)]'], why: 'the ring finds its own focus through an arbitrary variant, so nothing injects a stylesheet and no hook class survives, and it is the full-strength role because the accent at 16% is a wash rather than an edge' },
    { slot: 'group', has: ['flex', 'flex-col', 'gap-items'], why: 'the group is a column, and it is a display utility because the host binds it' },
  ],
  ArenaMenu: [
    { chosen: { destructive: true, disabled: false }, slot: 'item', has: [INK, 'hover:bg-hover'], hasNot: ['text-error'], why: HUE_WHY },
    { slot: 'root', has: ['inline-flex'], why: 'a host-bound root is never the UA-default inline box' },
    { chosen: { anchored: true }, slot: 'panel', hasNot: ['absolute', 'top-full', 'left-0', 'mt-1.5'], why: 'anchored, the CDK positions the pane, so every in-flow positioning class is gone' },
    { chosen: { anchored: true }, slot: 'root', hasNot: ['relative'], why: 'nothing is positioned against the host once the panel has left it' },
    { chosen: { anchored: false }, slot: 'panel', has: ['absolute', 'top-full', 'left-0', 'mt-1.5'], why: 'in flow, the panel positions itself against the host, which is the shape the specimen renders' },
  ],
  ArenaPageHead: [
    ...[true, false].map((narrow) => ({ chosen: { narrow }, slot: 'actions', has: ['flex-wrap'],
      why: 'three buttons at 390px overflow the page without it, and the row wraps its own children at every width' })),
    { chosen: { narrow: false }, slot: 'root', has: ['flex', 'flex-row', '[align-items:var(--arena-align-items,flex-start)]'], hasNot: ['flex-col', 'items-stretch'], why: 'the wide layout is a row, and it is the default because nothing has been measured yet' },
    { chosen: { narrow: false }, slot: 'actions', has: ['w-auto'], hasNot: ['w-full'], why: 'the wide layout pins the actions to their content' },
    { chosen: { narrow: true }, slot: 'root', has: ['flex-col', 'items-stretch'], hasNot: ['flex-row'], why: 'below the breakpoint the row stacks and neither branch leaks the other direction' },
    { chosen: { narrow: true }, slot: 'actions', has: ['w-full'], hasNot: ['w-auto'], why: 'below the breakpoint the actions go full width' },
  ],
  ArenaPagination: [
    { slot: 'root', has: ['inline-flex', 'items-center'], why: 'a host-bound root is never the UA-default inline box' },
    { slot: 'nav', has: ['disabled:text-ink-muted/40', 'disabled:cursor-not-allowed'], why: 'an unreachable step says so through a :disabled variant, which only a real disabled control matches' },
    { chosen: { current: true }, slot: 'page', has: ['bg-primary', 'text-primary-content'], why: 'the current page is the one filled control in the row' },
    { chosen: { current: false }, slot: 'page', has: ['bg-transparent'], hasNot: ['bg-primary'], why: 'the current page is the one filled control in the row' },
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
    { slot: 'error', has: [INK], hasNot: ['text-error'], why: 'the field error message reads the ink of the danger hue always gives its slot, so a plugin moving the danger ink moves the message with the ring' },
    { slot: 'field', has: ['focus:border-secondary'], why: 'the focus ring is the recipe\'s job, not the component\'s, so nothing injects a stylesheet for it' },
    { slot: 'field', has: ['appearance-none', 'pr-9'], why: 'the field strips the platform chrome and reserves the room the caret Arena draws sits in' },
    { slot: 'root', has: ['flex'], why: 'a host-bound root is never the UA-default inline box' },
    { slot: 'caret', has: ['pointer-events-none'], why: 'the caret is decoration over the native control and must not swallow the click' },
    { slot: 'field', has: ['focus:border-secondary', 'focus:outline-none'], why: 'a select takes focus itself, so the ring is focus rather than focus-within' },
  ],
  ArenaSheet: [
    { chosen: { open: true }, slot: 'root', has: ['flex'],
      why: 'the display utility stays on the base, since the host binds the root slot and a placement class writes no display' },
  ],
  ArenaSideNav: [
    ...['item', 'trigger'].map((slot) => ({ slot, has: ['flex', 'items-center', 'gap-row', 'px-row-x', 'py-row-y', 'rounded-control'],
      why: 'the trigger matches the item metrics, or a collapsible header will not line up with its siblings' })),
    { slot: 'root', has: ['flex', 'flex-col'], why: 'the rail is a column, and it is a display utility because the host binds it' },
  ],
  ArenaSwitch: [
    { chosen: { state: true }, slot: 'knob', has: ['[translate:var(--arena-orientation-knob-on,100%_0)]'], hasNot: ['translate-x-0'], why: 'the knob travels to the end its orientation names, and the channel falls back to the horizontal one' },
    { chosen: { state: false }, slot: 'knob', has: ['translate-x-0'], hasNot: ['[translate:var(--arena-orientation-knob-on,100%_0)]'], why: 'an off knob rests at the start, whichever way the switch lies' },
    { chosen: { state: true }, slot: 'track', has: ['bg-primary'], why: 'on fills with the brand and off stays the neutral rail' },
    { chosen: { state: false }, slot: 'track', has: ['bg-neutral'], why: 'on fills with the brand and off stays the neutral rail' },
    { slot: 'icon', has: ['text-primary'], why: 'the icon reads the brand ink on the knob' },
    { slot: 'knob', has: ['bg-primary-content'], why: 'the knob is the content colour against the filled track' },
    { chosen: { disabled: true }, slot: 'root', has: ['opacity-50'], why: 'disabled dims the whole control' },
  ],
  ArenaTabs: [
    { slot: 'root', has: ['flex', 'border-b-[length:var(--bw-separator)]', 'border-edge-separator'], why: 'the tablist sits on a hairline rule that the selected tab overdraws' },
    { chosen: { selected: true }, slot: 'tab', has: ['font-control', 'text-ink-body', 'shadow-[inset_0_calc(var(--bw-strong)*-1)_0_var(--crimson)]'], why: 'the selected tab is marked by an inset underline rather than a fill' },
    { chosen: { selected: false }, slot: 'tab', has: ['font-medium', 'text-ink-muted/(--level-ink-muted)', 'shadow-none'], why: 'an unselected tab is muted and carries no underline' },
    { slot: 'tab', has: ['focus-visible:outline-none'], why: 'a directly focused slot removes the browser\'s own outline or that is what a keyboard user sees instead of Arena\'s' },
    {
      slot: 'tab',
      has: ['focus-visible:ring-[length:var(--focus-width)]', 'focus-visible:ring-[color:var(--focus-ring)]'],
      why: 'the ring is a ring utility rather than a shadow one, for the reason the tab focus-ring test in this file carries',
    },
    { chosen: { selected: true }, slot: 'panel', has: ['block'], hasNot: ['hidden'], why: 'exactly one panel is shown, and the other is hidden rather than merely unstyled' },
    { chosen: { selected: false }, slot: 'panel', has: ['block', 'hidden'], why: 'exactly one panel is shown, and the other is hidden rather than merely unstyled: the base block and the branch hidden are both present and the branch is emitted later' },
  ],
  ArenaTextarea: [
    { slot: 'error', has: [INK], hasNot: ['text-error'], why: 'the field error message reads the ink of the danger hue always gives its slot, so a plugin moving the danger ink moves the message with the ring' },
    { slot: 'field', has: ['focus:border-secondary'], why: 'the focus ring is the recipe\'s job, not the component\'s, so nothing injects a stylesheet for it' },
    { chosen: { state: 'neutral' }, slot: 'field', has: ['focus:border-secondary'], hasNot: ['border-success'], why: 'a textarea takes focus itself, so its ring is focus rather than focus-within' },
    { chosen: { state: 'error' }, slot: 'field', has: [EDGE, 'ring-[color:var(--arena-hue-fill-soft)]'], hasNot: ['border-success'], why: 'error rings at rest and says which it is' },
    { chosen: { resize: 'vertical' }, slot: 'field', has: ['resize-y'], why: 'resize is the consumer\'s choice and the recipe carries both answers' },
    { chosen: { resize: 'none' }, slot: 'field', has: ['resize-none'], why: 'resize is the consumer\'s choice and the recipe carries both answers' },
    { chosen: { disabled: true }, slot: 'root', has: ['opacity-50'], why: 'disabled dims the whole field group' },
    { chosen: { readOnly: true }, slot: 'field', has: ['bg-base-200', 'cursor-default'], why: 'readonly changes the surface, not the border' },
    { slot: 'counter', has: ['font-mono', 'text-ink-muted/(--level-ink-muted)'], why: 'the counter is a muted mono readout' },
    { chosen: { near: true }, slot: 'counter', has: [INK], hasNot: ['text-warning'], why: 'the counter warns before it refuses, which is a warning ink read from the hue channel and not a danger one' },
    { slot: 'foot', has: ['justify-between'], why: 'the foot spaces the help text and the counter to opposite ends' },
  ],
  ArenaBadge: [
    ...hueClaims('root', Object.fromEntries(STATUS.map((tone) => [tone, [SOFT]]))),
    { chosen: { tone: 'neutral' }, slot: 'root', hasNot: [SOFT, 'bg-base-300', 'bg-primary/14', 'bg-secondary/16'], why: 'a neutral badge is the absence of a hue, so the accent channel washes it and the tone adds no class' },
    { slot: 'root', has: ['text-ink-body/(--level-ink-body)'], why: 'the ink of a badge is the body ink under every tone, so it sits once in the base' },
    { slot: 'root', has: ['w-fit'], why: 'a badge is as wide as its label in a card body, where a width of auto would stretch it' },
    { slot: 'dot', has: ['bg-current'], why: 'the dot takes the tone ink from the text colour around it rather than naming one' },
    ...['neutral', 'success', 'warning', 'danger', 'info'].map((tone) => ({
      chosen: { tone }, slot: 'root', has: ['rounded-marker', 'font-face-label', 'case-label', 'text-ctl-xs', 'tracking-label-role'],
      why: 'every tone keeps the shared chip base, the marker radius roles.json gives a badge, and the mono uppercase micro-label',
    })),
  ],
};

const READS: [component: string, slot: string, question: string, reads: string[], chosen?: Record<string, string>][] = [
  ['ArenaButton', 'root', 'size.control-h', ['h-[var(--arena-size-control-h,var(--size-md-control-h))]']],
  ['ArenaIconButton', 'root', 'size.control-h', ['h-[var(--arena-size-control-h,var(--size-md-control-h))]', 'min-w-[var(--arena-size-control-h,var(--size-md-control-h))]']],
  ['ArenaButton', 'root', 'size.control-pad-x', ['px-[var(--arena-size-control-pad-x,var(--size-md-control-pad-x))]']],
  ['ArenaButton', 'root', 'size.control-step', ['text-[length:var(--arena-size-control-step,var(--size-md-control-step))]']],
  ['ArenaSegmentedControl', 'segment', 'size.segment-h', ['h-[var(--arena-size-segment-h,var(--size-md-segment-h))]']],
  ['ArenaSegmentedControl', 'segment', 'size.segment-pad-x', ['px-[var(--arena-size-segment-pad-x,var(--size-md-segment-pad-x))]']],
  ['ArenaSegmentedControl', 'segment', 'size.segment-step', ['text-[length:var(--arena-size-segment-step,var(--size-md-segment-step))]']],
  ['ArenaSwitch', 'knob', 'size.switch-knob', ['size-[var(--arena-size-switch-knob,var(--size-md-switch-knob))]']],
  ['ArenaSwitch', 'icon', 'size.switch-icon', ['text-[length:var(--arena-size-switch-icon,var(--size-md-switch-icon))]']],
  ['ArenaSpinner', 'circle', 'size.spinner', ['size-[var(--arena-size-spinner,var(--size-md-spinner))]']],
  ['ArenaProgressBar', 'track', 'size.meter', ['h-[var(--arena-size-meter,var(--size-md-meter))]']],
  ['ArenaProgressBar', 'ringTrack', 'size.meter', ['[stroke-width:var(--arena-size-meter,var(--size-md-meter))]']],
  ['ArenaProgressBar', 'ringFill', 'size.meter', ['[stroke-width:var(--arena-size-meter,var(--size-md-meter))]']],
  ['ArenaProgressBar', 'ring', 'size.ring', ['size-[var(--arena-size-ring,var(--size-md-ring))]']],
  ['ArenaAvatar', 'root', 'size.avatar', ['size-[var(--arena-size-avatar,var(--size-md-avatar))]']],
  ['ArenaAvatar', 'box', 'size.avatar', ['size-[var(--arena-size-avatar,var(--size-md-avatar))]', 'text-[length:calc(var(--arena-size-avatar,var(--size-md-avatar))*0.4)]']],
  ['ArenaAvatar', 'status', 'size.avatar', ['size-[max(calc(var(--sp-1)*2),calc(var(--arena-size-avatar,var(--size-md-avatar))*0.28))]']],
  ['ArenaAppLogo', 'mark', 'size.logo-mark', ['size-[var(--arena-size-logo-mark,var(--size-md-logo-mark))]']],
  ['ArenaAppLogo', 'name', 'size.logo-step', ['text-[length:var(--arena-size-logo-step,var(--size-md-logo-step))]']],
  ['ArenaPeopleList', 'root', 'size.list-gap', ['gap-[var(--arena-size-list-gap,var(--size-md-list-gap))]']],
  ['ArenaPeopleList', 'row', 'size.row-gap', ['gap-[var(--arena-size-row-gap,var(--size-md-row-gap))]']],
  ['ArenaPeopleList', 'row', 'size.row-pad-x', ['px-[calc(var(--arena-size-row-pad-x,var(--size-md-row-pad-x))*var(--dz-row-scale-x))]']],
  ['ArenaPeopleList', 'row', 'size.row-pad-y', ['py-[calc(var(--arena-size-row-pad-y,var(--size-md-row-pad-y))*var(--dz-row-scale-y))]']],
  ['ArenaPeopleList', 'rank', 'size.rank', ['w-[var(--arena-size-rank,var(--size-md-rank))]']],
  ['ArenaPeopleList', 'rank', 'size.caption-step', ['text-[length:var(--arena-size-caption-step,var(--size-md-caption-step))]']],
  ['ArenaPeopleList', 'secondary', 'size.caption-step', ['text-[length:var(--arena-size-caption-step,var(--size-md-caption-step))]']],
  ['ArenaPeopleList', 'name', 'size.name-step', ['text-[length:var(--arena-size-name-step,var(--size-md-name-step))]']],
  ['ArenaPeopleList', 'figure', 'size.figure-step', ['text-[length:var(--arena-size-figure-step,var(--size-md-figure-step))]']],
  ['ArenaAppLogo', 'root', 'orientation.direction', ['[flex-direction:var(--arena-orientation-direction,row)]']],
  ['ArenaSwitch', 'track', 'orientation.direction', ['[flex-direction:var(--arena-orientation-direction,row)]']],
  ['ArenaAppLogo', 'root', 'orientation.logo-gap', ['gap-[var(--arena-orientation-logo-gap,calc(var(--sp-1)*2.5))]']],
  ['ArenaSwitch', 'track', 'orientation.track-w', ['w-[var(--arena-orientation-track-w,var(--arena-size-switch-long,var(--size-md-switch-long)))]', 'h-[var(--arena-orientation-track-h,var(--arena-size-switch-short,var(--size-md-switch-short)))]']],
  ['ArenaButton', 'root', 'emphasis.fill', ['bg-[color:var(--arena-emphasis-fill,var(--emphasis-primary-fill))]']],
  ['ArenaIconButton', 'root', 'emphasis.fill', ['bg-[color:var(--arena-emphasis-fill,transparent)]']],
  ['ArenaButton', 'root', 'emphasis.ink', ['text-[color:var(--arena-emphasis-ink,var(--emphasis-primary-ink))]']],
  ['ArenaIconButton', 'root', 'emphasis.ink', ['text-[color:var(--arena-emphasis-ink,color-mix(in_oklab,var(--emphasis-ghost-ink)_var(--level-ink-body),transparent))]']],
  ['ArenaButton', 'root', 'emphasis.edge', ['border-[color:var(--arena-emphasis-edge,var(--emphasis-primary-edge))]']],
  ['ArenaIconButton', 'root', 'emphasis.icon-edge', ['border-[length:var(--bw-control)]', 'border-[color:var(--arena-emphasis-icon-edge,var(--emphasis-ghost-icon-edge))]', '[border-style:var(--arena-emphasis-edge-style,solid)]']],
  ['ArenaButton', 'root', 'emphasis.fill-hover', ['hover:bg-[color:var(--arena-emphasis-fill-hover,var(--emphasis-primary-fill))]']],
  ['ArenaIconButton', 'root', 'emphasis.fill-hover', ['hover:bg-[color:var(--arena-emphasis-fill-hover,var(--emphasis-ghost-fill-hover))]'], { pressed: 'false' }],
  ['ArenaBadge', 'root', 'accent.fill-soft', ['bg-[color:var(--arena-accent-fill-soft,var(--accent-plain-fill-soft))]']],
  ['ArenaStatCard', 'value', 'accent.ink', ['text-[color:var(--arena-accent-ink,var(--accent-plain-ink))]']],
  ['ArenaProgressBar', 'track', 'accent.ink', ['text-[color:var(--arena-accent-ink,var(--accent-primary-ink))]']],
  ['ArenaProgressBar', 'ring', 'accent.ink', ['text-[color:var(--arena-accent-ink,var(--accent-primary-ink))]']],
  ['ArenaActivityFeed', 'dot', 'accent.ink', ['text-[color:var(--arena-accent-ink,var(--accent-primary-ink))]']],
  ['ArenaSpinner', 'root', 'accent.ink', ['text-[color:var(--arena-accent-ink,var(--accent-primary-ink))]']],
  ['ArenaTag', 'root', 'accent.quiet-ink', ['text-[color:var(--arena-accent-quiet-ink,color-mix(in_oklab,var(--accent-plain-quiet-ink)_var(--level-ink-quiet),transparent))]']],
  ['ArenaCard', 'root', 'accent.edge', ['border-[color:var(--arena-accent-edge,var(--accent-plain-edge))]']],
  ['ArenaTag', 'root', 'accent.edge', ['border-[color:var(--arena-accent-edge,var(--accent-plain-edge))]']],
  ['ArenaToast', 'root', 'accent.side-edge', ['border-l-[color:var(--arena-accent-side-edge,var(--accent-plain-side-edge))]']],
  ['ArenaCard', 'root', 'elevation.shadow', ['shadow-[var(--arena-elevation-shadow,var(--elevation-flat-shadow))]']],
  ['ArenaHero', 'words', 'align.items', ['[align-items:var(--arena-align-items,flex-start)]']],
  ['ArenaPageHead', 'root', 'align.items', ['[align-items:var(--arena-align-items,flex-start)]']],
  ['ArenaHero', 'words', 'align.text', ['[text-align:var(--arena-align-text,start)]']],
  ['ArenaHero', 'root', 'layout.cols', ['[grid-template-columns:var(--arena-layout-cols,repeat(auto-fit,minmax(min(calc(var(--grid-min)*1.5),100%),1fr)))]']],
  ['ArenaHero', 'root', 'layout.items', ['[align-items:var(--arena-layout-items,center)]']],
  ['ArenaHero', 'root', 'layout.gap', ['gap-[var(--arena-layout-gap,var(--rhythm-section))]']],
  ['ArenaHero', 'root', 'layout.frame', ['[position:var(--arena-layout-frame,static)]', '[overflow:var(--arena-layout-clip,visible)]', 'rounded-[var(--arena-layout-radius,0)]', 'py-[var(--arena-layout-pad-block,var(--rhythm-section))]', 'px-[var(--arena-layout-pad-inline,0)]']],
  ['ArenaHero', 'words', 'layout.place', ['col-start-[var(--arena-layout-place,auto)]', 'row-start-[var(--arena-layout-place,auto)]', 'z-[var(--arena-layout-z,auto)]', '[justify-content:var(--arena-layout-words-justify,normal)]']],
  ['ArenaHero', 'figure', 'layout.place', ['col-start-[var(--arena-layout-place,auto)]', 'row-start-[var(--arena-layout-place,auto)]', '[align-self:var(--arena-layout-self,auto)]']],
  ['ArenaSheet', 'root', 'placement.top', ['top-[var(--arena-placement-top,auto)]', 'bottom-[var(--arena-placement-bottom,0)]', 'start-[var(--arena-placement-start,0)]', 'end-[var(--arena-placement-end,0)]', 'w-[var(--arena-placement-width,auto)]', 'max-w-[var(--arena-placement-max-width,none)]', 'max-h-[var(--arena-placement-max-height,80vh)]', 'rounded-ss-[var(--arena-placement-radius-ss,var(--r-lg))]', 'rounded-se-[var(--arena-placement-radius-se,var(--r-lg))]', 'rounded-es-[var(--arena-placement-radius-es,0)]', 'rounded-ee-[var(--arena-placement-radius-ee,0)]', 'pt-[var(--arena-placement-pad-top,0)]', 'pb-[var(--pad-safe-bottom)]']],
  ['ArenaToastHost', 'root', 'placement.top', ['top-[var(--arena-placement-top,auto)]', 'bottom-[var(--arena-placement-bottom,max(var(--sp-6),var(--pad-safe-bottom)))]', 'start-[var(--arena-placement-start,auto)]', 'end-[var(--arena-placement-end,var(--sp-6))]']],
  ['ArenaButton', 'root', 'emphasis.shadow-hover', ['hover:shadow-[var(--arena-emphasis-shadow-hover,var(--emphasis-primary-shadow-hover))]']],
];

const mutable = CLAIMS as unknown as Record<string, Claim[]>;
for (const [component, slot, question, reads, chosen] of READS) {
  (mutable[component] ??= []).push({
    ...(chosen ? { chosen } : {}), slot, has: reads,
    why: `the ${slot} answers ${question} through its channel, with the family default as its fallback, so no option written is the look it had before the family`,
  });
}

test('every size, orientation, emphasis, accent, elevation, align, layout and placement question a slot answers is read through its own channel with a fallback', () => {
  const channels = READS.flatMap(([, , , reads]) => reads.flatMap((one) => [...one.matchAll(/var\(--arena-(?:size|orientation|emphasis|accent|elevation|align|layout|placement)-[a-z0-9-]+,/g)]));
  assert.ok(channels.length >= READS.length, 'a read names a channel and the fallback that stands in for it');
  for (const [component, slot, question, reads] of READS) {
    const family = question.split('.')[0]!;
    assert.ok(reads.some((one) => one.includes(`var(--arena-${family}-`)), `${component}.${slot} reads no ${family} channel`);
  }
});

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

test('a status a component states follows the accent read in the slot string, so the status wins over any accent', () => {
  const stated: [string, string, string, string[]][] = [
    ['ArenaBadge', 'root', 'accent-fill-soft', ['success', 'warning', 'danger', 'info']],
    ['ArenaStatCard', 'value', 'accent-ink', ['success', 'warning', 'danger', 'info']],
    ['ArenaTag', 'root', 'accent-edge', ['success', 'warning', 'danger']],
    ['ArenaToast', 'root', 'accent-side-edge', ['success', 'danger']],
    ['ArenaProgressBar', 'track', 'accent-ink', ['success', 'danger', 'info']],
    ['ArenaActivityFeed', 'dot', 'accent-ink', ['success', 'warning', 'danger', 'info']],
  ];
  for (const [component, slot, channel, tones] of stated) {
    for (const tone of tones) {
      const classes = resolve(component, { tone }, slot);
      const accent = classes.findIndex((one) => one.includes(`--arena-${channel},`));
      const meaning = classes.findIndex((one) => one.includes('--arena-hue-'));
      assert.ok(accent >= 0 && meaning > accent, `${component}.${slot} at tone ${tone} must write its hue read after the ${channel} read`);
    }
  }
});

test('a component whose tone is optional carries no default for it, so an untoned one paints its accent', () => {
  for (const component of ['ArenaProgressBar', 'ArenaActivityFeed'])
    assert.equal(manifests.get(component)?.defaultVariants?.tone, undefined, `${component} still defaults its tone`);
});

test('a non-destructive button draws its focus ring after its hover rule, so a hovered and focused one keeps the ring', () => {
  const sheet = readFileSync(join(repoRoot, 'frameworks/tailwind/consume/components/forms/arena-button/ArenaButton.styles.generated.css'), 'utf8');
  const selector = '.arena-button__root:where(:not([data-arena-destructive]))';
  const hover = sheet.indexOf(`${selector}:hover {`);
  const focus = sheet.search(new RegExp(`${selector.replace(/[()[\]]/g, '\\$&')}:focus-visible\\b`));
  assert.ok(hover >= 0, 'the compiled sheet has no non-destructive hover rule');
  assert.ok(focus > hover, 'the non-destructive focus-visible rule must follow its hover rule');
});

const DIALOG_PANEL = '.arena-dialog__panel';

function fillOutranksFamilyWidth(sheet: string): boolean {
  const family = sheet.indexOf(`${DIALOG_PANEL} {`);
  const fill = sheet.indexOf(`${DIALOG_PANEL}:where([data-arena-fill]) {`);
  return family >= 0 && fill > family && /width: 100%;/.test(sheet.slice(fill, sheet.indexOf('}', fill)));
}

test('a filling dialog panel is 100% wide after its family width rule at no lower specificity, so a set --arena-dialog-width cannot beat filling', () => {
  const sheet = readFileSync(join(repoRoot, 'frameworks/tailwind/consume/components/feedback/arena-dialog/ArenaDialog.styles.generated.css'), 'utf8');
  assert.ok(fillOutranksFamilyWidth(sheet), 'the fill rule must come after the panel rule and set width: 100%');
  const familyRule = sheet.slice(sheet.indexOf(`${DIALOG_PANEL} {`), sheet.indexOf('}', sheet.indexOf(`${DIALOG_PANEL} {`)));
  assert.match(familyRule, /width: var\(--arena-dialog-width-size,/);
  const swapped = '.arena-dialog__panel:where([data-arena-fill]) {\n width: 100%;\n}\n.arena-dialog__panel {\n width: var(--arena-dialog-width-size,x);\n}';
  assert.equal(fillOutranksFamilyWidth(swapped), false, 'a fill rule before the family rule must fail the check');
});
