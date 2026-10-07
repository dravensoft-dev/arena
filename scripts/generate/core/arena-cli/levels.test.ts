import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DECORATIVE, derivedLevels, exemptionFor, gateFor, inlineHues, levelReports, levelsIn, raisedReports,
  surfaceKeys, washesIn, washReports,
} from './levels.ts';
import { walkFiles } from '../../../utils/walk-files.ts';
import { repoRoot } from '../../../lib/arena/repo-root.ts';

const SHEET = [
  '@layer utilities {',
  '  .arena-table__caption {',
  '    color: var(--ink-muted);',
  '    @supports (color: color-mix(in lab, red, red)) {',
  '      color: color-mix(in oklab, var(--ink-muted) var(--level-ink-muted), transparent);',
  '    }',
  '  }',
  '  .arena-pagination__nav {',
  '    &:disabled {',
  '      color: color-mix(in oklab, var(--ink-muted) 40%, transparent);',
  '    }',
  '  }',
  '  .arena-avatar__status:where([data-arena-status="offline"]) {',
  '    background-color: color-mix(in oklab, var(--color-base-content) 52%, transparent);',
  '  }',
  '  .arena-badge__root:where([data-arena-tone="success"]) {',
  '    background-color: color-mix(in oklab, var(--color-success) 16%, transparent);',
  '  }',
  '}',
].join('\n');

const ROLES = new Map([
  ['ink-muted', 'var(--color-base-content)'],
  ['fill-surface', 'var(--color-base-100)'],
]);

const DEFAULTS = { 'level-ink-muted': 62 };

const DUOLINGO = { 'base-100': '#ffffff', 'base-content': '#4b4b4b', success: '#58cc02' };

test('a level is read off the sheet a package ships, with the slot that paints it', () => {
  const levels = levelsIn(SHEET, DEFAULTS);
  assert.deepEqual(levels.map((l) => `${l.property}/${l.variable}/${l.percent}`), [
    'color/ink-muted/62',
    'color/ink-muted/40',
    'background-color/color-base-content/52',
    'background-color/color-success/16',
  ]);
  assert.equal(levels[0]?.selector, '.arena-table__caption');
});

test('the disabled register is exempt, and says why rather than being absent', () => {
  const [, disabled] = levelsIn(SHEET, DEFAULTS);
  assert.match(exemptionFor(disabled as never) ?? '', /inactive/);
});

test('text is held to AA, a mark to 3:1, and a tint of a status colour to nothing', () => {
  const [text, , mark, tint] = levelsIn(SHEET, DEFAULTS);
  assert.equal(gateFor(text as never), 4.5);
  assert.equal(gateFor(mark as never), 3);
  assert.equal(gateFor(tint as never), null,
    'a soft wash is meant to be faint; holding it to a ratio would report the design');
});

test('the surfaces are the page plus whatever the plugin answers with', () => {
  assert.deepEqual(surfaceKeys(ROLES), ['base-100']);
  assert.deepEqual(surfaceKeys(new Map([...ROLES, ['fill-surface', 'var(--color-base-200)']])),
    ['base-100', 'base-200']);
});

test('a level composited over a real palette is measured rather than assumed', () => {
  const reports = levelReports(levelsIn(SHEET, DEFAULTS), ROLES, DUOLINGO);
  assert.equal(reports.length, 2, 'the caption at 62% and the presence dot at 52% both fail here');
  assert.ok(reports.some((r) => r.message.includes('--ink-muted at 62%') && r.message.includes('3.23:1')));
  assert.ok(reports.some((r) => r.message.includes('--color-base-content at 52%') && r.message.includes('2.58:1')));
});

const HOVER = [
  '  .arena-button__root:where([data-arena-destructive]) {',
  '    color: var(--color-error);',
  '    &:hover {',
  '      @media (hover: hover) {',
  '        background-color: color-mix(in oklab, var(--color-error) 14%, transparent);',
  '      }',
  '    }',
  '  }',
].join('\n');

test('a token drawn on a wash of its own colour is found through the nesting', () => {
  assert.deepEqual(washesIn(HOVER), [
    { selector: '.arena-button__root:where([data-arena-destructive])', variable: 'color-error', percent: 14 },
  ]);
});

