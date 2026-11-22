import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import {
  configProblems, heatReports, heatOrderReports, themeCss, packageLines, PACKAGE_HEADER, packageImports, paletteReports, defaultPalette, isStylesheet, scopedImports,
  pluginName, pluginValue, readPlugin, weightReports, rootWithDefaults, resolvedPlugin,
  pluginBlocks, pluginTokenProblems, rolesFor, nestedRolesFor,
  ARENA_FONT_DEFAULTS, ALWAYS_THEMED, RUNTIME_MARKER, polarityClass, polarityDeclarations, restatedBy, lightGroupProblems, type CheckedStylesheet, type CheckedSheets,
} from './theme-css.ts';
import { PALETTE_KEYS, POLARITIES, heatKeys } from './palette-keys.ts';
import { heatLadder } from './oklab.ts';
import { parseDecls } from '../../../lib/arena/css-decls.ts';
import { roleReferencesIn } from './sheets.ts';
import { tokenCatalogue } from '../../../lib/arena/package-assembly.ts';
import { repoRoot } from '../../../lib/arena/repo-root.ts';
import { goldenInput } from '../../../lib/arena/theme-css-golden-input.ts';
import { crossKeys, scopeOn } from './style-plugin-rules.ts';
import { whileHeld } from './cli-fixtures.ts';

const SLOTS = tokenCatalogue().slots;

const colors = (overrides: Record<string, string> = {}): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const key of PALETTE_KEYS) out[key] = '#141010';
  return { ...out, ...overrides };
};

const schemeIn = (css: string, selector: string): string | null => {
  const at = css.indexOf(`${selector}{`);
  if (at < 0) return null;
  return /color-scheme:([a-z]+);/.exec(css.slice(at, css.indexOf('}', at)))?.[1] ?? null;
};

const config = (overrides: Record<string, any> = {}): any => ({
  palettes: [{ name: 'dark', default: true, polarity: 'dark', colors: colors() }],
  fonts: {
    display: { family: 'Archivo', src: 'https://example.com/a.woff2' },
    body: { family: 'Familjen Grotesk', src: './fonts/b.woff2' },
    mono: { family: 'Spline Sans Mono', src: './fonts/m.woff2' },
  },
  ...overrides,
});

const packageCss = (c: Parameters<typeof packageLines>[0], o: Parameters<typeof packageLines>[1] = {}) =>
  `${PACKAGE_HEADER}\n${packageLines(c, o).join('\n')}\n`;

test('a well-formed configuration has no problems', () => {
  assert.deepEqual(configProblems(config()), []);
});

test('an extension key is not a configuration', () => {
  const problems = configProblems(config({ extension: 'showcase' }));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /stylePlugins/,
    'the axis has one name, and the other one is taken twice over: by the DTCG vendor key in this '
    + 'tree and by the Claude Code plugin the repository ships');
});

test('stylePlugins takes a list and never a bare name', () => {
  const problems = configProblems(config({ stylePlugins: 'default' }));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /a list/,
    'a build can carry more than one register, so the field is a list from the first day rather '
    + 'than a name that grows into one');
});

test('an empty list is not a configuration', () => {
  const problems = configProblems(config({ stylePlugins: [] }));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /at least one/,
    'removable means replaceable: a build with no style plugin has no answer to any role');
});

test('a missing colour is named by its key', () => {
  const broken = config();
  delete broken.palettes[0].colors.primary;
  assert.deepEqual(configProblems(broken), ['palettes[0].colors: missing primary']);
});

test('error-fill may be left out of a palette', () => {
  const c = config();
  delete c.palettes[0].colors['error-fill'];
  assert.deepEqual(configProblems(c), []);
});

test('a palette that leaves primary-fill out fills with primary, so nothing it already draws moves', () => {
  const without = colors({ primary: '#6941c6' });
  delete without['primary-fill'];
  const c = config({ palettes: [{ name: 'day', default: true, polarity: 'light', colors: without }] });
  assert.deepEqual(configProblems(c), []);
  assert.equal(parseDecls(themeCss(c)).get(':root').get('color-primary-fill'), '#6941c6',
    'a button, a checked box and a current page compile to var(--color-primary-fill) with no fallback');
});

test('a palette may split the primary fill from the primary ink, and the content is measured on the fill', () => {
  const split = colors({ primary: '#9e77ed', 'primary-fill': '#7f56d9', 'primary-content': '#ffffff' });
  const [report] = paletteReports(config({ palettes: [{ name: 'night', default: true, polarity: 'dark', colors: split }] }));
  assert.ok(!report?.messages.some((m) => m.message.includes('primary-content on')),
    'white on #7f56d9 clears 4.5:1; white on #9e77ed would not, and nothing sets it there');
});

const withoutHeat = (one: Record<string, string>) => {
  for (const key of heatKeys()) delete one[key];
  return one;
};

test('a palette that pins no heat step gets all five derived from its slot, surface and ink', () => {
  const own = withoutHeat(colors({ 'cat-4': '#6a59bc', 'base-200': '#1d1715', 'base-content': '#f3ede5' }));
  const c = config({ palettes: [{ name: 'dark', default: true, polarity: 'dark', colors: own }] });
  assert.deepEqual(configProblems(c), []);
  const root = parseDecls(themeCss(c)).get(':root');
  assert.deepEqual(heatKeys().map((k) => root.get(`color-${k}`)),
    heatLadder('#6a59bc', '#1d1715', '#f3ede5', 'dark'),
    'a heatmap cell compiles to a role born at var(--color-heat-N), which no fallback stands behind');
});

test('a palette that pins all five heat steps keeps them', () => {
  const pinned = ['#111111', '#222222', '#333333', '#444444', '#555555'];
  const own = colors(Object.fromEntries(heatKeys().map((k, i) => [k, pinned[i]!])));
  const root = parseDecls(themeCss(config({ palettes: [{ name: 'dark', default: true, polarity: 'dark', colors: own }] })))
    .get(':root');
  assert.deepEqual(heatKeys().map((k) => root.get(`color-${k}`)), pinned);
});

test('a palette that pins two heat steps is a problem, because a ladder half pinned is half derived', () => {
  const own = withoutHeat(colors());
  own['heat-1'] = '#111111';
  own['heat-2'] = '#222222';
  const c = config({ palettes: [{ name: 'dark', default: true, polarity: 'dark', colors: own }] });
  assert.deepEqual(configProblems(c), ['palettes[0].colors: pins heat-1 to heat-5 together or none']);
});

test('a key Arena does not have is a problem, not a passthrough', () => {
  const c = config({ palettes: [{ name: 'dark', polarity: 'dark', colors: colors({ 'brand-x': '#ffffff' }) }] });
  assert.deepEqual(configProblems(c), ['palettes[0].colors: brand-x is not an Arena palette key']);
});

test('a colour that is not a six-digit hex is reported with its value', () => {
  const c = config({ palettes: [{ name: 'dark', polarity: 'dark', colors: colors({ primary: 'crimson' }) }] });
  assert.deepEqual(configProblems(c), ['palettes[0].colors.primary: "crimson" is not a #rrggbb hex']);
});

test('a name that is not kebab-case is rejected, because it becomes a class', () => {
  const c = config({ palettes: [{ name: 'High Contrast', polarity: 'light', colors: colors() }] });
  assert.deepEqual(configProblems(c), ['palettes[0].name: "High Contrast" is not a kebab-case name']);
});

test('two palettes cannot share a name', () => {
  const c = config({ palettes: [
    { name: 'dark', polarity: 'dark', colors: colors() },
    { name: 'dark', polarity: 'light', colors: colors() },
  ] });
  assert.deepEqual(configProblems(c), ['palettes[1].name: dark is declared twice']);
});

test('exactly one palette reaches :root', () => {
  const c = config({ palettes: [
    { name: 'dark', default: true, polarity: 'dark', colors: colors() },
    { name: 'light', default: true, polarity: 'light', colors: colors() },
  ] });
  assert.deepEqual(configProblems(c), ['palettes: 2 palettes declare default; exactly one reaches :root']);
});

test('with no palette declaring default, the first one is it', () => {
  const c = config({ palettes: [
    { name: 'ember', polarity: 'dark', colors: colors() },
    { name: 'bone', polarity: 'light', colors: colors() },
  ] });
  assert.deepEqual(configProblems(c), []);
  assert.equal(defaultPalette(c.palettes).name, 'ember');
});

test('an unknown polarity is rejected, because it decides --picker-invert and color-scheme', () => {
  const c = config({ palettes: [{ name: 'dark', polarity: 'midnight', colors: colors() }] });
  assert.deepEqual(configProblems(c), ['palettes[0].polarity: "midnight" is not one of dark, light']);
});

test('a palette refuses a key it does not know and takes the four it does', () => {
  const rows: { name: string; palette: Record<string, unknown>; expected: string[] }[] = [
    {
      name: 'a palette carrying an unknown key is refused naming the key and the keys a palette takes',
      palette: { name: 'dark', polarity: 'dark', colors: colors(), './design/soft': true },
      expected: ['palettes[0]../design/soft: not a key of a palette. The keys are name, default, polarity, colors'],
    },
    {
      name: 'a palette carrying only known keys has no key problem',
      palette: { name: 'dark', default: true, polarity: 'dark', colors: colors() },
      expected: [],
    },
  ];
  for (const { name, palette, expected } of rows) {
    assert.deepEqual(configProblems(config({ palettes: [palette] })), expected, name);
  }
});

const withScopes = (scopes: string[]): any => ({ layers: [], components: [], scopes });

test('a palette named after a class the package ships is refused, and its own polarity is the exception', () => {
  const c = config({ palettes: [
    { name: 'light', default: true, polarity: 'light', colors: colors() },
    { name: 'midnight', polarity: 'dark', colors: colors() },
    { name: 'compact', polarity: 'dark', colors: colors() },
    { name: 'stat-card', polarity: 'dark', colors: colors() },
  ] });
  const problems = configProblems(c, withScopes(['compact', 'light', 'stat-card']));
  assert.equal(problems.length, 2);
  assert.match(problems[0] ?? '', /^palettes\[2\]\.name: "compact" is already a class this package ships/);
  assert.match(problems[1] ?? '', /^palettes\[3\]\.name: "stat-card" is already a class this package ships/);
});

test('a palette named after a class Arena is going to ship is refused, with or without a package', () => whileHeld('held-name', () => {
  const c = config({ palettes: [
    { name: 'light', default: true, polarity: 'light', colors: colors() },
    { name: 'held-name', polarity: 'dark', colors: colors() },
    { name: 'brand', polarity: 'dark', colors: colors() },
  ] });
  for (const sheets of [withScopes(['light', 'stat-card']), undefined]) {
    const problems = configProblems(c, sheets);
    assert.equal(problems.length, 1);
    assert.match(problems[0] ?? '', /^palettes\[1\]\.name: "held-name" is held for ArenaHeld, a name held for one case/);
  }
}));

test('a palette and a style plugin both named for a reserved class each report the reservation', () => whileHeld('held-name', () => {
  const c = config({
    palettes: [
      { name: 'light', default: true, polarity: 'light', colors: colors() },
      { name: 'held-name', polarity: 'dark', colors: colors() },
    ],
    stylePlugins: ['default', './plugins/held-name'],
  });
  const problems = configProblems(c, withScopes(['light']));
  assert.ok(problems.some((line) => line.startsWith('palettes[1].name: "held-name" is held for ArenaHeld, a name held for one case')), problems.join('\n'));
  assert.ok(problems.some((line) => line.startsWith('stylePlugins[1]: "held-name" is held for ArenaHeld, a name held for one case')), problems.join('\n'));
  assert.ok(problems.some((line) => line.startsWith('stylePlugins[1]: "held-name" is also the name of a palette')), problems.join('\n'));
}));

test('a palette claiming a polarity scope it does not answer to is refused', () => {
  const c = config({ palettes: [
    { name: 'midnight', default: true, polarity: 'dark', colors: colors() },
    { name: 'light', polarity: 'dark', colors: colors() },
  ] });
  const problems = configProblems(c, withScopes(['light']));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /palettes\[1\]\.name: "light" is already a class this package ships/);
});

test('a style plugin named after a class the package ships is refused', () => {
  const c = config({ stylePlugins: ['default', './plugins/stack'] });
  const problems = configProblems(c, withScopes(['stack']));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /^stylePlugins\[1\]: "stack" is already a class this package ships/);
});

test('every palette is validated, however many the config declares', () => {
  const c = config({ palettes: [
    { name: 'bone', default: true, polarity: 'light', colors: colors() },
    { name: 'ember', polarity: 'midnight', colors: colors() },
    { name: 'Slate', polarity: 'dark', colors: colors() },
    { name: 'dusk', polarity: 'dark', colors: colors({ primary: 'crimson' }) },
  ] });
  assert.deepEqual(configProblems(c), [
    'palettes[1].polarity: "midnight" is not one of dark, light',
    'palettes[2].name: "Slate" is not a kebab-case name',
    'palettes[3].colors.primary: "crimson" is not a #rrggbb hex',
  ]);
});

test('a missing font role names the three tokens Arena reads', () => {
  const c = config();
  delete c.fonts.mono;
  assert.match(configProblems(c)[0] ?? '', /fonts\.mono: missing; Arena reads --font-display/);
});

test('the default palette lands on :root and, with every other, on its own class', () => {
  const c = config({ palettes: [
    { name: 'dark', default: true, polarity: 'dark', colors: colors() },
    { name: 'light', polarity: 'light', colors: colors({ 'base-100': '#ffffff' }) },
    { name: 'high-contrast', polarity: 'light', colors: colors({ 'base-100': '#fefefe' }) },
  ] });
  const decls = parseDecls(themeCss(c));
  assert.deepEqual([...decls.keys()].filter((s) => !s.startsWith('@')), [':root', '.arena-dark', '.arena-light', '.arena-high-contrast']);
  assert.equal(decls.get(':root').get('color-base-100'), '#141010');
  assert.equal(decls.get('.arena-light').get('color-base-100'), '#ffffff');
  assert.equal(decls.get('.arena-dark').get('color-base-100'), '#141010');
});

