import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  COLORS, COMPONENT_SHEETS, ON_INK_GATE, ON_SURFACE, PAIRS, PALETTE, REMOVED, ROLE_SHEETS, SCOPED_PLUGINS, VOCABULARY_SHEETS,
  answeredColour, answeredKey, catalogueOnInk, catalogueReports, contrastScopes, slotReportLines, stateProblems, stateReports, defaultBuildProblems, JUDGED, componentSheets, onInkPairs, paletteColours, resolvePercent, scopesToMeasure, structureOf, surfacesUnder, THEMES,
} from './check-text-contrast.ts';
import { paletteBlock } from '../../lib/core/palette-read.ts';
import { resolvedFor } from './check-style-plugin.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { unlayeredColors } from '../../lib/core/colors-fixtures.ts';
import {
  derivedLevels, levelDefaults, levelReports, levelsIn, raisedReports, STATUS_HUES,
} from '../../generate/core/arena-cli/levels.ts';
import { CATALOGUE } from './check-catalogue.ts';
import { scratchContrastTree } from '../../lib/core/contrast-fixtures.ts';
import { FILL_PAIRS } from '../../generate/core/arena-cli/palette-keys.ts';
import { slotPairs } from '../../generate/core/arena-cli/slot-contrast.ts';
import { tokenCatalogue } from '../../lib/arena/package-assembly.ts';
import { contrast } from '../../lib/core/validate-palette.mjs';

test('this gate and the shipped command hold the same fills legible', () => {
  const key = (p: { fill: string, content: string }) => `${p.fill}/${p.content}`;
  assert.deepEqual([...PAIRS.map(key)].sort(), [...FILL_PAIRS.map(key)].sort(),
    'a pair this gate measures over Arena and the command does not measure over a consumer '
    + 'is the half nobody reads');
});

const SELECTORS = [':root', '.arena-dark', '.arena-light'];
const structure = structureOf([
  ':root, .arena-dark, .arena-light {',
  '  --text-strong: var(--color-base-content);',
  '  --text-body: color-mix(in oklab, var(--color-base-content) 82%, transparent);',
  '  --text-muted: var(--mute);',
  '  --mute: color-mix(in oklab, var(--color-base-content) 61%, transparent);',
  '  --loop-a: var(--loop-b);',
  '  --loop-b: var(--loop-a);',
  '  --painted: #ff0000;',
  '}',
].join('\n'), SELECTORS);

test('an alias block whose selector lacks a palette the palette sheet declares is refused, naming it', () => {
  assert.throws(() => structureOf(':root, .arena-light { --text-strong: var(--color-base-content); }', SELECTORS),
    /does not carry \.arena-dark/);
  assert.throws(() => structureOf(':root,.arena-dark{ --picker-invert:1; }', SELECTORS), /no block declares the aliases/);
});

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

test('a held-back alias that reads a level resolves at the level the block declares', () => {
  const mix = '--mute:color-mix(in oklab,var(--color-base-content) var(--level-ink-muted),transparent);';
  assert.equal(resolvePercent(`--level-ink-muted:62%;${mix}`, 'mute'), 62);
  assert.throws(() => resolvePercent(mix, 'mute'), /level-ink-muted/);
  assert.throws(() => resolvePercent(mix, 'mute'), /--mute/);
});

function literalAliases(block: string) {
  const bare = (value: string) => {
    let out = value;
    for (let before = ''; before !== out;) { before = out; out = out.replace(/var\([^()]*\)/g, ''); }
    return out;
  };
  return [...block.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)]
    .filter(([, name, value]) => !(name ?? '').startsWith('level-') && /\d%/.test(bare(value ?? '')))
    .map(([, name]) => name);
}