test('the wash is measured against the ink that rides on it', () => {
  const roles = new Map([['fill-surface', 'var(--color-base-100)']]);
  const colors = { 'base-100': '#ffffff', 'color-error': '#ff4b4b', error: '#ff4b4b' };
  const [only] = washReports(washesIn(HOVER), roles, colors);
  assert.match(only?.message ?? '', /14% wash of itself/);
  assert.match(only?.message ?? '', /no wash percentage lifts it/);
});

test('a level is raised until it clears its bar, and never lowered', () => {
  const derived = derivedLevels(levelsIn(SHEET, DEFAULTS), ROLES, DUOLINGO);
  assert.equal(derived.get('level-ink-muted')?.percent, 76,
    "duolingo's #4b4b4b on white needs 76% to clear AA, where Dravensoft needs 62");

  const roomy = { ...DUOLINGO, 'base-content': '#1a1a1a' };
  assert.equal(derivedLevels(levelsIn(SHEET, DEFAULTS), ROLES, roomy).get('level-ink-muted')?.percent, 62,
    'an ink with room resolves to the floor, so Arena and every skin like it do not move');
});

test('a level that closes on the one above it says so, because legibility cost the hierarchy', () => {
  const derived = new Map([
    ['level-ink-muted', { floor: 62, percent: 76, gate: 4.5 }],
    ['level-ink-quiet', { floor: 70, percent: 76, gate: 4.5 }],
  ]);
  const said = raisedReports(derived).map((r) => r.message).join('\n');
  assert.match(said, /raised from 62% to 76%/);
  assert.match(said, /0 points apart/);
});

test('an ink that cannot clear its bar at full strength is named as the ink and not the level', () => {
  const flat = { 'base-100': '#ffffff', 'base-content': '#e8e8e8' };
  const derived = derivedLevels(levelsIn(SHEET, DEFAULTS), ROLES, flat);
  assert.equal(derived.get('level-ink-muted')?.percent, null);
  const [only] = levelReports(levelsIn(SHEET, DEFAULTS), ROLES, flat, derived);
  assert.match(only?.message ?? '', /The ink is what has no room, not the level/);
});

const COMPOUNDED = [
  '  .arena-stat-card__icon {',
  '    color: color-mix(in oklab, var(--ink-muted) var(--level-ink-muted), transparent);',
  '    opacity: 60%;',
  '  }',
].join('\n');

test('an opacity on the same rule compounds, because it is what the browser paints', () => {
  const [only] = levelsIn(COMPOUNDED, DEFAULTS);
  assert.equal(only?.percent, 37.2,
    '62% of the ink at 60% opacity is 37.2% of it, and reporting 62 is reporting a value '
    + 'nothing paints');
});

test('every decorative exemption is a part both layers still render aria-hidden', () => {
  for (const [selector, why] of DECORATIVE) {
    const part = (selector.match(/^\.arena-[a-z-]+__([a-z-]+)$/) ?? [])[1];
    assert.ok(part, `${selector} is not a part selector, so nothing can hold its markup`);
    const component = selector.slice(1).split('__')[0] as string;
    const slot = component.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase());
    for (const layer of ['react', 'angular']) {
      const at = join(repoRoot, 'frameworks', layer, 'components');
      const file = walkFiles(at).find((p) => p.endsWith(`${slot}.${layer === 'react' ? 'tsx' : 'ts'}`));
      assert.ok(file, `${slot} has no source in the ${layer} layer`);
      const lines: string[] = readFileSync(file as string, 'utf8').split('\n');
      const drawn: string | undefined = lines.find((line) => line.includes(`parts.${part}`));
      assert.ok(drawn?.includes('aria-hidden'),
        `${selector} is exempt because "${why.slice(0, 40)}…", and the ${layer} layer no longer `
        + 'renders it aria-hidden, so the exemption is excusing a mark somebody has to see');
    }
  }
});

const PRESSED = [
  '  .arena-icon-button__root:where([data-arena-pressed]) {',
  '    border-color: var(--color-primary);',
  '    @supports (color: color-mix(in lab, red, red)) {',
  '      background-color: color-mix(in oklab, var(--color-primary) 14%, transparent);',
  '      border-color: color-mix(in oklab, var(--color-primary) 38%, transparent);',
  '    }',
  '    color: var(--color-primary);',
  '    &:hover {',
  '      @media (hover: hover) {',
  '        @supports (color: color-mix(in lab, red, red)) {',
  '          background-color: color-mix(in oklab, var(--color-primary) 22%, transparent);',
  '        }',
  '      }',
  '    }',
  '  }',
].join('\n');