const aliased = () => ({ ...SHEETS_FULL, aliases: ['--ink:var(--color-base-100);', '--focus-ring:var(--color-secondary);'] });
const TWO_PALETTES = [
  { name: 'dark', default: true, polarity: 'dark', colors: colors() },
  { name: 'light', polarity: 'light', colors: colors({ 'base-100': '#ffffff' }) },
];

test('a later plugin with no answer for the palette still names itself in its block', () => {
  const css = themeCss(listed(['console', 'marketing']), {
    sheets: SHEETS_FULL, plugins: [total(), readPlugin('marketing', {})],
  });
  assert.match(css, /\.arena-marketing\{\n  --arena-plugin:marketing;\n\}/);
});

test('the default palette also wears its class, carrying its polarity and its name', () => {
  const css = themeCss(config({ palettes: TWO_PALETTES }));
  const block = (selector: string) => css.slice(css.indexOf(`${selector}{`), css.indexOf('}', css.indexOf(`${selector}{`)));
  assert.match(block('.arena-dark'), /color-scheme:dark;/);
  assert.match(block('.arena-dark'), /--arena-palette:dark;/);
  assert.match(block(':root'), /--arena-palette:dark;/);
  assert.match(block('.arena-light'), /--arena-palette:light;/);
  assert.match(block('.arena-light'), /color-scheme:light;/);
});

test('every palette block, :root included, holds every alias the catalogue declares', () => {
  const css = themeCss(config({ palettes: TWO_PALETTES }), { sheets: aliased() });
  const decls = parseDecls(css);
  for (const selector of [':root', '.arena-dark', '.arena-light'])
    for (const alias of ['ink', 'focus-ring'])
      assert.ok(decls.get(selector).has(alias), `${selector} lacks --${alias}`);
  assert.equal(decls.get('.arena-light').get('focus-ring'), 'var(--color-secondary)');
});

const MUTE = /--mute:[^;]+;/.exec(readFileSync(fileURLToPath(new URL('../../../../contracts/design/colors.css', import.meta.url)), 'utf8'))?.[0] ?? '';
const MUTE_LEVELS = [{ selector: '.arena-x__muted', state: '', property: 'color', variable: 'color-base-content', percent: 62, level: 'level-ink-muted' }];
const DIM_PALETTES = [{
  name: 'dim', default: true, polarity: 'dark',
  colors: colors({ 'base-content': '#a89e9e', 'base-100': '#141010', 'base-200': '#141010', 'base-300': '#141010' }),
}];
const MUTE_DECLARATION = 'color-mix(in oklab,var(--color-base-content) var(--level-ink-muted),transparent)';

test('a palette whose muted level is raised restates --mute at that level', () => {
  const css = themeCss(config({ palettes: DIM_PALETTES }), { sheets: { ...SHEETS_FULL, aliases: [MUTE], levels: MUTE_LEVELS }, plugins: [total()] });
  const block = parseDecls(css).get('.arena-dim');
  const raised = Number(/^(\d+)%$/.exec(block.get('level-ink-muted') ?? '')?.[1]);
  assert.ok(raised > 62, `the fixture raises the muted level past its 62% floor, got ${block.get('level-ink-muted')}`);
  assert.equal(block.get('mute'), MUTE_DECLARATION, 'the alias reads the level the same block declares');
});

test('runtimePalettes restates --mute in each polarity block, so it follows the level raised for that scope', () => {
  const css = themeCss(config({ palettes: DIM_PALETTES, runtimePalettes: true }),
    { sheets: { ...SHEETS_FULL, aliases: [MUTE], levels: MUTE_LEVELS }, plugins: [total()] });
  for (const p of POLARITIES) {
    assert.equal(parseDecls(css).get(`.${polarityClass(p)}`).get('mute'), MUTE_DECLARATION, `${p} hook`);
  }
});

test('a later plugin names itself, the root plugin does not, and the default palette crosses too', () => {
  const css = themeCss(listed(['console', 'marketing'], { palettes: [
    { name: 'dark', default: true, polarity: 'dark', colors: colors() },
    { name: 'light', polarity: 'light', colors: colors() },
  ] }), {
    sheets: SHEETS_FULL,
    plugins: [total(), scoped({ 'ink-eyebrow': { $type: 'color', $value: '{color.secondary}' } })],
  });
  const decls = parseDecls(css);
  assert.equal(decls.get('.arena-marketing').get('arena-plugin'), 'marketing');
  assert.equal(decls.get(':root').has('arena-plugin'), false);
  const keys = [...decls.keys()];
  for (const key of crossKeys('.arena-dark', '.arena-marketing'))
    assert.ok(keys.includes(key), `the default palette lacks the cross ${key}`);
});

test('polarity decides --picker-invert and color-scheme in every block', () => {
  const c = config({ palettes: [
    { name: 'bone', default: true, polarity: 'light', colors: colors() },
    { name: 'ember', polarity: 'dark', colors: colors() },
    { name: 'dusk', polarity: 'dark', colors: colors() },
    { name: 'paper', polarity: 'light', colors: colors() },
  ] });
  const css = themeCss(c);
  const decls = parseDecls(css);
  assert.equal(decls.get(':root').get('picker-invert'), '0');
  assert.equal(decls.get('.arena-ember').get('picker-invert'), '1');
  assert.equal(decls.get('.arena-dusk').get('picker-invert'), '1');
  assert.equal(decls.get('.arena-paper').get('picker-invert'), '0');
  assert.equal(schemeIn(css, ':root'), 'light');
  assert.equal(schemeIn(css, '.arena-ember'), 'dark');
  assert.equal(schemeIn(css, '.arena-dusk'), 'dark');
  assert.equal(schemeIn(css, '.arena-paper'), 'light');
});

test('the three families reach :root with the generic fallback their role carries', () => {
  const decls = parseDecls(themeCss(config()));
  assert.equal(decls.get(':root').get('font-display'), "'Archivo',system-ui,sans-serif");
  assert.equal(decls.get(':root').get('font-mono'), "'Spline Sans Mono',ui-monospace,monospace");
});

test('a declared fallback replaces the role default', () => {
  const c = config();
  c.fonts.body.fallback = ['Georgia', 'serif'];
  const decls = parseDecls(themeCss(c));
  assert.equal(decls.get(':root').get('font-body'), "'Familjen Grotesk','Georgia',serif");
});

test('a src is emitted verbatim, and its format comes from the extension', () => {
  const css = themeCss(config());
  assert.match(css, /src:url\('https:\/\/example\.com\/a\.woff2'\) format\('woff2'\);/);
  assert.match(css, /src:url\('\.\/fonts\/b\.woff2'\) format\('woff2'\);/);
});

test('a URL carrying a query keeps its format, because the extension is read off the path', () => {
  const c = config();
  c.fonts.display.src = 'https://example.com/a.woff2?v=3';
  assert.match(themeCss(c), /url\('https:\/\/example\.com\/a\.woff2\?v=3'\) format\('woff2'\)/);
});

test('a src with no recognised extension is emitted with no format hint rather than a wrong one', () => {
  const c = config();
  c.fonts.display.src = 'https://example.com/font';
  assert.match(themeCss(c), /src:url\('https:\/\/example\.com\/font'\);/);
});

