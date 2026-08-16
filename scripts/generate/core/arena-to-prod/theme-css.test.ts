import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  configProblems, themeCss, paletteReports, defaultPalette, isStylesheet, scopedImports,
  pluginName, pluginValue, readPlugin,
} from './theme-css.ts';
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
  assert.ok(report.messages.some((m) => m.kind === 'contrast'
    && m.message.startsWith('text, base-content on base-100')));
});

test('a ramp of one repeated colour is reported as indistinguishable', () => {
  const [report] = paletteReports(config());
  assert.ok(report?.messages.some((m) => m.kind === 'ramp' && m.message.startsWith('ramp,')));
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
  assert.deepEqual(configProblems(config({ stylesheet: { components: [] } }), SHEETS),
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

const SHEETS = {
  layers: ['css/reset.css'],
  components: ['button'],
  roleReferences: ['--fill-surface:var(--color-base-200);'],
};

const SHEETS_FULL = {
  ...SHEETS,
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
    'only a colour is deferred, because only a colour is redeclared under a palette');
  assert.equal(pluginValue('{color.nonesuch}', SHEETS_FULL.catalogue), null);
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
    sheets: SHEETS_FULL, importHeader: false, plugins: [total(), scoped()],
  });
  assert.match(css, /:root\{[^}]*--bw-surface:1px;/);
  assert.match(css, /\.arena-marketing\{[^}]*--bw-surface:0px;/);
  assert.doesNotMatch(css, /\.arena-console\{/,
    'the first plugin is what a page with no class on it looks like, so it has no class of its own');
});

test('a polarity group emits all three compound selectors', () => {
  const css = themeCss(listed(['console', 'marketing'], {
    palettes: [
      { name: 'dark', default: true, polarity: 'dark', colors: colors() },
      { name: 'light', polarity: 'light', colors: colors() },
    ],
  }), {
    sheets: SHEETS_FULL,
    importHeader: false,
    plugins: [total(), scoped({ light: { 'ink-eyebrow': { $type: 'color', $value: '{color.secondary}' } } })],
  });
  assert.ok(css.includes('.arena-light.arena-marketing'));
  assert.ok(css.includes('.arena-light .arena-marketing'));
  assert.ok(css.includes('.arena-marketing .arena-light'),
    'the plugin class and the theme class sit in either order or on one element, and this is the one '
    + 'an author forgets: without it a light region inside a scoped root takes the dark answer');
});

test('only the root plugin is held to totality', () => {
  assert.match(pluginProblems(listed(['marketing', 'console']), [scoped(), total()])[0] ?? '',
    /does not answer/);
  assert.deepEqual(pluginProblems(listed(['console', 'marketing']), [total(), scoped()]), []);
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
  /takes a \{color\.\*\} alias only/);
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
  const css = themeCss(listed(['console']), { sheets: shipped, plugins: [total()] });
  assert.doesNotMatch(css, /arena\.css/,
    'the barrel carries the sheet the package assembles, and a build that answered every role itself '
    + 'would take both');
  assert.doesNotMatch(css, /style-plugin-default\.css/);
  assert.match(css, /css\/components\/arena-button\.css/);
});

test('the sheet the package assembles stays in the chain while it is the root plugin', () => {
  const css = themeCss(listed(['default']), { sheets: shipped });
  assert.match(css, /@import '@dravensoft\/arena-react\/arena\.css';/);
});

test('no declared plugin means nothing extra reaches :root', () => {
  const css = themeCss(config(), { sheets: SHEETS_FULL, importHeader: false });
  assert.ok(!css.includes('--step-title-surface'));
});

test('a colour a plugin assigns is restated inside every palette, not left on :root alone', () => {
  const css = themeCss(listed(['console'], {
    palettes: [
      { name: 'night', default: true, polarity: 'dark', colors: colors() },
      { name: 'day', polarity: 'light', colors: colors() },
    ],
  }), { sheets: SHEETS_FULL, importHeader: false, plugins: [total()] });

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
  }), { sheets: SHEETS, importHeader: false });

  assert.match(css.slice(css.indexOf('.arena-day')), /--fill-surface:var\(--color-base-200\);/,
    'left on :root alone the role computes against the default palette and inherits that colour '
    + 'into every other one, so a second palette keeps the first one\'s card fill');
});
