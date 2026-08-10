import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  undrawnStep,
  parseArgs, resolved, reportLines, hostPackage, hostPackageName, packageSheets, sourceFiles, phosphorRoot,
  relativeFrom, themeStep, iconsStep, main, componentMap, isProgram, USAGE, THEME_SHEET, ICONS_SHEET,
  COMPONENT_MAP,
} from './arena-to-prod.ts';
import { PALETTE_KEYS } from './palette-keys.ts';
import type { ComponentMap } from './components.ts';
import type { Environment, ThemeEnvironment } from './arena-to-prod.ts';

test('every path has a default, so the bare command is the whole of it', () => {
  const bare = parseArgs([]);
  assert.equal(bare.config, 'arena.config.json');
  assert.equal(bare.out, 'src');
  assert.deepEqual(bare.paths, ['src']);
  assert.equal(bare.strict, false);
  assert.equal(bare.importHeader, true);
});

test('--config and --src and --out all take their value either way, and --src repeats', () => {
  assert.equal(parseArgs(['--config', 'a.json']).config, 'a.json');
  assert.equal(parseArgs(['--config=a.json']).config, 'a.json');
  assert.equal(parseArgs(['-o', 'out']).out, 'out');
  assert.equal(parseArgs(['--out', 'out']).out, 'out');
  assert.equal(parseArgs(['--out=out']).out, 'out');
  assert.deepEqual(parseArgs(['--src', 'app', '--src=lib']).paths, ['app', 'lib']);
});

test('a flag with nothing after it is an error rather than a silent undefined path', () => {
  assert.match(errorOf(['--config']), /--config needs a path/);
  assert.match(errorOf(['--src']), /--src needs a path/);
  assert.match(errorOf(['-o']), /-o needs a directory/);
});

test('an unknown flag is refused by name', () => {
  assert.match(errorOf(['--minify']), /unknown flag: --minify/);
});

test('a positional is an error, because every path this command takes is named', () => {
  assert.match(errorOf(['arena.config.json']), /unexpected argument: arena\.config\.json/);
});

test('both behaviour flags default off and read as themselves', () => {
  const flagged = parseArgs(['--strict', '--no-import']);
  assert.equal(flagged.strict, true);
  assert.equal(flagged.importHeader, false);
});

test('--help asks for nothing else', () => {
  assert.equal(parseArgs(['--help']).help, true);
  assert.match(USAGE, /arena-to-prod \[--config <path>\]/);
  assert.match(USAGE, new RegExp(THEME_SHEET.replace('.', '\\.')));
  assert.match(USAGE, new RegExp(ICONS_SHEET.replace('.', '\\.')));
});

test('a report line names the palette it came from', () => {
  assert.deepEqual(reportLines([{ palette: 'ember', messages: ['text, x: 2.00:1'] }]), ['ember: text, x: 2.00:1']);
});

const colors = (overrides: Record<string, string> = {}): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const key of PALETTE_KEYS) out[key] = '#141010';
  return { ...out, ...overrides };
};

const readable = {
  palettes: [{ name: 'dark', default: true, polarity: 'dark',
    colors: colors({ 'base-content': '#f3ede5',
      'cat-1': '#3c7b0a', 'cat-2': '#3b63be', 'cat-3': '#0a924b', 'cat-4': '#6a59bc',
      'cat-5': '#00a3c0', 'cat-6': '#884da9', 'cat-7': '#00a99a', 'cat-8': '#984697' }) }],
  fonts: {
    display: { family: 'Archivo', src: 'https://example.com/a.woff2' },
    body: { family: 'Familjen Grotesk', src: 'https://example.com/b.woff2' },
    mono: { family: 'Spline Sans Mono', src: 'https://example.com/m.woff2' },
  },
};

const PHOSPHOR_SHEET = (selector: string, family: string) => `@font-face {
  font-family: "${family}";
  src: url("./${family}.woff2") format("woff2"), url("./${family}.ttf") format("truetype");
  font-weight: normal;
}

${selector} { font-family: "${family}" !important; }

${selector}.ph-bell:before { content: "\\e0ce"; }
${selector}.ph-moon:before { content: "\\e330"; }
${selector}.ph-sun:before { content: "\\e6a2"; }
`;