test('the package sheet names the package, and the theme sheet imports none of it', () => {
  assert.match(packageCss(config(), { packageName: '@dravensoft/arena-angular' }),
    /@import '@dravensoft\/arena-angular\/arena\.css';/);
  assert.doesNotMatch(themeCss(config()), /@import '@dravensoft/);
  assert.doesNotMatch(themeCss(config()), /arena\.css/);
});

test('the package sheet carries no word of the config, so its bytes change with the package and the components drawn', () => {
  const sheets = { layers: ['css/base.css', 'css/components.css'], components: ['arena-button'] } as CheckedSheets;
  const one = packageCss(config({ palettes: [{ name: 'one', default: true, polarity: 'dark', colors: colors() }] }), { sheets });
  const two = packageCss(config({ fonts: { ...config().fonts, body: { family: 'Other', src: './x.woff2' } } }), { sheets });
  assert.equal(one, two);
  assert.match(one, /^\/\* GENERATED by arena build\. /);
  assert.ok(!one.includes('arena.config.json'));
});

test('packageImports answers null when the config names its own sheets and the package\'s were never read', () => {
  assert.equal(packageImports(config({ stylesheet: { components: ['arena-button'] } }), {}), null);
  assert.throws(() => packageLines(config({ stylesheet: { components: ['arena-button'] } }), {}), /never read/);
  assert.deepEqual(packageImports(config(), { packageName: '@x/y' }), ["@import '@x/y/arena.css';"]);
});

test('a palette whose text fails 4.5:1 is reported rather than refused', () => {
  const c = config({ palettes: [{ name: 'dark', polarity: 'dark',
    colors: colors({ 'base-100': '#141010', 'base-content': '#1a1a1a' }) }] });
  assert.deepEqual(configProblems(c), []);
  const [report] = paletteReports(c);
  assert.ok(report, 'a palette under 4.5:1 reported nothing at all');
  assert.equal(report.palette, 'dark');
  assert.ok(report.messages.some((m) => m.kind === 'contrast'
    && m.message.startsWith('text, base-content on base-100')));
});

test('a palette whose base-100 sits on the other side of its polarity is reported, in either direction', () => {
  const messages = (polarity: string, ground: string) =>
    paletteReports(config({ palettes: [{ name: 'x', default: true, polarity, colors: colors({ 'base-100': ground }) }] }))[0]?.messages
      .filter((m) => m.message.startsWith('polarity,')) ?? [];
  assert.deepEqual(messages('dark', '#fafafa').map((m) => [m.kind, m.message]),
    [['contrast', 'polarity, base-100 #fafafa reads as light, and the palette declares dark']]);
  assert.deepEqual(messages('light', '#141010').map((m) => m.message),
    ['polarity, base-100 #141010 reads as dark, and the palette declares light']);
  assert.deepEqual(messages('dark', '#141010'), []);
  assert.deepEqual(messages('light', '#ffffff'), []);
});

test('a ramp of one repeated colour is reported as indistinguishable', () => {
  const [report] = paletteReports(config());
  assert.ok(report?.messages.some((m) => m.kind === 'ramp' && m.message.startsWith('ramp,')));
});

test('a palette that leaves error-fill out still gets a fill to paint with', () => {
  const without = colors({ error: '#c0392f' });
  delete without['error-fill'];
  const c = config({ palettes: [{ name: 'day', default: true, polarity: 'light', colors: without }] });
  assert.deepEqual(configProblems(c), []);
  const decls = parseDecls(themeCss(c));
  assert.ok(decls.get(':root').get('color-error-fill'),
    'ArenaConfirmDialog compiles to var(--color-error-fill) with no fallback, so an omitted '
    + 'key drops the declaration and the point-of-no-return button paints nothing at all');
});

test('every fill a consumer declares is measured against its content, not only primary', () => {
  const c = config({ palettes: [{ name: 'day', default: true, polarity: 'light',
    colors: colors({ success: '#58cc02', 'success-content': '#ffffff' }) }] });
  const [report] = paletteReports(c);
  assert.ok(report?.messages.some((m) => m.kind === 'contrast'
    && m.message.startsWith('text, success-content on success')),
  'a fill carrying illegible content reached the consumer as silence');
});

test('a ramp colour invisible against the surface it is drawn on is reported', () => {
  const pale = ['#ffe9a8', '#ffd6e0', '#d9f2d0', '#cfe6ff', '#f0dcff', '#d0f2ee', '#ffe4cc', '#e6e6c8'];
  const overrides: Record<string, string> = { 'base-100': '#ffffff', 'base-200': '#ffffff' };
  pale.forEach((hex, i) => { overrides[`cat-${i + 1}`] = hex; });
  const c = config({ palettes: [{ name: 'day', default: true, polarity: 'light', colors: colors(overrides) }] });
  const [report] = paletteReports(c);
  assert.ok(report?.messages.some((m) => m.kind === 'ramp' && m.message.includes('Contrast vs surface')),
    'a slot under 3:1 against its surface reached the consumer as silence');
});

test('a stylesheet src becomes an @import, because Google Fonts serves CSS and not a binary', () => {
  const c = config();
  c.fonts.display.src = 'https://fonts.googleapis.com/css2?family=Archivo:wght@400..900&display=swap';
  const css = themeCss(c);
  assert.match(css, /@import url\('https:\/\/fonts\.googleapis\.com\/css2\?family=Archivo[^']*'\);/);
  assert.doesNotMatch(css, /font-family:'Archivo';\n/);
  assert.match(css, /--font-display:'Archivo',system-ui,sans-serif/);
});

test('one stylesheet serving several families is imported once', () => {
  const c = config();
  const sheet = 'https://fonts.googleapis.com/css2?family=Archivo&family=Familjen+Grotesk&display=swap';
  c.fonts.display.src = sheet;
  c.fonts.body.src = sheet;
  assert.equal(themeCss(c).match(/@import url\(/g)?.length, 1);
});

test('every @import precedes the first rule, which is what CSS requires', () => {
  const c = config();
  c.fonts.display.src = 'https://fonts.googleapis.com/css2?family=Archivo';
  const css = themeCss(c);
  assert.ok(css.lastIndexOf('@import') < css.indexOf('@font-face'));
  assert.ok(css.lastIndexOf('@import') < css.indexOf(':root{'));
});

test('a .css path is a stylesheet however it is hosted', () => {
  assert.equal(isStylesheet('./fonts/faces.css'), true);
  assert.equal(isStylesheet('https://cdn.example.com/f.css?v=2'), true);
  assert.equal(isStylesheet('./fonts/a.woff2'), false);
});

const shipped = {
  layers: ['css/reset.css', 'css/base.css', 'css/prelude.css', 'css/components.css', 'css/arena-cdk.css'],
  components: ['arena-button', 'arena-side-nav', 'arena-table'],
};

test('with no stylesheet key the sheets are imported one by one, so no root takes the barrel', () => {
  assert.deepEqual(configProblems(config(), shipped), []);
  const css = packageCss(config(), { sheets: shipped });
  assert.doesNotMatch(css, /arena\.css/);
  for (const name of shipped.components) assert.ok(css.includes(`css/components/${name}.css`), name);
});

test('every root imports the closed list: the default and a custom root differ only by the plugin slot line', () => {
  const sheets = { ...shipped, layers: [...shipped.layers, 'css/style-plugin-default.css'] };
  const slot = "@import '@dravensoft/arena-react/css/style-plugin-default.css';";
  const imports = (css: string) => css.split('\n').filter((line) => line.startsWith('@import \'@dravensoft'));
  const byDefault = imports(packageCss(listed(['default']), { sheets }));
  const own = imports(packageCss(listed(['console']), { sheets }));
  assert.ok(byDefault.includes(slot));
  assert.ok(!own.includes(slot));
  assert.deepEqual(byDefault.filter((line) => line !== slot), own);
  assert.ok(![...byDefault, ...own].some((line) => line.endsWith('/arena.css\';')));
});

test('a named component list replaces the barrel and keeps the order the barrel had', () => {
  const c = config({ stylesheet: { components: ['arena-table', 'arena-button'] } });
  assert.deepEqual(configProblems(c, shipped), []);
  assert.deepEqual(scopedImports('@dravensoft/arena-angular', c.stylesheet, shipped), [
    "@import '@dravensoft/arena-angular/css/reset.css';",
    "@import '@dravensoft/arena-angular/css/base.css';",
    "@import '@dravensoft/arena-angular/css/prelude.css';",
    "@import '@dravensoft/arena-angular/css/components/arena-table.css';",
    "@import '@dravensoft/arena-angular/css/components/arena-button.css';",
    "@import '@dravensoft/arena-angular/css/arena-cdk.css';",
  ]);
  assert.doesNotMatch(packageCss(c, { sheets: shipped }), /arena\.css/);
});

test('preflight false drops the one layer that is Tailwind\'s and not Arena\'s', () => {
  const c = config({ stylesheet: { components: ['arena-button'], preflight: false } });
  assert.deepEqual(configProblems(c, shipped), []);
  assert.ok(!scopedImports('p', c.stylesheet, shipped).some((line) => line.includes('css/base.css')));
  assert.ok(scopedImports('p', c.stylesheet, shipped).some((line) => line.includes('css/prelude.css')));
});

test('a stylesheet block with preflight false and no components imports every component sheet and drops base.css', () => {
  const c = config({ stylesheet: { preflight: false } });
  assert.deepEqual(configProblems(c, shipped), []);
  const imports = packageCss(c, { sheets: shipped });
  assert.ok(!imports.includes('css/base.css'));
  for (const name of shipped.components) assert.ok(imports.includes(`css/components/${name}.css`), name);
});

test('fontFace writes ARENA_FONT_DEFAULTS for a font that names no style, weight or display', () => {
  const css = themeCss(config());
  assert.ok(css.includes(`font-style:${ARENA_FONT_DEFAULTS.style};`));
  assert.ok(css.includes(`font-weight:${ARENA_FONT_DEFAULTS.weight};`));
  assert.ok(css.includes(`font-display:${ARENA_FONT_DEFAULTS.display};`));
});

test('a local src is cut and named by content: one face per cut file, each with the Latin-1 unicode-range', () => {
  const css = themeCss(config(), { cuts: {
    body: { faces: [{ name: 'b-0123456789.woff2', weight: '400 700' }] },
    mono: { faces: [{ name: 'm-aaaaaaaaaa.woff2', weight: '400' }, { name: 'm-bbbbbbbbbb.woff2', weight: '700' }] },
  } });
  assert.ok(css.includes("src:url('./b-0123456789.woff2') format('woff2');"));
  assert.equal(css.match(/font-family:'Spline Sans Mono';/g)?.length, 2, 'two pins, two faces');
  assert.ok(css.includes('font-weight:400;') && css.includes('font-weight:700;'));
  assert.equal(css.match(/unicode-range:U\+0020-007E,U\+00A0-00FF,U\+2013-2014,U\+2018-201A,U\+201C-201E,U\+2026,U\+20AC;/g)?.length, 3);
  assert.ok(!css.includes('./fonts/b.woff2') && !css.includes('./fonts/m.woff2'), 'the cut replaces the source path');
});

test('a remote src stays as written, with no unicode-range', () => {
  const css = themeCss(config(), { cuts: {} });
  assert.ok(css.includes("src:url('https://example.com/a.woff2') format('woff2');"));
  assert.ok(!css.includes('unicode-range'));
});

test('a weight the cut lost is a weight report naming role, weight and font', () => {
  const messages = weightReports(config(), null, null,
    { body: { family: 'Familjen Grotesk', label: './fonts/b.woff2', axis: [400, 700], lost: [300, 900] } });
  assert.equal(messages.length, 2);
  assert.ok(messages.every((m) => m.kind === 'weight' && m.message.includes('fonts.body') && m.message.includes('Familjen Grotesk')
    && m.message.includes('./fonts/b.woff2') && m.message.includes('400-700')));
  assert.ok(messages[0]?.message.includes('paints 300') && messages[1]?.message.includes('paints 900'));
});

test('a component the package does not ship is fatal and the message lists what it does ship', () => {
  const [problem] = configProblems(config({ stylesheet: { components: ['buton'] } }), shipped);
  assert.match(problem ?? '', /"buton" is not a sheet this package ships, which are arena-button, arena-side-nav, arena-table/);
});

test('an empty list is a problem, because it reads as a project that renders nothing', () => {
  assert.deepEqual(configProblems(config({ stylesheet: { components: [] } }), SHEETS),
    ['stylesheet.components: name at least one component sheet, or drop stylesheet to let arena build work them out']);
});

test('a name repeated in the list is reported rather than imported twice', () => {
  const problems = configProblems(config({ stylesheet: { components: ['arena-button', 'arena-button'] } }), shipped);
  assert.deepEqual(problems, ['stylesheet.components: arena-button is named twice']);
});

test('a stylesheet key Arena does not have is a problem, and preflight takes a boolean', () => {
  assert.deepEqual(configProblems(config({ stylesheet: { components: ['arena-button'], minify: true } }), shipped),
    ['stylesheet.minify: not an Arena stylesheet key']);
  assert.deepEqual(configProblems(config({ stylesheet: { components: ['arena-button'], preflight: 'no' } }), shipped),
    ['stylesheet.preflight: "no" is not true or false']);
});

test('without the shipped sheets a name can be held to nothing, so the run stops', () => {
  const [problem] = configProblems(config({ stylesheet: { components: ['arena-button'] } }), null);
  assert.match(problem ?? '', /^stylesheet: the sheets this package ships cannot be read/);
});

const SHEETS = {
  layers: ['css/reset.css'],
  components: ['button'],
  roleReferences: ['--fill-surface:var(--color-base-200);'],
};

const SHEETS_FULL = {
  ...SHEETS,
  catalogue: { slots: SLOTS,
    tokens: {
      'fs-h3': '24px', 'font-display': "'Archivo',system-ui,sans-serif",
      'font-body': "'Familjen Grotesk',system-ui,sans-serif", 'fw-black': '900', 'fw-regular': '400',
      'color-base-200': 'var(--color-base-200)', 'color-secondary': 'var(--color-secondary)',
      bw: '1px', 'bw-surface': '1px', 'shadow-surface-rest': '0px 0px 0px 0px rgba(0,0,0,0)',
      'fill-surface': 'var(--color-base-200)', 'fill-page': 'var(--color-base-100)',
      'lh-prose': '1.6', 'lh-heading': '1.5', 'measure-prose': '72ch',
      'rhythm-group': '12px', 'rhythm-section': '24px',
    },
    roles: {
      'ff-eyebrow': { type: 'fontFamily' },
      'tt-eyebrow': { type: 'keyword', values: ['none', 'uppercase', 'lowercase', 'capitalize'] },
      'step-title-surface': { type: 'dimension' },
      'ink-eyebrow': { type: 'color' },
      'fill-surface': { type: 'color' },
      'bw-surface': { type: 'dimension' },
      'lh-heading': { type: 'number' },
      'measure-prose': { type: 'number' },
    },
  },
};

const ARENA = 'com.dravensoft.arena';

const ROOT_ANSWERS: Record<string, any> = {
  'ff-eyebrow': { $type: 'fontFamily', $value: '{font.display}' },
  'tt-eyebrow': { $type: 'keyword', $value: 'none' },
  'step-title-surface': { $type: 'dimension', $value: '{fs.h3}' },
  'ink-eyebrow': { $type: 'color', $value: '{color.secondary}' },
  'fill-surface': { $type: 'color', $value: '{color.base-200}' },
  'bw-surface': { $type: 'dimension', $value: { value: 1, unit: 'px' } },
  'lh-heading': { $type: 'number', $value: 1.5 },
  'measure-prose': { $type: 'number', $value: 72, $extensions: { [ARENA]: { cssUnit: 'ch' } } },
};

const total = (over: Record<string, any> = {}) => readPlugin('console', { ...ROOT_ANSWERS, ...over });

const scoped = (over: Record<string, any> = {}) => readPlugin('marketing', {
  'bw-surface': { $type: 'dimension', $value: { value: 0, unit: 'px' } },
  ...over,
});

const listed = (names: string[], over: Record<string, any> = {}) =>
  config({ stylePlugins: names.map((name) => (name === 'default' ? name : `./design/${name}`)), ...over });

const pluginProblems = (c: any, plugins: any[] = []) =>
  configProblems(c, SHEETS_FULL, plugins).filter((p) => p.includes('stylePlugin'));

test('a bare colour alias becomes the var() a palette scope can restate', () => {
  assert.equal(pluginValue('{color.secondary}', SHEETS_FULL.catalogue), 'var(--color-secondary)');
  assert.equal(pluginValue('{fs.h3}', SHEETS_FULL.catalogue), '24px',
    'a scale step is Arena\'s own and resolves to the value this package ships');
  assert.equal(pluginValue('{color.nonesuch}', SHEETS_FULL.catalogue), null);
});

const SCALED = {
  ...SHEETS_FULL.catalogue,
  roles: {
    ...SHEETS_FULL.catalogue.roles,
    'step-title-surface': { type: 'dimension', userScale: 'scales' },
    'bw-surface': { type: 'dimension', userScale: 'fixed' },
  },
};

test('a project literal on a scales role is emitted in rem', () => {
  const plugin = readPlugin('mine', { 'step-title-surface': { $type: 'dimension', $value: { value: 18, unit: 'px' } } });
  assert.equal(pluginValue(plugin.tokens['step-title-surface'], SCALED, 'step-title-surface'), '1.125rem');
  assert.equal(pluginValue('clamp(2.5rem,8.5vw,6rem)', SCALED, 'step-title-surface'), 'clamp(2.5rem,8.5vw,6rem)');
  assert.equal(resolvedPlugin(plugin, SCALED).get('step-title-surface'), '1.125rem');
});

test('a project literal on a fixed role keeps its px', () => {
  const plugin = readPlugin('mine', { 'bw-surface': { $type: 'dimension', $value: { value: 2, unit: 'px' } } });
  assert.equal(pluginValue(plugin.tokens['bw-surface'], SCALED, 'bw-surface'), '2px');
  assert.equal(pluginValue('2px', SCALED), '2px');
});

test('arena build refuses a rem answer to a fixed role', () => {
  const rem = (value: number) => readPlugin('p', { 'bw-surface': { $type: 'dimension', $value: { value, unit: 'rem' } } }).tokens;
  const problems = pluginTokenProblems('p', rem(0.125), SCALED);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /bw-surface/);
  const scales = readPlugin('p', { 'step-title-surface': { $type: 'dimension', $value: { value: 1.125, unit: 'rem' } } }).tokens;
  assert.deepEqual(pluginTokenProblems('p', scales, SCALED), []);
});

const ALIASED = {
  slots: SLOTS,
  tokens: {
    ...SHEETS_FULL.catalogue.tokens,
    'case-none': 'none', 'color-primary': 'var(--color-primary)',
    'ink-muted': 'var(--color-base-content)', 'ink-key': 'var(--ink-muted)',
  },
  roles: {
    ...SHEETS_FULL.catalogue.roles,
    'tt-key': { type: 'keyword', values: ['none', 'uppercase', 'lowercase', 'capitalize'] },
    'ink-muted': { type: 'color' },
    'ink-key': { type: 'color' },
  },
};

test('a keyword role may be answered by an alias that resolves to one of its values', () => {
  assert.deepEqual(pluginTokenProblems('p', { 'tt-key': '{case.none}' }, ALIASED), []);
  assert.deepEqual(pluginBlocks(readPlugin('p', { 'tt-key': { $value: '{case.none}' } }), ALIASED, 'dark'),
    ['--tt-key:none;']);
  assert.equal(pluginTokenProblems('p', { 'tt-key': '{fs.h3}' }, ALIASED).length, 1,
    'a scale step resolves to 24px, which is not a word of the set');
});

test('a colour role may name another colour role and emits a reference to it', () => {
  assert.deepEqual(pluginTokenProblems('p', { 'ink-key': '{ink-muted}' }, ALIASED), []);
  assert.deepEqual(pluginBlocks(readPlugin('p', { 'ink-key': { $value: '{ink-muted}' } }), ALIASED, 'dark'),
    ['--ink-key:var(--ink-muted);']);
  assert.equal(pluginTokenProblems('p', { 'ink-key': '{tt-key}' }, ALIASED).length, 1);
  assert.equal(pluginTokenProblems('p', { 'ink-key': '#123456' }, ALIASED).length, 1);
});

test('a role alias chain that loops is refused, and a role naming itself is too', () => {
  const loop = pluginTokenProblems('p', { 'ink-key': '{ink-muted}', 'ink-muted': '{ink-key}' }, ALIASED);
  assert.ok(loop.some((m) => m.includes(
    '"ink-key" is "{ink-muted}", and "ink-muted" leads back to "ink-key", so neither resolves')), loop.join('\n'));
  const self = pluginTokenProblems('p', { 'ink-key': '{ink-key}' }, ALIASED);
  assert.equal(self.length, 1, self.join('\n'));
  assert.match(self[0] ?? '', /names itself/);
});

test('a ring that closes across the root answers and the light answers is refused', () => {
  const problems = pluginProblems(listed(['console']), [total({
    'fill-surface': { $type: 'color', $value: '{ink-eyebrow}' },
    light: { 'ink-eyebrow': { $type: 'color', $value: '{fill-surface}' } },
  })]);
  assert.ok(problems.some((m) => /neither resolves/.test(m)), problems.join('\n'));
  assert.equal(problems.filter((m) => /neither resolves/.test(m)).length, 1,
    'one ring is named once, not once per role in it');
});

test('a ring wholly inside one group is reported once and not again from the merged answers', () => {
  const problems = pluginProblems(listed(['console']), [total({
    'fill-surface': { $type: 'color', $value: '{ink-eyebrow}' },
    'ink-eyebrow': { $type: 'color', $value: '{fill-surface}' },
  })]);
  assert.equal(problems.filter((m) => /neither resolves/.test(m)).length, 1, problems.join('\n'));
});

test('a colour role naming another colour role is restated under a palette, as a palette colour is', () => {
  const plugin = readPlugin('p', { 'ink-key': { $value: '{ink-muted}' }, 'tt-key': { $value: '{case.none}' } });
  assert.deepEqual(restatedBy(plugin, ALIASED, 'dark'), ['--ink-key:var(--ink-muted);'],
    'a later plugin\'s role alias that is not restated loses to the palette block under the same element');
});

test('a ring that closes between the root plugin and a later one is refused', () => {
  const problems = pluginProblems(listed(['console', 'marketing']), [
    total({ 'fill-surface': { $type: 'color', $value: '{ink-eyebrow}' } }),
    scoped({ 'ink-eyebrow': { $type: 'color', $value: '{fill-surface}' } }),
  ]);
  const rings = problems.filter((m) => /neither resolves/.test(m));
  assert.equal(rings.length, 1, problems.join('\n'));
  assert.match(rings[0] ?? '', /"ink-eyebrow" is "\{fill-surface\}", and "fill-surface" leads back to "ink-eyebrow"/);
});

test('a ring closed through a role a later plugin takes by default names that default', () => {
  const sheets = { ...SHEETS_FULL, catalogue: { ...SHEETS_FULL.catalogue, roles: {
    ...SHEETS_FULL.catalogue.roles, 'ink-key': { type: 'color', default: '{ink-eyebrow}' },
  } } };
  const problems = configProblems(listed(['console', 'marketing']), sheets, [
    total(), scoped({ 'ink-eyebrow': { $type: 'color', $value: '{ink-key}' } }),
  ]).filter((m) => m.includes('stylePlugins'));
  const rings = problems.filter((m) => /never resolves|neither resolves/.test(m));
  assert.equal(rings.length, 1, problems.join('\n'));
  assert.match(rings[0] ?? '', /"ink-key" carries Arena's default \{ink-eyebrow\}, so it takes that role's answer/);
});

test('a ring wholly inside the root plugin is not laid at a later plugin that did not write it', () => {
  const problems = pluginProblems(listed(['console', 'marketing']), [
    total({
      'fill-surface': { $type: 'color', $value: '{ink-eyebrow}' },
      'ink-eyebrow': { $type: 'color', $value: '{fill-surface}' },
    }),
    scoped(),
  ]);
  assert.ok(problems.some((m) => m.startsWith('stylePlugins.console:') && /neither resolves/.test(m)), problems.join('\n'));
  assert.deepEqual(problems.filter((m) => m.startsWith('stylePlugins.marketing:') && /resolves/.test(m)), [], problems.join('\n'));
});

test('a ring inside the root plugin is reported against the root, and a later plugin answering one of its roles with a palette colour gets no ring', () => {
  const sheets = { ...SHEETS_FULL, catalogue: { ...SHEETS_FULL.catalogue, roles: {
    ...SHEETS_FULL.catalogue.roles,
    'ink-key': { type: 'color', default: '{ink-muted}' }, 'ink-muted': { type: 'color' },
  } } };
  const problems = configProblems(listed(['console', 'marketing']), sheets, [
    total({
      'ink-key': { $type: 'color', $value: '{ink-muted}' },
      'ink-muted': { $type: 'color', $value: '{ink-key}' },
    }),
    scoped({ 'ink-muted': { $type: 'color', $value: '{color.secondary}' } }),
  ]).filter((m) => m.includes('stylePlugins'));
  assert.ok(problems.some((m) => m.startsWith('stylePlugins.console:') && /neither resolves/.test(m)), problems.join('\n'));
  assert.deepEqual(problems.filter((m) => m.startsWith('stylePlugins.marketing:') && /resolves/.test(m)), [], problems.join('\n'));
});

test('a ring the root closes through a default is not laid at a later plugin that takes that default too', () => {
  const sheets = { ...SHEETS_FULL, catalogue: { ...SHEETS_FULL.catalogue, roles: {
    ...SHEETS_FULL.catalogue.roles,
    'ink-key': { type: 'color', default: '{ink-muted}' }, 'ink-muted': { type: 'color' },
  } } };
  const problems = configProblems(listed(['console', 'marketing']), sheets, [
    total({
      'ink-muted': { $type: 'color', $value: '{fill-surface}' },
      'fill-surface': { $type: 'color', $value: '{ink-key}' },
    }),
    scoped({ 'ink-muted': { $type: 'color', $value: '{color.secondary}' } }),
  ]).filter((m) => m.includes('stylePlugins'));
  const rings = problems.filter((m) => /resolves/.test(m));
  assert.ok(rings.some((m) => m.startsWith('stylePlugins.console:') && /"ink-key" carries Arena's default/.test(m)),
    problems.join('\n'));
  assert.deepEqual(rings.filter((m) => m.startsWith('stylePlugins.marketing:')), [],
    'marketing takes ink-key by default from its own ink-muted, a palette colour, which breaks the ring under it');
});

test('resolvedPlugin follows a role alias to the colour the named role resolves to', () => {
  const plugin = readPlugin('p', { 'ink-muted': { $value: '{color.primary}' }, 'ink-key': { $value: '{ink-muted}' } });
  assert.equal(resolvedPlugin(plugin, ALIASED).get('ink-key'), 'var(--color-primary)');
});

const WEIGHT_REPORTS: { name: string; family?: string; src: string; expected: string[] | null; why?: string }[] = [
  {
    name: 'a weight a role asks for and the face never carries is reported',
    family: 'Baloo 2',
    src: 'https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&display=swap',
    expected: ['900', 'Baloo 2'],
    why: 'the face tops out at 800, so 900 is a weight the browser draws by smearing the 800',
  },
  {
    name: 'a weight the face does carry is not reported',
    src: 'https://fonts.googleapis.com/css2?family=Baloo+2:wght@400..900&display=swap',
    expected: null,
  },
  {
    name: 'a src that says nothing about weight is left alone rather than guessed at',
    src: './fonts/display.woff2',
    expected: null,
    why: 'a self-hosted file declares its own range and this command cannot open it',
  },
];

test('a weight a role asks for is reported when the face never carries it, and not when it may', () => {
  assert.ok(WEIGHT_REPORTS.length > 0, 'the table has rows');
  for (const row of WEIGHT_REPORTS) {
    const c = config();
    if (row.family) c.fonts.display.family = row.family;
    c.fonts.display.src = row.src;
    const plugin = readPlugin('bank', {
      'ff-heading': { $type: 'fontFamily', $value: '{font.display}' },
      'fw-heading': { $type: 'fontWeight', $value: '{fw.black}' },
    });
    const messages = weightReports(c, SHEETS_FULL.catalogue, [plugin]);
    const message = row.why ? `${row.name}: ${row.why}` : row.name;
    if (row.expected === null) assert.deepEqual(messages, [], message);
    else assert.ok(messages.some((m) => m.kind === 'weight' && row.expected!.every((part) => m.message.includes(part))), message);
  }
});

test('a face alias becomes a var() too, because the face is the consumer\'s', () => {
  assert.equal(pluginValue('{font.display}', SHEETS_FULL.catalogue), 'var(--font-display)',
    'resolving it to the catalogue would answer ff-heading with Archivo, which is Arena\'s '
    + 'own face and not one the consumer loaded');
});

test('a token at the top of the tree is reachable by the alias that names it', () => {
  assert.equal(pluginValue('{bw}', SHEETS_FULL.catalogue), '1px',
    'bw and scrim-blur are leaves beside the color and fs groups, so the alias naming one '
    + 'carries no dot. An alias pattern that demanded one did not report the reference, it '
    + 'stopped seeing it, and the raw {bw} reached the sheet as a declaration the browser drops.');
  assert.equal(pluginValue('{nonesuch}', SHEETS_FULL.catalogue), null,
    'and a dotless alias naming nothing resolves to null like any other, so the audit reports '
    + 'it instead of writing it out');
});

test('a length role answered with a css function keeps the function', () => {
  const read = readPlugin('meridian', {
    'step-title-surface': { $type: 'dimension', $value: 'clamp(2.5rem,8.5vw,6rem)' },
  });
  assert.equal(read.tokens['step-title-surface'], 'clamp(2.5rem,8.5vw,6rem)',
    'a scale has no fluid step, so a title that has to shrink with its column is exactly the '
    + 'literal the norm sanctions. What it may never do is reach the sheet as undefinedundefined, '
    + 'which is an invalid custom property and takes its whole declaration with it.');
});

test('a length role answered with half a length is reported rather than emitted', () => {
  const problems = pluginProblems(listed(['./design/console']), [total({
    'step-title-surface': { $type: 'dimension', $value: { value: 12 } },
  })]);
  assert.match(problems.join('\n'), /"step-title-surface" is .*resolves to nothing/);
});

test('a plugin file is read as DTCG, and an alias survives while a literal is spelled as CSS', () => {
  const read = readPlugin('meridian', {
    $description: 'a group key of its own is not an answer',
    'r-surface': { $type: 'dimension', $value: '{r.lg}' },
    'grid-min': { $type: 'dimension', $value: { value: 200, unit: 'px' } },
    'measure-prose': { $type: 'number', $value: 72, $extensions: { [ARENA]: { cssUnit: 'ch' } } },
    light: { 'ink-eyebrow': { $type: 'color', $value: '{color.secondary}' } },
  });
  assert.deepEqual(read.tokens, { 'r-surface': '{r.lg}', 'grid-min': '200px', 'measure-prose': '72ch' });
  assert.deepEqual(read.light, { 'ink-eyebrow': '{color.secondary}' });
  assert.equal(read.name, 'meridian');
});

test('a plugin is named by the directory that holds it', () => {
  assert.equal(pluginName('./design/marketing'), 'marketing');
  assert.equal(pluginName('../shared/design/marketing/'), 'marketing');
  assert.equal(pluginName('default'), 'default');
});

test('a style plugin a consumer wrote is accepted, which is the point of the field', () => {
  assert.deepEqual(pluginProblems(listed(['console']), [total()]), []);
});

test('the first plugin lands on :root and the rest on their own class', () => {
  const css = themeCss(listed(['console', 'marketing']), {
    sheets: SHEETS_FULL, plugins: [total(), scoped()],
  });
  assert.match(css, /:root\{[^}]*--bw-surface:1px;/);
  assert.match(css, /\.arena-marketing\{[^}]*--bw-surface:0px;/);
  assert.doesNotMatch(css, /\.arena-console\{/,
    'the first plugin is what a page with no class on it looks like, so it has no class of its own');
});

test('a polarity group emits both @scope rules of a cross', () => {
  const css = themeCss(listed(['console', 'marketing'], {
    palettes: [
      { name: 'dark', default: true, polarity: 'dark', colors: colors() },
      { name: 'light', polarity: 'light', colors: colors() },
    ],
  }), {
    sheets: SHEETS_FULL,
    plugins: [total(), scoped({ light: { 'ink-eyebrow': { $type: 'color', $value: '{color.secondary}' } } })],
  });
  const keys = [...parseDecls(css).keys()];
  for (const key of crossKeys('.arena-light', '.arena-marketing'))
    assert.ok(keys.includes(key),
      'the plugin class and the theme class sit in either order or on one element, and a cross that '
      + `lacks ${key} leaves a light region inside a scoped root, or the reverse, on the dark answer`);
  assert.ok(!css.includes('.arena-light.arena-marketing, '), 'the comma list of compound selectors is gone');
});

test('only the root plugin is held to totality', () => {
  assert.match(pluginProblems(listed(['marketing', 'console']), [scoped(), total()])[0] ?? '',
    /does not answer/);
  assert.deepEqual(pluginProblems(listed(['console', 'marketing']), [total(), scoped()]), []);
});

const DEFAULTED = {
  ...SHEETS_FULL,
  catalogue: { slots: SLOTS,
    tokens: {
      ...SHEETS_FULL.catalogue.tokens,
      'r-lg': '14px', 'lh-tight': '1.1', 'ink-link': 'var(--color-base-content)', 'r-popover': '8px',
    },
    roles: {
      ...SHEETS_FULL.catalogue.roles,
      'ink-link': { type: 'color', default: '{ink-eyebrow}' },
      'r-popover': { type: 'dimension', default: '{r.lg}' },
    },
  },
};

const BARE = {
  ...DEFAULTED,
  catalogue: {
    ...DEFAULTED.catalogue,
    roles: { ...SHEETS_FULL.catalogue.roles, 'ink-link': { type: 'color' }, 'r-popover': { type: 'dimension' } },
  },
};

const silent = (...keys: string[]) => readPlugin('console',
  Object.fromEntries(Object.entries(ROOT_ANSWERS).filter(([key]) => !keys.includes(key))));

const twoPalettes = { palettes: [
  { name: 'dark', default: true, polarity: 'dark', colors: colors() },
  { name: 'light', polarity: 'light', colors: colors() },
] };

test('a root plugin silent on a role with a kernel default is total, and without the default it is not', () => {
  assert.deepEqual(configProblems(listed(['console']), DEFAULTED, [total()]).filter((p) => p.includes('stylePlugin')), []);
  const bare = configProblems(listed(['console']), BARE, [total()])
    .filter((p) => p.includes('stylePlugin'));
  assert.deepEqual(bare.map((p) => p.slice(0, p.indexOf('.'))), [
    'stylePlugins[0]: the root style plugin does not answer ink-link',
    'stylePlugins[0]: the root style plugin does not answer r-popover',
  ]);
});

test('a keyword or a half step default names a token the package emits, and a silent root plugin draws its value', () => {
  const sheets = {
    ...SHEETS_FULL,
    catalogue: { slots: SLOTS,
      tokens: { ...SHEETS_FULL.catalogue.tokens, 'case-none': 'none', 'sp-0-5': '2px' },
      roles: {
        ...SHEETS_FULL.catalogue.roles,
        'tt-key': { type: 'keyword', default: '{case.none}' },
        'pad-key-y': { type: 'dimension', default: '{sp.0-5}' },
      },
    },
  };
  const { plugins, defaulted } = rootWithDefaults([total()], sheets.catalogue);
  assert.deepEqual(defaulted, ['pad-key-y', 'tt-key']);
  const css = themeCss(listed(['console']), { sheets, plugins });
  assert.match(css, /:root\{[^}]*--tt-key:none;/);
  assert.match(css, /:root\{[^}]*--pad-key-y:2px;/);
});

test('a default resolves through the root plugin\'s own answer and is restated under every palette', () => {
  const { plugins, defaulted } = rootWithDefaults([total()], DEFAULTED.catalogue);
  assert.deepEqual(defaulted, ['ink-link', 'r-popover']);
  const css = themeCss(listed(['console'], twoPalettes), { sheets: DEFAULTED, plugins });
  assert.match(css, /:root\{[^}]*--ink-link:var\(--color-secondary\);[^}]*--r-popover:14px;/);
  assert.match(css, /\.arena-light\{[^}]*--ink-link:var\(--color-secondary\);/);
  assert.doesNotMatch(css, /--ink-link:var\(--color-base-content\)/,
    'the catalogue carries the default plugin\'s answer, and a project\'s default follows its own');
});

test('a default that names a focus token is emitted as the token, as Arena\'s own sheet does', () => {
  const sheets = {
    ...DEFAULTED,
    catalogue: {
      ...DEFAULTED.catalogue,
      tokens: { ...DEFAULTED.catalogue.tokens, 'focus-width': '2px' },
      roles: { ...DEFAULTED.catalogue.roles, 'bw-focus': { type: 'dimension', userScale: 'fixed', default: '{focus.width}' } },
    },
  };
  const { plugins, defaulted } = rootWithDefaults([total()], sheets.catalogue as any);
  assert.ok(defaulted.includes('bw-focus'));
  const css = themeCss(listed(['console']), { sheets: sheets as any, plugins });
  assert.match(css, /--bw-focus:var\(--focus-width\);/);
});

test('a default follows the root plugin\'s light answer to the role it aliases', () => {
  const root = total({ light: { 'ink-eyebrow': { $type: 'color', $value: '{color.base-200}' } } });
  const { plugins } = rootWithDefaults([root], DEFAULTED.catalogue);
  const css = themeCss(listed(['console'], twoPalettes), { sheets: DEFAULTED, plugins });
  const light = /\.arena-light\{([^}]*)\}/.exec(css)?.[1] ?? '';
  assert.ok(light.lastIndexOf('--ink-link:var(--color-base-200);') > light.lastIndexOf('--ink-link:var(--color-secondary);'), light);
});

test('a null root is left as it was, and a later plugin follows its own answer to the role the default aliases', () => {
  assert.deepEqual(rootWithDefaults([null, scoped()], DEFAULTED.catalogue), { plugins: [null, scoped()], defaulted: [] });
  const ember = scoped({ 'ink-eyebrow': { $type: 'color', $value: '{color.base-200}' } });
  assert.equal(rootWithDefaults([null, ember], DEFAULTED.catalogue).plugins?.[1]?.tokens['ink-link'], '{color.base-200}');
});

test('a later plugin silent on a defaulted role takes its own answer to the role the default aliases', () => {
  const ember = scoped({ 'ink-eyebrow': { $type: 'color', $value: '{color.base-200}' } });
  const { plugins, defaulted } = rootWithDefaults([total(), ember], DEFAULTED.catalogue);
  assert.deepEqual(defaulted, ['ink-link', 'r-popover'], 'the note names the root plugin\'s defaults only');
  assert.equal(plugins?.[1]?.tokens['ink-link'], '{color.base-200}');
  assert.equal(Object.hasOwn(plugins?.[1]?.tokens ?? {}, 'r-popover'), false,
    'a default naming a token and not a role is the root\'s answer, and the root already emits it');
  const css = themeCss(listed(['console', 'marketing']), { sheets: DEFAULTED, plugins });
  assert.match(css, /\.arena-marketing\{[^}]*--ink-link:var\(--color-base-200\);/);
  const light = rootWithDefaults([total(), scoped({ light: { 'ink-eyebrow': { $type: 'color', $value: '{color.accent}' } } })],
    DEFAULTED.catalogue).plugins?.[1];
  assert.equal(light?.light['ink-link'], '{color.accent}', 'a light answer of the later plugin follows the default too');
  assert.equal(Object.hasOwn(light?.tokens ?? {}, 'ink-link'), false);
});

test('a root plugin\'s own answer to a defaulted role is not replaced inside a later plugin\'s scope', () => {
  const root = total({ 'ink-link': { $type: 'color', $value: '{color.secondary}' } });
  const ember = scoped({ 'ink-eyebrow': { $type: 'color', $value: '{color.base-200}' } });
  const { plugins } = rootWithDefaults([root, ember], DEFAULTED.catalogue);
  assert.equal(Object.hasOwn(plugins?.[1]?.tokens ?? {}, 'ink-link'), false);
  const css = themeCss(listed(['console', 'marketing']), { sheets: DEFAULTED, plugins });
  assert.doesNotMatch(/\.arena-marketing\{([^}]*)\}/.exec(css)?.[1] ?? '', /--ink-link/);
});

test('a later plugin is held to the floors on a role it takes through a default', () => {
  const floored = { ...DEFAULTED, catalogue: { ...DEFAULTED.catalogue, roles: {
    ...DEFAULTED.catalogue.roles, 'lh-prose': { type: 'number', default: '{lh-heading}' },
  } } };
  const ember = scoped({ 'lh-heading': { $type: 'number', $value: 1.2 } });
  const problems = configProblems(listed(['console', 'marketing']), floored, [total(), ember]).join('\n');
  assert.match(problems, /stylePlugins\[1\][^\n]*--lh-prose is 1\.2 in dark/);
  assert.doesNotMatch(problems, /stylePlugins\[0\]/);
});

test('the floors and the reports read a role the default answered', () => {
  const floored = { ...DEFAULTED, catalogue: { ...DEFAULTED.catalogue, roles: {
    ...DEFAULTED.catalogue.roles, 'lh-prose': { type: 'number', default: '{lh.tight}' },
  } } };
  assert.match(configProblems(listed(['console']), floored, [total()]).join('\n'), /--lh-prose is 1\.1 in dark/);

  const surfaced = { ...DEFAULTED.catalogue, roles: {
    ...DEFAULTED.catalogue.roles, 'fill-surface': { type: 'color', default: '{fill-page}' },
  } };
  const root = rootWithDefaults([silent('fill-surface')], surfaced).plugins?.[0];
  assert.ok(root);
  assert.equal(resolvedPlugin(root, surfaced, 'dark').get('fill-surface'), 'var(--color-base-100)',
    'paletteReports and the level declarations read the surface through this map');
});

test('a style plugin is held to the floors the repository holds its own to', () => {
  assert.match(pluginProblems(listed(['console']),
    [total({ 'lh-heading': { $type: 'number', $value: 0.8 } })])[0] ?? '', /--lh-heading is 0.8/);
  assert.match(pluginProblems(listed(['console']), [total({
    'measure-prose': { $type: 'number', $value: 120, $extensions: { [ARENA]: { cssUnit: 'ch' } } },
  })])[0] ?? '', /outside 45 to 90/);
});

test('a style plugin may not name a role the package does not ship', () => {
  const problems = pluginProblems(listed(['console']),
    [total({ 'r-lg': { $type: 'dimension', $value: { value: 22, unit: 'px' } } })]);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /neither a role this package ships nor an fs or rhythm step/);
});

