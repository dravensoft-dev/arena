import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PALETTE_KEYS } from './palette-keys.ts';
import { paletteReports, readPlugin, runtimeData, themeCss } from './theme-css.ts';
import { parseDecls } from '../../../lib/arena/css-decls.ts';
import { nodeImportsReachedFrom } from './cli-fixtures.ts';
import { arenaCheckPalette, arenaPaletteDeclarations, arenaRuntimePalette } from './palette.ts';

const colors = (overrides: Record<string, string> = {}): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const key of PALETTE_KEYS) out[key] = '#141010';
  return { ...out, ...overrides };
};

const PALETTES = [
  { name: 'dark', default: true, polarity: 'dark', colors: colors({ 'base-content': '#f3ede5' }) },
  { name: 'light', polarity: 'light', colors: colors({ 'base-100': '#ffffff', 'base-200': '#f4efe9' }) },
  { name: 'dusk', polarity: 'dark', colors: colors({ 'base-100': '#1b1830', 'base-200': '#25213f', 'base-content': '#f3ede5' }) },
];

const CONFIG: any = {
  palettes: PALETTES,
  runtimePalettes: true,
  stylePlugins: ['./design/console', './design/marketing'],
  fonts: {
    display: { family: 'Archivo', src: 'https://example.com/a.woff2' },
    body: { family: 'Familjen Grotesk', src: './fonts/b.woff2' },
    mono: { family: 'Spline Sans Mono', src: './fonts/m.woff2' },
  },
};

const SHEETS: any = {
  layers: ['css/reset.css'],
  components: ['button'],
  scopes: ['inverse'],
  aliases: ['--ink:var(--color-base-100);'],
  roleReferences: ['--fill-x:var(--color-base-200);'],
  levels: [
    { selector: '.arena-x__muted', state: '', property: 'color', variable: 'color-base-content', percent: 62, level: 'level-ink-muted' },
    { selector: '.arena-x__quiet', state: '', property: 'color', variable: 'color-base-content', percent: 40, level: 'level-ink-quiet' },
  ],
  washes: [{ selector: '.arena-x__hover', variable: 'color-primary', percent: 14 }],
  catalogue: {
    tokens: {
      'color-base-200': 'var(--color-base-200)', 'color-secondary': 'var(--color-secondary)',
      'fill-surface': 'var(--color-base-200)', 'fill-page': 'var(--color-base-100)',
    },
    roles: { 'ink-eyebrow': { type: 'color' }, 'fill-surface': { type: 'color' } },
  },
};
const PLUGINS = [
  readPlugin('console', {
    'ink-eyebrow': { $type: 'color', $value: '{color.secondary}' },
    'fill-surface': { $type: 'color', $value: '{color.base-200}' },
    light: {
      'ink-eyebrow': { $type: 'color', $value: '{color.base-200}' },
      'fill-surface': { $type: 'color', $value: '{color.base-content}' },
    },
  }),
  readPlugin('marketing', { 'ink-eyebrow': { $type: 'color', $value: '{color.base-200}' } }),
];

const data = runtimeData(CONFIG, SHEETS, PLUGINS);
const css = themeCss(CONFIG, { sheets: SHEETS, importHeader: false, plugins: PLUGINS });
const decls = parseDecls(css);
const keys = (selector: string) => {
  const found = decls.get(selector);
  assert.ok(found, `no ${selector} block`);
  const out: Record<string, string> = Object.fromEntries(found);
  delete out['arena-palette'];
  return out;
};

const differences = (built: Record<string, string>, runtime: Record<string, string>) =>
  [...new Set([...Object.keys(built), ...Object.keys(runtime)])].sort().flatMap((key) => {
    if (!(key in runtime)) return [`${key}: only the built class has it (${built[key]})`];
    if (!(key in built)) return [`${key}: only the runtime declaration has it (${runtime[key]})`];
    return built[key] === runtime[key] ? [] : [`${key}: built ${built[key]}, runtime ${runtime[key]}`];
  });

const fail = (fn: () => unknown, ...needles: string[]) => {
  assert.throws(fn, (error: Error) => needles.every((n) => error.message.includes(n)), `expected a throw naming ${needles.join(', ')}`);
};

for (const palette of PALETTES) {
  test(`a runtime palette and the class of the same palette declare the same thing, key by key: ${palette.name}`, () => {
    const built = keys(`.arena-${palette.name}`);
    assert.ok(Object.keys(built).some((key) => key.startsWith('level-')), 'the fixture sheets carry levels');
    const hook = keys(`.arena-polarity-${palette.polarity}`);
    const runtime = { ...arenaPaletteDeclarations(palette, data), ...hook };
    const stripped = Object.fromEntries(Object.entries(runtime).map(([k, v]) => [k.replace(/^--/, ''), v]));
    assert.deepEqual(differences(built, stripped), []);
  });

  test(`the checks are the build's checks: ${palette.name}`, () => {
    const built = paletteReports({ ...CONFIG, palettes: [palette] }, SHEETS.catalogue, PLUGINS, SHEETS.levels, SHEETS.washes)[0]?.messages ?? [];
    assert.deepEqual(arenaCheckPalette(palette, data), built);
  });
}

test('a palette that fails a check is still declared', () => {
  const mine = { polarity: 'dark', colors: colors({ 'base-content': '#141010', 'base-100': '#141010' }) };
  const { palette, reports } = arenaRuntimePalette('mine', mine, data);
  assert.ok(reports.some((r) => r.kind === 'contrast'), JSON.stringify(reports));
  assert.equal(palette.name, 'mine');
  assert.equal(palette.polarity, 'dark');
  assert.equal(palette.properties['--arena-palette'], 'mine');
  assert.equal(palette.properties['--color-base-100'], '#141010');
});

