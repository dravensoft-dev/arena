import { test } from 'node:test';
import assert from 'node:assert/strict';
import { configProblems, themeCss, paletteReports, defaultPalette, isStylesheet, scopedImports } from './theme-css.ts';
import { PALETTE_KEYS } from './palette-keys.ts';
import { parseDecls } from '../../../lib/arena/css-decls.ts';

const colors = (overrides: Record<string, string> = {}): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const key of PALETTE_KEYS) out[key] = '#141010';
  return { ...out, ...overrides };
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

test('a well-formed configuration has no problems', () => {
  assert.deepEqual(configProblems(config()), []);
});

test('a missing colour is named by its key', () => {
  const broken = config();
  delete broken.palettes[0].colors.primary;
  assert.deepEqual(configProblems(broken), ['palettes[0].colors: missing primary']);
});

test('error-fill is the one colour a palette may omit', () => {
  const c = config();
  delete c.palettes[0].colors['error-fill'];
  assert.deepEqual(configProblems(c), []);
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

test('an unknown polarity is rejected, because it decides --picker-invert', () => {
  const c = config({ palettes: [{ name: 'dark', polarity: 'midnight', colors: colors() }] });
  assert.deepEqual(configProblems(c), ['palettes[0].polarity: "midnight" is not one of dark, light']);
});

test('a missing font role names the three tokens Arena reads', () => {
  const c = config();
  delete c.fonts.mono;
  assert.match(configProblems(c)[0] ?? '', /fonts\.mono: missing; Arena reads --font-display/);
});

test('the default palette lands on :root and every other on its own class', () => {
  const c = config({ palettes: [
    { name: 'dark', default: true, polarity: 'dark', colors: colors() },
    { name: 'light', polarity: 'light', colors: colors({ 'base-100': '#ffffff' }) },
    { name: 'high-contrast', polarity: 'light', colors: colors({ 'base-100': '#fefefe' }) },
  ] });
  const decls = parseDecls(themeCss(c));
  assert.deepEqual([...decls.keys()].filter((s) => !s.startsWith('@')), [':root', '.arena-light', '.arena-high-contrast']);
  assert.equal(decls.get(':root').get('color-base-100'), '#141010');
  assert.equal(decls.get('.arena-light').get('color-base-100'), '#ffffff');
});

test('polarity decides --picker-invert in every block', () => {
  const c = config({ palettes: [
    { name: 'bone', default: true, polarity: 'light', colors: colors() },
    { name: 'ember', polarity: 'dark', colors: colors() },
  ] });
  const decls = parseDecls(themeCss(c));
  assert.equal(decls.get(':root').get('picker-invert'), '0');
  assert.equal(decls.get('.arena-ember').get('picker-invert'), '1');
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

test('the import header names the package and can be suppressed', () => {
  assert.match(themeCss(config(), { packageName: '@dravensoft/arena-angular' }),
    /@import '@dravensoft\/arena-angular\/arena\.css';/);
  assert.doesNotMatch(themeCss(config(), { importHeader: false }), /@import/);
});

test('a palette whose text fails 4.5:1 is reported rather than refused', () => {
  const c = config({ palettes: [{ name: 'dark', polarity: 'dark',
    colors: colors({ 'base-100': '#141010', 'base-content': '#1a1a1a' }) }] });
  assert.deepEqual(configProblems(c), []);
  const [report] = paletteReports(c);
  assert.ok(report, 'a palette under 4.5:1 reported nothing at all');
  assert.equal(report.palette, 'dark');
  assert.ok(report.messages.some((m) => m.startsWith('text, base-content on base-100')));
});

test('a ramp of one repeated colour is reported as indistinguishable', () => {
  const [report] = paletteReports(config());
  assert.ok(report?.messages.some((m) => m.startsWith('ramp,')));
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

test('with no stylesheet key the barrel is imported, so an existing project is unmoved', () => {
  assert.deepEqual(configProblems(config(), shipped), []);
  assert.match(themeCss(config(), { sheets: shipped }), /@import '@dravensoft\/arena-react\/arena\.css';/);
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
  assert.doesNotMatch(themeCss(c, { sheets: shipped }), /arena\.css/);
});

test('preflight false drops the one layer that is Tailwind\'s and not Arena\'s', () => {
  const c = config({ stylesheet: { components: ['arena-button'], preflight: false } });
  assert.deepEqual(configProblems(c, shipped), []);
  assert.ok(!scopedImports('p', c.stylesheet, shipped).some((line) => line.includes('css/base.css')));
  assert.ok(scopedImports('p', c.stylesheet, shipped).some((line) => line.includes('css/prelude.css')));
});

test('a component the package does not ship is fatal and the message lists what it does ship', () => {
  const [problem] = configProblems(config({ stylesheet: { components: ['buton'] } }), shipped);
  assert.match(problem ?? '', /"buton" is not a sheet this package ships, which are arena-button, arena-side-nav, arena-table/);
});

test('an empty list is a problem, because it reads as a project that renders nothing', () => {
  assert.deepEqual(configProblems(config({ stylesheet: { components: [] } }), shipped),
    ['stylesheet.components: name at least one component sheet, or drop stylesheet to import them all']);
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

const SHEETS_WITH_EXT = {
  layers: ['css/reset.css'],
  components: ['button'],
  extensions: { showcase: { base: ['--r-surface:22px;', '--bw-surface:0px;'],
    byPolarity: { light: ['--shadow-surface-rest:DROP;'] } } },
  roleReferences: ['--fill-surface:var(--color-base-200);'],
};

const SHEETS_LOCAL = {
  ...SHEETS_WITH_EXT,
  extensions: {
    showcase: {
      grouping: 'figure-ground',
      base: ['--bw-surface:0px;', '--shadow-surface-rest:0px 2px 6px -2px rgba(0,0,0,.5);'],
      byPolarity: { light: ['--shadow-surface-rest:0px 2px 6px -2px rgba(0,0,0,.5);'] },
    },
  },
  catalogue: {
    tokens: {
      'fs-h3': '24px', 'font-display': "'Archivo',system-ui,sans-serif",
      'color-base-200': 'var(--color-base-200)', 'color-secondary': 'var(--color-secondary)',
      'bw-surface': '1px', 'shadow-surface-rest': '0px 0px 0px 0px rgba(0,0,0,0)',
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
    extensions: {},
  },
};

const local = (over: Record<string, any> = {}) => config({
  extension: {
    name: 'meridian',
    extends: 'showcase',
    tokens: { 'ff-eyebrow': '{font.display}', 'tt-eyebrow': 'none', 'step-title-surface': '{fs.h3}' },
    ...over,
  },
});

const localProblems = (c: any) => configProblems(c, SHEETS_LOCAL).filter((p) => p.includes('extension'));

test('a local extension deriving from a shipped one is accepted, which is the point of the field', () => {
  assert.deepEqual(localProblems(local()), []);
});

test('a local extension emits its parent whole and then its own tokens over it', () => {
  const css = themeCss(local(), { sheets: SHEETS_LOCAL, importHeader: false });
  const root = parseDecls(css).get(':root');
  assert.equal(root.get('bw-surface'), '0px', 'inherited from what it extends');
  assert.equal(root.get('ff-eyebrow'), "'Archivo',system-ui,sans-serif", 'an alias resolved against the catalogue');
  assert.equal(root.get('step-title-surface'), '24px');
  assert.equal(root.get('tt-eyebrow'), 'none', 'a keyword travels as the word it is');
});

test('a local extension is held to the same floors a shipped one is', () => {
  assert.match(localProblems(local({ tokens: { 'lh-heading': '0.8' } }))[0] ?? '', /--lh-heading is 0.8/);
  assert.match(localProblems(local({ tokens: { 'measure-prose': '120ch' } }))[0] ?? '', /outside 45 to 90/);
});

test('a local extension may not name a role the package does not ship', () => {
  const problems = localProblems(local({ tokens: { 'r-lg': '22px' } }));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /neither a role this package ships nor an fs or rhythm step/);
});

test('a local extension may not author a colour, only assign one', () => {
  assert.match(localProblems(local({ tokens: { 'ink-eyebrow': '#b52a20' } }))[0] ?? '',
    /takes a \{color\.\*\} alias only/);
  assert.deepEqual(localProblems(local({ tokens: { 'ink-eyebrow': '{color.secondary}' } })), []);
});

test('a keyword outside its set fails in a consumer build with the set named', () => {
  assert.match(localProblems(local({ tokens: { 'tt-eyebrow': 'smallcaps' } }))[0] ?? '',
    /not one of none, uppercase, lowercase, capitalize/);
});

test('an alias that points at nothing shipped fails rather than emitting the word null', () => {
  assert.match(localProblems(local({ tokens: { 'step-title-surface': '{fs.nonesuch}' } }))[0] ?? '',
    /resolves to nothing this package ships/);
});

test('a local extension may not take a name the package already ships, or a palette name', () => {
  assert.match(localProblems(local({ name: 'showcase' }))[0] ?? '', /already ships/);
  assert.match(localProblems(config({
    extension: { name: 'dark', extends: 'showcase', tokens: { 'tt-eyebrow': 'none' } },
  }))[0] ?? '', /theme polarity/);
});

test('a local extension extending nothing Arena ships names what it could have extended', () => {
  assert.match(localProblems(local({ extends: 'nonesuch' }))[0] ?? '', /which this package does not ship/);
});

test('a local extension that moves nothing is a class nobody can tell from its absence', () => {
  assert.match(localProblems(local({ tokens: {} }))[0] ?? '', /moves at least one role/);
});

test('a local extension with no catalogue beside it is refused rather than emitted unchecked', () => {
  const problems = configProblems(local(), SHEETS_WITH_EXT).filter((p) => p.includes('extension'));
  assert.match(problems.at(-1) ?? '', /role catalogue this package ships cannot be read/);
});

test('the extension field is optional, and a config without one asks for no extension', () => {
  const c = config();
  assert.deepEqual(configProblems(c, SHEETS_WITH_EXT).filter((p) => p.includes('extension')), []);
});

test('"none" is how a config says it wants no extension, and it is not an unknown name', () => {
  const c = config({ extension: 'none' });
  assert.deepEqual(configProblems(c, SHEETS_WITH_EXT).filter((p) => p.includes('extension')), []);
});

test('"default" is an unknown extension until one is called that, rather than a word meaning none', () => {
  const c = config({ extension: 'default' });
  const problems = configProblems(c, SHEETS_WITH_EXT).filter((p) => p.includes('extension'));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /default/);
  assert.match(problems[0] ?? '', /showcase/);
});

test('a shipped extension is accepted by name', () => {
  const c = config({ extension: 'showcase' });
  assert.deepEqual(configProblems(c, SHEETS_WITH_EXT).filter((p) => p.includes('extension')), []);
});

test('the extension field is one name and never a list, so a build carries at most one', () => {
  const c = config({ extension: ['showcase'] });
  assert.match(configProblems(c, SHEETS_WITH_EXT).find((p) => p.includes('extension')) ?? '', /one name/);
});

test('a palette may not take a shipped extension name, since both become .arena-<name>', () => {
  const c = config({ palettes: [{ name: 'showcase', default: true, polarity: 'dark', colors: colors() }] });
  assert.match(configProblems(c, SHEETS_WITH_EXT).find((p) => p.includes('showcase')) ?? '', /extension/);
});

test('the chosen extension reaches :root, so a consumer needs no class of their own', () => {
  const css = themeCss(config({ extension: 'showcase' }), { sheets: SHEETS_WITH_EXT, importHeader: false });
  assert.match(css, /--r-surface:22px;/);
  assert.match(css, /--bw-surface:0px;/);
});

test('no extension means nothing extra reaches :root', () => {
  const css = themeCss(config(), { sheets: SHEETS_WITH_EXT, importHeader: false });
  assert.ok(!css.includes('--r-surface'));
});

test('"none" emits nothing, the same as omitting the field', () => {
  const css = themeCss(config({ extension: 'none' }), { sheets: SHEETS_WITH_EXT, importHeader: false });
  assert.ok(!css.includes('--r-surface'));
});

test('an extension that answers a polarity reaches the palette of that polarity, not only the default one', () => {
  const css = themeCss(config({
    extension: 'showcase',
    palettes: [
      { name: 'night', default: true, polarity: 'dark', colors: colors() },
      { name: 'day', polarity: 'light', colors: colors() },
    ],
  }), { sheets: SHEETS_WITH_EXT, importHeader: false });

  const dayBlock = css.slice(css.indexOf('.arena-day'));
  assert.match(dayBlock, /--shadow-surface-rest:DROP;/,
    'the light half never reached the light palette, so a consumer would take the dark '
    + 'answer in their light theme -- the defect the theme group exists to remove');
  assert.doesNotMatch(css.slice(0, css.indexOf('.arena-day')), /--shadow-surface-rest:DROP;/,
    'the light half reached :root, where the dark palette would take it too');
});

test('a colour reference is restated inside every palette, because a var() computes where it is declared', () => {
  const css = themeCss(config({
    palettes: [
      { name: 'night', default: true, polarity: 'dark', colors: colors() },
      { name: 'day', polarity: 'light', colors: colors() },
    ],
  }), { sheets: SHEETS_WITH_EXT, importHeader: false });

  assert.match(css.slice(css.indexOf('.arena-day')), /--fill-surface:var\(--color-base-200\);/,
    'left on :root alone the role computes against the default palette and inherits that colour '
    + 'into every other one, so a second palette keeps the first one\'s card fill');
});