test('a style plugin may not author a colour, only assign one', () => {
  assert.match(pluginProblems(listed(['console']),
    [total({ 'ink-eyebrow': { $type: 'color', $value: '#b52a20' } })])[0] ?? '',
  /takes a \{color\.\*\} alias, another colour role or transparent/);
  assert.deepEqual(pluginProblems(listed(['console']),
    [total({ 'ink-eyebrow': { $type: 'color', $value: '{color.secondary}' } })]), []);
});

test('a keyword outside its set fails in a consumer build with the set named', () => {
  assert.match(pluginProblems(listed(['console']),
    [total({ 'tt-eyebrow': { $type: 'keyword', $value: 'smallcaps' } })])[0] ?? '',
  /not one of none, uppercase, lowercase, capitalize/);
});

test('an alias that points at nothing shipped fails rather than emitting the word null', () => {
  assert.match(pluginProblems(listed(['console']),
    [total({ 'step-title-surface': { $type: 'dimension', $value: '{fs.nonesuch}' } })])[0] ?? '',
  /resolves to nothing this package ships/);
});

test('a style plugin may not take a theme polarity or a palette name', () => {
  assert.match(pluginProblems(listed(['dark']))[0] ?? '', /theme polarity/);
  assert.match(pluginProblems(listed(['meridian'], {
    palettes: [{ name: 'meridian', default: true, polarity: 'dark', colors: colors() }],
  }))[0] ?? '', /also the name of a palette/);
});