function phosphor(weights: Record<string, string> = { bold: 'Phosphor-Bold', fill: 'Phosphor-Fill' }) {
  const root = mkdtempSync(join(tmpdir(), 'arena-phosphor-'));
  const web = join(root, 'node_modules', '@phosphor-icons', 'web');
  mkdirSync(web, { recursive: true });
  writeFileSync(join(web, 'package.json'), JSON.stringify({ name: '@phosphor-icons/web' }));
  for (const [weight, family] of Object.entries(weights)) {
    const dir = join(web, 'src', weight);
    mkdirSync(dir, { recursive: true });
    const selector = weight === 'regular' ? '.ph' : `.ph-${weight}`;
    writeFileSync(join(dir, 'style.css'), PHOSPHOR_SHEET(selector, family));
    writeFileSync(join(dir, `${family}.woff2`), '');
  }
  return { root, web };
}

function project(config: any = readable, files: Record<string, string> = { 'app.html': '<i class="ph-bold ph-bell"></i>' }) {
  const root = mkdtempSync(join(tmpdir(), 'arena-to-prod-'));
  mkdirSync(join(root, 'src'), { recursive: true });
  if (config) writeFileSync(join(root, 'arena.config.json'), JSON.stringify(config));
  for (const [name, content] of Object.entries(files)) writeFileSync(join(root, 'src', name), content);
  return root;
}

const errorOf = (argv: string[]) => parseArgs(argv).error ?? '';

const options = (
  root: string,
  extra: { strict?: boolean; importHeader?: boolean; undrawn?: boolean } = {},
) => resolved(parseArgs([
  '--config', join(root, 'arena.config.json'), '--src', join(root, 'src'), '-o', join(root, 'src'),
  ...(extra.strict ? ['--strict'] : []),
  ...(extra.undrawn ? ['--undrawn'] : []),
  ...(extra.importHeader === false ? ['--no-import'] : []),
]));

function quietly(run: () => void) {
  const log = console.log, error = console.error;
  const said: string[] = [];
  console.log = (m) => said.push(m);
  console.error = (m) => said.push(m);
  try { return { code: run(), said }; } finally { console.log = log; console.error = error; }
}

test('the theme step writes the stylesheet and creates the directory leading to it', () => {
  const root = project();
  const out = join(root, 'src', 'styles');
  const step = themeStep({ ...options(root), out }, { packageName: '@dravensoft/arena-react', sheets: null });
  assert.equal(step.code, 0);
  assert.match(readFileSync(join(out, THEME_SHEET), 'utf8'), /@import '@dravensoft\/arena-react\/arena\.css';/);
  rmSync(root, { recursive: true });
});

test('a configuration problem is fatal and writes nothing', () => {
  const broken = structuredClone(readable);
  delete broken.palettes[0]?.colors.primary;
  const root = project(broken);
  const step = themeStep(options(root), { packageName: '@dravensoft/arena-react', sheets: null });
  assert.equal(step.code, 1);
  assert.ok(step.fatal.some((m) => m.includes('missing primary')));
  assert.equal(existsSync(join(root, 'src', THEME_SHEET)), false);
  rmSync(root, { recursive: true });
});

test('a config that is not JSON exits 2 rather than throwing', () => {
  const root = project(null);
  writeFileSync(join(root, 'arena.config.json'), '{ not json');
  const step = themeStep(options(root), { packageName: '@dravensoft/arena-react', sheets: null });
  assert.equal(step.code, 2);
  assert.ok(step.fatal.some((m) => m.includes('cannot read')));
  rmSync(root, { recursive: true });
});

test('a contrast report warns and still writes, because a consumer owns their brand', () => {
  const dim = structuredClone(readable);
  const [firstPalette] = dim.palettes;
  assert.ok(firstPalette, 'the readable fixture declares no palette to dim');
  firstPalette.colors['base-content'] = '#1a1a1a';
  const root = project(dim);
  const step = themeStep(options(root), { packageName: '@dravensoft/arena-react', sheets: null });
  assert.equal(step.code, 0);
  assert.ok(step.reports.some((m) => m.includes('under the 4.5:1')));
  assert.ok(existsSync(join(root, 'src', THEME_SHEET)));
  rmSync(root, { recursive: true });
});

