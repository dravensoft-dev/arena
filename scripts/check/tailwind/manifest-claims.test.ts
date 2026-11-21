/* What each manifest MEANS: which tone paints which token, which size is which height, which
 * branch a responsive layout takes. A component renders its own class names, so a layer suite cannot see a utility, and Angular
 * may not import a manifest to look. So the claims
 * live once, beside the manifests, resolved through classesFor, the function the compiler applies,
 * which concatenates a slot's base and each chosen branch and never merges. */

import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { classesFor } from '../../../frameworks/tailwind/ManifestClasses.js';
import { escapeClass, layerManifests } from '../../lib/tailwind/tailwind-compile.ts';
import { defaultBlockChannels, markupDeclarations, readFamilies, type Family } from '../../lib/tailwind/vocabulary.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { readJson } from '../../utils/read-file.ts';
import { readColorSlots } from '../../lib/core/color-slots.ts';
import { haloValue, memberValue } from '../../generate/core/arena-cli/slots.ts';
import { classStringsBySlot } from '../arena/check-manifest-states.ts';

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

test('a pressed icon button keeps its wash under the pointer', () => {
  const pressed = resolve('ArenaIconButton', { pressed: true }, 'root');
  assert.deepEqual(pressed.filter((c) => c.startsWith('hover:bg-')).map((c) => /^hover:bg-\[color:var\((--arena-emphasis-fill-[a-z-]+)[,)]/.exec(c)?.[1]),
    ['--arena-emphasis-fill-selected-hover']);
  const unpressed = resolve('ArenaIconButton', { pressed: false }, 'root');
  assert.ok(unpressed.some((c) => c.startsWith('hover:bg-')), 'an unpressed control keeps its emphasis hover');
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
  ArenaBadge: { tone: { success: 'success', warning: 'warning', danger: 'danger', info: 'info' } },
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
    ['ArenaBadge', 'tone', ['neutral']],
  ] as [string, string, string[]][])
    for (const value of values)
      assert.equal(manifests.get(component)?.hues?.[group]?.[value], null, `${component}.hues.${group}.${value} is not mapped to no hue`);
});