test('two entries under one directory name would be one class, so the second is refused', () => {
  assert.match(pluginProblems(config({
    stylePlugins: ['./design/marketing', './vendor/marketing'],
  }))[0] ?? '', /is the directory name of another entry/);
});

test('the sheet the package assembles is the first entry of the list or none of it', () => {
  assert.deepEqual(pluginProblems(listed(['default', 'marketing']), [null, scoped()]), []);
  assert.match(pluginProblems(listed(['marketing', 'default']), [scoped(), null])[0] ?? '',
    /first entry of the list or none of it/);
});

test('a style plugin that answers nothing is a class nobody can tell from its absence', () => {
  assert.match(pluginProblems(listed(['console', 'empty']),
    [total(), readPlugin('empty', {})])[0] ?? '', /answers at least one role/);
  assert.ok(!pluginProblems(listed(['console', 'lit']),
    [total(), readPlugin('lit', { light: { 'edge-focus': { $type: 'color', $value: '{color.secondary}' } } })])
    .some((p) => /answers at least one role/.test(p)));
});

test('a style plugin with no catalogue beside it is refused rather than emitted unchecked', () => {
  const problems = configProblems(listed(['console']), SHEETS, [total()]).filter((p) => p.includes('stylePlugin'));
  assert.match(problems.at(-1) ?? '', /role catalogue this package ships cannot be read/);
});

test('the field is optional, and a config without one declares no style plugin', () => {
  assert.deepEqual(configProblems(config(), SHEETS).filter((p) => p.includes('stylePlugin')), []);
});

test('a path is a spelling this module checks and never opens', () => {
  assert.deepEqual(configProblems(listed(['console']), SHEETS_FULL), [],
    'the command reads the directory and hands the answers in, because emitting a theme opens no file');
});

test('an entry that is not a path is named by its index', () => {
  const problems = configProblems(config({ stylePlugins: [{ name: 'meridian' }] }), SHEETS_FULL);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /stylePlugins\[0\]/);
});

test('a root plugin of a consumer\'s own drops the package\'s appearance from the import chain', () => {
  const css = packageCss(listed(['console']), { sheets: shipped });
  assert.doesNotMatch(css, /arena\.css/,
    'the barrel carries the sheet the package assembles, and a build that answered every role itself '
    + 'would take both');
  assert.doesNotMatch(css, /style-plugin-default\.css/);
  assert.match(css, /css\/components\/arena-button\.css/);
});

test('the sheet the package assembles stays in the chain while it is the root plugin', () => {
  const css = packageCss(listed(['default']), { sheets: { ...shipped, layers: [...shipped.layers, 'css/style-plugin-default.css'] } });
  assert.match(css, /@import '@dravensoft\/arena-react\/css\/style-plugin-default\.css';/);
  assert.doesNotMatch(css, /arena\.css';/);
});

test('no declared plugin means nothing extra reaches :root', () => {
  const css = themeCss(config(), { sheets: SHEETS_FULL });
  assert.ok(!css.includes('--step-title-surface'));
});

test('a colour a plugin assigns is restated inside every palette, not left on :root alone', () => {
  const css = themeCss(listed(['console'], {
    palettes: [
      { name: 'night', default: true, polarity: 'dark', colors: colors() },
      { name: 'day', polarity: 'light', colors: colors() },
    ],
  }), { sheets: SHEETS_FULL, plugins: [total()] });

  assert.match(css.slice(css.indexOf('.arena-day')), /--ink-eyebrow:var\(--color-secondary\);/,
    'left on :root alone the role computes against the default palette and inherits that colour '
    + 'into every other one, so a second palette keeps the first one\'s eyebrow');
});

test('a colour reference is restated inside every palette, because a var() computes where it is declared', () => {
  const css = themeCss(config({
    palettes: [
      { name: 'night', default: true, polarity: 'dark', colors: colors() },
      { name: 'day', polarity: 'light', colors: colors() },
    ],
  }), { sheets: SHEETS });

  assert.match(css.slice(css.indexOf('.arena-day')), /--fill-surface:var\(--color-base-200\);/,
    'left on :root alone the role computes against the default palette and inherits that colour '
    + 'into every other one, so a second palette keeps the first one\'s card fill');
});

test('a top-level configuration key Arena does not have is a problem, naming the key and the keys it has', () => {
  const problems = configProblems(config({ gradientMark: true } as never));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /gradientMark/);
});

test('a project naming its own component subset still imports every vocabulary sheet arena.css links', () => {
  const lines = scopedImports('@dravensoft/arena-react', { components: ['button'] } as CheckedStylesheet,
    { layers: ['css/base.css', 'css/components.css', 'css/vocabulary/fill.css'], components: ['button'] } as CheckedSheets);
  assert.ok(lines.includes("@import '@dravensoft/arena-react/css/vocabulary/fill.css';"));
  assert.ok(lines.includes("@import '@dravensoft/arena-react/css/components/button.css';"));
});

