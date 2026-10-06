import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  COLORS, COMPONENT_SHEETS, PAIRS, PALETTE, REMOVED, ROLE_SHEETS, VOCABULARY_SHEETS, componentSheets, paletteColours,
  resolvePercent, scopesToMeasure, structureOf, surfacesUnder, THEMES,
} from './check-text-contrast.ts';
import { paletteBlock } from '../../lib/core/palette-read.ts';
import { resolvedFor } from './check-style-plugin.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import {
  derivedLevels, levelDefaults, levelReports, levelsIn, raisedReports,
} from '../../generate/core/arena-to-prod/levels.ts';
import { FILL_PAIRS } from '../../generate/core/arena-to-prod/palette-keys.ts';

test('this gate and the shipped command hold the same fills legible', () => {
  const key = (p: { fill: string, content: string }) => `${p.fill}/${p.content}`;
  assert.deepEqual([...PAIRS.map(key)].sort(), [...FILL_PAIRS.map(key)].sort(),
    'a pair this gate measures over Arena and the command does not measure over a consumer '
    + 'is the half nobody reads');
});

const structure = structureOf([
  ':root, .arena-light {',
  '  --text-strong: var(--color-base-content);',
  '  --text-body: color-mix(in oklab, var(--color-base-content) 82%, transparent);',
  '  --text-muted: var(--mute);',
  '  --mute: color-mix(in oklab, var(--color-base-content) 61%, transparent);',
  '  --loop-a: var(--loop-b);',
  '  --loop-b: var(--loop-a);',
  '  --painted: #ff0000;',
  '}',
].join('\n'));

test('a level that is base-content itself is the whole of it', () => {
  assert.equal(resolvePercent(structure, 'text-strong'), 100);
});

test('a level mixed with transparent resolves to the percentage it keeps', () => {
  assert.equal(resolvePercent(structure, 'text-body'), 82);
});

test('an alias resolves to what it points at, however many hops away that is', () => {
  assert.equal(resolvePercent(structure, 'text-muted'), 61,
    'colors.css names a level twice on purpose, so following one hop is not enough');
});

test('a level nothing declares is absent rather than zero', () => {
  assert.equal(resolvePercent(structure, 'text-nothing'), null,
    'zero would read as a fully transparent level and clear no gate by measuring nothing');
});

test('an alias cycle is named, never followed until the stack ends', () => {
  assert.throws(() => resolvePercent(structure, 'loop-a'), /--loop-a is a circular reference/);
});

test('a level that is a colour rather than a derivation of base-content is refused', () => {
  assert.throws(() => resolvePercent(structure, 'painted'),
    /--painted resolves to "#ff0000", which is neither base-content, a color-mix of it, nor a var\(\) alias/,
    'the gate measures levels derived from one content colour, so a pinned hex is outside what it '
    + 'can compose and is reported instead of silently skipped');
});

test('a retired token carries the token that replaces it, so the failure is actionable', () => {
  assert.ok(REMOVED.length > 0, 'an empty list holds nothing and would pass over any reappearance');
  for (const { token, use } of REMOVED) {
    assert.ok(token && use, `${token} is retired with no replacement named`);
    assert.equal(REMOVED.filter((r) => r.token === token).length, 1, `${token} is listed twice`);
  }
});

test('the two sheets are named once each, and they are not the same sheet', () => {
  assert.match(PALETTE, /^contracts\/design-generated\//);
  assert.match(COLORS, /^contracts\/design\//);
  assert.notEqual(PALETTE, COLORS,
    'the skin values are generated and the derivations are hand-written, and the gate needs both');
});

test('the surfaces text is measured on come from the fill roles, so a reassignment is not measured against the old one', () => {
  const flat = new Map([['fill-surface', 'var(--color-base-100)'], ['fill-surface-floating', 'var(--color-base-200)']]);
  assert.deepEqual(surfacesUnder(flat), ['color-base-100', 'color-base-200']);
  const raised = new Map([['fill-surface', 'var(--color-base-300)'], ['fill-surface-floating', 'var(--color-base-200)']]);
  assert.deepEqual(surfacesUnder(raised), ['color-base-100', 'color-base-300', 'color-base-200']);
});

test('a role that is not a reference contributes no surface, rather than a name nothing declares', () => {
  assert.deepEqual(surfacesUnder(new Map([['fill-surface', '#1d1715']])), ['color-base-100']);
  assert.deepEqual(surfacesUnder(new Map()), ['color-base-100']);
});

test('a style plugin that moves no fill adds no scope, so the run is not the same measurement twice', () => {
  const css = ':root{--fill-surface:var(--color-base-200)}\n.arena-quiet{--r-surface:22px}\n'
    + '.arena-loud{--fill-surface:var(--color-base-300)}';
  const scopes = scopesToMeasure(css, 'dark', ['quiet', 'loud']);
  assert.deepEqual(scopes.map((s) => s.label), ['the root plugin', '.arena-loud']);
  assert.deepEqual(scopes[1]?.surfaces, ['color-base-100', 'color-base-300']);
});

test('the vocabulary sheets are read with the component sheets, so a level a family writes is measured', () => {
  assert.ok(COMPONENT_SHEETS.includes(VOCABULARY_SHEETS), 'a family sheet is where the accent and emphasis inks now live');
  assert.ok(componentSheets().some((css) => css.includes('--arena-accent-ink')), 'the accent family sheet is among those read');
});

const accentSheet = () => componentSheets().find((css) => css.includes('--arena-accent-quiet-ink:')) as string;

function measured(defaults: Record<string, number>) {
  const palette = readFileSync(join(repoRoot, PALETTE), 'utf8');
  const effects = ROLE_SHEETS.map((sheet) => readFileSync(join(repoRoot, sheet), 'utf8')).join('\n');
  return THEMES.flatMap((theme) => {
    const roles = resolvedFor(effects, '', theme.name);
    const colours = paletteColours(paletteBlock(palette, theme.selector, 'palette.generated.css'));
    const levels = levelsIn(accentSheet(), defaults);
    const derived = derivedLevels(levels, roles, colours);
    return [...levelReports(levels, roles, colours, derived), ...raisedReports(derived)];
  });
}

test('a level the accent family draws is measured, and lowering one below its floor fails', () => {
  const defaults = levelDefaults(readFileSync(join(repoRoot, COLORS), 'utf8'));
  assert.deepEqual(measured(defaults), [], 'the levels the shipped colors.css declares clear the bars');
  assert.ok(measured({ ...defaults, 'level-ink-quiet': 20, 'level-ink-muted': 20 }).length > 0,
    'the quiet ink and the muted ink a family writes fail once their levels fall under what AA needs');
  const soft = levelsIn(accentSheet(), { ...defaults, 'level-accent-soft-gold': 4 }).find((one) => one.level === 'level-accent-soft-gold');
  assert.equal(soft?.percent, 4, 'the gold wash level is read off the family sheet, so a change of it is a change of what is measured');
  assert.equal(soft?.selector, '.arena-accent-gold');
});