test('a component the package does not ship stops the run and writes nothing', () => {
  const root = project({ ...readable, stylesheet: { components: ['nope'] } });
  const sheets = { layers: ['css/components.css'], components: ['button'] };
  const step = themeStep(options(root), { packageName: '@dravensoft/arena-react', sheets });
  assert.equal(step.code, 1);
  assert.ok(step.fatal.some((m) => m.includes('is not a sheet this package ships')));
  assert.equal(existsSync(join(root, 'src', THEME_SHEET)), false);
  rmSync(root, { recursive: true });
});

test('a scoped run writes the per-component imports and never the barrel', () => {
  const root = project({ ...readable, stylesheet: { components: ['button'] } });
  const sheets = { layers: ['css/reset.css', 'css/components.css'], components: ['button', 'table'] };
  assert.equal(themeStep(options(root), { packageName: '@dravensoft/arena-react', sheets }).code, 0);
  const css = readFileSync(join(root, 'src', THEME_SHEET), 'utf8');
  assert.match(css, /@import '@dravensoft\/arena-react\/css\/components\/button\.css';/);
  assert.doesNotMatch(css, /arena\.css/);
  rmSync(root, { recursive: true });
});

const MAP: ComponentMap = {
  match: 'selector',
  draws: { 'arena-button': 'button', 'arena-table': 'table', 'arena-bar-chart': null },
  needs: { table: ['pagination', 'select'] },
};

const SHEETS = { layers: ['css/base.css', 'css/components.css'], components: ['button', 'pagination', 'select', 'table'] };

const auto = { ...readable, stylesheet: { components: 'auto' } };

test('"auto" writes the sheets the sources draw and the ones Arena draws for them', () => {
  const root = project(auto, { 'app.html': '<arena-table /><arena-button />' });
  const step = themeStep(options(root), { packageName: '@dravensoft/arena-react', sheets: SHEETS, map: MAP });
  assert.equal(step.code, 0);
  const css = readFileSync(join(root, 'src', THEME_SHEET), 'utf8');
  for (const name of ['button', 'table', 'pagination', 'select']) {
    assert.match(css, new RegExp(`css/components/${name}\\.css`), `${name} was drawn or pulled in and is missing`);
  }
  assert.doesNotMatch(css, /arena\.css/, 'a resolved auto is a subset, not the barrel');
  assert.match(step.notes?.[0] ?? '', /2 component sheet\(s\) drawn, and 2 Arena draws for you: pagination, select/);
  rmSync(root, { recursive: true });
});

test('an element Arena does not ship is reported, and --strict is what makes it fatal', () => {
  const { root: phosphorRootDir, web } = phosphor({ bold: 'Phosphor-Bold' });
  const root = project(auto, { 'app.html': '<arena-widget /><arena-button icon="ph-bold ph-bell" />' });
  const environment: Environment & ThemeEnvironment = {
    packageName: '@dravensoft/arena-react', sheets: SHEETS, map: MAP, phosphor: web, arena: null,
  };

  const step = themeStep(options(root), environment);
  assert.equal(step.code, 0);
  assert.ok(step.reports.some((m) => m.includes('arena-widget is not a component this package ships')));

  const argv = (...extra: string[]) =>
    ['--config', join(root, 'arena.config.json'), '--src', join(root, 'src'), '-o', join(root, 'src'), ...extra];
  assert.equal(quietly(() => main(argv(), environment)).code, 0, 'it reports rather than refuses');
  assert.equal(quietly(() => main(argv('--strict'), environment)).code, 1);

  rmSync(root, { recursive: true });
  rmSync(phosphorRootDir, { recursive: true });
});

test('"auto" that finds nothing is fatal, because an empty subset is every screen unstyled', () => {
  const root = project(auto, { 'app.html': '<h1>ours alone</h1>' });
  const step = themeStep(options(root), { packageName: '@dravensoft/arena-react', sheets: SHEETS, map: MAP });
  assert.equal(step.code, 1);
  assert.ok(step.fatal.some((m) => m.includes('found no Arena component')));
  assert.equal(existsSync(join(root, 'src', THEME_SHEET)), false);
  rmSync(root, { recursive: true });
});