test('properties hold the colours and nothing of the polarity half', () => {
  const { palette } = arenaRuntimePalette('mine', PALETTES[1], data);
  assert.ok(Object.keys(palette.properties).every((k) => k.startsWith('--')));
  assert.ok(!('color-scheme' in palette.properties) && !('--picker-invert' in palette.properties));
});

test('input refusals name the key', () => {
  const ok = colors();
  const bad = (over: Record<string, any>, drop?: string) => {
    const c: Record<string, any> = { ...ok, ...over };
    if (drop) delete c[drop];
    return { polarity: 'dark', colors: c };
  };
  fail(() => arenaCheckPalette(bad({ primary: '#fff' }), data), 'palette.colors.primary: "#fff" is not a #rrggbb hex');
  fail(() => arenaCheckPalette(bad({ primary: 'red' }), data), 'palette.colors.primary: "red" is not a #rrggbb hex');
  fail(() => arenaCheckPalette(bad({ primary: 'url(x)' }), data), 'palette.colors.primary: "url(x)" is not a #rrggbb hex');
  fail(() => arenaCheckPalette(bad({ primary: '#aabbccdd' }), data), 'palette.colors.primary: "#aabbccdd" is not a #rrggbb hex');
  fail(() => arenaCheckPalette(bad({}, 'primary'), data), 'primary');
  fail(() => arenaCheckPalette(bad({ brand: '#aabbcc' }), data), 'brand');
  fail(() => arenaCheckPalette({ polarity: 'dim', colors: ok }, data), 'polarity');
  const noHeat = Object.fromEntries(Object.entries(ok).filter(([k]) => !k.startsWith('heat-')));
  fail(() => arenaCheckPalette({ polarity: 'dark', colors: { ...noHeat, 'heat-1': '#aabbcc' } }, data), 'heat-1');
  fail(() => arenaCheckPalette(undefined, data), 'palette: not an object');
  for (const nonObject of [null, 'dark', [], 7]) fail(() => arenaCheckPalette(nonObject, data), 'palette: not an object');
  for (const colorsOf of [null, 'x', [], 7]) {
    fail(() => arenaCheckPalette({ polarity: 'dark', colors: colorsOf }, data), 'palette.colors: not an object');
  }
  const upper = arenaPaletteDeclarations(bad({ primary: '#AABBCC' }), data);
  assert.equal(upper['--color-primary'], '#aabbcc');
});

test('data refusals say how to get the data', () => {
  for (const bad of [undefined, {}, { arenaRuntimePalettes: 2 }]) {
    fail(() => arenaCheckPalette(PALETTES[0], bad), 'arenaCheckPalette: no runtime data', '"runtimePalettes": true');
    fail(() => arenaPaletteDeclarations(PALETTES[0], bad), 'arenaPaletteDeclarations: no runtime data', '"runtimePalettes": true');
    fail(() => arenaRuntimePalette('mine', PALETTES[0], bad), 'arenaRuntimePalette: no runtime data', '"runtimePalettes": true', 'arena.runtime.generated.json');
  }
});

test('marker-only and malformed data throw a shape error naming the function', () => {
  const cases: unknown[] = [
    { arenaRuntimePalettes: 1 },
    { ...data, roles: undefined },
    { ...data, roles: { dark: {}, light: 'x' } },
    { ...data, hasRoot: undefined },
    { ...data, declared: 'dusk' },
    { ...data, levels: {} },
  ];
  for (const bad of cases) {
    fail(() => arenaCheckPalette(PALETTES[0], bad), 'arenaCheckPalette: the runtime data does not match', 'arena.runtime.generated.json');
    fail(() => arenaRuntimePalette('mine', PALETTES[0], bad), 'arenaRuntimePalette: the runtime data does not match');
  }
});

test('name refusals', () => {
  fail(() => arenaRuntimePalette('dusk', PALETTES[0], data), 'dusk', 'a palette the build declares');
  fail(() => arenaRuntimePalette('inverse', PALETTES[0], data), 'inverse');
  fail(() => arenaRuntimePalette('polarity-dark', PALETTES[0], data), 'polarity-dark');
  fail(() => arenaRuntimePalette('My Palette', PALETTES[0], data), 'My Palette');
});

test('the module imports no node: module', () => {
  assert.deepEqual(nodeImportsReachedFrom('scripts/generate/core/arena-cli/palette.ts'), []);
});

test('arenaCheckPalette reports a base-100 that contradicts the declared polarity, as a declared palette does', () => {
  const input = { polarity: 'light' as const, colors: colors() };
  const lines = arenaCheckPalette(input, data).filter((m) => m.message.startsWith('polarity,'));
  assert.deepEqual(lines.map((m) => m.message), ['polarity, base-100 #141010 reads as dark, and the palette declares light']);
  const declared = paletteReports({ ...CONFIG, palettes: [{ name: 'x', default: true, ...input }] }, SHEETS.catalogue, PLUGINS, SHEETS.levels, SHEETS.washes)[0]?.messages ?? [];
  assert.deepEqual(declared.filter((m) => m.message.startsWith('polarity,')).map((m) => m.message), lines.map((m) => m.message));
  assert.deepEqual(arenaCheckPalette({ polarity: 'dark', colors: colors() }, data).filter((m) => m.message.startsWith('polarity,')), []);
});