test('a wash written before the ink is still a wash of that ink, and both of them are found', () => {
  assert.deepEqual(washesIn(PRESSED), [
    { selector: '.arena-icon-button__root:where([data-arena-pressed])', variable: 'color-primary', percent: 14 },
    { selector: '.arena-icon-button__root:where([data-arena-pressed])', variable: 'color-primary', percent: 22 },
  ], 'the resting wash is declared above the color it washes, and a reader that keeps the last '
    + 'color it passed sees neither it nor the ratio it costs');
});

const SIBLING = [
  '  .arena-menu__item-default {',
  '    color: var(--ink-body);',
  '    &:hover {',
  '      @media (hover: hover) {',
  '        background-color: color-mix(in oklab, var(--color-primary) 14%, transparent);',
  '      }',
  '    }',
  '    &:hover {',
  '      @media (hover: hover) {',
  '        color: var(--color-primary);',
  '      }',
  '    }',
  '  }',
].join('\n');

test('two rules with one selector are one rule to a browser, so the ink can be declared beside the wash', () => {
  assert.deepEqual(washesIn(SIBLING), [
    { selector: '.arena-menu__item-default', variable: 'color-primary', percent: 14 },
  ], 'the hovered item takes both blocks, so its ink on hover is the accent and not the body ink '
    + 'the resting block declares');
});

const MENU = [
  '  .arena-menu__item:where([data-arena-disabled]) {',
  '    color: color-mix(in oklab, var(--ink-muted) var(--level-ink-muted), transparent);',
  '    opacity: 60%;',
  '  }',
  '  .arena-menu__item:where(:not([data-arena-disabled])[data-arena-destructive]) {',
  '    color: color-mix(in oklab, var(--ink-muted) var(--level-ink-muted), transparent);',
  '  }',
].join('\n');

test('a compound that waits for a disabled row is exempt by its condition, one that waits for an enabled row is judged', () => {
  const [disabled, enabled] = levelsIn(MENU, DEFAULTS);
  assert.ok(exemptionFor(disabled as never), 'the disabled compound keeps the inactive-component exemption');
  assert.equal(exemptionFor(enabled as never), null, 'a compound that names disabled only to negate it is not inactive');
});

const HUE_SHEET = [
  '@layer utilities {',
  '  .x:where([data-arena-tone="danger"]) {',
  '    --arena-hue-ink: var(--hue-danger-ink);',
  '    --arena-hue-edge: var(--hue-danger-edge);',
  '    --arena-hue-fill-strong: var(--hue-danger-fill-strong);',
  '    --arena-hue-fill-soft: color-mix(in oklab, var(--hue-danger-fill-soft) var(--level-hue-soft-danger), transparent);',
  '  }',
  '  .x:where([data-arena-tone="neutral"]) {',
  '    --arena-hue-ink: initial;',
  '    --arena-hue-fill-soft: initial;',
  '  }',
  '}',
].join('\n');

const HUE_ROLES = new Map([
  ['hue-danger-ink', 'var(--color-error)'],
  ['hue-danger-edge', 'var(--color-error)'],
  ['hue-danger-fill-strong', 'transparent'],
  ['hue-danger-fill-soft', 'var(--color-error)'],
]);

test('inlineHues reads a channel through the hue sheet, so the sweeps see the wash the browser paints', () => {
  const css = [
    '@layer utilities {',
    '  .x:where([data-arena-tone="danger"]) {',
    '    background-color: var(--arena-hue-fill-soft);',
    '    border-color: var(--arena-hue-edge);',
    '  }',
    '}',
  ].join('\n');
  const inlined = inlineHues(css, HUE_SHEET, HUE_ROLES, { 'level-hue-soft-danger': '14%' });
  assert.match(inlined, /background-color: color-mix\(in oklab, var\(--color-error\) 14%, transparent\);/);
  assert.match(inlined, /border-color: var\(--color-error\);/);
  assert.equal(levelsIn(inlined).length, 1);
});