test('"auto" with no map beside the command is fatal rather than a silent barrel', () => {
  const root = project(auto);
  const step = themeStep(options(root), { packageName: '@dravensoft/arena-react', sheets: SHEETS, map: null });
  assert.equal(step.code, 1);
  assert.ok(step.fatal.some((m) => m.includes('reads the component map this package carries')));
  rmSync(root, { recursive: true });
});

test('a named list is untouched by any of this, and no map is read for it', () => {
  const root = project({ ...readable, stylesheet: { components: ['button'] } });
  const step = themeStep(options(root), { packageName: '@dravensoft/arena-react', sheets: SHEETS, map: null });
  assert.equal(step.code, 0);
  assert.deepEqual(step.notes, []);
  rmSync(root, { recursive: true });
});

test('the map is read from beside the command, by the name both packages write it under', () => {
  const root = mkdtempSync(join(tmpdir(), 'arena-installed-'));
  writeFileSync(join(root, COMPONENT_MAP), JSON.stringify(MAP));
  assert.deepEqual(componentMap(root), MAP);
  writeFileSync(join(root, COMPONENT_MAP), JSON.stringify({ nothing: true }));
  assert.equal(componentMap(root), null, 'a file of the right name and the wrong shape is no map');
  assert.equal(componentMap(join(tmpdir(), 'arena-nowhere')), null);
  rmSync(root, { recursive: true });
});

test('the icons step writes one file holding every weight in use and nothing else', () => {
  const { root: phosphorRootDir, web } = phosphor();
  const root = project(readable, { 'app.html': '<i class="ph-bold ph-bell"></i><i class="ph-fill ph-moon"></i>' });

  const step = iconsStep(options(root), { phosphor: web, arena: null });
  assert.equal(step.code, 0);
  const css = readFileSync(join(root, 'src', ICONS_SHEET), 'utf8');
  assert.match(css, /\.ph-bold\.ph-bell:before\{content:"\\e0ce"\}/);
  assert.match(css, /\.ph-fill\.ph-moon:before\{content:"\\e330"\}/);
  assert.doesNotMatch(css, /ph-sun/, 'a glyph nothing draws is the whole reason this command exists');
  assert.match(step.wrote ?? '', /2 glyph\(s\), 2 named by your sources and 0 by Arena's own components, 2 weight\(s\)/);

  rmSync(root, { recursive: true });
  rmSync(phosphorRootDir, { recursive: true });
});

test('the font path is written relative to the stylesheet, so a bundler resolves it', () => {
  const { root: phosphorRootDir, web } = phosphor({ bold: 'Phosphor-Bold' });
  const root = project();
  iconsStep(options(root), { phosphor: web, arena: null });
  const src = /url\('([^']+)'\)/.exec(readFileSync(join(root, 'src', ICONS_SHEET), 'utf8'));
  assert.ok(src, 'the sheet declares no @font-face src at all');
  const path = src[1] ?? '';
  assert.ok(path.startsWith('..'), path);
  assert.ok(path.endsWith('/bold/Phosphor-Bold.woff2'), path);
  rmSync(root, { recursive: true });
  rmSync(phosphorRootDir, { recursive: true });
});

test('the icons Arena draws itself are counted, because a consumer never names them', () => {
  const { root: phosphorRootDir, web } = phosphor({ bold: 'Phosphor-Bold' });
  const arena = mkdtempSync(join(tmpdir(), 'arena-package-'));
  writeFileSync(join(arena, 'index.js'), "const caret = 'ph-bold ph-sun';");
  const root = project();

  iconsStep(options(root), { phosphor: web, arena });
  assert.match(readFileSync(join(root, 'src', ICONS_SHEET), 'utf8'), /ph-sun/);

  rmSync(arena, { recursive: true });
  rmSync(root, { recursive: true });
  rmSync(phosphorRootDir, { recursive: true });
});

test('running outside a package says so, because the icons Arena draws went uncounted', () => {
  const { root: phosphorRootDir, web } = phosphor({ bold: 'Phosphor-Bold' });
  const root = project();
  const step = iconsStep(options(root), { phosphor: web, arena: null });
  assert.ok(step.reports.some((m) => m.includes('not running from inside an Arena package')));
  rmSync(root, { recursive: true });
  rmSync(phosphorRootDir, { recursive: true });
});