test('a family split per component imports the part sheets of the components drawn, and the whole sheet when every one is', () => {
  const sheets = {
    layers: ['css/components.css', 'css/vocabulary/emphasis.css', 'css/vocabulary/fill.css'],
    components: ['arena-button', 'arena-card', 'arena-icon-button'],
    parts: { 'css/vocabulary/emphasis.css': ['arena-button', 'arena-icon-button'] },
  } as CheckedSheets;
  const drawn = (components: string[]) => scopedImports('p', { components } as CheckedStylesheet, sheets).filter((line) => line.includes('/vocabulary/'));
  assert.deepEqual(drawn(['arena-button', 'arena-card']), ["@import 'p/css/vocabulary/emphasis/arena-button.css';", "@import 'p/css/vocabulary/fill.css';"]);
  assert.deepEqual(drawn(['arena-card']), ["@import 'p/css/vocabulary/fill.css';"]);
  assert.deepEqual(drawn(['arena-button', 'arena-icon-button']), ["@import 'p/css/vocabulary/emphasis.css';", "@import 'p/css/vocabulary/fill.css';"]);
});

const COLOUR_ROLES = {
  slots: SLOTS,
  tokens: Object.fromEntries(['neutral', 'secondary', 'base-content', 'base-100', 'base-200', 'base-300', 'error', 'info']
    .map((key) => [`color-${key}`, `var(--color-${key})`])),
};

const answered = (answers: Record<string, string>) => readPlugin('console',
  Object.fromEntries(Object.entries(answers).map(([role, value]) => [role, { $type: 'color', $value: value }])));

const RATIO = String.raw`\d\.\d\d:1`;

const darkAxisConfig = () => config({ palettes: [{ name: 'night', default: true, polarity: 'dark', colors: colors({
  'base-100': '#111111', 'base-300': '#444444', 'base-content': '#eeeeee', neutral: '#222222',
}) }] });

const axisConfig = () => config({ palettes: [{ name: 'day', default: true, polarity: 'light', colors: colors({
  'base-100': '#ffffff', 'base-300': '#e6e6e6', 'base-content': '#111111', neutral: '#f0f0f0',
}) }] });

const contrastMessages = (c: any, answers: Record<string, string>) =>
  (paletteReports(c, COLOUR_ROLES as any, [answered(answers)])[0]?.messages ?? [])
    .filter((m) => m.kind === 'contrast' && /^--(edge|hue)-/.test(m.message)).map((m) => m.message);

const AXIS_REPORTS: { name: string; config: () => ReturnType<typeof axisConfig>; answers: Record<string, string>; expected: RegExp | null }[] = [
  {
    name: 'an axis answered with no more contrast than the grid is reported under contrast, in words that hold for a darker one too',
    config: axisConfig,
    answers: { 'edge-separator': '{color.base-300}', 'edge-axis': '{color.neutral}' },
    expected: new RegExp('^--edge-axis has no more contrast than --edge-separator in the light theme '
      + `\\(${RATIO} against ${RATIO} on base-100\\), so a chart's axis reads no heavier than its grid$`),
  },
  {
    name: 'an axis answered with the same neutral as the grid is reported as having the same contrast',
    config: axisConfig,
    answers: { 'edge-separator': '{color.neutral}', 'edge-axis': '{color.neutral}' },
    expected: new RegExp('^--edge-axis has the same contrast as --edge-separator in the light theme '
      + `\\(${RATIO} against ${RATIO} on base-100\\), so a chart's axis reads no heavier than its grid$`),
  },
  {
    name: 'an axis darker than the grid on a dark base-100, with no more contrast than it, is reported in the same words',
    config: darkAxisConfig,
    answers: { 'edge-separator': '{color.base-300}', 'edge-axis': '{color.neutral}' },
    expected: new RegExp('^--edge-axis has no more contrast than --edge-separator in the dark theme '
      + `\\(${RATIO} against ${RATIO} on base-100\\), so a chart's axis reads no heavier than its grid$`),
  },
  {
    name: 'an axis answered with base-content, heavier than the grid, is not reported',
    config: axisConfig,
    answers: { 'edge-separator': '{color.base-300}', 'edge-axis': '{color.base-content}' },
    expected: null,
  },
];

test('an axis with no more contrast than its grid is reported, and one heavier than it is not', () => {
  assert.ok(AXIS_REPORTS.length > 0, 'the table has rows');
  for (const row of AXIS_REPORTS) {
    const messages = contrastMessages(row.config(), row.answers);
    if (row.expected === null) {
      assert.deepEqual(messages, [], row.name);
      continue;
    }
    const [message] = messages;
    assert.match(message ?? '', row.expected, row.name);
    assert.doesNotMatch(message ?? '', /lighter/, row.name);
  }
});

const HUE_ON_INK: { name: string; palette: Record<string, string>; answers: Record<string, string>; expected: RegExp | null }[] = [
  {
    name: 'a status hue whose on-ink measures under 4.5:1 over its ink is reported with its ratio',
    palette: { 'base-100': '#101010', error: '#aa3333', info: '#334455', 'base-content': '#f0f0f0' },
    answers: {
      'hue-danger-ink': '{color.error}', 'hue-danger-on-ink': '{color.base-100}',
      'hue-info-ink': '{color.info}', 'hue-info-on-ink': '{color.base-content}',
    },
    expected: new RegExp('^--hue-danger-on-ink measures \\d\\.\\d\\d:1 over '
      + '--hue-danger-ink in the dark theme, below 4\\.5:1, so a solid badge\'s label is hard to read$'),
  },
  {
    name: 'a status hue whose on-ink clears 4.5:1 over its ink is not reported',
    palette: { 'base-100': '#101010', error: '#ff8888' },
    answers: { 'hue-danger-ink': '{color.error}', 'hue-danger-on-ink': '{color.base-100}' },
    expected: null,
  },
];

test('a status hue whose on-ink falls under 4.5:1 over its ink is reported, and one that clears it is not', () => {
  assert.ok(HUE_ON_INK.length > 0, 'the table has rows');
  for (const row of HUE_ON_INK) {
    const c = config({ palettes: [{ name: 'night', default: true, polarity: 'dark', colors: colors(row.palette) }] });
    const messages = contrastMessages(c, row.answers);
    if (row.expected === null) {
      assert.deepEqual(messages, [], row.name);
      continue;
    }
    assert.equal(messages.length, 1, row.name);
    assert.match(messages[0] ?? '', row.expected, row.name);
  }
});

test('a derived heat ladder whose steps do not rise or fall in lightness is reported once, by its order', () => {
  const disordered = Object.fromEntries(['#202020', '#808080', '#404040', '#c0c0c0', '#ffffff'].map((hex, i) => [`heat-${i + 1}`, hex]));
  const reports = heatReports({}, disordered);
  assert.equal(reports.length, 1);
  assert.match(JSON.stringify(reports[0]), /do not rise or fall in lightness/);
});

const HEAT_ORDER: { name: string; ladder: string[]; surface: string; length: number; at?: number; message?: RegExp; why?: string }[] = [
  { name: 'heatOrderReports accepts a ladder that moves away from a light surface', ladder: ['#e0e0e0', '#b0b0b0', '#808080', '#505050', '#101010'], surface: '#ffffff', length: 0 },
  { name: 'heatOrderReports accepts a ladder that moves away from a dark surface', ladder: ['#202020', '#505050', '#808080', '#b0b0b0', '#f0f0f0'], surface: '#000000', length: 0 },
  {
    name: 'heatOrderReports reports a step no further from the surface than the one before, naming both steps',
    ladder: ['#101010', '#505050', '#808080', '#b0b0b0', '#e0e0e0'],
    surface: '#ffffff',
    length: 4,
    at: 0,
    message: /heat, steps 1 and 2: step 2 is no further from the surface than step 1/,
  },
  {
    name: 'heatOrderReports reports a reversed ladder on a dark surface as it does on a light one',
    ladder: ['#f0f0f0', '#b0b0b0', '#808080', '#505050', '#202020'],
    surface: '#000000',
    length: 4,
    at: 3,
    message: /steps 4 and 5/,
    why: 'a reversed ladder on a dark surface is reported as it is on a light one',
  },
];

test('heatOrderReports accepts a ladder that moves away from the surface and reports a step that does not', () => {
  assert.ok(HEAT_ORDER.length > 0, 'the table has rows');
  for (const row of HEAT_ORDER) {
    const reports = heatOrderReports(row.ladder, row.surface);
    if (row.length === 0) {
      assert.deepEqual(reports, [], row.name);
      continue;
    }
    assert.equal(reports.length, row.length, row.why ? `${row.name}: ${row.why}` : row.name);
    assert.match(JSON.stringify(reports[row.at!]), row.message!, row.name);
  }
});

const HEAT_ROLES = {
  tokens: Object.fromEntries(['base-100', 'base-content', ...heatKeys()].map((key) => [`color-${key}`, `var(--color-${key})`])),
};

const heatLadderColours = (polarity: 'light' | 'dark') => polarity === 'light'
  ? { 'base-100': '#ffffff', 'base-200': '#f4f4f4', 'base-content': '#111111',
    'heat-1': '#e0e0e0', 'heat-2': '#b0b0b0', 'heat-3': '#808080', 'heat-4': '#505050', 'heat-5': '#202020' }
  : { 'base-100': '#000000', 'base-200': '#0a0a0a', 'base-content': '#f0f0f0',
    'heat-1': '#202020', 'heat-2': '#505050', 'heat-3': '#808080', 'heat-4': '#b0b0b0', 'heat-5': '#e0e0e0' };

const heatMessages = (polarity: 'light' | 'dark', order: string[], root: boolean) => {
  const ladder = heatLadderColours(polarity) as Record<string, string>;
  const pinned = Object.fromEntries(order.map((key, i) => [`heat-${i + 1}`, ladder[key]!]));
  return paletteReports(config({ palettes: [{ name: polarity, default: true, polarity, colors: colors({ ...ladder, ...pinned }) }] }),
    HEAT_ROLES as any, root ? [total()] : [])[0]?.messages.filter((m) => m.kind === 'heat').map((m) => m.message) ?? [];
};

test('a pinned heat ladder out of order is reported from the palette itself', () => {
  const swapped = ['heat-1', 'heat-3', 'heat-2', 'heat-4', 'heat-5'];
  const forward = ['heat-1', 'heat-2', 'heat-3', 'heat-4', 'heat-5'];
  for (const polarity of ['light', 'dark'] as const) {
    const out = heatMessages(polarity, swapped, false);
    assert.equal(out.length, 1, `${polarity}: the swapped pair is named once`);
    assert.match(out[0] ?? '', /heat, steps 2 and 3: step 3 is no further from the surface than step 2, and the heatmap reads the steps by magnitude/);
    assert.deepEqual(heatMessages(polarity, forward, false), [], `${polarity}: the palette's own order is not reported`);
    assert.equal(heatMessages(polarity, swapped, true).length, 1, `${polarity}: a root plugin changes nothing`);
  }
});

const shippedPalette = (polarity: 'light' | 'dark'): Record<string, string> => {
  const file = fileURLToPath(new URL(`../../../../contracts/design/palette.${polarity}.json`, import.meta.url));
  const entries = JSON.parse(readFileSync(file, 'utf8')).color as Record<string, any>;
  return Object.fromEntries(Object.entries(entries)
    .filter(([key, entry]) => !key.startsWith('$') && typeof entry?.$value?.hex === 'string')
    .map(([key, entry]) => [key, entry.$value.hex as string]));
};

test('the heat ladder in order reports nothing, in a fixture palette and in the shipped light and dark palettes', () => {
  for (const polarity of ['light', 'dark'] as const) {
    for (const [what, set] of [['fixture', heatLadderColours(polarity)], ['shipped', shippedPalette(polarity)]] as const) {
      const c = config({ palettes: [{ name: polarity, default: true, polarity, colors: colors(set) }] });
      const out = paletteReports(c, HEAT_ROLES as any, [])[0]?.messages.filter((m) => m.kind === 'heat') ?? [];
      assert.deepEqual(out, [], `${what} ${polarity} palette`);
    }
  }
});

const ROOT_ONLY = {
  contrast: '@media (prefers-contrast: more) {\n  :root {\n    --bw-surface: var(--bw-strong);\n    --focus-width: var(--sp-1);\n  }\n}\n',
  environment: ':root {\n  --pad-safe-top: max(var(--sp-0), env(safe-area-inset-top));\n  --title-hero-fit: clamp(1px, 2px, 3px);\n}\n',
};

const HC_ROOT = '@media (prefers-contrast: more) {\n:root{';

test('each later plugin restates the high-contrast widths and the hero fit after its own block, once', () => {
  const css = themeCss(listed(['console', 'marketing', 'ops']), {
    sheets: { ...SHEETS_FULL, rootOnly: ROOT_ONLY }, plugins: [total(), scoped(), readPlugin('ops', { 'bw-surface': { $type: 'dimension', $value: { value: 2, unit: 'px' } } })],
  });
  for (const name of ['marketing', 'ops']) {
    const own = css.indexOf(`.arena-${name}{\n  --arena-plugin:${name};`);
    const media = css.indexOf(`@media (prefers-contrast: more) {\n.arena-${name}{`);
    const fit = css.indexOf(`.arena-${name}{\n  --title-hero-fit:clamp(1px, 2px, 3px);`);
    assert.ok(own >= 0 && media > own && fit > media, `${name}: own block, then the media block, then the hero fit`);
  }
  assert.doesNotMatch(css, /:root\{[^}]*--title-hero-fit/, 'the root plugin takes the high-contrast block and not the hero fit');
  assert.doesNotMatch(css, /pad-safe/, 'only the hero fit is taken from environment.css');
  const count = (text: string) => css.split(text).length - 1;
  assert.equal(count(HC_ROOT), 1);
  for (const name of ['marketing', 'ops']) assert.equal(count(`@media (prefers-contrast: more) {\n.arena-${name}{`), 1, name);
});