test('inlineHues turns an ink on its own wash into the one wash the sweep measures', () => {
  const css = [
    '@layer utilities {',
    '  .x:where([data-arena-tone="danger"]) {',
    '    color: var(--arena-hue-ink);',
    '    background-color: var(--arena-hue-fill-soft);',
    '  }',
    '}',
  ].join('\n');
  const inlined = inlineHues(css, HUE_SHEET, HUE_ROLES, { 'level-hue-soft-danger': '14%' });
  assert.deepEqual(washesIn(css), []);
  assert.deepEqual(washesIn(inlined), [
    { selector: '.x:where([data-arena-tone="danger"])', variable: 'color-error', percent: 14 },
  ]);
});

test('inlineHues leaves a read the hue sheet does not write, and an initial one, as it stands', () => {
  const css = '.x:where([data-arena-tone="neutral"]) {\n  color: var(--arena-hue-ink);\n}\n.y {\n  color: var(--arena-hue-ink);\n}\n';
  assert.equal(inlineHues(css, HUE_SHEET, HUE_ROLES, {}), css);
});

test('inlineHues reads a compound selector through the rule whose conditions it holds', () => {
  const css = '.x:where(:not([data-arena-disabled])[data-arena-tone="danger"]) {\n  color: var(--arena-hue-ink);\n}\n';
  assert.match(inlineHues(css, HUE_SHEET, HUE_ROLES, {}), /color: var\(--color-error\);/);
});

const FAMILY = [
  '@layer utilities {',
  '  @scope (.arena-accent-plain) to ([data-arena-boundary] > *) {',
  '    &[data-arena-part="tag"], [data-arena-part="tag"] {',
  '      --arena-accent-quiet-ink: color-mix(in oklab,var(--accent-plain-quiet-ink) var(--level-ink-quiet),transparent);',
  '      --arena-accent-edge: var(--accent-plain-edge);',
  '    }',
  '  }',
  '  @scope (.arena-accent-gold) to ([data-arena-boundary] > *) {',
  '    &[data-arena-part="badge"], [data-arena-part="badge"] {',
  '      --arena-accent-fill-soft: color-mix(in oklab,var(--accent-gold-fill-soft) var(--level-accent-soft-gold),transparent);',
  '    }',
  '  }',
  '}',
].join('\n');

test('a family sheet writes a level through a channel, and the channel is read as the property that reads it', () => {
  const levels = levelsIn(FAMILY, { 'level-ink-quiet': 50, 'level-accent-soft-gold': 16 });
  assert.deepEqual(levels.map((l) => `${l.selector}/${l.property}/${l.variable}/${l.percent}/${l.level}`), [
    '.arena-accent-plain/color/accent-plain-quiet-ink/50/level-ink-quiet',
    '.arena-accent-gold/background-color/accent-gold-fill-soft/16/level-accent-soft-gold',
  ]);
  assert.equal(gateFor(levels[0] as never), 4.5, 'a quiet ink is text, whichever sheet writes it');
  assert.equal(gateFor(levels[1] as never), null, 'a soft wash is meant to be faint');
});

test('a mix nested in the fallback of a channel read is a level too', () => {
  const nested = [
    '.arena-tag__root {',
    '  @supports (color: color-mix(in lab, red, red)) {',
    '    color: var(--arena-accent-quiet-ink,color-mix(in oklab,var(--accent-plain-quiet-ink) var(--level-ink-quiet),transparent));',
    '  }',
    '}',
  ].join('\n');
  const [only, ...more] = levelsIn(nested, { 'level-ink-quiet': 50 });
  assert.equal(more.length, 0);
  assert.equal(`${only?.property}/${only?.variable}/${only?.percent}`, 'color/accent-plain-quiet-ink/50');
});

test('a wash whose percent is a level reads its default, and one with no default is left out', () => {
  const css = [
    '.arena-x__y {',
    '  color: var(--ink-x);',
    '  background-color: color-mix(in oklab,var(--ink-x) var(--level-wash),transparent);',
    '}',
  ].join('\n');
  assert.deepEqual(washesIn(css, { 'level-wash': 14 }), [{ selector: '.arena-x__y', variable: 'ink-x', percent: 14 }]);
  assert.deepEqual(washesIn(css), []);
});