test('a glyph Phosphor does not draw is reported and still writes', () => {
  const { root: phosphorRootDir, web } = phosphor({ bold: 'Phosphor-Bold' });
  const root = project(readable, { 'app.html': '<i class="ph-bold ph-nope"></i><i class="ph-bold ph-bell"></i>' });

  const step = iconsStep(options(root), { phosphor: web, arena: null });
  assert.equal(step.code, 0);
  assert.ok(step.reports.some((m) => m.includes('ph-nope is not an icon Phosphor draws at that weight')));
  assert.ok(existsSync(join(root, 'src', ICONS_SHEET)));

  rmSync(root, { recursive: true });
  rmSync(phosphorRootDir, { recursive: true });
});

test('a project naming a glyph and no weight is stopped, because no rule could be written', () => {
  const { root: phosphorRootDir, web } = phosphor({ bold: 'Phosphor-Bold' });
  const root = project(readable, { 'app.html': '<i class="ph-bell"></i>' });
  const step = iconsStep(options(root), { phosphor: web, arena: null });
  assert.equal(step.code, 1);
  assert.ok(step.fatal.some((m) => m.includes('no Phosphor weight class was found beside a glyph')));
  rmSync(root, { recursive: true });
  rmSync(phosphorRootDir, { recursive: true });
});

test('no Phosphor and no path are both fatal, and neither writes', () => {
  const root = project();
  const missing = iconsStep(options(root), { phosphor: null, arena: null });
  assert.equal(missing.code, 2);
  assert.ok(missing.fatal.some((m) => m.includes('cannot find @phosphor-icons/web')));

  const { root: phosphorRootDir, web } = phosphor({ bold: 'Phosphor-Bold' });
  const nowhere = iconsStep({ ...options(root), paths: [join(root, 'nope')] }, { phosphor: web, arena: null });
  assert.equal(nowhere.code, 2);
  assert.equal(existsSync(join(root, 'src', ICONS_SHEET)), false);

  rmSync(root, { recursive: true });
  rmSync(phosphorRootDir, { recursive: true });
});

test('one run writes both files, which is the whole point of one command', () => {
  const { root: phosphorRootDir, web } = phosphor({ bold: 'Phosphor-Bold' });
  const root = project();
  const argv = ['--config', join(root, 'arena.config.json'), '--src', join(root, 'src'), '-o', join(root, 'src')];

  const { code } = quietly(() => main(argv, { phosphor: web, arena: null, packageName: '@dravensoft/arena-react', sheets: null }));
  assert.equal(code, 0);
  assert.ok(existsSync(join(root, 'src', THEME_SHEET)));
  assert.ok(existsSync(join(root, 'src', ICONS_SHEET)));

  rmSync(root, { recursive: true });
  rmSync(phosphorRootDir, { recursive: true });
});

test('a config that does not parse stops the run before the subset, which it has no theme for', () => {
  const { root: phosphorRootDir, web } = phosphor({ bold: 'Phosphor-Bold' });
  const root = project(null);
  writeFileSync(join(root, 'arena.config.json'), '{ not json');
  const argv = ['--config', join(root, 'arena.config.json'), '--src', join(root, 'src'), '-o', join(root, 'src')];

  const { code } = quietly(() => main(argv, { phosphor: web, arena: null, packageName: '@dravensoft/arena-react', sheets: null }));
  assert.equal(code, 2);
  assert.equal(existsSync(join(root, 'src', ICONS_SHEET)), false);

  rmSync(root, { recursive: true });
  rmSync(phosphorRootDir, { recursive: true });
});

test('--strict promotes a report from either step, and neither is fatal without it', () => {
  const { root: phosphorRootDir, web } = phosphor({ bold: 'Phosphor-Bold' });
  const dim = structuredClone(readable);
  const [firstPalette] = dim.palettes;
  assert.ok(firstPalette, 'the readable fixture declares no palette to dim');
  firstPalette.colors['base-content'] = '#1a1a1a';
  const environment: Environment = { phosphor: web, arena: null, packageName: '@dravensoft/arena-react', sheets: null };

  const contrast = project(dim);
  const glyph = project(readable, { 'app.html': '<i class="ph-bold ph-nope"></i><i class="ph-bold ph-bell"></i>' });
  const argv = (root: string, ...extra: string[]) =>
    ['--config', join(root, 'arena.config.json'), '--src', join(root, 'src'), '-o', join(root, 'src'), ...extra];

  assert.equal(quietly(() => main(argv(contrast), environment)).code, 0);
  assert.equal(quietly(() => main(argv(contrast, '--strict'), environment)).code, 1);
  assert.equal(quietly(() => main(argv(glyph), environment)).code, 0);
  assert.equal(quietly(() => main(argv(glyph, '--strict'), environment)).code, 1);

  rmSync(contrast, { recursive: true });
  rmSync(glyph, { recursive: true });
  rmSync(phosphorRootDir, { recursive: true });
});