test('every manifest claim holds', () => {
  const problems = claimProblems(CLAIMS as unknown as Record<string, Claim[]>);
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('the sticky family writes the position and the isolation channels the table reads', () => {
  const family = readJson(join(repoRoot, 'frameworks/tailwind/vocabulary/arena-sticky/Sticky.family.json')) as any;
  assert.equal(family.variants['arena-sticky-head'], '[--arena-sticky-position:sticky] [--arena-sticky-isolation:isolate]');
  assert.equal(family.variants['arena-sticky-none'], '[--arena-sticky-position:static] [--arena-sticky-isolation:auto]');
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

const SIDE_NAV_INSET = 'ps-[calc(var(--pad-nav-row-x)*var(--dz-row-scale-x)+var(--pad-row-indent)*var(--arena-side-nav-depth,0))]';

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

const APP_BAR_CEILING = 'px-[min(var(--pad-band-x),7%)]';

const SLOTS = readColorSlots();
const UTILITIES = { bg: 'bg-[color:', text: 'text-[color:', border: 'border-[color:', ring: 'ring-[color:' } as const;
const read = (member: string, slot: string, utility: keyof typeof UTILITIES, modifier = '') => `${modifier}${UTILITIES[utility]}${memberValue(SLOTS, member, slot, 'tailwind')}]`;
const ERROR_INK = (member: string) => read(member, 'fields-error-ink-rest', 'text');
const INK = 'text-[color:var(--arena-hue-ink)]';
const EDGE = 'border-[color:var(--arena-hue-edge)]';
const SOFT = 'bg-[color:var(--arena-hue-fill-soft)]';
const STRONG = 'bg-[color:var(--arena-hue-fill-strong)]';
const MARK_SOFT = 'bg-[color:var(--arena-mark-fill,var(--arena-accent-marks-soft-fill))]';
const MARK_INK = 'text-[color:var(--arena-mark-ink,var(--arena-accent-marks-soft-ink))]';
const MARK_WHY = 'a status colour is a read of the marks slot of its tone, so the style plugin that answers the slot moves every surface wearing it';
const marked = (member: string, slot: string, utility: keyof typeof UTILITIES, wrap?: string) =>
  (wrap === undefined ? read(member, slot, utility) : `${UTILITIES[utility]}var(${wrap},${memberValue(SLOTS, member, slot, 'tailwind')})]`);
const SOFT_OF = (tone: string) => ['bg', 'text'].map((utility) => marked('ArenaBadge.root', `marks-${tone}-soft-${utility === 'bg' ? 'fill' : 'ink'}-rest`, utility as 'bg' | 'text', `--arena-mark-${utility === 'bg' ? 'fill' : 'ink'}`));
const OUTLINE_OF = (member: string, option: string) => [marked(member, `marks-${option}-outline-edge-rest`, 'border'), marked(member, `marks-${option}-outline-ink-rest`, 'text')];
const LABEL_OF = (tone: string) => marked('ArenaStatCard.value', `marks-${tone}-label-ink-rest`, 'text');
const DESTRUCTIVE = ['edge', 'ink', 'fill'].map((property) => {
  const hue = { edge: 'edge', ink: 'ink', fill: 'fill-strong' }[property];
  const utility = { edge: 'border', ink: 'text', fill: 'bg' }[property];
  return `${utility}-[color:var(--actions-destructive-root-${property}-rest,var(--hue-danger-${hue}))]`;
});
const STRONG_INK = 'text-[color:var(--arena-hue-fill-strong)]';
const STATUS = ['success', 'warning', 'danger', 'info'];
const FEEDBACK_WHY = 'a status colour is a read of the feedback slot of its tone, so the style plugin that answers the slot moves every surface wearing it';
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
    { slot: 'frame', has: ['rounded-media', 'overflow-hidden', `bg-[color:${memberValue(SLOTS, 'ArenaFigure.frame', 'surfaces-media-sunken-fill-rest', 'tailwind')}]`], hasNot: ['rounded-surface', 'rounded-lg'], why: 'a figure is the thing being looked at rather than a container the reader looks past, so its corner is its own role and not the surface one' },
    { slot: 'media', has: ['[&>img]:fit-media', '[&>video]:fit-media'], why: 'how the picture meets the frame is a role, and it is scoped to the media box so an image in the overlay or the fallback is not cropped with it' },
    { slot: 'overlay', has: [`bg-[color:${memberValue(SLOTS, 'ArenaFigure.overlay', 'surfaces-media-fill-rest', 'tailwind')}]`], why: 'the wash is a colour role with the opacity in the manifest, so which colour and how held back stay two decisions and the contrast is measurable' },
    { slot: 'frame', has: ['aspect-[var(--arena-ratio-frame,var(--arena-ratio,var(--aspect-media)))]'], hasNot: ['aspect-square', 'aspect-video'], why: 'the shape is read from the ratio family\'s channel, then its axis, then the media role, because a consumer pinning a video is answering about one figure and not about the appearance' },
    { slot: 'frame', has: ['grid-rows-1', 'grid-cols-1'], why: 'the frame\'s one track does not grow with its picture, so a picture taller than the ratio is fitted by object-fit and never stretches the frame' },
    { slot: 'fallback', has: ['col-start-1', 'row-start-1', 'place-items-center'], why: 'the fallback sits in the frame\'s one track and centres in it, so a figure with no picture keeps its box' },
    { slot: 'overlay', has: ['col-start-1', 'row-start-1', 'self-end'], why: 'the overlay shares the media\'s cell and rests on its bottom edge, so the track fix never moves it' },
    { slot: 'media', has: ['min-h-0'], why: 'the media cell may be shorter than its picture, which is what lets the track hold the ratio' },
  ],
  ArenaHero: [
    { slot: 'title', has: ['text-[length:var(--title-hero-fit)]'], hasNot: ['text-title-hero', 'text-display', 'text-hero', 'text-h1'], why: 'the top rung of the title ladder is a role, so a style plugin re-pitches a hero with the three registers under it rather than around them, and it reaches the line through --title-hero-fit, which narrows it toward the page step in a container too narrow for one word of it' },
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
    { slot: 'root', has: ['flex', `bg-[color:${memberValue(SLOTS, 'ArenaChartCard.root', 'surfaces-plain-card-fill-rest', 'tailwind')}]`, 'border-[length:var(--bw-surface)]', `border-[color:${memberValue(SLOTS, 'ArenaChartCard.root', 'surfaces-plain-card-edge-rest', 'tailwind')}]`, 'rounded-surface'], why: 'a chart tile is a bordered tile off the surface scale, not a heading-bearing panel' },
    { slot: 'title', has: ['font-face-label', 'case-label', 'tracking-label-role'], hasNot: ['font-display', 'text-h1', 'text-h2', 'text-h3', 'text-h4'], why: 'a microlabel carries neither the display font nor a heading size, which would fabricate a document outline' },
    { slot: 'head', has: ['justify-between', 'items-center', 'flex-wrap'], why: 'the head row spaces title and actions to opposite ends and wraps, since the slot projects one element per control' },
  ],
  ArenaActivityFeed: [
    { slot: 'dot', has: ['bg-current'], hasNot: ['bg-error', 'bg-success', 'bg-warning', 'bg-info', 'bg-primary', 'bg-primary-fill', 'bg-secondary'], why: 'the dot carries the tone as a colour, never as a fill of its own' },
    ...['neutral', 'success', 'warning', 'danger', 'info'].map((tone) => ({
      chosen: { tone }, slot: 'dot', has: [`text-[color:${memberValue(SLOTS, 'ArenaActivityFeed.dot', `marks-${tone}-dot-ink-rest`, 'tailwind')}]`], hasNot: [INK, STRONG_INK],
      why: 'a toned dot reads the marks dot of its tone inline, so an answer to that dot reaches it (D92)',
    })),
    { chosen: { divided: true }, slot: 'item', has: ['border-t-[length:var(--bw-separator)]'], why: 'divided draws the rule between rows' },
    { chosen: { divided: false }, slot: 'item', has: ['border-t-0'], why: 'the first row carries no divider above it' },
  ],
  ArenaAvatar: [
    { chosen: { kind: 'person' }, slot: 'box', has: ['rounded-pill'], why: 'a person is drawn as a circle and a team as a rounded square, so the two read apart' },
    { chosen: { kind: 'team' }, slot: 'box', has: ['rounded-md'], why: 'a person is drawn as a circle and a team as a rounded square, so the two read apart' },
    { slot: 'status', has: ['bg-current', 'border-surface'], hasNot: ['border-base-200'], why: 'the presence dot paints the ink of its marks dot, and its ring is the surface the dot is cut from, no slot read (R13)' },
    ...Object.entries({ online: 'success', busy: 'danger', away: 'warning', offline: 'muted' }).map(([status, option]) => ({
      chosen: { status }, slot: 'status', has: [`text-[color:${memberValue(SLOTS, 'ArenaAvatar.status', `marks-${option}-dot-ink-rest`, 'tailwind')}]`], hasNot: [STRONG, 'bg-[color:var(--arena-hue-ink)]'],
      why: 'a presence tone maps to the marks dot of its status, never to a series colour (D92)',
    })),
    { slot: 'image', has: ['w-full', 'h-full', 'object-cover'], why: 'the image fills the box and crops to it, so a non-square source never distorts' },
  ],
  ArenaCard: [
    { slot: 'root', has: ['block', 'bg-[color:var(--arena-accent-surfaces-card-fill)]'], hasNot: ['bg-base-200'], why: 'the card names WHICH surface it is rather than which step of the scale, so a style plugin can flatten it onto the page, and it is never a zero-area inline box' },
    { slot: 'root', hasNot: ['border-primary', 'border-edge-surface', 'shadow-surface-rest', 'shadow-surface-floating', 'shadow-none'], why: 'the edge colour and the depth are the accent and elevation channels, so no accent, no resting shadow and no lifted one is a class of this manifest any more' },
    { slot: 'eyebrow', has: ['font-face-eyebrow', 'case-eyebrow', read('ArenaCard.eyebrow', 'text-eyebrow-ink-rest', 'text')], why: 'the eyebrow is the accent mono micro-label above the display-weight title' },
    { slot: 'title', has: ['font-face-heading', 'text-title-surface'], why: 'the eyebrow is the accent mono micro-label above the display-weight title' },
  ],
  ArenaSkeleton: [
    { slot: 'root', has: ['arena-shimmer', 'w-[var(--arena-skeleton-box-width,var(--arena-skeleton-width,100%))]'], hasNot: ['hidden'], why: 'the box reads its width, height and corner from the channels the shape option sets, each falling back to the block option\'s written value' },
    { slot: 'stack', has: ['flex-col', 'w-[var(--arena-skeleton-width,100%)]'], why: 'a stack of lines is a column that reads the width property directly, and decides its own tree by lines rather than by a shape class' },
    { chosen: { last: false }, slot: 'line', has: ['w-full'], hasNot: ['w-[62%]'], why: 'a full line runs the whole width and only the closing one runs short' },
    { chosen: { last: true }, slot: 'line', has: ['w-[62%]'], why: 'the last line is narrower than the rest, the way a paragraph ends' },
  ],
  ArenaStatCard: [
    ...['success', 'warning', 'danger', 'info'].map((tone) => ({ chosen: { tone }, slot: 'value', has: [LABEL_OF(tone)], why: 'every status value tone inks the figure from the marks label slot of its tone, and the tone class follows the accent read in the string, so the status is the one that wins' })),
    { chosen: { tone: 'neutral' }, slot: 'value', hasNot: [INK, 'text-ink-body', ...STATUS.map(LABEL_OF)], why: 'a neutral figure states no status, so the accent channel inks it and the tone adds no class' },
    { chosen: { tone: 'danger' }, slot: 'value', has: [LABEL_OF('danger')], hasNot: ['bg-error'], why: 'a danger value tone colours text only, so the value slot carries no background' },
    { chosen: { tone: 'danger', deltaTone: 'positive' }, slot: 'delta', has: OUTLINE_OF('ArenaStatCard.delta', 'success'), why: 'tone and deltaTone are independent, which is why the contract declares them separately' },
    { chosen: { deltaTone: 'negative' }, slot: 'delta', has: [...OUTLINE_OF('ArenaStatCard.delta', 'danger'), 'bg-transparent'], hasNot: ['bg-error', EDGE, INK], why: 'a negative delta draws its border and text from the danger outline mark on a transparent background' },
    { chosen: { deltaTone: 'positive' }, slot: 'delta', has: OUTLINE_OF('ArenaStatCard.delta', 'success'), hasNot: ['border-error', 'text-error'], why: 'a positive delta reads the success outline mark, not the danger one' },
    { chosen: { deltaTone: 'neutral' }, slot: 'delta', has: OUTLINE_OF('ArenaStatCard.delta', 'neutral'), why: 'a delta that states no direction reads the neutral outline mark' },
    { chosen: { deltaTone: 'neutral' }, slot: 'delta', has: ['rounded-marker'], why: 'every delta tone keeps the shared marker base, which is the corner roles.json gives a delta badge' },
  ],
  ArenaTable: [
    ...['th', 'td'].map((slot) => ({
      slot, has: ['focus:outline-hidden', 'focus:shadow-[inset_0_0_0_var(--bw-focus)_var(--edge-focus)]'],
      why: 'a cell draws its focus ring from the focus tokens and hides the UA outline while keeping a transparent one forced colours paint, or a keyboard user cannot see where the cursor is',
    })),
    ...['th', 'td'].map((slot) => ({
      slot, has: ['w-[var(--arena-column-width,auto)]', '[text-align:var(--arena-column-align,left)]'], hasNot: ['text-left', 'text-center', 'text-right'],
      why: 'a column is sized and aligned by the properties its key names, and a cell with none set keeps the automatic width and the left alignment the table always had',
    })),
    { chosen: { numeric: true }, slot: 'td', has: ['font-mono', 'tabular-nums'], hasNot: ['font-body'], why: 'a figure column aligns by digit, and the figure treatment replaces the prose face rather than stacking on it' },
    { chosen: { numeric: false }, slot: 'td', has: ['font-body'], hasNot: ['font-mono'], why: 'a prose column keeps the body face' },
    { slot: 'root', has: ['block'], why: 'a host-bound root is never the UA-default inline box' },
    { chosen: { narrow: false }, slot: 'root', has: ['rounded-surface', 'overflow-clip'], hasNot: ['flex-col', 'overflow-hidden'], why: 'the wide shape is the framed grid, and it is the default because nothing has been measured yet; it clips the corners without becoming a scroll container, or a sticky head would stick to a root that never scrolls' },
    { slot: 'root', has: ['[isolation:var(--arena-sticky-isolation,auto)]'], hasNot: ['isolate'], why: 'the table keeps its own layer only while its head sticks, so the stuck head never competes with a layering token a menu or a tooltip draws at and the default table paints as before' },
    { slot: 'th', has: ['[position:var(--arena-sticky-position,static)]', 'top-0', 'z-1', `bg-[color:${memberValue(SLOTS, 'ArenaTable.th', 'data-header-fill-rest', 'tailwind')}]`], why: 'a head cell reads the sticky channel with the default written as its fallback, and carries its own fill so a stuck head is opaque over the rows that pass under it' },
    { chosen: { narrow: false }, slot: 'grid', has: ['table'], why: 'the wide shape is the framed grid' },
    { chosen: { narrow: true }, slot: 'root', has: ['flex', 'flex-col'], hasNot: ['rounded-surface', 'overflow-hidden'], why: 'below the breakpoint the frame goes away and the rows become a stack of cards' },
    { chosen: { narrow: true }, slot: 'grid', has: ['table', 'contents'], why: 'below the breakpoint the frame goes away and the rows become a stack of cards: the base table and the branch contents are both present and the branch is emitted later' },
    { slot: 'headRow', has: ['table-row'], why: 'a row and a cell need the table display utilities to work as custom-element hosts' },
    { slot: 'row', has: ['table-row'], why: 'a row and a cell need the table display utilities to work as custom-element hosts' },
    { slot: 'th', has: ['table-cell'], why: 'a row and a cell need the table display utilities to work as custom-element hosts' },
    { slot: 'td', has: ['table-cell'], why: 'a row and a cell need the table display utilities to work as custom-element hosts' },
  ],
  ArenaTag: [
    { chosen: { disabled: true }, slot: 'close', has: ['opacity-[var(--actions-dismiss-fade-disabled,var(--fade-disabled))]', 'cursor-not-allowed'], hasNot: ['text-ink-muted/40', 'opacity-[var(--fade-disabled)]'], why: 'a disabled close keeps its rest ink and fades by its own marker, so an answered disabled dismiss slot stops the fade' },
    { chosen: { tone: 'danger' }, slot: 'root', has: OUTLINE_OF('ArenaTag.root', 'danger'), hasNot: ['bg-error', EDGE, INK], why: 'danger draws its border and text from the danger outline mark, with no background of its own' },
    ...['success', 'warning'].map((tone) => ({ chosen: { tone }, slot: 'root', has: OUTLINE_OF('ArenaTag.root', tone), why: MARK_WHY })),
    ...[1, 2, 3, 4, 5, 6, 7, 8].map((id) => ({ chosen: { colorId: String(id) }, slot: 'root', has: [EDGE, INK], why: HUE_WHY })),
    { chosen: { tone: 'neutral' }, slot: 'root', hasNot: [EDGE, INK, 'border-edge-surface', 'text-ink-body/(--level-ink-quiet)', 'border-primary', 'text-primary'], why: 'a neutral tag states no status, so the accent channels paint its edge and its ink and the tone adds no class' },
    ...['neutral', 'success', 'warning', 'danger'].map((tone) => ({
      chosen: { tone }, slot: 'root', has: ['rounded-marker', 'text-ctl-xs'],
      why: 'every tone keeps the shared marker base and its control font size, which an unregistered suffix would lose to the tone colour',
    })),
    { slot: 'close', has: ['relative', "before:content-['']", 'before:absolute', 'before:w-ctl-h-sm', 'before:h-ctl-h-sm'], hasNot: ['min-h-ctl-h-sm', 'min-w-ctl-h-sm'],
      why: 'the remove control answers a thumb through a hit area centred on the glyph, so the chip keeps its own height' },
    { slot: 'closeLabel', has: ['sr-only'], why: 'the remove word is read and never seen' },
    { slot: 'root', has: ['wrap-anywhere'],
      why: 'a label with no break opportunity, such as a long file name, wraps inside the chip and never pushes its field or the page sideways' },
  ],
  ArenaUnauthCard: [
    { slot: 'root', has: ['block', 'shadow-surface-deep', 'max-w-[calc(var(--unauth-card-width)+var(--bw-surface)*2)]'], why: 'the width is the token, which the text scale moves, and never the literal it computes to' },
  ],
  ArenaAlert: [
    ...STATUS.flatMap((tone) => [
      { chosen: { tone }, slot: 'root', has: [`bg-[color:${memberValue(SLOTS, 'ArenaAlert.root', `feedback-${tone}-banner-fill-rest`, 'tailwind')}]`, `border-[color:${memberValue(SLOTS, 'ArenaAlert.root', `feedback-${tone}-banner-edge-rest`, 'tailwind')}]`], hasNot: ['bg-error', 'bg-error-fill'], why: 'every status tone colours its root from the feedback slots, as a soft wash and an edge' },
      { chosen: { tone }, slot: 'icon', has: [`text-[color:${memberValue(SLOTS, 'ArenaAlert.icon', `feedback-${tone}-icon-ink-rest`, 'tailwind')}]`], why: FEEDBACK_WHY },
      { chosen: { tone }, slot: 'action', has: [`text-[color:${memberValue(SLOTS, 'ArenaAlert.action', `feedback-${tone}-action-ink-rest`, 'tailwind')}]`], why: FEEDBACK_WHY },
    ]),
    { chosen: { tone: 'neutral' }, slot: 'root', has: [`border-[color:${memberValue(SLOTS, 'ArenaAlert.root', 'feedback-neutral-banner-edge-rest', 'tailwind')}]`], hasNot: [SOFT, EDGE], why: 'the neutral tone is the absence of a hue, so its edge is the floating surface role rather than a status colour' },
    { chosen: { tone: 'neutral' }, slot: 'icon', has: [`text-[color:${memberValue(SLOTS, 'ArenaAlert.icon', 'feedback-neutral-icon-ink-rest', 'tailwind')}]`], hasNot: [INK, 'text-neutral'], why: 'the neutral tone is the absence of a hue, so its icon is the muted ink' },
    { slot: 'action', has: ['border-none'], hasNot: ['bg-transparent'], why: 'the action control is text-only chrome, carrying no border and reading its fill from the feedback slots' },
    { slot: 'close', has: ['bg-[color:var(--actions-dismiss-fill-rest,transparent)]', 'border-none'], hasNot: ['bg-transparent'], why: 'the close control is text-only chrome that reads the dismiss slots for its fill, and carries no border of its own' },
    { chosen: { titled: true }, slot: 'message', has: ['mt-1'], why: 'the message carries the title-separating margin only when a title is present' },
  ],
  ArenaAppBar: [
    { slot: 'band', has: [APP_BAR_CEILING], hasNot: ['px-gutter'],
      why: 'the bar\'s contents stand off the edge by the ceiling .arena-band does, through the role that defaults to the gutter, so a style plugin that answers it moves the bar apart from the page column' },
  ],
  ArenaBottomNav: [
    { slot: 'root', has: ['pb-[var(--pad-safe-bottom)]'], why: 'the bar adds the safe-area inset to its own height rather than eating into the row' },
    { slot: 'root', has: ['flex'], why: 'a host-bound root is never the UA-default inline box' },
    { slot: 'item', has: ['flex-1', 'basis-0', 'min-w-0'], why: 'a column takes an equal share and a zero floor, so a long label cannot push its neighbours out of the bar' },
  ],
  ArenaBreadcrumbs: [
    { slot: 'root', has: ['flex'], why: 'a host-bound breadcrumbs trail has no other way to lay out' },
    { slot: 'current', has: ['font-bold', read('ArenaBreadcrumbs.current', 'text-body-ink-rest', 'text')], why: 'only the current crumb is bold and full-strength; a linked crumb stays muted' },
    { slot: 'crumb', has: [read('ArenaBreadcrumbs.crumb', 'navigation-quiet-link-ink-rest', 'text'), 'no-underline'], hasNot: ['font-bold'], why: 'a crumb stays muted and carries no underline, reading the quiet link ink of the navigation group' },
    { chosen: { linked: 'true' }, slot: 'crumb', has: ['cursor-pointer', read('ArenaBreadcrumbs.crumb', 'navigation-quiet-link-ink-hover', 'text', 'hover:')], hasNot: ['hover:text-ink-body/(--level-ink-body)'], why: 'a linked crumb reads as a pointer target and takes its hover as a state modifier inside the linked branch, so a crumb with no href never hovers' },
    { slot: 'separator', has: [read('ArenaBreadcrumbs.separator', 'text-muted-ink-rest', 'text')], why: 'the mark between two crumbs is held back to the level a crumb already sits at, because the muted step is the faintest level that clears AA and a mark under it is a mark nobody sees' },
    { slot: 'crumb', has: ['font-face-label', 'text-trail', 'tracking-trail'], why: 'the trail register, which wears the label face and none of its case, and which default answers at the size and the narrow nav tracking a crumb already had' },
    { slot: 'current', has: ['font-face-label', 'text-trail', 'tracking-trail'], why: 'the same register at the last segment, which is the one drawn bold' },
  ],
  ArenaBulkActionBar: [
    { chosen: { destructive: true }, slot: 'action', has: ['border-[color:var(--actions-destructive-root-edge-rest,var(--hue-danger-edge))]', 'text-[color:var(--actions-destructive-root-ink-rest,var(--hue-danger-ink))]'], hasNot: [EDGE, INK], why: 'the destructive action reads the actions group\'s destructive option, so a style plugin answering it moves the action and the Button alike' },
    { chosen: { destructive: false }, slot: 'action', has: ['border-[color:var(--actions-secondary-root-edge-rest,var(--emphasis-secondary-edge))]'], hasNot: [EDGE, INK], why: 'a quiet action reads the actions group\'s secondary option and is the absence of a hue' },
    { chosen: { open: true }, slot: 'root', has: ['flex'], why: 'the root carries a display utility in its own base string, independent of the open variant' },
    { slot: 'divider', has: ['w-px'], why: 'the divider uses the one-pixel utility rather than a border-width token, since it is not a border' },
  ],
  ArenaCommandPalette: [
    { chosen: { active: true }, slot: 'row', has: [read('ArenaCommandPalette.row', 'menus-plain-item-fill-selected', 'bg'), read('ArenaCommandPalette.row', 'menus-plain-item-ink-selected', 'text')], hasNot: ['bg-primary/14', 'bg-selected/(--level-accent-soft-primary)', 'text-ink-selected'], why: 'the cursor row is washed by the menus group\'s selected slots, so a skin that answers the wash moves it with the Combobox rows' },
    { chosen: { open: true }, slot: 'root', has: ['flex'], why: 'the root carries a display utility in its own base string, independent of the open variant' },
  ],
  ArenaConfirmDialog: [
    { chosen: { destructive: true }, slot: 'eyebrow', has: [read('ArenaConfirmDialog.eyebrow', 'overlays-destructive-eyebrow-ink-rest', 'text')], hasNot: [INK], why: 'the destructive eyebrow reads the overlays group\'s destructive option, so the answer that moves it is a slot answer and not a hue channel' },
    { chosen: { destructive: true }, slot: 'confirm', has: ['bg-[color:var(--actions-destructive-root-fill-rest,var(--hue-danger-fill-strong))]', 'text-[color:var(--actions-destructive-root-ink-rest,var(--hue-danger-ink))]'], hasNot: ['bg-error', 'bg-error-fill', STRONG], why: 'the final confirmation reads the actions group\'s destructive option, so the answer that moves a destructive Button moves it' },
    { chosen: { destructive: false }, slot: 'confirm', has: ['bg-[color:var(--actions-primary-root-fill-rest,var(--emphasis-primary-fill))]', 'text-[color:var(--actions-primary-root-ink-rest,var(--emphasis-primary-ink))]'], hasNot: ['bg-primary-fill'], why: 'a confirmation that is not destructive reads the actions group\'s primary option' },
    { chosen: { destructive: true }, slot: 'confirm', has: ['disabled:opacity-[var(--actions-destructive-root-fade-disabled,var(--fade-disabled))]'], hasNot: ['disabled:opacity-[var(--fade-disabled)]'], why: 'a locked destructive confirmation fades by the destructive marker, so an answered disabled slot stops the fade' },
    { chosen: { destructive: false }, slot: 'confirm', has: ['disabled:opacity-[var(--actions-primary-root-fade-disabled,var(--fade-disabled))]'], hasNot: ['disabled:opacity-[var(--fade-disabled)]'], why: 'a locked confirmation fades by the primary marker, so an answered disabled slot stops the fade' },
    { chosen: { open: true }, slot: 'foot', has: ['flex-wrap'], why: 'the footer wraps the way ArenaDialog, ArenaPageHead and ArenaChartCard all do, and a third action row behaving differently is worse than none' },
    { chosen: { open: true }, slot: 'root', has: ['flex'], why: 'the root carries a display utility in its own base string, independent of the open variant' },
    { slot: 'input', has: ['focus-visible:ring-edge-focus'], hasNot: ['focus-visible:ring-error'], why: 'the require-text input focus reads the focus role like every field, and never the danger hue' },
    { chosen: { invalid: true }, slot: 'input', has: [read('ArenaConfirmDialog.input', 'fields-error-field-edge-rest', 'border')], hasNot: ['border-error', 'border-edge-field', 'border-edge-invalid'], why: 'invalid borders the require-text input in the invalid edge role and drops the neutral border' },
    { chosen: { invalid: false }, slot: 'input', has: [read('ArenaConfirmDialog.input', 'fields-neutral-field-edge-rest', 'border')], why: 'a valid require-text input keeps the neutral border' },
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
    { slot: 'root', has: ['flex', `border-[color:${memberValue(SLOTS, 'ArenaErrorState.root', 'feedback-danger-banner-edge-rest', 'tailwind')}]`, `bg-[color:${memberValue(SLOTS, 'ArenaErrorState.root', 'feedback-danger-banner-fill-rest', 'tailwind')}]`], hasNot: ['border-dashed', 'border-error', 'bg-error/14', 'bg-error', 'bg-error-fill', STRONG], why: 'danger stays a soft resting tint here, read from the feedback slots: this is a non-interactive status surface, not a risk trigger' },
    { slot: 'icon', has: [`text-[color:${memberValue(SLOTS, 'ArenaErrorState.icon', 'feedback-danger-icon-ink-rest', 'tailwind')}]`], hasNot: ['text-error'], why: FEEDBACK_WHY },
    { slot: 'actions', has: ['mt-1.5'], why: 'the actions slot carries the token spacing that separates the row from the copy above it' },
  ],
  ArenaOnboarding: [
    { chosen: { open: true }, slot: 'root', has: ['block'], why: 'the root carries a display utility in its own base string, independent of the open variant' },
    { slot: 'dot', has: ['duration-[var(--dur-state)]'], why: 'the dot width transition rides the token duration scale, never a literal' },
  ],
  ArenaProgressBar: [
    ...['success', 'danger', 'info'].map((tone) => ({ chosen: { tone }, slot: 'track', has: [`text-[color:${memberValue(SLOTS, 'ArenaProgressBar.track', `meters-${tone}-track-ink-rest`, 'tailwind')}]`], hasNot: [INK, STRONG_INK],
      why: 'every tone inks the track from the meters track slot of its tone, which is what the fill reads through bg-current (D93)' })),
    { slot: 'fill', has: ['bg-current'], why: 'the fill reads the tone the track inks rather than naming a colour' },
    { chosen: { tone: 'danger' }, slot: 'track', has: [`bg-[color:${memberValue(SLOTS, 'ArenaProgressBar.track', 'meters-danger-track-fill-rest', 'tailwind')}]`], hasNot: ['bg-error', 'bg-track'], why: 'danger is a tone on the track, and the track stays the neutral rail whatever the tone, read from the meters track fill slot rather than a palette step this slot names' },
    { chosen: { indeterminate: true }, slot: 'track', has: ['arena-prog-indeterminate'], why: 'the sweep is a shared animation utility, so no layer injects keyframes of its own' },
    { slot: 'track', has: ['overflow-hidden', 'rounded-pill'], hasNot: ['rounded-full'], why: 'the track clips its own fill and takes the pill radius' },
    { slot: 'root', has: ['grid', 'w-full'], why: 'w-full on an inline host does nothing, since an unknown element defaults to display inline, and the bar stacks its head over its track' },
    { chosen: { shape: 'radial' }, slot: 'root', has: ['grid', 'w-fit'], hasNot: ['w-full'], why: 'a ring is as wide as it is tall, so the root shrinks to it rather than filling the row the way a bar does' },
    { chosen: { tone: 'danger' }, slot: 'ring', has: [`text-[color:${memberValue(SLOTS, 'ArenaProgressBar.ring', 'meters-danger-track-ink-rest', 'tailwind')}]`], hasNot: [INK], why: 'every tone inks the ring, which is what the arc reads through stroke-current' },
    { chosen: { tone: 'danger' }, slot: 'ringTrack', has: [`stroke-[color:${memberValue(SLOTS, 'ArenaProgressBar.ringTrack', 'meters-danger-track-fill-rest', 'tailwind')}]`], hasNot: ['stroke-base-300'], why: 'the ring rail is the track fill of the meters group drawn as a stroke, so an answer to the track moves the bar and the ring together' },
    { slot: 'ringFill', has: ['stroke-current', '[stroke-dasharray:100]'], why: 'the arc reads the tone the ring inks, and its length is hundredths of the path, so the percentage is the offset and the radius is free' },
    { chosen: { indeterminate: true }, slot: 'ringFill', has: ['arena-prog-ring'], why: 'the turn is a shared animation utility, so no layer injects keyframes of its own' },
  ],
  ArenaMeter: [
    ...Object.entries({ optimum: 'success', fair: 'warning', poor: 'danger' }).map(([standing, tone]) => ({ chosen: { standing }, slot: 'track',
      has: [`text-[color:${memberValue(SLOTS, 'ArenaMeter.track', `meters-${tone}-track-ink-rest`, 'tailwind')}]`, `bg-[color:${memberValue(SLOTS, 'ArenaMeter.track', `meters-${tone}-track-fill-rest`, 'tailwind')}]`],
      hasNot: [INK, STRONG_INK, 'bg-track'], why: 'the region the value sits in inks the track from the meters track slots of its tone, which is what the fill reads through bg-current (D93)' })),
  ],
  ArenaSpinner: [
    { slot: 'root', hasNot: ['text-primary', 'text-secondary', 'text-primary-content', 'text-ink-muted/(--level-ink-muted)'], why: 'the ink of the ring is the accent channel, so no accent is a class of this manifest any more' },
    { slot: 'circle', has: ['border-current', 'border-t-transparent', 'rounded-pill', 'arena-spinner'], hasNot: ['rounded-full'], why: 'the ring takes its colour from the root so one tone paints both, and its radius is the pill token' },
    { slot: 'root', has: ['inline-flex'], why: 'a host-bound root is never the UA-default inline box' },
  ],
  ArenaToast: [
    ...['success', 'danger'].map((tone) => ({ chosen: { tone }, slot: 'root', has: [`border-l-[color:${memberValue(SLOTS, 'ArenaToast.root', `feedback-${tone}-banner-edge-rest`, 'tailwind')}]`], why: FEEDBACK_WHY })),
    ...['neutral', 'success', 'danger'].map((tone) => ({ chosen: { tone }, slot: 'action',
      has: [`text-[color:${memberValue(SLOTS, 'ArenaToast.action', 'feedback-neutral-action-ink-rest', 'tailwind')}]`], hasNot: [INK, 'text-primary', 'text-secondary'],
      why: 'every tone draws the action in one measured role: the tone is the side edge, an undo is not a risk trigger, and an accent as ink is the style plugin\'s to raise' })),
    { slot: 'root', has: ['flex', 'z-toast'], why: 'the root sits on --z-toast, the one slot above every other overlay' },
  ],
  ArenaTooltip: [
    { slot: 'bubble', has: ['arena-fade', 'z-tooltip', 'whitespace-nowrap', 'rounded-control', 'shadow-surface-floating', 'font-mono', 'text-ctl-xs',
      `bg-[color:${memberValue(SLOTS, 'ArenaTooltip.bubble', 'overlays-tip-fill-rest', 'tailwind')}]`, `text-[color:${memberValue(SLOTS, 'ArenaTooltip.bubble', 'overlays-tip-ink-rest', 'tailwind')}]`],
      hasNot: ['absolute', 'bottom-full', 'left-1/2', '-translate-x-1/2', '-translate-y-2', 'bg-base-content', 'text-base-100'],
      why: 'the bubble is the inverted overlay and nothing in the manifest positions it: each layer places it over its trigger' },
    { slot: 'root', has: ['inline-flex'], hasNot: ['relative'], why: 'the bubble leaves the wrapper when it is shown, so nothing is positioned against the root' },
  ],
  ArenaButton: [
    { chosen: { destructive: true }, slot: 'root', has: DESTRUCTIVE, hasNot: ['bg-error', 'bg-error-fill'], why: 'destructive draws its border and label in the danger hue and fills with hue-danger-fill-strong, transparent by default' },
    { chosen: { destructive: true }, slot: 'root', has: ['hover:shadow-control-rest'], hasNot: ['hover:shadow-[var(--arena-emphasis-shadow-hover)]'],
      why: 'a destructive button never lifts on hover whatever its emphasis, because the raised hover shadow is the emphasis destructive does not govern' },
    { chosen: { destructive: false }, slot: 'root', has: ['hover:shadow-[var(--arena-emphasis-shadow-hover)]'],
      why: 'a button that states no meaning lifts as its emphasis says, through the emphasis channel, and the meaning branch is the only one that overrides it' },
    { chosen: { destructive: false }, slot: 'root', hasNot: ['bg-primary', 'bg-primary-fill', 'bg-base-200', 'bg-transparent', 'text-primary-content', 'border-primary', 'border-primary-fill'],
      why: 'the fill, the ink and the edge are the emphasis channels, so no emphasis is a class of this manifest any more' },
    { slot: 'root', has: ['rounded-control', 'inline-flex'], why: 'the shared control geometry sits in the base, so every emphasis keeps it' },
    { slot: 'root', has: ['w-[var(--arena-fill-width,fit-content)]'], hasNot: ['w-auto', 'w-full', 'w-fit'], why: 'the width is the fill channel, which fits the content until a vocabulary class says otherwise, in a column as in a row' },
    { slot: 'spinner', has: ['arena-btn-spin'], why: 'the spinner slot carries the reduced-motion-aware utility, which is where that answer lives' },
  ],
  ArenaSplitButton: [
    { slot: 'root', has: ['hover:-translate-y-[var(--lift-control)]', 'active:scale-[var(--press-scale)]', 'motion-reduce:active:scale-100'],
      why: 'the lift and the press sit on the root once, so the two halves move as one control' },
    { slot: 'primary', hasNot: ['hover:-translate-y-[var(--lift-control)]', 'active:scale-[var(--press-scale)]', 'rounded-control'],
      why: 'a half that lifted or scaled on its own would part from the other half at the joint' },
    { slot: 'caret', hasNot: ['hover:-translate-y-[var(--lift-control)]', 'active:scale-[var(--press-scale)]', 'rounded-control'],
      why: 'the same reason, on the other half' },
    { slot: 'primary', has: ['rounded-s-control', 'border-e-0'], why: 'the primary half rounds its start corners only and draws no end edge, so the joint is one line and never two' },
    { slot: 'caret', has: ['rounded-e-control', 'w-[var(--arena-size-control-h,var(--size-md-control-h))]'], why: 'the caret rounds its end corners only and is a square of the control height' },
    { chosen: { destructive: false }, slot: 'caret', has: ['border-s-[color:color-mix(in_oklab,var(--arena-emphasis-ink)_var(--level-ink-muted),transparent)]'], hasNot: ['border-s-[color:var(--arena-emphasis-edge)]'],
      why: 'the joint is the emphasis ink at the muted level, because the primary edge is the primary fill and the ghost edge is transparent, so an edge-coloured joint draws nothing' },
    { chosen: { destructive: true }, slot: 'caret', has: ['border-s-[color:color-mix(in_oklab,var(--actions-destructive-root-ink-rest,var(--hue-danger-ink))_var(--level-ink-muted),transparent)]'], hasNot: ['border-s-[color:color-mix(in_oklab,var(--arena-emphasis-ink)_var(--level-ink-muted),transparent)]'],
      why: 'a destructive split draws its joint in the ink its option answers, the danger ink by default, the same way' },
    { chosen: { destructive: true }, slot: 'primary', has: DESTRUCTIVE, why: 'destructive draws the primary half in the danger hue, border and label, with a fill of hue-danger-fill-strong, as on a button' },
    { chosen: { destructive: true }, slot: 'caret', has: DESTRUCTIVE, why: 'and on the caret half, so the split is one danger control' },
    { chosen: { destructive: false }, slot: 'caret',
      has: ['aria-expanded:bg-[color:var(--arena-emphasis-fill-hover)]', 'aria-expanded:shadow-[var(--arena-emphasis-shadow-hover)]'],
      why: 'an open caret holds the half\'s own hover look while its menu is shown, read through the emphasis channel' },
    { chosen: { destructive: true }, slot: 'caret', has: ['aria-expanded:bg-[color:var(--actions-destructive-root-fill-hover,var(--fill-hover))]'],
      why: 'a destructive caret holds its hover wash while its menu is shown, the same way' },
    { slot: 'spinner', has: ['arena-btn-spin'], why: 'the spinner is the button spinner, reduced-motion answer included' },
  ],
  ArenaCheckbox: [
    { slot: 'box', has: ['[&:has(~input:focus-visible)]:shadow-[0_0_0_var(--bw-focus)_var(--edge-focus)]'], why: 'the focus ring is a selector on the box, so nothing injects a stylesheet and no hook class survives, and it is the full-strength role because the accent at 16% is a wash rather than an edge' },
    { chosen: { checked: true }, slot: 'box', has: ['bg-[color:var(--choices-box-fill-selected,var(--fill-control-on))]', 'border-[color:var(--choices-box-edge-selected,transparent)]'], why: 'a ticked box reads the choices box at selected, so a plugin answer moves every ticked box; unticked is the box at rest behind the control edge' },
    { chosen: { checked: false }, slot: 'box', has: ['bg-[color:var(--choices-box-fill-rest,var(--fill-control))]', 'border-[color:var(--choices-box-edge-rest,var(--edge-control))]'], why: 'a ticked box reads the choices box at selected, so a plugin answer moves every ticked box; unticked is the box at rest behind the control edge' },
    { chosen: { checked: true }, slot: 'check', has: ['text-[color:var(--choices-mark-ink-selected,var(--emphasis-primary-ink))]'], why: 'the tick is the choices mark over the ticked box, which is the one pairing that has to hold' },
    { chosen: { disabled: true }, slot: 'root', has: ['cursor-not-allowed'], hasNot: ['opacity-[var(--fade-disabled)]', 'opacity-50'], why: 'disabled takes the pointer away and fades each part, so an answered disabled box stops its own fade; enabled offers the pointer' },
    { chosen: { disabled: true }, slot: 'box', has: ['opacity-[var(--choices-box-fade-disabled,var(--fade-disabled))]'], why: 'disabled takes the pointer away and fades each part, so an answered disabled box stops its own fade; enabled offers the pointer' },
    { chosen: { disabled: true }, slot: 'label', has: ['opacity-[var(--fade-disabled)]'], why: 'disabled takes the pointer away and fades each part, so an answered disabled box stops its own fade; enabled offers the pointer' },
    { chosen: { disabled: false }, slot: 'root', has: ['cursor-pointer'], why: 'disabled takes the pointer away and fades each part, so an answered disabled box stops its own fade; enabled offers the pointer' },
    { slot: 'input', has: ['opacity-0', 'size-0'], hasNot: ['hidden'], why: 'the native input is hidden by the recipe rather than by display none, so it stays focusable' },
    ...[true, false].map((checked) => ({
      chosen: { checked }, slot: 'box', has: ['size-5', 'rounded-control-sm', 'inline-flex'],
      why: 'the box keeps its geometry through the merge, in both states',
    })),
    { slot: 'group', has: ['flex', 'flex-col', 'gap-items'], why: 'the group is a column, and it is a display utility because the host binds it' },
  ],
  ArenaCombobox: [
    { slot: 'root', has: ['flex', 'flex-col'], why: 'a host-bound root is never the UA-default inline box' },
    { slot: 'error', has: [ERROR_INK('ArenaCombobox.error')], hasNot: ['text-error', 'text-ink-invalid'], why: 'the field error message reads the invalid ink role, so a plugin answering ink-invalid moves the message with the edge' },
    { chosen: { state: 'neutral' }, slot: 'field', has: ['focus-within:border-edge-focus'], why: 'focus stays in the input, so the field rings on focus-within, and neutral rings only then' },
    { chosen: { state: 'error' }, slot: 'statusIcon', has: [read('ArenaCombobox.statusIcon', 'fields-error-status-ink-rest', 'text')], why: 'error and valid ring at rest and say which they are, with a glyph as the second channel' },
    { slot: 'field', has: ['min-h-ctl-h'], hasNot: ['h-ctl-h'], why: 'the field is a floor and never a fixed height, so a row of chips can wrap inside it' },
    { slot: 'caret', has: ['pointer-events-none'], why: 'the caret is decoration and must not swallow the press meant for the field' },
    { slot: 'announcement', has: ['sr-only'], why: 'the count is spoken and never seen' },
    { slot: 'panel', has: ['z-dropdown', 'max-h-80', 'overflow-auto'], hasNot: ['absolute', 'fixed', 'relative'], why: 'the panel scrolls its own rows and leaves its position to the layer' },
    { slot: 'option', has: ['min-h-row-min', 'px-row-floating-x', 'py-row-floating-y'], why: 'a row of a floating list spends the floating row roles, and its floor reads the density' },
    { chosen: { active: true }, slot: 'option', has: [read('ArenaCombobox.option', 'menus-plain-item-fill-selected', 'bg'), read('ArenaCombobox.option', 'menus-plain-item-ink-selected', 'text')], hasNot: ['bg-primary/14', 'bg-selected/(--level-accent-soft-primary)', 'text-ink-selected'], why: 'the cursor row is washed by the menus group\'s selected slots, and a chosen row carries a glyph, so neither is told by colour alone' },
    { chosen: { blocked: true }, slot: 'option', has: ['opacity-[var(--menus-plain-item-fade-disabled,var(--fade-disabled))]', 'cursor-not-allowed'], hasNot: ['cursor-pointer', 'opacity-[var(--fade-disabled)]', 'opacity-60', 'text-ink-muted/(--level-ink-muted)'], why: 'a row the cap blocks dims by the plain option\'s marker and refuses the pointer, and only an available row offers it' },
    { slot: 'clear', has: ['min-h-ctl-h-sm', 'min-w-ctl-h-sm'], why: 'the clear control is a small control box, which clears the floor of every density' },
    { slot: 'chips', has: ['flex-wrap', 'gap-inline', 'py-1'], why: 'chips wrap inside the field, keep the gap between siblings on one line and leave air above and below so a second row never touches the border' },
  ],
  ArenaFieldset: [
    { slot: 'root', has: ['block', 'border-0', 'p-0', 'm-0', 'min-w-0'], why: 'a fieldset is a plain grouping, so the platform border, padding and minimum width are taken away and the root keeps a display utility of its own' },
    { slot: 'body', has: ['flex', 'flex-col', 'gap-items'], why: 'the fields of a set are spaced by the role named for them, and the legend sits outside that column' },
    { slot: 'error', has: [ERROR_INK('ArenaFieldset.error')], hasNot: ['text-error', 'text-ink-invalid'], why: 'the set error reads the invalid ink role, the same as a field error' },
    { chosen: { state: 'error' }, slot: 'statusIcon', has: [read('ArenaFieldset.statusIcon', 'fields-error-status-ink-rest', 'text')], why: 'the glyph is the second channel of the set error, in the danger ink' },
    { chosen: { disabled: true }, slot: 'root', has: ['opacity-[var(--fade-disabled)]'], hasNot: ['opacity-50'], why: 'a disabled set dims as a whole, as a disabled field does' },
  ],
  ArenaIconButton: [
    { chosen: { pressed: false }, slot: 'root', has: ['hover:bg-[color:var(--arena-emphasis-fill-hover)]'],
      why: 'the hover fill is an emphasis read, and it sits in the unpressed branch so a pressed control keeps its own wash under the pointer' },
    { chosen: { pressed: true }, slot: 'root', has: [
      'bg-[color:var(--arena-emphasis-fill-selected)]',
      'text-[color:var(--arena-emphasis-ink-selected)]',
      'border-[color:var(--arena-emphasis-icon-edge-selected)]',
      'hover:bg-[color:var(--arena-emphasis-fill-selected-hover)]',
      'active:bg-[color:var(--arena-emphasis-fill-selected-pressed)]',
    ], hasNot: ['hover:bg-primary/22', 'bg-primary/14', 'hover:bg-[color:var(--arena-emphasis-fill-hover,var(--actions-ghost-root-fill-hover,var(--emphasis-ghost-fill-hover)))]'],
      why: 'a pressed control is a state of the control and states its own wash over any emphasis' },
    { chosen: { showLabel: true }, slot: 'root', has: ['w-[var(--arena-fill-width,fit-content)]', 'gap-control'], why: 'showLabel opens the box out to its label through the fill channel and gives the glyph a gap; without it the control has neither' },
    { chosen: { showLabel: false }, slot: 'root', has: ['p-0', 'gap-0'], why: 'showLabel opens the box out and gives the glyph a gap; without it the control has neither' },
    { chosen: { pressed: false }, slot: 'root', has: ['disabled:opacity-[var(--arena-emphasis-fade-disabled)]', 'disabled:cursor-not-allowed'], hasNot: ['disabled:opacity-45', 'disabled:opacity-[var(--arena-emphasis-fade-selected-disabled)]'], why: 'the disabled treatment is a :disabled variant, which only a real disabled control matches' },
    { chosen: { pressed: true }, slot: 'root', has: ['disabled:opacity-[var(--arena-emphasis-fade-selected-disabled)]'], hasNot: ['disabled:opacity-[var(--arena-emphasis-fade-disabled)]'],
      why: 'a selected disabled control fades by its own marker, and one disabled answer neither repaints nor un-fades it, and only one fade applies to the element' },
  ],
  ArenaInput: [
    { slot: 'error', has: [ERROR_INK('ArenaInput.error')], hasNot: ['text-error', 'text-ink-invalid'], why: 'the field error message reads the invalid ink role, so a plugin answering ink-invalid moves the message with the edge' },
    { chosen: { state: 'neutral' }, slot: 'field', has: ['focus-within:border-edge-focus'], why: 'neutral rings gold only on focus, where error and valid ring at rest and say which they are' },
    { chosen: { state: 'error' }, slot: 'field', has: [read('ArenaInput.field', 'fields-error-field-edge-rest', 'border'), `ring-[color:${haloValue(SLOTS, 'ArenaInput.field', 'error')}]`], why: 'error and valid ring at rest and say which they are, error in the invalid edge and a soft hue halo rather than full strength' },
    { chosen: { state: 'error' }, slot: 'statusIcon', has: [read('ArenaInput.statusIcon', 'fields-error-status-ink-rest', 'text')], why: 'error and valid ring at rest and say which they are' },
    { chosen: { state: 'valid' }, slot: 'field', has: [read('ArenaInput.field', 'fields-valid-field-edge-rest', 'border'), 'focus-within:border-edge-focus'], why: 'a valid field still takes the focus ring, because being valid is not being focused' },
    { chosen: { state: 'valid' }, slot: 'statusIcon', has: [read('ArenaInput.statusIcon', 'fields-valid-status-ink-rest', 'text')], why: 'error and valid ring at rest and say which they are' },
    { chosen: { disabled: true }, slot: 'label', has: ['opacity-[var(--fade-disabled)]'], hasNot: ['opacity-50'], why: 'disabled dims each part on its own, so an answered disabled field slot can stop the fade on its part alone' },
    { chosen: { disabled: true, state: 'neutral' }, slot: 'field', has: ['opacity-[var(--fields-neutral-field-fade-disabled,var(--fade-disabled))]'], why: 'the field fades by its own marker, and one disabled answer neither repaints nor un-fades another option' },
    { chosen: { disabled: true }, slot: 'root', hasNot: ['opacity-[var(--fade-disabled)]'], why: 'the root carries no fade, since a child cannot lift its parent\'s opacity' },
    { chosen: { readOnly: true }, slot: 'field', has: [read('ArenaInput.field', 'fields-readonly-field-fill-rest', 'bg')], why: 'disabled dims the whole field group and readonly changes the surface, not the border' },
    { chosen: { readOnly: true }, slot: 'input', has: ['cursor-default'], why: 'disabled dims the whole field group and readonly changes the surface, not the border' },
    { slot: 'required', has: [read('ArenaInput.required', 'fields-required-ink-rest', 'text')], hasNot: ['text-primary'], why: 'the required marker is the brand, so a label reads as required without the word' },
  ],
  ArenaFileInput: [
    { slot: 'error', has: [ERROR_INK('ArenaFileInput.error')], hasNot: ['text-error', 'text-ink-invalid'], why: 'the field error message reads the invalid ink role, so a plugin answering ink-invalid moves the message with the zone' },
    { slot: 'rejection', has: [ERROR_INK('ArenaFileInput.rejection')], hasNot: ['text-error', 'text-ink-invalid'], why: 'a refused file is said in the invalid ink role' },
    { chosen: { state: 'error', droppable: 'true' }, slot: 'zone', has: [read('ArenaFileInput.zone', 'fields-error-field-edge-rest', 'border')], why: 'an error turns the zone\'s edge to the invalid edge role, so a plugin answering edge-invalid moves it' },
    { chosen: { droppable: 'true' }, slot: 'zone', has: ['border-dashed', read('ArenaFileInput.zone', 'fields-neutral-field-edge-rest', 'border'), 'border-[length:var(--bw-surface)]', 'p-surface', 'rounded-surface'], why: 'a drop zone is a surface with a dashed edge, drawn literally as the empty state draws its own, and every other property a role' },
    { chosen: { droppable: 'false' }, slot: 'zone', hasNot: ['border-dashed', 'p-surface'], why: 'a field that takes no drop draws no frame, so the trigger stands on the page as a button would' },
    { chosen: { dragging: 'true', droppable: 'true' }, slot: 'zone', has: [read('ArenaFileInput.zone', 'fields-neutral-field-fill-hover', 'bg')], why: 'a drag over the zone is the surface answering, which is the fill-hover role, and a colour crossfade stays under reduced motion' },
    { slot: 'input', has: ['absolute', 'inset-0', 'size-full', 'col-start-1', 'col-end-2', 'row-start-1', 'row-end-2', 'opacity-0', 'pointer-events-none'], why: 'the hidden input lies over the trigger\'s grid cell, so the browser anchors a required field\'s message at the trigger, and it takes no pointer event, so every press reaches the trigger' },
    { slot: 'trigger', has: ['col-start-1', 'row-start-1'], why: 'the trigger owns the grid cell the hidden input is placed over' },
    { chosen: { disabled: 'true' }, slot: 'zone', has: ['opacity-[var(--fade-disabled)]'], hasNot: ['opacity-50'], why: 'disabled dims the zone and its trigger once, so the trigger carries no dimming of its own to compound with it' },
    { chosen: { disabled: 'true' }, slot: 'root', hasNot: ['opacity-[var(--fade-disabled)]'], why: 'the root carries no fade, since a child cannot lift its parent\'s opacity' },
    { chosen: { disabled: 'true' }, slot: 'trigger', hasNot: ['hover:-translate-y-[var(--lift-control)]'], why: 'a disabled trigger answers no pointer, so its hover lives in the enabled branch' },
    { slot: 'status', has: ['sr-only'], why: 'the count is announced and never drawn, because the chips already show it' },
    { slot: 'size', has: ['font-mono', 'tabular-nums'], why: 'a byte count is a figure, and figures set in tabular digits' },
  ],
  ArenaRadio: [
    { slot: 'ring', has: ['[&:has(~input:focus-visible)]:shadow-[0_0_0_var(--bw-focus)_var(--edge-focus)]'], why: 'the ring finds its own focus through an arbitrary variant, so nothing injects a stylesheet and no hook class survives, and it is the full-strength role because the accent at 16% is a wash rather than an edge' },
    { slot: 'group', has: ['flex', 'flex-col', 'gap-items'], why: 'the group is a column, and it is a display utility because the host binds it' },
  ],
  ArenaMenu: [
    { chosen: { disabled: false, destructive: false }, slot: 'item', has: [read('ArenaMenu.item', 'menus-plain-item-fill-hover', 'bg', 'hover:')], hasNot: ['hover:bg-hover', 'hover:bg-primary/14'], why: 'a plain item under the pointer reads the menus group\'s hover slot, not the selected wash' },
    { chosen: { disabled: true, destructive: false }, slot: 'item', has: ['opacity-[var(--menus-plain-item-fade-disabled,var(--fade-disabled))]', 'cursor-not-allowed'], hasNot: ['opacity-[var(--fade-disabled)]', 'opacity-60', 'text-ink-muted/(--level-ink-muted)'], why: 'a disabled item fades by the plain option\'s marker, so an answered disabled slot stops the fade' },
    { chosen: { disabled: true, destructive: true }, slot: 'item', has: ['opacity-[var(--menus-destructive-item-fade-disabled,var(--fade-disabled))]', 'cursor-not-allowed'], hasNot: ['opacity-[var(--fade-disabled)]'], why: 'a disabled destructive item fades by the destructive option\'s marker' },
    { chosen: { destructive: true, disabled: false }, slot: 'item', has: [read('ArenaMenu.item', 'menus-destructive-item-ink-rest', 'text'), read('ArenaMenu.item', 'menus-destructive-item-fill-hover', 'bg', 'hover:')], hasNot: ['text-error', INK, 'hover:bg-hover'], why: 'a destructive item reads the menus group\'s destructive option, so the danger ink is a slot a plugin answers' },
    { slot: 'root', has: ['inline-flex'], why: 'a host-bound root is never the UA-default inline box' },
    { slot: 'panel', hasNot: ['absolute', 'top-full', 'left-0', 'mt-1.5', 'left-auto', 'right-0'],
      why: 'each layer places the panel and lines it up with the trigger, so no positioning class is left for either edge' },
    { slot: 'root', hasNot: ['relative'], why: 'nothing is positioned against the host once the panel has left it' },
    { slot: 'panel', has: [read('ArenaMenu.panel', 'overlays-panel-ink-rest', 'text')], why: 'the panel writes its own ink over the platform default a top-layer panel starts from, and its rows inherit it' },
  ],
  ArenaPopover: [
    { slot: 'root', has: ['inline-flex', 'w-[var(--arena-fill-width,fit-content)]'], why: 'a host-bound root is never the UA-default inline box, and the fill channel sizes the wrapper as it does the trigger' },
    { slot: 'panel', has: ['w-max', 'max-w-[92vw]', 'z-dropdown', read('ArenaPopover.panel', 'overlays-panel-ink-rest', 'text')], hasNot: ['absolute', 'fixed', 'relative'],
      why: 'the panel takes its content\'s width up to the viewport bound, writes its own ink over the platform default a top-layer panel starts from, and leaves its position to the layer' },
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
    { slot: 'nav', has: ['disabled:opacity-[var(--actions-secondary-root-fade-disabled,var(--fade-disabled))]', 'disabled:cursor-not-allowed'], hasNot: ['disabled:text-ink-muted/40', 'disabled:opacity-[var(--fade-disabled)]'], why: 'an unreachable step says so through a :disabled variant, which only a real disabled control matches, and fades by its own marker' },
    { chosen: { current: true }, slot: 'page', has: [read('ArenaPagination.page', 'navigation-item-fill-selected', 'bg'), read('ArenaPagination.page', 'navigation-item-edge-selected', 'border'), read('ArenaPagination.page', 'navigation-item-ink-selected', 'text')], hasNot: ['bg-primary-fill', 'text-primary-content'], why: 'the current page is the navigation group\'s quiet selection: its wash, its selected ink and the selected edge its border draws' },
    { chosen: { current: false }, slot: 'page', has: [read('ArenaPagination.page', 'navigation-item-fill-rest', 'bg'), read('ArenaPagination.page', 'navigation-item-edge-rest', 'border')], hasNot: ['bg-primary-fill', 'border-edge-control-quiet'], why: 'a resting page reads the transparent rest edge, so its border draws nothing until it is current' },
    { slot: 'page', has: ['min-h-ctl-h-sm', 'min-w-ctl-h-sm', 'border-[length:var(--bw-control)]'], why: 'the shared box is set once on the page slot, so a state slot never fights it, and it reads the density rather than a step, so a page number is a target a thumb can hit in the density chosen for one' },
  ],
  ArenaSegmentedControl: [
    { chosen: { selected: true }, slot: 'segment', has: ['bg-[color:var(--choices-segment-fill-selected,var(--fill-control))]', 'font-control', 'shadow-1'], why: 'the selected segment reads as a raised chip in fill-control rather than a brand fill' },
    { chosen: { selected: false }, slot: 'segment', has: ['bg-[color:var(--choices-segment-fill-rest,transparent)]', 'text-[color:color-mix(in_oklab,var(--choices-segment-ink-rest,var(--ink-muted))_var(--level-ink-muted),transparent)]', 'hover:text-[color:color-mix(in_oklab,var(--choices-segment-ink-hover,var(--ink-body))_var(--level-ink-body),transparent)]'], why: 'an unselected segment is muted and answers hover' },
    { slot: 'track', has: ['inline-flex', 'rounded-control', 'focus-within:border-edge-focus'], why: 'the track carries the focus ring for the group, since the native inputs are hidden' },
    { slot: 'segment', has: ['rounded-control-sm'], why: 'the segment radius is one step inside the track radius' },
    { slot: 'input', has: ['opacity-0', 'size-0'], hasNot: ['hidden'], why: 'the native input is hidden by the recipe rather than by display none, so it stays focusable' },
  ],
  ArenaSelect: [
    { slot: 'error', has: [ERROR_INK('ArenaSelect.error')], hasNot: ['text-error', 'text-ink-invalid'], why: 'the field error message reads the invalid ink role, so a plugin answering ink-invalid moves the message with the edge' },
    { slot: 'field', has: ['focus:border-edge-focus'], why: 'the focus ring is the recipe\'s job, not the component\'s, so nothing injects a stylesheet for it' },
    { slot: 'field', has: ['appearance-none', 'pr-9'], why: 'the field strips the platform chrome and reserves the room the caret Arena draws sits in' },
    { slot: 'root', has: ['flex'], why: 'a host-bound root is never the UA-default inline box' },
    { slot: 'caret', has: ['pointer-events-none'], why: 'the caret is decoration over the native control and must not swallow the click' },
    { slot: 'field', has: ['focus:border-edge-focus', 'focus:outline-hidden'], why: 'a select takes focus itself, so the ring is focus rather than focus-within' },
  ],
  ArenaSheet: [
    { chosen: { open: true }, slot: 'root', has: ['flex'],
      why: 'the display utility stays on the base, since the host binds the root slot and a placement class writes no display' },
  ],
  ArenaSideNav: [
    { chosen: { current: true }, slot: 'item', has: [read('ArenaSideNav.item', 'navigation-item-fill-selected', 'bg'), read('ArenaSideNav.item', 'navigation-item-ink-selected', 'text')], hasNot: ['bg-primary/14', 'bg-selected/(--level-accent-soft-primary)'], why: 'the current page is a wash in the selected ink, read from the navigation group\'s selected slots' },
    { chosen: { current: false }, slot: 'badge', has: [read('ArenaSideNav.badge', 'navigation-badge-fill-rest', 'bg')], hasNot: ['bg-base-300'], why: 'the count beside a row that is not current is the quiet marker fill' },
    ...['item', 'trigger'].map((slot) => ({ slot, has: ['flex', 'items-center', 'gap-row', 'px-nav-row-x', 'py-nav-row-y', 'rounded-control'],
      why: 'the trigger matches the item metrics, or a collapsible header will not line up with its siblings' })),
    { slot: 'root', has: ['flex', 'flex-col'], why: 'the rail is a column, and it is a display utility because the host binds it' },
  ],
  ArenaSwitch: [
    { chosen: { state: true }, slot: 'knob', has: ['[translate:var(--arena-orientation-knob-on,100%_0)]'], hasNot: ['translate-x-0'], why: 'the knob travels to the end its orientation names, and the channel falls back to the horizontal one' },
    { chosen: { state: false }, slot: 'knob', has: ['translate-x-0'], hasNot: ['[translate:var(--arena-orientation-knob-on,100%_0)]'], why: 'an off knob rests at the start, whichever way the switch lies' },
    { chosen: { state: true }, slot: 'track', has: ['bg-[color:var(--choices-box-fill-selected,var(--fill-control-on))]'], why: 'on fills the track as a ticked box and off keeps the box at rest' },
    { chosen: { state: false }, slot: 'track', has: ['bg-[color:var(--choices-box-fill-rest,var(--fill-control))]'], why: 'on fills the track as a ticked box and off keeps the box at rest' },
    { chosen: { state: false }, slot: 'icon', has: ['text-[color:var(--choices-knob-ink-rest,var(--ink-knob-off))]'], why: 'the icon is the knob glyph, drawn on the knob it sits in' },
    { chosen: { state: false }, slot: 'knob', has: ['bg-[color:var(--choices-knob-fill-rest,var(--fill-knob-off))]'], why: 'the knob reads the choices knob, against the box it sits on' },
    { chosen: { disabled: true }, slot: 'label', has: ['opacity-[var(--fade-disabled)]'], hasNot: ['opacity-50'], why: 'disabled fades the label, and the track fades under disabled: until a disabled box answer stops it' },
    { slot: 'track', has: ['disabled:opacity-[var(--choices-box-fade-disabled,var(--fade-disabled))]'], why: 'disabled fades the label, and the track fades under disabled: until a disabled box answer stops it' },
  ],
  ArenaCalendar: [
    { chosen: { disabled: true }, slot: 'chip', has: ['opacity-[var(--fade-disabled)]', 'cursor-not-allowed'], hasNot: ['opacity-50'], why: 'a disabled control keeps its rest ink and fades by the role the skin answers' },
  ],
  ArenaTreeView: [
    { chosen: { selected: true }, slot: 'item', has: [read('ArenaTreeView.item', 'navigation-item-fill-selected', 'bg'), read('ArenaTreeView.item', 'navigation-item-ink-selected', 'text')], hasNot: ['bg-primary/14', 'bg-selected/(--level-accent-soft-primary)'], why: 'the selected row is a wash in the selected ink, read from the navigation group\'s selected slots' },
    { chosen: { disabled: true }, slot: 'item', has: ['opacity-[var(--navigation-item-fade-disabled,var(--fade-disabled))]', 'cursor-not-allowed'], hasNot: ['text-ink-muted/40', 'opacity-[var(--fade-disabled)]'], why: 'a disabled control keeps its rest ink and fades by its own marker until a disabled answer stops it' },
  ],
  ArenaTabs: [
    { slot: 'root', has: ['flex', 'border-b-[length:var(--bw-separator)]', `border-[color:${memberValue(SLOTS, 'ArenaTabs.root', 'surfaces-separator-edge-rest', 'tailwind')}]`], why: 'the tablist sits on a hairline rule that the selected tab overdraws' },
    { chosen: { selected: true }, slot: 'tab', has: ['font-control', read('ArenaTabs.tab', 'navigation-item-ink-selected', 'text'), `shadow-[inset_0_calc(var(--bw-strong)*-1)_0_${memberValue(SLOTS, 'ArenaTabs.tab', 'navigation-item-edge-selected', 'tailwind')}]`], why: 'the selected tab is marked by an inset rule in the navigation group\'s selected edge rather than a fill' },
    { chosen: { selected: false }, slot: 'tab', has: ['font-medium', read('ArenaTabs.tab', 'navigation-item-ink-rest', 'text'), `shadow-[inset_0_calc(var(--bw-strong)*-1)_0_${memberValue(SLOTS, 'ArenaTabs.tab', 'navigation-item-edge-rest', 'tailwind')}]`], hasNot: ['shadow-none'], why: 'an unselected tab is muted and its rule reads the transparent rest edge, so it carries no underline' },
    { slot: 'tab', has: ['focus-visible:outline-hidden'], why: 'a directly focused slot hides the browser\'s own outline and keeps a transparent one for forced colours' },
    {
      slot: 'tab',
      has: ['focus-visible:ring-[length:var(--bw-focus)]', 'focus-visible:ring-edge-focus'],
      why: 'the ring is a ring utility rather than a shadow one, for the reason the tab focus-ring test in this file carries',
    },
    { chosen: { selected: true }, slot: 'panel', has: ['block'], hasNot: ['hidden'], why: 'exactly one panel is shown, and the other is hidden rather than merely unstyled' },
    { chosen: { selected: false }, slot: 'panel', has: ['block', 'hidden'], why: 'exactly one panel is shown, and the other is hidden rather than merely unstyled: the base block and the branch hidden are both present and the branch is emitted later' },
  ],
  ArenaTextarea: [
    { slot: 'error', has: [ERROR_INK('ArenaTextarea.error')], hasNot: ['text-error', 'text-ink-invalid'], why: 'the field error message reads the invalid ink role, so a plugin answering ink-invalid moves the message with the edge' },
    { slot: 'field', has: ['focus:border-edge-focus'], why: 'the focus ring is the recipe\'s job, not the component\'s, so nothing injects a stylesheet for it' },
    { chosen: { state: 'neutral' }, slot: 'field', has: ['focus:border-edge-focus'], hasNot: ['border-success'], why: 'a textarea takes focus itself, so its ring is focus rather than focus-within' },
    { chosen: { state: 'error' }, slot: 'field', has: [read('ArenaTextarea.field', 'fields-error-field-edge-rest', 'border'), `ring-[color:${haloValue(SLOTS, 'ArenaTextarea.field', 'error')}]`], hasNot: ['border-success'], why: 'error rings at rest and says which it is' },
    { chosen: { resize: 'vertical' }, slot: 'field', has: ['resize-y'], why: 'resize is the consumer\'s choice and the recipe carries both answers' },
    { chosen: { resize: 'none' }, slot: 'field', has: ['resize-none'], why: 'resize is the consumer\'s choice and the recipe carries both answers' },
    { chosen: { disabled: true }, slot: 'label', has: ['opacity-[var(--fade-disabled)]'], hasNot: ['opacity-50'], why: 'disabled dims each part on its own, so an answered disabled field slot can stop the fade on its part alone' },
    { chosen: { disabled: true }, slot: 'root', hasNot: ['opacity-[var(--fade-disabled)]'], why: 'the root carries no fade, since a child cannot lift its parent\'s opacity' },
    { chosen: { readOnly: true }, slot: 'field', has: [read('ArenaTextarea.field', 'fields-readonly-field-fill-rest', 'bg'), 'cursor-default'], why: 'readonly changes the surface, not the border' },
    { slot: 'counter', has: ['font-mono', read('ArenaTextarea.counter', 'fields-neutral-counter-ink-rest', 'text')], why: 'the counter is a muted mono readout' },
    { chosen: { near: true }, slot: 'counter', has: [read('ArenaTextarea.counter', 'fields-warning-counter-ink-rest', 'text')], hasNot: ['text-warning'], why: 'the counter warns before it refuses, which is a warning ink read from the hue channel and not a danger one' },
    { slot: 'foot', has: ['justify-between'], why: 'the foot spaces the help text and the counter to opposite ends' },
  ],
  ArenaBadge: [
    ...STATUS.map((tone) => ({ chosen: { tone }, slot: 'root', has: SOFT_OF(tone), why: `${MARK_WHY}, inside the mark channel arena-mark-solid writes` })),
    { chosen: { tone: 'neutral' }, slot: 'root', has: [MARK_SOFT, MARK_INK], hasNot: [...STATUS.flatMap(SOFT_OF), SOFT, 'bg-base-300', 'bg-primary/14', 'bg-secondary/16'], why: 'a neutral badge is the absence of a hue, so the accent channel washes it and the tone adds no class' },
    { slot: 'root', hasNot: ['text-ink-body/(--level-ink-body)'], why: 'the ink of a badge is the body ink its marks soft slot gives unless arena-mark-solid writes the hue\'s on-ink, so it is read behind the mark channel' },
    { slot: 'root', has: ['w-fit'], why: 'a badge is as wide as its label in a card body, where a width of auto would stretch it' },
    { slot: 'dot', has: ['bg-current'], why: 'the dot takes the tone ink from the text colour around it rather than naming one' },
    ...['neutral', 'success', 'warning', 'danger', 'info'].map((tone) => ({
      chosen: { tone }, slot: 'root', has: ['rounded-marker', 'font-face-label', 'case-label', 'tracking-label-role'],
      why: 'every tone keeps the shared chip base, the marker radius roles.json gives a badge, and the mono uppercase micro-label',
    })),
  ],
};

const READS: [component: string, slot: string, question: string, reads: string[], chosen?: Record<string, string>][] = [
  ['ArenaButton', 'root', 'size.control-h', ['h-[var(--arena-size-control-h,var(--size-md-control-h))]']],
  ['ArenaIconButton', 'root', 'size.control-h', ['h-[var(--arena-size-control-h,var(--size-md-control-h))]', 'min-w-[var(--arena-size-control-h,var(--size-md-control-h))]']],
  ['ArenaButton', 'root', 'size.control-pad-x', ['px-[var(--arena-size-control-pad-x,var(--size-md-control-pad-x))]']],
  ['ArenaButton', 'root', 'size.control-step', ['text-[length:var(--arena-size-control-step,var(--size-md-control-step))]']],
  ['ArenaFileInput', 'trigger', 'size.control-h', ['h-[var(--arena-size-control-h,var(--size-md-control-h))]']],
  ['ArenaFileInput', 'trigger', 'size.control-pad-x', ['px-[var(--arena-size-control-pad-x,var(--size-md-control-pad-x))]']],
  ['ArenaFileInput', 'trigger', 'size.control-step', ['text-[length:var(--arena-size-control-step,var(--size-md-control-step))]']],
  ['ArenaFileInput', 'trigger', 'emphasis.fill', ['bg-[color:var(--arena-emphasis-fill)]']],
  ['ArenaFileInput', 'trigger', 'emphasis.ink', ['text-[color:var(--arena-emphasis-ink)]']],
  ['ArenaFileInput', 'trigger', 'emphasis.edge', ['border-[color:var(--arena-emphasis-edge)]']],
  ['ArenaFileInput', 'trigger', 'emphasis.fill-hover', ['hover:bg-[color:var(--arena-emphasis-fill-hover)]']],
  ['ArenaFileInput', 'trigger', 'emphasis.shadow-hover', ['hover:shadow-[var(--arena-emphasis-shadow-hover)]']],
  ['ArenaSegmentedControl', 'segment', 'size.segment-h', ['h-[var(--arena-size-segment-h,var(--size-md-segment-h))]']],
  ['ArenaSegmentedControl', 'segment', 'size.segment-pad-x', ['px-[var(--arena-size-segment-pad-x,var(--size-md-segment-pad-x))]']],
  ['ArenaSegmentedControl', 'segment', 'size.segment-step', ['text-[length:var(--arena-size-segment-step,var(--size-md-segment-step))]']],
  ['ArenaSwitch', 'knob', 'size.switch-knob', ['size-[var(--arena-size-switch-knob,var(--size-md-switch-knob))]']],
  ['ArenaSwitch', 'icon', 'size.switch-icon', ['text-[length:var(--arena-size-switch-icon,var(--size-md-switch-icon))]']],
  ['ArenaSpinner', 'circle', 'size.spinner', ['size-[var(--arena-size-spinner,var(--size-md-spinner))]']],
  ['ArenaProgressBar', 'track', 'size.meter', ['h-[var(--arena-size-meter,var(--size-md-meter))]']],
  ['ArenaSlider', 'rail', 'size.meter', ['h-[var(--arena-size-meter,var(--size-md-meter))]']],
  ['ArenaSlider', 'fill', 'size.meter', ['h-[var(--arena-size-meter,var(--size-md-meter))]']],
  ['ArenaSlider', 'rail', 'size.meter', ['w-[var(--arena-size-meter,var(--size-md-meter))]'], { orientation: 'vertical' }],
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
  ['ArenaBadge', 'root', 'size.badge-pad-x', ['px-[var(--arena-size-badge-pad-x,calc(var(--sp-1)*2.5))]']],
  ['ArenaBadge', 'root', 'size.badge-pad-y', ['py-[var(--arena-size-badge-pad-y,var(--pad-marker-y))]']],
  ['ArenaBadge', 'root', 'size.badge-step', ['text-[length:var(--arena-size-badge-step,var(--dz-text-xs))]']],
  ['ArenaAppLogo', 'root', 'orientation.direction', ['[flex-direction:var(--arena-orientation-direction,row)]']],
  ['ArenaSwitch', 'track', 'orientation.direction', ['[flex-direction:var(--arena-orientation-direction,row)]']],
  ['ArenaAppLogo', 'root', 'orientation.logo-gap', ['gap-[var(--arena-orientation-logo-gap,calc(var(--sp-1)*2.5))]']],
  ['ArenaDivider', 'root', 'orientation.direction', ['[flex-direction:var(--arena-orientation-direction,row)]'], { labelled: 'true' }],
  ['ArenaDivider', 'root', 'orientation.rule-w', ['w-[var(--arena-orientation-rule-w,100%)]', 'h-[var(--arena-orientation-rule-h,var(--bw-separator))]'], { labelled: 'false' }],
  ['ArenaDivider', 'rule', 'orientation.rule-w', ['w-[var(--arena-orientation-rule-w,100%)]', 'h-[var(--arena-orientation-rule-h,var(--bw-separator))]'], { labelled: 'true' }],
  ['ArenaStepper', 'root', 'orientation.direction', ['[flex-direction:var(--arena-orientation-direction,row)]']],
  ['ArenaStepper', 'rail', 'orientation.direction', ['[flex-direction:var(--arena-orientation-direction,row)]']],
  ['ArenaStepper', 'rail', 'orientation.rule-w', ['basis-[var(--arena-orientation-rule-w,100%)]']],
  ['ArenaStepper', 'text', 'orientation.rule-w', ['basis-[var(--arena-orientation-rule-w,100%)]']],
  ['ArenaTimeline', 'root', 'orientation.direction', ['[flex-direction:var(--arena-orientation-direction,column)]']],
  ['ArenaTimeline', 'rail', 'orientation.direction', ['[flex-direction:var(--arena-orientation-direction,column)]']],
  ['ArenaTimeline', 'rail', 'orientation.rule-w', ['basis-[var(--arena-orientation-rule-w,var(--bw-separator))]']],
  ['ArenaTimeline', 'content', 'orientation.rule-w', ['basis-[var(--arena-orientation-rule-w,var(--bw-separator))]']],
  ['ArenaTimeline', 'connector', 'orientation.rule-w', ['w-[var(--arena-orientation-rule-w,var(--bw-separator))]', 'h-[var(--arena-orientation-rule-h,auto)]']],
  ['ArenaStepper', 'connector', 'orientation.rule-w', ['w-[var(--arena-orientation-rule-w,100%)]', 'h-[var(--arena-orientation-rule-h,var(--bw-separator))]']],
  ['ArenaSwitch', 'track', 'orientation.track-w', ['w-[var(--arena-orientation-track-w,var(--arena-size-switch-long,var(--size-md-switch-long)))]', 'h-[var(--arena-orientation-track-h,var(--arena-size-switch-short,var(--size-md-switch-short)))]']],
  ['ArenaButton', 'root', 'emphasis.fill', ['bg-[color:var(--arena-emphasis-fill)]']],
  ['ArenaIconButton', 'root', 'emphasis.fill', ['bg-[color:var(--arena-emphasis-fill)]']],
  ['ArenaButton', 'root', 'emphasis.ink', ['text-[color:var(--arena-emphasis-ink)]']],
  ['ArenaIconButton', 'root', 'emphasis.ink', ['text-[color:var(--arena-emphasis-ink)]']],
  ['ArenaButton', 'root', 'emphasis.edge', ['border-[color:var(--arena-emphasis-edge)]']],
  ['ArenaIconButton', 'root', 'emphasis.icon-edge', ['border-[length:var(--bw-control)]', 'border-[color:var(--arena-emphasis-icon-edge)]', '[border-style:var(--arena-emphasis-edge-style)]']],
  ['ArenaButton', 'root', 'emphasis.fill-hover', ['hover:bg-[color:var(--arena-emphasis-fill-hover)]']],
  ['ArenaIconButton', 'root', 'emphasis.fill-hover', ['hover:bg-[color:var(--arena-emphasis-fill-hover)]'], { pressed: 'false' }],
  ['ArenaBadge', 'root', 'accent.marks-soft-fill', [MARK_SOFT]],
  ['ArenaBadge', 'root', 'accent.marks-soft-ink', [MARK_INK]],
  ['ArenaBadge', 'root', 'mark.fill', [MARK_SOFT]],
  ['ArenaBadge', 'root', 'mark.ink', [MARK_INK]],
  ['ArenaStatCard', 'value', 'accent.marks-label-ink', ['text-[color:var(--arena-accent-marks-label-ink)]']],
  ['ArenaProgressBar', 'track', 'accent.meters-track-ink', ['text-[color:var(--arena-accent-meters-track-ink)]']],
  ['ArenaProgressBar', 'track', 'accent.meters-track-fill', ['bg-[color:var(--arena-accent-meters-track-fill)]']],
  ['ArenaProgressBar', 'ring', 'accent.meters-track-ink', ['text-[color:var(--arena-accent-meters-track-ink)]']],
  ['ArenaProgressBar', 'ringTrack', 'accent.meters-track-fill', ['stroke-[color:var(--arena-accent-meters-track-fill)]']],
  ['ArenaMeter', 'track', 'accent.meters-track-ink', ['text-[color:var(--arena-accent-meters-track-ink)]']],
  ['ArenaMeter', 'track', 'accent.meters-track-fill', ['bg-[color:var(--arena-accent-meters-track-fill)]']],
  ['ArenaActivityFeed', 'dot', 'accent.marks-dot-ink', ['text-[color:var(--arena-accent-marks-dot-ink)]']],
  ['ArenaSpinner', 'root', 'accent.meters-track-ink', ['text-[color:var(--arena-accent-meters-track-ink)]']],
  ['ArenaTag', 'root', 'accent.marks-outline-ink', ['text-[color:var(--arena-accent-marks-outline-ink)]']],
  ['ArenaCard', 'root', 'accent.edge', ['border-[color:var(--arena-accent-surfaces-card-edge)]']],
  ['ArenaTag', 'root', 'accent.marks-outline-edge', ['border-[color:var(--arena-accent-marks-outline-edge)]']],
  ['ArenaToast', 'root', 'accent.feedback-banner-edge', ['border-l-[color:var(--arena-accent-feedback-banner-edge)]']],
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
  ['ArenaButton', 'root', 'emphasis.shadow-hover', ['hover:shadow-[var(--arena-emphasis-shadow-hover)]']],
  ['ArenaSplitButton', 'primary', 'size.control-h', ['h-[var(--arena-size-control-h,var(--size-md-control-h))]']],
  ['ArenaSplitButton', 'caret', 'size.control-h', ['h-[var(--arena-size-control-h,var(--size-md-control-h))]']],
  ['ArenaSplitButton', 'primary', 'size.control-pad-x', ['px-[var(--arena-size-control-pad-x,var(--size-md-control-pad-x))]']],
  ['ArenaSplitButton', 'primary', 'size.control-step', ['text-[length:var(--arena-size-control-step,var(--size-md-control-step))]']],
  ['ArenaSplitButton', 'primary', 'emphasis.fill', ['bg-[color:var(--arena-emphasis-fill)]']],
  ['ArenaSplitButton', 'primary', 'emphasis.ink', ['text-[color:var(--arena-emphasis-ink)]']],
  ['ArenaSplitButton', 'primary', 'emphasis.edge', ['border-[color:var(--arena-emphasis-edge)]']],
  ['ArenaSplitButton', 'primary', 'emphasis.fill-hover', ['hover:bg-[color:var(--arena-emphasis-fill-hover)]'], { destructive: 'false' }],
  ['ArenaSplitButton', 'primary', 'emphasis.shadow-hover', ['hover:shadow-[var(--arena-emphasis-shadow-hover)]'], { destructive: 'false' }],
  ['ArenaSplitButton', 'caret', 'size.control-step', ['text-[length:var(--arena-size-control-step,var(--size-md-control-step))]']],
  ['ArenaSplitButton', 'caret', 'emphasis.fill', ['bg-[color:var(--arena-emphasis-fill)]']],
  ['ArenaSplitButton', 'caret', 'emphasis.ink', ['text-[color:var(--arena-emphasis-ink)]']],
  ['ArenaSplitButton', 'caret', 'emphasis.edge', ['border-[color:var(--arena-emphasis-edge)]']],
  ['ArenaSplitButton', 'caret', 'emphasis.fill-hover', ['hover:bg-[color:var(--arena-emphasis-fill-hover)]'], { destructive: 'false' }],
  ['ArenaSplitButton', 'caret', 'emphasis.shadow-hover', ['hover:shadow-[var(--arena-emphasis-shadow-hover)]'], { destructive: 'false' }],
];

const mutable = CLAIMS as unknown as Record<string, Claim[]>;
for (const [component, slot, question, reads, chosen] of READS) {
  (mutable[component] ??= []).push({
    ...(chosen ? { chosen } : {}), slot, has: reads,
    why: reads.every((one) => /var\(--arena-[a-z0-9-]+,/.test(one))
      ? `the ${slot} answers ${question} through its channel, with the family default as its fallback, so no option written is the look it had before the family`
      : `the ${slot} answers ${question} through its channel, which the family's default block writes on the part, so no option written is the look of the default`,
  });
}

test('every size, orientation, emphasis, accent, mark, elevation, align, layout and placement question a slot answers is read through its own channel, with a fallback unless the part\'s default block writes it', () => {
  const blocks = new Map([...['emphasis', 'accent'].flatMap((family) => [...defaultBlockChannels(readFamilies().get(family) as Family, [...layerManifests().values()])])]);
  for (const [component, slot, , reads] of READS) {
    for (const one of reads) {
      for (const [, channel, end] of one.matchAll(/var\((--arena-(?:size|orientation|emphasis|accent|mark|elevation|align|layout|placement)-[a-z0-9-]+)([,)])/g)) {
        const written = blocks.get(`${component}.${slot}`)?.has(channel as string) ?? false;
        assert.equal(end, written ? ')' : ',', `${component}.${slot} reads ${channel} ${written ? 'bare, since its default block writes it' : 'with the fallback that stands in for it'}`);
      }
    }
  }
  for (const [component, slot, question, reads] of READS) {
    const family = question.split('.')[0]!;
    assert.ok(reads.some((one) => one.includes(`var(--arena-${family}-`)), `${component}.${slot} reads no ${family} channel`);
  }
});

test('every slot that takes a placeholder colours it, rather than inheriting preflight', () => {
  const wanted = `placeholder:text-[color:color-mix(in_oklab,${memberValue(SLOTS, 'ArenaInput.input', 'fields-value-ink-rest', 'tailwind')}_var(--level-ink-muted),transparent)]`;
  for (const [component, slot] of [
    ['ArenaInput', 'input'],
    ['ArenaNumberField', 'input'],
    ['ArenaTextarea', 'field'],
    ['ArenaCommandPalette', 'input'],
    ['ArenaCombobox', 'input'],
  ] as const) {
    assert.ok(resolve(component, {}, slot).includes(wanted),
      `${component}.${slot} takes a placeholder and colours none, so Tailwind's preflight paints `
      + 'it at 50% of currentcolor: a level nothing in Arena declared, nothing measures, and one '
      + 'that fails AA on six of the ten palettes measured, this skin\'s own light theme included');
  }
});

test('a status a component states follows the accent read in the slot string, so the status wins over any accent', () => {
  const stated: [string, string, string, string[]][] = [
    ['ArenaBadge', 'root', 'accent-marks-soft-fill', ['success', 'warning', 'danger', 'info']],
    ['ArenaStatCard', 'value', 'accent-marks-label-ink', ['success', 'warning', 'danger', 'info']],
    ['ArenaTag', 'root', 'accent-marks-outline-edge', ['success', 'warning', 'danger']],
    ['ArenaToast', 'root', 'accent-feedback-banner-edge', ['success', 'danger']],
    ['ArenaProgressBar', 'track', 'accent-meters-track-ink', ['success', 'danger', 'info']],
    ['ArenaActivityFeed', 'dot', 'accent-marks-dot-ink', ['success', 'warning', 'danger', 'info']],
  ];
  for (const [component, slot, channel, tones] of stated) {
    for (const tone of tones) {
      const classes = resolve(component, { tone }, slot);
      const accent = classes.findIndex((one) => one.includes(`--arena-${channel},`) || one.includes(`--arena-${channel})`));
      const meaning = classes.findIndex((one) => one.includes('--arena-hue-') || one.includes(`--feedback-${tone}-banner-`) || one.includes(`--marks-${tone}-`) || one.includes(`--meters-${tone}-track-`));
      assert.ok(accent >= 0 && meaning > accent, `${component}.${slot} at tone ${tone} must write its hue read after the ${channel} read`);
    }
  }
});

test('a component whose tone is optional carries no default for it, so an untoned one paints its accent', () => {
  for (const component of ['ArenaProgressBar', 'ArenaActivityFeed'])
    assert.equal(manifests.get(component)?.defaultVariants?.tone, undefined, `${component} still defaults its tone`);
});

test('a non-destructive button draws its focus ring as an outline no hover rule writes, so a hovered and focused one keeps the ring', () => {
  const sheet = readFileSync(join(repoRoot, 'frameworks/tailwind/consume/components/forms/arena-button/ArenaButton.styles.generated.css'), 'utf8');
  const selector = '.arena-button__root:where(:not([data-arena-destructive]))';
  const hover = sheet.indexOf(`${selector}:hover {`);
  assert.ok(hover >= 0, 'the compiled sheet has no non-destructive hover rule');
  assert.match(sheet, /&:focus-visible \{\s*outline-style: var\(--tw-outline-style\);\s*outline-width: var\(--bw-focus\);/, 'the root draws no focus outline');
  assert.ok(!/outline/.test(sheet.slice(hover, sheet.indexOf('}', hover))), 'the hover rule writes an outline over the focus ring');
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

test('a key cap is drawn one way wherever it appears, so a plugin answers every cap through the key roles', () => {
  const cap = resolve('ArenaKbd', {}, 'key');
  assert.deepEqual(resolve('ArenaCommandPalette', {}, 'esc'), cap,
    'the escape cap and an ArenaKbd cap drifted apart, so a plugin moving the key register moves one of them');
  for (const role of ['font-face-key', 'case-key', 'text-[color:color-mix(in_oklab,var(--text-key-ink-rest,', 'py-key-y'])
    assert.ok(cap.some((one) => one.startsWith(role)), `the cap reads no ${role}, so a plugin cannot reach that part of it`);
  for (const [component, slot] of [['ArenaMenu', 'shortcut'], ['ArenaCommandPalette', 'shortcut'], ['ArenaKbd', 'separator']] as const) {
    const bare = resolve(component, {}, slot);
    assert.ok(bare.includes('font-face-key') && bare.some((one) => one.startsWith('text-[color:color-mix(in_oklab,var(--text-key-ink-rest,')),
      `${component}.${slot} prints a key outside the key register, in a face or an ink no key role answers`);
  }
});

const FOCUS_MODIFIER = /(^|[:\]])focus(-visible|-within)?:/;

function everyClassBySlot(): [string, string, string[]][] {
  const found: [string, string, string[]][] = [];
  for (const [component, manifest] of manifests)
    for (const [slot, strings] of classStringsBySlot(manifest))
      found.push([component, slot, strings.flatMap((one) => one.split(/\s+/).filter(Boolean))]);
  return found;
}

test('no manifest reads a focus compatibility alias', () => {
  const problems: string[] = [];
  for (const [component, slot, classes] of everyClassBySlot()) {
    for (const cls of classes) {
      if (/--focus-ring|(^|:)ring-primary|(^|:)ring-secondary|(^|:)border-secondary/.test(cls))
        problems.push(`${component}.${slot} reads ${cls}`);
      if (FOCUS_MODIFIER.test(cls) && cls.includes('--focus-width'))
        problems.push(`${component}.${slot} reads --focus-width inside the focus class ${cls}`);
    }
  }
  assert.deepEqual(problems, [],
    'focus is answered by the edge-focus and bw-focus roles, so a nested plugin answering them reaches every component');
});

test('an errored field carries no focus edge', () => {
  for (const component of ['ArenaInput', 'ArenaNumberField', 'ArenaCombobox', 'ArenaSelect', 'ArenaPinInput', 'ArenaTextarea']) {
    const manifest = manifests.get(component) as { slots: Record<string, string>; variants: Record<string, Record<string, Record<string, string>>> };
    const field = Object.keys(manifest.variants.state?.error ?? {})[0] as string;
    const base = (manifest.slots[field] ?? '').split(/\s+/);
    const error = (manifest.variants.state!.error![field] ?? '').split(/\s+/);
    const focusOf = (list: string[]) => list.filter((cls) => FOCUS_MODIFIER.test(cls) && /(border|ring|shadow)-/.test(cls.replace(FOCUS_MODIFIER, "")));
    assert.deepEqual(focusOf(base), [], `${component}.${field} base carries a focus class, which would turn an errored field gold on focus`);
    assert.deepEqual(focusOf(error), [], `${component}.${field} state=error carries a focus class`);
    const neutral = (manifest.variants.state!.neutral![field] ?? '').split(/\s+/);
    assert.ok(neutral.some((cls) => /^focus(-within)?:border-edge-focus$/.test(cls)), `${component}.${field} state=neutral lacks its focus edge`);
  }
});

test('every slot that gained a ring keeps it under hover', () => {
  const RING = 'focus-visible:shadow-[inset_0_0_0_var(--bw-focus)_var(--edge-focus)]';
  const gained: [string, string][] = [
    ['ArenaSideNav', 'item'], ['ArenaSideNav', 'trigger'], ['ArenaMenu', 'item'], ['ArenaBreadcrumbs', 'crumb'],
  ];
  for (const [component, slot] of gained) {
    const manifest = manifests.get(component) as { slots: Record<string, string> };
    assert.ok((manifest.slots[slot] ?? '').split(/\s+/).includes(RING), `${component}.${slot} base lacks the focus ring`);
    const strings = classStringsBySlot(manifest as never).get(slot) ?? [];
    const hover = strings.flatMap((one) => one.split(/\s+/)).filter((cls) => cls.includes('hover:shadow-'));
    assert.deepEqual(hover, [], `${component}.${slot} sets ${hover.join(' ')}, which replaces the inset ring while the pointer rests on a focused control`);
  }
});

test('a focus ring never sits on a filled ground', () => {
  const INSET = 'focus-visible:shadow-[inset_0_0_0_var(--bw-focus)_var(--edge-focus)]';
  const OUTLINE = ['focus-visible:outline-[length:var(--bw-focus)]', 'focus-visible:outline-edge-focus', 'focus-visible:outline-offset-[var(--gap-focus)]'];
  const isFill = (cls: string) => {
    const colour = /^(?:[\w-]+:)*bg-(.+)$/.exec(cls)?.[1];
    if (colour === undefined || /\/(?:\d|\(|\[)/.test(colour) || /^(?:transparent|hover|surface|track|field|base|raised|sunken|selected|\[?color:var\(--hover)/.test(colour)) return false;
    if (/fill-(?:soft|hover)/.test(colour)) return false;
    if (/^\[color:(?:color-mix\(in_oklab,)?var\(--(?:menus|navigation)-/.test(colour)) return false;
    return /fill|^(?:primary|secondary|accent|neutral|error|success|warning|info)$/.test(colour);
  };
  assert.equal(isFill('bg-[color:var(--arena-hue-fill-soft)]'), false);
  assert.equal(isFill('hover:bg-[color:var(--arena-emphasis-fill-hover,var(--x))]'), false);
  assert.equal(isFill('active:bg-[color:var(--menus-plain-item-fill-pressed,var(--x))]'), false, 'a menu row\'s wash is the ground its ring sits on, not a fill that hides it');
  assert.equal(isFill('bg-primary-fill'), true);
  assert.equal(isFill('bg-[color:var(--arena-emphasis-fill,var(--x))]'), true);
  const filled: [string, string][] = [
    ['ArenaButton', 'root'], ['ArenaSplitButton', 'primary'], ['ArenaSplitButton', 'caret'], ['ArenaConfirmDialog', 'confirm'],
    ['ArenaIconButton', 'root'], ['ArenaFileInput', 'trigger'], ['ArenaSwitch', 'track'], ['ArenaPagination', 'page'], ['ArenaPagination', 'nav'],
  ];
  for (const [component, slot] of filled) {
    const manifest = manifests.get(component) as { slots: Record<string, string> };
    const base = (manifest.slots[slot] ?? '').split(/\s+/);
    for (const cls of OUTLINE) assert.ok(base.includes(cls), `${component}.${slot} base lacks ${cls}`);
    assert.ok(!base.includes('outline-none') && !base.includes('focus-visible:outline-none'), `${component}.${slot} strips the outline it draws`);
  }
  for (const manifest of manifests.values() as Iterable<{ component: string }>) {
    for (const [slot, strings] of classStringsBySlot(manifest as never)) {
      const classes = strings.flatMap((one) => one.split(/\s+/));
      if (!classes.some(isFill)) continue;
      assert.ok(!classes.includes(INSET), `${manifest.component}.${slot} has a fill and draws its focus ring inset on it`);
      assert.deepEqual(classes.filter((cls) => cls.includes('hover:outline-')), [], `${manifest.component}.${slot} sets a hover outline over the focus ring`);
    }
  }
});

test('an invalid field reads the fields group\'s error slots', () => {
  const fields: [string, string][] = [
    ['ArenaInput', 'field'], ['ArenaNumberField', 'field'], ['ArenaCombobox', 'field'], ['ArenaSelect', 'field'],
    ['ArenaTextarea', 'field'], ['ArenaPinInput', 'cell'], ['ArenaFileInput', 'zone'],
  ];
  const HUE_EDGE = 'border-[color:var(--arena-hue-edge)]';
  const HUE_INK = 'text-[color:var(--arena-hue-ink)]';
  for (const [component, slot] of fields) {
    const classes = resolve(component, { state: 'error', ...(slot === 'zone' ? { droppable: 'true' } : {}) }, slot);
    assert.ok(classes.includes(read(`${component}.${slot}`, 'fields-error-field-edge-rest', 'border')), `${component}.${slot} state=error lacks the error edge read`);
    assert.ok(!classes.includes(HUE_EDGE) && !classes.includes('border-edge-invalid'), `${component}.${slot} state=error still reads a role directly`);
  }
  for (const component of ['ArenaInput', 'ArenaNumberField', 'ArenaCombobox', 'ArenaPinInput', 'ArenaFieldset']) {
    const classes = resolve(component, { state: 'error' }, 'statusIcon');
    assert.ok(classes.includes(read(`${component}.statusIcon`, 'fields-error-status-ink-rest', 'text')), `${component}.statusIcon state=error lacks the status ink read`);
    assert.ok(!classes.includes(HUE_INK) && !classes.includes('text-ink-invalid'), `${component}.statusIcon state=error still reads a role directly`);
  }
  for (const component of ['ArenaInput', 'ArenaNumberField', 'ArenaCombobox', 'ArenaPinInput', 'ArenaFieldset', 'ArenaFileInput', 'ArenaSelect', 'ArenaTextarea']) {
    const classes = resolve(component, {}, 'error');
    assert.ok(classes.includes(ERROR_INK(`${component}.error`)), `${component}.error lacks the error ink read`);
    assert.ok(!classes.includes(HUE_INK) && !classes.includes('text-ink-invalid'), `${component}.error still reads a role directly`);
  }
  const rejection = resolve('ArenaFileInput', {}, 'rejection');
  assert.ok(rejection.includes(ERROR_INK('ArenaFileInput.rejection')) && !rejection.includes(HUE_INK), 'ArenaFileInput.rejection reads the error ink');
  const input = resolve('ArenaConfirmDialog', { invalid: true }, 'input');
  assert.ok(input.includes(read('ArenaConfirmDialog.input', 'fields-error-field-edge-rest', 'border')) && !input.includes(HUE_EDGE), 'ArenaConfirmDialog input invalid=true reads the error edge');
  for (const component of ['ArenaInput', 'ArenaNumberField', 'ArenaCombobox', 'ArenaSelect', 'ArenaTextarea', 'ArenaPinInput']) {
    const slot = component === 'ArenaPinInput' ? 'cell' : 'field';
    assert.ok(resolve(component, { state: 'error' }, slot).includes(`ring-[color:${haloValue(SLOTS, `${component}.${slot}`, 'error')}]`), `${component} keeps its error halo, read from its edge`);
  }
});

test('only the offline presence dot reads a muted marks slot, and the neutral feed dot reads its own', () => {
  const muted = [...manifests.values()].flatMap((m) => [...classStringsBySlot(m)].filter(([, texts]) => texts.some((text) => text.includes('--marks-muted-'))).map(([slot]) => `${m.component}.${slot}`));
  assert.deepEqual(muted, ['ArenaAvatar.status'], 'a marks-muted answer reaches the offline dot alone (D92)');
  const neutral = resolve('ArenaActivityFeed', { tone: 'neutral' }, 'dot');
  assert.ok(neutral.includes(`text-[color:${memberValue(SLOTS, 'ArenaActivityFeed.dot', 'marks-neutral-dot-ink-rest', 'tailwind')}]`), neutral.join(' '));
  assert.ok(!neutral.some((one) => one.includes('--marks-muted-')), 'the neutral feed dot takes no muted answer');
});