test('the disabled text and the scrim are the two aliases in colors.css that hold a fixed percentage, with no level', () => {
  const block = structureOf(readFileSync(join(repoRoot, 'contracts/design/colors.css'), 'utf8'), SELECTORS)
    .replace(/\/\*[\s\S]*?\*\//g, '');
  assert.deepEqual(literalAliases(block), ['mute-2-disabled', 'scrim']);
});

test('a percentage inside a var() fallback is not a literal the alias holds', () => {
  assert.deepEqual(literalAliases('--x:color-mix(in oklab,var(--c) var(--level-x,62%),transparent);--y:color-mix(in oklab,var(--c) 40%,transparent);'), ['y']);
});

test('colors.css held in the defaults layer reads as the same alias block as its unlayered body', () => {
  const css = readFileSync(join(repoRoot, 'contracts/design/colors.css'), 'utf8');
  const body = unlayeredColors(css);
  assert.ok(css.includes('@layer arena-defaults {') && !body.includes('@layer'), 'the body is the layer\'s contents');
  assert.equal(structureOf(css, SELECTORS), structureOf(body, SELECTORS));
  assert.ok(structureOf(css, SELECTORS).includes('--text-strong'));
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
  assert.ok(componentSheets().some((css) => css.includes('--arena-accent-marks-label-ink')), 'the accent family sheet is among those read');
});

const accentSheet = () => componentSheets().find((css) => css.includes('--arena-accent-marks-outline-ink:')) as string;

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

test('the on-ink of each status hue is measured over its ink in both themes, in the root plugin and every scoped one', () => {
  const palette = readFileSync(join(repoRoot, PALETTE), 'utf8');
  const effects = ROLE_SHEETS.map((sheet) => readFileSync(join(repoRoot, sheet), 'utf8')).join('\n');
  assert.deepEqual([...STATUS_HUES], ['danger', 'success', 'warning', 'info']);
  for (const theme of THEMES) {
    const body = paletteBlock(palette, theme.selector, 'palette.generated.css');
    for (const scope of ['', ...SCOPED_PLUGINS]) {
      const roles = resolvedFor(effects, scope, theme.name);
      const pairs = onInkPairs(roles, body);
      assert.deepEqual(pairs.map((one) => one.hue), [...STATUS_HUES]);
      for (const one of pairs)
        assert.ok(one.ratio !== null && one.ratio >= ON_INK_GATE, `${theme.name} ${scope || 'root'}: ${one.hue} on-ink over ink is ${one.ratio}`);
      const same = new Map(roles).set('hue-danger-on-ink', roles.get('hue-danger-ink') ?? '');
      assert.ok((onInkPairs(same, body)[0]?.ratio ?? 0) < ON_INK_GATE, 'content set in its own fill reads as nothing');
    }
  }
});

test('every catalogue entry sets each status hue\'s on-ink legibly over its ink in every palette it declares', () => {
  const pairs = catalogueOnInk();
  assert.ok(new Set(pairs.map((one) => one.entry)).size > 0, `no entry measured under ${CATALOGUE}`);
  const failing = pairs.filter((one) => one.ratio === null || one.ratio < ON_INK_GATE);
  assert.deepEqual(failing, []);
});

test('an entry\'s answer wins over the kernel default, and a silent entry takes the default', () => {
  const colors = { 'base-100': '#ffffff', 'success-content': '#000000' };
  const defaults = { 'hue-success-on-ink': '{color.success-content}' };
  assert.equal(answeredColour('hue-success-on-ink', {}, {}, defaults, colors, 'dark'), '#000000');
  assert.equal(answeredColour('hue-success-on-ink', { 'hue-success-on-ink': { $value: '{color.base-100}' } }, {}, defaults, colors, 'dark'), '#ffffff');
});

const sheetOf = (marker: string) => componentSheets().find((css) => css.includes(marker)) as string;

function inkReports(marker: string, role: string, answer?: string) {
  const palette = readFileSync(join(repoRoot, PALETTE), 'utf8');
  const effects = ROLE_SHEETS.map((sheet) => readFileSync(join(repoRoot, sheet), 'utf8')).join('\n');
  const defaults = levelDefaults(readFileSync(join(repoRoot, COLORS), 'utf8'));
  const levels = levelsIn(sheetOf(marker), defaults).filter((one) => one.variable === role);
  return {
    levels,
    reports: THEMES.flatMap((theme) => {
      const roles = resolvedFor(effects, '', theme.name);
      if (answer) roles.set(role, answer);
      const colours = paletteColours(paletteBlock(palette, theme.selector, 'palette.generated.css'));
      return levelReports(levels, roles, colours, derivedLevels(levels, roles, colours)).map((one) => `${theme.name}: ${one.message}`);
    }),
  };
}

const selectorsOf = (levels: { selector: string }[]) => [...new Set(levels.map((one) => one.selector))].sort();

test('a table\'s figures are drawn in a role the contrast gate measures, and it clears AA in both themes', () => {
  const { levels, reports } = inkReports('.arena-table__td', 'ink-figure');
  assert.deepEqual(selectorsOf(levels), ['.arena-table__card-value:where([data-arena-numeric])', '.arena-table__td:where([data-arena-numeric])'],
    'a numeric cell and a numeric card value paint --ink-figure through a level, which is the one shape levelReports reads; '
    + 'a raw var(--color-secondary) was an accent drawn as ink that nothing measured');
  assert.deepEqual(reports, [], 'the figures of a pricing table are the numbers a reader came for');
  assert.ok(inkReports('.arena-table__td', 'ink-figure', 'var(--color-neutral)').reports.some((one) => one.startsWith('light: --ink-figure')),
    'a plugin raising a fill colour to the figures owes 4.5:1, and neutral on the light card does not clear it');
});

test('a bulk action bar\'s count is a figure, drawn in a role the contrast gate measures', () => {
  const { levels, reports } = inkReports('.arena-bulk-action-bar__number', 'ink-figure');
  assert.deepEqual(selectorsOf(levels), ['.arena-bulk-action-bar__number'],
    'the number of rows selected paints --ink-figure through a level; a raw var(--color-secondary) was gold drawn as ink that nothing measured');
  assert.deepEqual(reports, [], 'the count is what the bar is about');
  assert.ok(inkReports('.arena-bulk-action-bar__number', 'ink-figure', 'var(--color-neutral)').reports.some((one) => one.startsWith('light: --ink-figure')),
    'a plugin raising a fill colour to the count owes 4.5:1, and neutral on the light floating surface does not clear it');
});

test('an activity feed\'s target is a code, drawn in a role the contrast gate measures', () => {
  const { levels, reports } = inkReports('.arena-activity-feed__target', 'ink-figure');
  assert.deepEqual(selectorsOf(levels), ['.arena-activity-feed__target'],
    'the identifier a row acted on paints --ink-figure through a level, as a table\'s codes do; a raw var(--color-secondary) was gold drawn as ink that nothing measured');
  assert.deepEqual(reports, [], 'the target is the half of the row a reader scans for');
  assert.ok(inkReports('.arena-activity-feed__target', 'ink-figure', 'var(--color-neutral)').reports.some((one) => one.startsWith('light: --ink-figure')),
    'a plugin raising a fill colour to the target owes 4.5:1, and neutral on the light page does not clear it');
});

test('a toast\'s action reads one measured role in every tone, and it clears AA in both themes', () => {
  const { levels, reports } = inkReports('.arena-toast__action', 'ink-action');
  assert.deepEqual(selectorsOf(levels), ['.arena-toast__action'],
    'the action paints --ink-action through a level in every tone, one role measured as every ink is');
  assert.deepEqual(reports, [], 'an undo nobody can read is an undo nobody takes');
  for (const theme of ['dark', 'light']) {
    assert.ok(inkReports('.arena-toast__action', 'ink-action', 'var(--color-neutral)').reports.some((one) => one.startsWith(`${theme}: --ink-action`)),
      `a plugin raising a fill colour to the action owes 4.5:1, and neutral on the ${theme} floating surface does not clear it`);
  }
});

test('the default plugin clears 4.5:1 on its invalid and selected inks in both themes', () => {
  assert.deepEqual(stateProblems('ink-'), []);
});

test('answeredKey follows the answer to the palette key a role names, and the light group only in a light theme', () => {
  const answers = { 'edge-focus': { $value: '{color.secondary}' } };
  const light = { 'edge-focus': { $value: '{color.base-content}' } };
  assert.equal(answeredKey('edge-focus', answers, light, {}, 'dark'), 'secondary');
  assert.equal(answeredKey('edge-focus', answers, light, {}, 'light'), 'base-content');
  assert.equal(answeredKey('edge-selected', {}, {}, { 'edge-selected': '{ink-body}', 'ink-body': '{color.base-content}' }, 'dark'), 'base-content');
});

const made: string[] = [];
after(() => { for (const dir of made) rmSync(dir, { recursive: true, force: true }); });

test('a surface answered with no palette colour is reported by the gate of the pair that stands on it', () => {
  const dir = mkdtempSync(join(tmpdir(), 'state-'));
  made.push(dir);
  mkdirSync(join(dir, 'contracts/design'), { recursive: true });
  mkdirSync(join(dir, 'p'));
  writeFileSync(join(dir, 'contracts/design/roles.json'), '{}');
  writeFileSync(join(dir, COLORS), readFileSync(join(repoRoot, COLORS)));
  const answer = (role: string, value: string) => ({ [role]: { $value: value } });
  writeFileSync(join(dir, 'p/plugin.tokens.json'), JSON.stringify({
    ...answer('fill-page', '{color.base-100}'), ...answer('fill-surface', 'var(--ring)'), ...answer('fill-field', '{color.base-300}'),
    ...answer('edge-focus', '{color.base-content}'), ...answer('edge-selected', '{color.base-content}'),
    ...answer('edge-invalid', '{color.base-content}'), ...answer('ink-invalid', '{color.base-content}'),
    ...answer('ink-selected', '{color.base-content}'), ...answer('fill-selected', '{color.primary}'),
  }));
  const colors = { 'base-100': '#ffffff', 'base-300': '#e5e5e5', 'base-content': '#111111', primary: '#b52a20' };
  const scopes = [{ where: 'p/plugin.tokens.json', theme: 'light', colors, judged: true }];
  const edges = stateProblems('edge-', scopes, dir);
  const inks = stateProblems('ink-', scopes, dir);
  assert.ok(edges.some((one) => /--edge-focus is measured over --fill-surface, which resolves to no palette colour/.test(one)));
  assert.ok(inks.some((one) => /--ink-invalid is measured over --fill-surface, which resolves to no palette colour/.test(one)));
  assert.ok(inks.some((one) => /--ink-selected is measured over --fill-surface/.test(one)));
});

function scratchTree(inkInvalid: string) {
  const dir = scratchContrastTree({ 'ink-invalid': inkInvalid });
  made.push(dir);
  return dir;
}

const WEAK = { 'base-100': '#ffffff', strong: '#000000', 'base-content': '#bbbbbb' };

test('a catalogue pair below AA is reported, not refused', () => {
  const dir = scratchTree('{color.base-content}');
  const scopes = [{ where: 'p/plugin.tokens.json', theme: 'light', colors: WEAK, judged: false }];
  assert.deepEqual(stateProblems('ink-', scopes, dir), []);
  assert.equal(stateReports('ink-', scopes, dir).length, 1);
});

test('a default pair below AA is refused', () => {
  const dir = scratchTree('{color.base-content}');
  const scopes = [{ where: 'p/plugin.tokens.json', theme: 'light', colors: WEAK, judged: true }];
  assert.equal(stateProblems('ink-', scopes, dir).length, 1);
  assert.deepEqual(stateReports('ink-', scopes, dir), []);
});

test('only the default plugin is judged', () => {
  assert.deepEqual(JUDGED, ['plugin-style-store/default/plugin.tokens.json']);
});

test('defaultBuildProblems is clean on Arena\'s skin', () => {
  assert.deepEqual(defaultBuildProblems(), []);
});

test('the default plugin resolves and clears every slot pair the contract declares', () => {
  assert.deepEqual(defaultBuildProblems(), []);
  assert.equal(slotPairs(tokenCatalogue().slots).length, 229, 'the sweep measures every slot pair the contract declares');
});

test('complete and the catalogue report their slot pairs in the lines the gate prints', () => {
  const lines = slotReportLines(contrastScopes());
  assert.ok(lines.length > 0, 'a sweep that reports nothing over complete and eight entries measured nothing');
  assert.ok(lines.every((one) => one.startsWith('plugin-style-store/complete/') || one.startsWith(`${CATALOGUE}/`)),
    'the default is refused through defaultBuildProblems, so only complete and the catalogue are reported here');
});

test('a catalogue palette below AA is reported with its entry and palette name', () => {
  const dir = mkdtempSync(join(tmpdir(), 'catalogue-'));
  made.push(dir);
  for (const name of readdirSync(repoRoot)) if (name !== 'plugin-style-store') symlinkSync(join(repoRoot, name), join(dir, name));
  const store = join(dir, 'plugin-style-store');
  mkdirSync(store);
  for (const name of readdirSync(join(repoRoot, 'plugin-style-store'))) {
    if (name !== 'catalogue') symlinkSync(join(repoRoot, 'plugin-style-store', name), join(store, name));
  }
  const entry = join(store, 'catalogue', 'weak-register');
  mkdirSync(entry, { recursive: true });
  writeFileSync(join(entry, 'plugin.tokens.json'), '{}');
  writeFileSync(join(entry, 'arena.config.json'), JSON.stringify({
    palettes: [{ name: 'faint', polarity: 'dark', colors: { 'base-100': '#141010', 'base-content': '#2a2323' } }],
  }));
  const found = catalogueReports(dir);
  assert.ok(found.length > 0, 'a palette that fails AA reports nothing');
  assert.ok(found.every((one) => one.startsWith('weak-register, faint: ')));
});

test('the accents and the status hues are gated as ink on the base surfaces', () => {
  for (const token of ['primary', 'secondary', 'info', 'success', 'warning']) {
    const row = ON_SURFACE.find((one) => one.token === token);
    assert.equal(row?.gate, 4.5, `--color-${token} read as ink owes 4.5:1 like every ink`);
    assert.doesNotMatch(row?.note ?? '', /NOT GATED/);
  }
});

test('every Dravensoft key read as ink clears 4.5 over base-100, base-200 and base-300', () => {
  const INK = ['primary', 'secondary', 'error', 'info', 'success', 'warning'];
  for (const theme of ['dark', 'light']) {
    const palette = JSON.parse(readFileSync(join(repoRoot, `contracts/design/palette.${theme}.json`), 'utf8')).color as Record<string, { $value?: { hex?: string } }>;
    const hex = (key: string) => palette[key]?.$value?.hex as string;
    for (const key of INK) for (const ground of ['base-100', 'base-200', 'base-300']) {
      const ratio = contrast(hex(key), hex(ground));
      assert.ok(ratio >= 4.5, `${theme}: ${key} ${hex(key)} over ${ground} ${hex(ground)} is ${ratio.toFixed(2)}:1`);
    }
  }
});