test('the package around the command is found by its name, and nothing else is', () => {
  const root = mkdtempSync(join(tmpdir(), 'arena-host-'));
  mkdirSync(join(root, 'bin'));
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: '@dravensoft/arena-angular' }));
  assert.equal(hostPackage(join(root, 'bin')), root);
  assert.equal(hostPackageName(root), '@dravensoft/arena-angular');
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'arena' }));
  assert.equal(hostPackage(join(root, 'bin')), null);
  assert.equal(hostPackage(join(root, 'nowhere')), null);
  assert.equal(hostPackageName(join(root, 'nowhere')), null);
  rmSync(root, { recursive: true });
});

function installed(barrel: string, components: string[]) {
  const root = mkdtempSync(join(tmpdir(), 'arena-installed-'));
  mkdirSync(join(root, 'css', 'components'), { recursive: true });
  writeFileSync(join(root, 'arena.css'), barrel);
  for (const name of components) writeFileSync(join(root, 'css', 'components', `${name}.css`), '');
  return root;
}

test('the sheets a package ships are read from beside the command, so no copy of them can age', () => {
  const root = installed("@import './css/reset.css';\n@import './css/components.css';\n", ['table', 'button']);
  assert.deepEqual(packageSheets(root), {
    layers: ['css/reset.css', 'css/components.css'],
    components: ['button', 'table'],
    extensions: {},
  });
  rmSync(root, { recursive: true });
});

test('no package around the command means no sheet list rather than an empty one', () => {
  assert.equal(packageSheets(join(tmpdir(), 'arena-nowhere')), null);
  const bare = installed('', []);
  assert.equal(packageSheets(bare), null);
  rmSync(bare, { recursive: true });
});

test('a path that is not there reads as nothing rather than as an empty tree', () => {
  assert.equal(sourceFiles(join(tmpdir(), 'arena-to-prod-nowhere')), null);
});

test('Phosphor is looked for upwards, which is where a package manager puts it', () => {
  const { root, web } = phosphor({ bold: 'Phosphor-Bold' });
  const deep = join(root, 'apps', 'web', 'src');
  mkdirSync(deep, { recursive: true });
  assert.equal(phosphorRoot(deep, deep), web);
  assert.equal(phosphorRoot(tmpdir(), tmpdir()), null);
  rmSync(root, { recursive: true });
});

test('a path already leaving the directory keeps its shape, and a sibling gains one', () => {
  assert.equal(relativeFrom(join('a', 'b'), join('a', 'b', 'c.woff2')), './c.woff2');
  assert.equal(relativeFrom(join('a', 'b'), join('a', 'd.woff2')), '../d.woff2');
});

test('--undrawn names the shipped components a project draws nowhere', () => {
  const root = project(auto, { 'app.html': '<arena-button />' });
  const step = undrawnStep(options(root, { undrawn: true }), '@dravensoft/arena-react', MAP);
  assert.deepEqual(step.fatal, []);
  assert.match(step.notes[0] ?? '', /1 of 3 shipped component\(s\) drawn/);
  assert.match(step.notes[1] ?? '', /2 drawn nowhere: arena-bar-chart, arena-table/);
  rmSync(root, { recursive: true });
});

test('a project drawing everything is told so, rather than being handed an empty list', () => {
  const root = project(auto, { 'app.html': '<arena-button /><arena-table /><arena-bar-chart />' });
  const step = undrawnStep(options(root, { undrawn: true }), '@dravensoft/arena-react', MAP);
  assert.match(step.notes[1] ?? '', /every component this package ships is drawn somewhere/);
  rmSync(root, { recursive: true });
});