const NO_RESTATEMENT: {
  name: string;
  names: string[];
  sheets: () => typeof SHEETS_FULL;
  plugins: () => (ReturnType<typeof total> | null)[];
  without: (string | RegExp)[];
  with?: string[];
}[] = [
  {
    name: 'a default root emits no :root restatement',
    names: ['default', 'marketing'],
    sheets: () => ({ ...SHEETS_FULL, rootOnly: ROOT_ONLY }) as typeof SHEETS_FULL,
    plugins: () => [null, scoped()],
    without: [HC_ROOT],
    with: ['@media (prefers-contrast: more) {\n.arena-marketing{'],
  },
  {
    name: 'a package whose sheets carry no root-only text emits no restatement',
    names: ['console', 'marketing'],
    sheets: () => SHEETS_FULL,
    plugins: () => [total(), scoped()],
    without: [/prefers-contrast|title-hero-fit/],
  },
];

test('a root that answers nothing, or a package with nothing to restate, emits no restatement', () => {
  assert.ok(NO_RESTATEMENT.length > 0, 'the table has rows');
  for (const row of NO_RESTATEMENT) {
    const css = themeCss(listed(row.names), { sheets: row.sheets(), plugins: row.plugins() } as never);
    for (const absent of row.without) {
      if (typeof absent === 'string') assert.ok(!css.includes(absent), row.name);
      else assert.doesNotMatch(css, absent, row.name);
    }
    for (const present of row.with ?? []) assert.ok(css.includes(present), row.name);
  }
});

const HC_ROOT_BLOCKS: {
  name: string;
  plugin: () => ReturnType<typeof total>;
  answered: RegExp;
  has?: RegExp;
  before?: RegExp;
  noHeroFit?: boolean;
}[] = [
  {
    name: 'a project\'s own root plugin is followed by the high-contrast :root block, and not by the hero fit',
    plugin: () => total(),
    answered: /--bw-surface:var\(--bw-strong\);/,
    before: /:root\{[^}]*--bw-surface:1px;/,
    noHeroFit: true,
  },
  {
    name: 'a root plugin that answers bw-strong does not change the :root high-contrast block',
    plugin: () => total({ 'bw-strong': { $type: 'dimension', $value: { value: 3, unit: 'px' } } }),
    answered: /--bw-surface:var\(--bw-strong\);/,
    has: /--bw-strong:3px;/,
  },
];

test('a root plugin is followed by the high-contrast :root block', () => {
  assert.ok(HC_ROOT_BLOCKS.length > 0, 'the table has rows');
  for (const row of HC_ROOT_BLOCKS) {
    const css = themeCss(listed(['console', 'marketing']), {
      sheets: { ...SHEETS_FULL, rootOnly: ROOT_ONLY }, plugins: [row.plugin(), scoped()],
    });
    const media = css.indexOf(HC_ROOT);
    if (row.has) assert.match(css, row.has, row.name);
    if (row.before) assert.ok(css.search(row.before) >= 0 && media > css.search(row.before), `${row.name}: the media block follows the root answers block`);
    assert.match(css.slice(media, css.indexOf('\n}\n', media)), row.answered, row.name);
    if (row.noHeroFit) assert.doesNotMatch(css, /:root\{[^}]*--title-hero-fit/, row.name);
  }
});

const STATE_ROLES = ['edge-focus', 'bw-focus', 'gap-focus', 'fill-selected', 'ink-selected', 'edge-selected',
  'fade-disabled', 'edge-invalid', 'ink-invalid'];

test('a silent root plugin gets the nine state roles and a widened bw-focus', () => {
  const shipped = JSON.parse(readFileSync(fileURLToPath(new URL('../../../../contracts/design/roles.json', import.meta.url)), 'utf8'));
  const contrast = readFileSync(fileURLToPath(new URL('../../../../contracts/design/contrast.css', import.meta.url)), 'utf8');
  const sheets = {
    ...SHEETS_FULL,
    rootOnly: { ...ROOT_ONLY, contrast },
    catalogue: { slots: SLOTS,
      tokens: {
        ...SHEETS_FULL.catalogue.tokens, 'color-primary': 'var(--color-primary)', 'color-base-content': 'var(--color-base-content)',
        'color-error': 'var(--color-error)', 'focus-width': '2px', 'focus-offset': '2px', 'opacity-disabled': '0.45',
      },
      roles: {
        ...SHEETS_FULL.catalogue.roles,
        ...Object.fromEntries(STATE_ROLES.map((name) => [name, {
          type: shipped[name].$type, default: shipped[name].$extensions['com.dravensoft.arena'].default,
        }])),
      },
    },
  };
  const { plugins, defaulted } = rootWithDefaults([total()], sheets.catalogue);
  assert.deepEqual(defaulted, [...STATE_ROLES].sort());
  const css = themeCss(listed(['console']), { sheets, plugins });
  const root = [...css.matchAll(/:root\{([^}]*)\}/g)].map((one) => one[1]).join('\n');
  for (const name of STATE_ROLES) assert.match(root, new RegExp(`--${name}:`), name);
  const media = css.indexOf(HC_ROOT);
  assert.ok(media > css.indexOf(':root{'), 'the media block follows the plugin block');
  assert.match(css.slice(media, css.indexOf('\n}\n', media)), /--bw-focus:var\(--focus-width\)/);
});

const hookBody = (css: string, polarity: string) => {
  const open = `.${polarityClass(polarity)}{`;
  const at = css.indexOf(open);
  assert.ok(at >= 0, `no ${open} block`);
  return css.slice(at + open.length, css.indexOf('}', at)).split('\n').map((l) => l.trim()).filter(Boolean);
};

const MARKETING = () => scoped({
  'ink-eyebrow': { $type: 'color', $value: '{color.secondary}' },
  light: { 'ink-eyebrow': { $type: 'color', $value: '{color.base-200}' } },
});

const runtime = (over: Record<string, any> = {}) => themeCss(listed(['console', 'marketing'], {
  palettes: TWO_PALETTES, runtimePalettes: true, ...over,
}), {
  sheets: { ...aliased(), roleReferences: ['--fill-x:var(--color-base-200);'] },
  plugins: [total(), MARKETING()],
});

test('a config without runtimePalettes emits what it emitted before the runtime-palette work, its body matching the golden sheet byte for byte, the generated header apart', () => {
  const { config: c, options } = goldenInput(readPlugin);
  const golden = readFileSync(fileURLToPath(new URL('../../../lib/arena/theme-css-golden.css', import.meta.url)), 'utf8');
  const bodyOf = (sheet: string) => sheet.slice(sheet.indexOf('\n\n') + 2);
  const before = themeCss(c, options);
  assert.match(before, /^\/\* GENERATED by arena build/);
  assert.equal(bodyOf(before), golden);
  assert.equal(bodyOf(themeCss({ ...c, runtimePalettes: false }, options)), golden, 'false is the same as absent');
  assert.doesNotMatch(before, /arena-polarity/);
  assert.ok(!before.includes(RUNTIME_MARKER));
});

test('the theme declares every name the package defaults leave to it', () => {
  const { config: c, options } = goldenInput(readPlugin);
  const root = parseDecls(themeCss(c, options)).get(':root');
  assert.ok(ALWAYS_THEMED.length > 0, 'an empty list names nothing and would pass over any name');
  for (const name of ALWAYS_THEMED) assert.ok(root.has(name.slice(2)), `${name} is left to the theme and the root block does not declare it`);
});

test('runtimePalettes emits one hook block per polarity carrying exactly the polarity half', () => {
  const css = runtime();
  const sheets = { ...aliased(), roleReferences: ['--fill-x:var(--color-base-200);'] };
  const plugins = [total(), MARKETING()];
  const context = { aliases: sheets.aliases, roleReferences: sheets.roleReferences, root: plugins[0]!, catalogue: sheets.catalogue };
  for (const p of POLARITIES) {
    assert.deepEqual(hookBody(css, p), polarityDeclarations(p, context), p);
    assert.equal(css.match(new RegExp(`\\n\\n\\.${polarityClass(p)}\\{`, 'g'))?.length, 1, `${p} hook is emitted once`);
  }
});

test('runtimePalettes marks :root', () => {
  const css = runtime();
  const root = css.slice(css.indexOf(':root{'), css.indexOf('}', css.indexOf(':root{')));
  assert.ok(root.includes('--arena-palette:dark;'));
  assert.ok(root.includes(`${RUNTIME_MARKER}:1;`));
  assert.ok(root.indexOf(`${RUNTIME_MARKER}:1;`) > root.indexOf('--arena-palette:dark;'));
  assert.equal(css.split(RUNTIME_MARKER).length, 2, 'the marker is on :root alone');
});

test('a non-root plugin gets a hook cross per polarity', () => {
  const css = runtime();
  const marketing = MARKETING();
  for (const p of POLARITIES) {
    const answers = restatedBy(marketing, SHEETS_FULL.catalogue, p);
    assert.ok(answers.length > 0, `the fixture's plugin answers ${p}`);
    const body = `\n${answers.map((d) => `  ${d}`).join('\n')}\n`;
    assert.ok(css.includes(scopeOn(`.${polarityClass(p)}`)('.arena-marketing', body)), `no hook cross for ${p}`);
    assert.ok(css.includes(scopeOn(`.arena-${p}`)('.arena-marketing', body)),
      `the declared ${p} palette's cross lacks the body the hook cross carries`);
  }
});

test('runtimePalettes: "yes" is refused', () => {
  const problems = configProblems(config({ runtimePalettes: 'yes' }));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /runtimePalettes: declare true or false/);
  assert.deepEqual(configProblems(config({ runtimePalettes: true })), []);
});

test('a palette named polarity-light is refused', () => {
  const c = config({ palettes: [{ name: 'polarity-light', default: true, polarity: 'light', colors: colors() }] });
  assert.ok(configProblems(c).some((m) => m.includes('"polarity-light" is the polarity hook a runtime palette wears')));
});

const stateConfig = () => config({ palettes: [{ name: 'day', default: true, polarity: 'light', colors: colors({
  'base-100': '#ffffff', 'base-200': '#f7f7f7', 'base-300': '#e6e6e6', 'base-content': '#111111', secondary: '#c5a059', error: '#aa1111',
}) }] });

test('arena build reports a state pair that fails', () => {
  const roles = {
    'fill-page': '{color.base-100}', 'fill-surface': '{color.base-200}', 'fill-field': '{color.base-300}',
    'edge-focus': '{color.secondary}',
  };
  const messages = (paletteReports(stateConfig(), COLOUR_ROLES as any, [answered(roles)])[0]?.messages ?? [])
    .filter((m) => m.kind === 'contrast' && m.message.startsWith('--edge-focus')).map((m) => m.message);
  assert.equal(messages.filter((m) => m.includes(' against --fill-')).length, 3, 'one per surface the focus ring can stand on');
  assert.deepEqual(messages.filter((m) => !m.includes(' against --fill-')).map((m) => /over (--[a-z-]+)/.exec(m)?.[1]), ['--navigation-item-fill-rest', '--navigation-item-fill-rest'],
    'and one per ground under the transparent navigation row its ring sits on');
  assert.match(messages[0] ?? '', /^--edge-focus measures 2\.\d\d:1 against --fill-page in the light theme, below 3:1 \(WCAG 1\.4\.11\)/);
});

test('arena build says nothing of a state role answered with no palette colour', () => {
  const found = (paletteReports(stateConfig(), COLOUR_ROLES as any, [answered({ 'edge-focus': 'var(--ring)' })])[0]?.messages ?? [])
    .filter((m) => /^--(edge|ink)-(focus|selected|invalid)/.test(m.message));
  assert.deepEqual(found, []);
});

test('arena build reports a pale light focus ring a root plugin left unanswered, once the kernel default is applied', () => {
  const catalogue = { tokens: COLOUR_ROLES.tokens, roles: { 'edge-focus': { type: 'color', default: '{color.secondary}' } } };
  const silent = answered({ 'fill-page': '{color.base-100}', 'fill-surface': '{color.base-200}', 'fill-field': '{color.base-300}' });
  const { plugins, defaulted } = rootWithDefaults([silent], catalogue as any);
  assert.ok(defaulted.includes('edge-focus'), 'the plugin never answered edge-focus');
  const messages = (paletteReports(stateConfig(), COLOUR_ROLES as any, plugins)[0]?.messages ?? [])
    .filter((m) => m.kind === 'contrast' && m.message.startsWith('--edge-focus')).map((m) => m.message);
  assert.equal(messages.filter((m) => m.includes(' against --fill-')).length, 3, messages.join('\n'));
  for (const surface of ['--fill-page', '--fill-surface', '--fill-field']) {
    assert.ok(messages.some((m) => m.includes(`against ${surface} in the light theme, below 3:1 (WCAG 1.4.11)`)), surface);
  }
});

test('a transparent colour answer is emitted as transparent', () => {
  const css = themeCss(config({ palettes: TWO_PALETTES }), {
    sheets: SHEETS_FULL,
    plugins: [total({ 'hue-danger-fill-strong': { $type: 'color', $value: 'transparent' } })],
  });
  assert.equal(parseDecls(css).get(':root').get('hue-danger-fill-strong'), 'transparent');
  const answered = total({ 'hue-danger-fill-strong': { $type: 'color', $value: 'transparent' } });
  for (const polarity of ['dark', 'light'])
    assert.ok(pluginBlocks(answered, SHEETS_FULL.catalogue, polarity).some((line) => /--hue-danger-fill-strong:\s*transparent/.test(line)), polarity);
  const coloured = themeCss(config({ palettes: TWO_PALETTES }), {
    sheets: SHEETS_FULL,
    plugins: [total({ 'hue-danger-fill-strong': { $type: 'color', $value: '{color.secondary}' } })],
  });
  assert.equal(parseDecls(coloured).get(':root').get('hue-danger-fill-strong'), 'var(--color-secondary)');
});

test('a default project with a light palette reports no edge-focus pair', () => {
  const light = readFileSync(fileURLToPath(new URL('../../../../contracts/design-generated/palette.generated.css', import.meta.url)), 'utf8');
  const body = /\.arena-light\{([^}]*)\}/.exec(light)?.[1] ?? '';
  const palette: Record<string, string> = {};
  for (const [, name, hex] of body.matchAll(/--color-([\w-]+):(#[0-9a-fA-F]{6})/g)) palette[name as string] = hex as string;
  const c = config({ palettes: [{ name: 'light', default: true, polarity: 'light', colors: { ...colors(), ...palette } }] });
  const messages = paletteReports(c, tokenCatalogue(), [null]).flatMap((one) => one.messages.map((m) => m.message));
  assert.ok(messages.every((m) => !/--edge-focus|--edge-selected/.test(m)), messages.join('\n'));
});

test('a text pair below AA is reported in words that let the build go on', () => {
  const c = config({ palettes: [{ name: 'dim', default: true, polarity: 'dark', colors: colors({ 'base-content': '#222222' }) }] });
  const messages = paletteReports(c)[0]?.messages.map((m) => m.message) ?? [];
  assert.ok(messages.some((m) => /Arena measures every palette and reports what falls short/.test(m)), messages.join('\n'));
});

test('a plugin that leaves edge-focus to the kernel is measured with the value the light sheet draws', () => {
  const dir = fileURLToPath(new URL('../../../../plugin-style-store/catalogue/booking/plugin.tokens.json', import.meta.url));
  const plugin = readPlugin('booking', JSON.parse(readFileSync(dir, 'utf8')));
  assert.equal('edge-focus' in plugin.tokens || 'edge-focus' in plugin.light, false);
  const catalogue = tokenCatalogue();
  const css = themeCss(config({ palettes: [
    { name: 'dark', default: true, polarity: 'dark', colors: colors() },
    { name: 'light', polarity: 'light', colors: colors({ 'base-100': '#ffffff' }) },
  ] }), { sheets: { layers: [], components: [], catalogue, roleReferences: roleReferencesIn(catalogue) }, plugins: [plugin] });
  const drawn = parseDecls(css).get('.arena-light').get('edge-focus');
  assert.equal(rolesFor(plugin, catalogue, 'light').get('edge-focus'), drawn);
  assert.equal(drawn, 'var(--color-secondary)');
});

test('a slot answer is emitted as a role var in both polarities', () => {
  const catalogue = tokenCatalogue();
  const plugin = readPlugin('p', { 'actions-primary-root-fill-rest': { $value: '{fill-surface}' } });
  for (const polarity of ['dark', 'light']) {
    assert.deepEqual(pluginBlocks(plugin, catalogue, polarity), ['--actions-primary-root-fill-rest:var(--fill-surface);'], polarity);
    assert.deepEqual(restatedBy(plugin, catalogue, polarity), ['--actions-primary-root-fill-rest:var(--fill-surface);'], polarity);
  }
  assert.deepEqual(pluginTokenProblems('p', { 'actions-primary-root-fill-rest': '{fill-surface}' }, catalogue), []);
  assert.equal(pluginTokenProblems('p', { 'actions-primary-root-fill-rest': '{ink-body}' }, catalogue).length, 1);
  assert.deepEqual(pluginBlocks(readPlugin('p', { 'fill-surface': { $value: '{fill-raised}' } }), catalogue, 'dark')
    .filter((line) => /--(button|emphasis-[a-z]+-root)-/.test(line)), [],
  'a plugin answering no slot emits none');
});

test('a disabled answer writes the part\'s fade marker', () => {
  const catalogue = tokenCatalogue();
  const blocks = (answers: Record<string, string>) =>
    pluginBlocks(readPlugin('p', Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, { $value: v }]))), catalogue, 'dark');
  const ink = blocks({ 'actions-primary-root-ink-disabled': '{ink-muted}' });
  assert.equal(ink.filter((line) => line === '--actions-primary-root-fade-disabled:1;').length, 1, ink.join('\n'));
  const two = blocks({ 'actions-primary-root-ink-disabled': '{ink-muted}', 'actions-primary-root-fill-disabled': '{fill-surface}' });
  assert.equal(two.filter((line) => /fade-disabled/.test(line)).length, 1, 'one marker per part');
  assert.ok(blocks({ 'actions-ghost-root-fill-disabled': 'transparent' }).includes('--actions-ghost-root-fade-disabled:1;'));
  assert.deepEqual(blocks({ 'actions-primary-root-ink-rest': '{ink-muted}' }).filter((line) => /fade/.test(line)), []);
});

test('arena build refuses {transparent} in a slot, in either group, and names the bare form', () => {
  const plugin = readPlugin('p', {
    'actions-ghost-root-fill-rest': { $type: 'color', $value: '{transparent}' },
    light: { 'actions-ghost-root-edge-rest': { $type: 'color', $value: '{transparent}' } },
  });
  const flat = pluginTokenProblems('p', plugin.tokens, SHEETS_FULL.catalogue);
  assert.equal(flat.filter((l) => /actions-ghost-root-fill-rest is "\{transparent\}"/.test(l)).length, 1);
  const light = pluginTokenProblems('p.light', plugin.light, SHEETS_FULL.catalogue);
  assert.equal(light.filter((l) => l.startsWith('stylePlugins.p.light') && /actions-ghost-root-edge-rest is "\{transparent\}"/.test(l)).length, 1);
});

test('a role answered {transparent} is refused with the bare form named', () => {
  const problems = pluginTokenProblems('p', { 'fill-surface': '{transparent}' }, SHEETS_FULL.catalogue);
  assert.equal(problems.filter((l) => l.includes('write transparent without braces')).length, 1);
});

test('arena build refuses an answer whose $type is not its role\'s, in either group', () => {
  const plugin = readPlugin('p', {
    'fill-surface': { $type: 'keyword', $value: 'transparent' },
    'bw-surface': { $value: '{fs.h3}' },
    [Object.keys(SLOTS.slots)[0] as string]: { $value: '{fill-surface}' },
    'rhythm-group': { $type: 'number', $value: 12 },
    light: { 'fs-h3': { $type: 'number', $value: 20 } },
  });
  const problems = configProblems(listed(['default', 'p']), SHEETS_FULL, [null, plugin]);
  const has = (re: RegExp) => assert.ok(problems.some((line) => re.test(line)), problems.join('\n'));
  has(/stylePlugins\.p: --fill-surface is a keyword here and a color/);
  has(/stylePlugins\.p: --bw-surface carries no \$type and a dimension/);
  has(/stylePlugins\.p: --\S+ carries no \$type, and a colour slot is a colour/);
  has(/stylePlugins\.p: --rhythm-group is a number, and a rhythm step is a dimension/);
  has(/stylePlugins\.p\.light: --fs-h3 is a number.*fs step is a dimension/);
});

test('a $description inside the light group is not an answer', () => {
  const plugin = readPlugin('p', { light: { $description: 'only prose', 'fill-surface': { $type: 'color', $value: '#fff' } } });
  assert.deepEqual(Object.keys(plugin.light), ['fill-surface']);
  assert.deepEqual(Object.keys(readPlugin('p', { light: { $description: 'only prose' } }).light), []);
});

test('every plugin under plugin-style-store passes the $type comparison', () => {
  const store = fileURLToPath(new URL('../../../../plugin-style-store/', import.meta.url));
  const names = ['default', 'complete', ...readdirSync(`${store}catalogue`).filter((n) => !n.includes('.'))];
  const catalogue = tokenCatalogue();
  const mismatch = /here and a | is a .*, and (a colour slot|an fs step|a rhythm step)/;
  for (const name of names) {
    const file = name === 'default' || name === 'complete' ? `${store}${name}/plugin.tokens.json` : `${store}catalogue/${name}/plugin.tokens.json`;
    const p = readPlugin(name, JSON.parse(readFileSync(file, 'utf8')));
    const lines = [
      ...pluginTokenProblems(name, p.tokens, catalogue, p.types),
      ...pluginTokenProblems(`${name}.light`, p.light, catalogue, p.lightTypes),
    ].filter((line) => mismatch.test(line));
    assert.deepEqual(lines, [], name);
  }
});

const nestedConfig = () => config({ palettes: [
  { name: 'night', default: true, polarity: 'dark', colors: colors({ 'base-100': '#111111', 'base-200': '#1a1a1a', 'base-300': '#2a2a2a', 'base-content': '#eeeeee' }) },
  { name: 'day', polarity: 'light', colors: colors({ 'base-100': '#ffffff', 'base-200': '#f4f4f4', 'base-300': '#e6e6e6', 'base-content': '#111111' }) },
] });

test('a nested plugin is measured in every palette and prints only what the root did not', () => {
  const catalogue = tokenCatalogue();
  const inkBodyOnGround = readPlugin('later', { 'ink-body': { $type: 'color', $value: '{color.base-100}' } });
  const reports = paletteReports(nestedConfig(), catalogue, [null, inkBodyOnGround]);
  for (const name of ['night', 'day']) {
    const one = reports.find((r) => r.palette === `${name}, style plugin later`);
    assert.ok(one, name);
    assert.ok(one.messages.some((m) => /ink-rest/.test(m.message)), one.messages.map((m) => m.message).join('\n'));
    const root = new Set(reports.find((r) => r.palette === name)?.messages.map((m) => m.message));
    assert.deepEqual(one.messages.filter((m) => root.has(m.message)), []);
  }
});

test('a nested plugin that keeps the root answer and moves another pair prints only its own new message', () => {
  const catalogue = tokenCatalogue();
  const colour = (value: string) => ({ $type: 'color', $value: value });
  const root = readPlugin('root', { 'ink-body': colour('{color.base-100}') });
  const nested = readPlugin('later', { 'ink-body': colour('{color.base-100}'), 'ink-heading': colour('{color.base-100}') });
  const reports = paletteReports(nestedConfig(), catalogue, [root, nested]);
  for (const name of ['night', 'day']) {
    const rootMessages = reports.find((r) => r.palette === name)?.messages.map((m) => m.message) ?? [];
    assert.ok(rootMessages.length > 0, name);
    const one = reports.find((r) => r.palette === `${name}, style plugin later`);
    assert.ok(one, name);
    const own = one.messages.map((m) => m.message);
    assert.ok(own.length > 0, name);
    for (const message of rootMessages) assert.equal(own.includes(message), false, message);
  }
});

test('over a non-null root, a nested light group wins in light and a nested plain answer wins over the root light answer', () => {
  const catalogue = tokenCatalogue();
  const colour = (value: string) => ({ $type: 'color', $value: value });
  const root = readPlugin('root', { light: { 'edge-focus': colour('#ff0000') } });
  const lightOver = readPlugin('later', { light: { 'edge-focus': colour('#0000ff') } });
  const plainOver = readPlugin('plain', { 'edge-focus': colour('#00ff00') });
  assert.equal(nestedRolesFor(root, lightOver, catalogue, 'light').get('edge-focus'), '#0000ff');
  assert.equal(nestedRolesFor(root, lightOver, catalogue, 'dark').get('edge-focus'), rolesFor(root, catalogue, 'dark').get('edge-focus'));
  assert.equal(rolesFor(root, catalogue, 'light').get('edge-focus'), '#ff0000');
  assert.equal(nestedRolesFor(root, plainOver, catalogue, 'light').get('edge-focus'), '#00ff00');
});

test('a nested plugin that moves no measured pair prints nothing', () => {
  const later = readPlugin('later', { 'r-surface': { $type: 'dimension', $value: '4px' } });
  const reports = paletteReports(nestedConfig(), tokenCatalogue(), [null, later]);
  assert.deepEqual(reports.filter((r) => /style plugin/.test(r.palette)), []);
});

test('a nested plugin over the default root keeps the default light answers underneath it', () => {
  const catalogue = tokenCatalogue();
  const later = readPlugin('later', { 'r-surface': { $type: 'dimension', $value: '4px' } });
  const under = rolesFor(null, catalogue, 'light').get('edge-focus');
  assert.ok(under);
  assert.equal(nestedRolesFor(null, later, catalogue, 'light').get('edge-focus'), under);
  const plain = readPlugin('plain', { 'edge-focus': { $type: 'color', $value: '{color.secondary}' } });
  const won = nestedRolesFor(null, plain, catalogue, 'light').get('edge-focus');
  assert.ok(won);
  assert.notEqual(won, under);
});

const lightOf = (answers: Record<string, any>) => lightGroupProblems(readPlugin('p', { light: answers }), tokenCatalogue());

test('the light group refuses a non-colour role, a step and transparent, which no palette would restate', () => {
  assert.equal(lightOf({ 'r-surface': { $type: 'dimension', $value: '{r.xs}' } }).length, 1);
  assert.equal(lightOf({ 'fs-h3': { $type: 'dimension', $value: '{fs.h2}' } }).length, 1);
  const clear = lightOf({ 'fill-selected': { $type: 'color', $value: 'transparent' } });
  assert.equal(clear.length, 1, clear.join('\n'));
  assert.match(clear[0] ?? '', /light group takes colour answers/);
  assert.match(clear[0] ?? '', /never `transparent`/);
  assert.match(clear[0] ?? '', /not restated/);
});

test('configProblems reaches the light group of a root plugin and of a nested plugin, one problem each', () => {
  const sheets = { ...SHEETS_FULL, catalogue: tokenCatalogue() };
  const light = { light: { 'r-surface': { $type: 'dimension', $value: '{r.xs}' } } };
  const root = readPlugin('console', light);
  const nested = readPlugin('marketing', light);
  const lightProblems = (plugins: any[]) => configProblems(listed(['console', 'marketing']), sheets, plugins)
    .filter((p) => p.includes('light group takes colour answers'));
  const found = lightProblems([root, nested]);
  assert.equal(found.length, 2, found.join('\n'));
  assert.equal(found.filter((p) => p.includes('stylePlugins.console.')).length, 1);
  assert.equal(found.filter((p) => p.includes('stylePlugins.marketing.')).length, 1);
});

test('the light group accepts a {color.*} alias and a colour role reference', () => {
  assert.deepEqual(lightOf({ 'edge-focus': { $type: 'color', $value: '{color.base-content}' } }), []);
  assert.deepEqual(lightOf({ 'ink-key': { $type: 'color', $value: '{ink-muted}' } }), []);
});

test('the shipped style plugins keep their light group to colour answers', () => {
  const root = join(repoRoot, 'plugin-style-store');
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(join(dir, entry.name));
      else if (entry.name === 'plugin.tokens.json') found.push(join(dir, entry.name));
    }
  };
  walk(root);
  assert.ok(found.length >= 3, found.join('\n'));
  for (const file of found) {
    const plugin = readPlugin(file, JSON.parse(readFileSync(file, 'utf8')));
    assert.deepEqual(lightGroupProblems(plugin, tokenCatalogue()), [], file);
  }
});