test('a component Arena draws on your behalf is still undrawn, because you never wrote it', () => {
  const root = project(auto, { 'app.html': '<arena-table />' });
  const step = undrawnStep(options(root, { undrawn: true }), '@dravensoft/arena-react', MAP);
  assert.match(step.notes[1] ?? '', /arena-button/);
  rmSync(root, { recursive: true });
});

test('--undrawn without the map beside the command says why rather than reporting nothing', () => {
  const root = project(auto, { 'app.html': '<arena-button />' });
  const step = undrawnStep(options(root, { undrawn: true }), '@dravensoft/arena-react', null);
  assert.equal(step.notes.length, 0);
  assert.match(step.fatal[0] ?? '', /reads the component map this package carries/);
  rmSync(root, { recursive: true });
});

test('--undrawn is a flag rather than an argument, and an unknown one still fails', () => {
  assert.equal(parseArgs(['--undrawn']).undrawn, true);
  assert.equal(parseArgs([]).undrawn, false);
  assert.match(errorOf(['--undrawn-please']), /unknown flag/);
});

test('the CLI decides it is the program the same way the tooling does, since it cannot import that', () => {
  const dir = mkdtempSync(join(tmpdir(), 'arena-cli-entry-'));
  try {
    const self = join(dir, 'arena-to-prod.mjs');
    writeFileSync(self, '');

    assert.equal(isProgram(self, self), true, 'the raw comparison answers first');
    assert.equal(isProgram(join(dir, 'other.mjs'), self), false);
    assert.equal(isProgram(undefined, self), false, 'an argv[1] that is not there is not this module');
    assert.equal(isProgram(join(dir, 'gone.mjs'), self), false,
      'an entry that resolves to nothing is not this module rather than a throw at import. The '
      + 'spelling this replaced called realpathSync on argv[1] unguarded, so a missing entry '
      + 'crashed the command a consumer had just installed.');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

const NEEDS_A_SYMLINK = (() => {
  const dir = mkdtempSync(join(tmpdir(), 'arena-cli-link-probe-'));
  try {
    symlinkSync(join(dir, 'target'), join(dir, 'link'));
    return false;
  } catch (err) {
    return `this host will not create a symlink (${(err as Error).message}), which is Windows `
      + 'without Developer Mode. It is asked once, before the case is declared, because bun '
      + 'implements no t.skip() and a skip decided inside the callback throws in its place.';
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
})();

test('it takes the union both ways, which is the half the shipped copy had lost',
  { skip: NEEDS_A_SYMLINK }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'arena-cli-link-'));
  try {
    const real = join(dir, 'arena-to-prod.mjs');
    const link = join(dir, 'linked.mjs');
    writeFileSync(real, '');
    symlinkSync(real, link);

    assert.equal(isProgram(link, real), true,
      'an entry reached through a link is still this module, and that is exactly what an npm '
      + 'bin/ entry is. main-module.ts records that sixty copies compared raw and one resolved '
      + 'only argv[1]; this file ships inside both packages, where scripts/ does not exist, so it '
      + 'could not import the union and was left spelling the losing half.');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the extensions a package ships are read out of the effects sheet, so no list is written twice', () => {
  const root = installed(
    "@import './css/reset.css';\n@import './css/effects.css';\n",
    ['button'],
  );
  mkdirSync(join(root, 'css'), { recursive: true });
  writeFileSync(join(root, 'css', 'effects.css'),
    ':root{\n  --r-surface:14px;\n}\n\n.arena-expressive{\n  /* a reason */\n  --r-surface:22px;\n  --bw-surface:0px;\n}\n');
  assert.deepEqual(packageSheets(root)?.extensions, {
    expressive: ['--r-surface:22px;', '--bw-surface:0px;'],
  });
  rmSync(root, { recursive: true });
});

test('a package whose effects sheet declares no scope class ships no extensions rather than failing', () => {
  const root = installed("@import './css/reset.css';\n", ['button']);
  mkdirSync(join(root, 'css'), { recursive: true });
  writeFileSync(join(root, 'css', 'effects.css'), ':root{\n  --r-surface:14px;\n}\n');
  assert.deepEqual(packageSheets(root)?.extensions, {});
  rmSync(root, { recursive: true });
});
