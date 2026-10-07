import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs, resolved, themeStep, iconsStep, main, isProgram, USAGE } from './arena-to-prod.ts';
import { THEME_SHEET, ICONS_SHEET, ICON_MANIFEST } from './sheets.ts';
import { STRICT_KINDS } from './reports.ts';
import { auto, MAP, SHEETS, options, phosphor, project, quietly, readable } from './cli-fixtures.ts';
import type { Environment, ThemeEnvironment } from './arena-to-prod.ts';

test('every path has a default, so the bare command is the whole of it', () => {
  const bare = parseArgs([]);
  assert.equal(bare.config, 'arena.config.json');
  assert.equal(bare.out, 'src');
  assert.deepEqual(bare.paths, ['src']);
  assert.deepEqual(bare.strict, []);
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
  assert.deepEqual(flagged.strict, [...STRICT_KINDS]);
  assert.equal(flagged.importHeader, false);
});

test('--strict takes the kinds it holds, and refuses one it does not report on', () => {
  assert.deepEqual(parseArgs(['--strict=audit,glyph']).strict, ['audit', 'glyph']);
  assert.deepEqual(parseArgs(['--strict=']).strict, [],
    'naming nothing holds nothing, which is the bare command');
  assert.match(errorOf(['--strict=spelling']), /--strict does not report on spelling/);
});

test('--help asks for nothing else', () => {
  assert.equal(parseArgs(['--help']).help, true);
  assert.match(USAGE, /arena-to-prod \[--config <path>\]/);
  assert.match(USAGE, new RegExp(THEME_SHEET.replace('.', '\\.')));
  assert.match(USAGE, new RegExp(ICONS_SHEET.replace('.', '\\.')));
});

const errorOf = (argv: string[]) => parseArgs(argv).error ?? '';

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
  assert.ok(step.reports.some((one) => one.kind === 'contrast' && one.message.includes('under the 4.5:1')));
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
  const { root: phosphorRootDir, web } = phosphor();
  const root = project(auto, { 'app.html': '<arena-widget /><arena-button icon="ph-bold ph-bell" />' });
  const environment: Environment & ThemeEnvironment = {
    packageName: '@dravensoft/arena-react', sheets: SHEETS, map: MAP, phosphor: web, arena: null,
  };

  const step = themeStep(options(root), environment);
  assert.equal(step.code, 0);
  assert.ok(step.reports.some((one) => one.kind === 'components'
    && one.message.includes('arena-widget is not a component this package ships')));

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

test('--strict takes the environment kind by name', () => {
  assert.deepEqual(parseArgs(['--strict=environment']).strict, ['environment']);
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
  assert.doesNotMatch(css, /\.ph-bold\.ph-moon/, 'a weight gains no glyph the sources did not name beside it');
  assert.match(css, /\.ph-fill\.ph-bell:before/,
    'fill is the exception: the navigation asks for it on its own, so the sheet carries every named glyph in it');
  assert.match(step.wrote ?? '', /2 glyph\(s\), 2 named by your sources and 0 drawn by Arena's own components, 2 weight\(s\)/);

  rmSync(root, { recursive: true });
  rmSync(phosphorRootDir, { recursive: true });
});

test('a project that names one weight and never fill still gets the fill rule the active navigation item asks for', () => {
  const { root: phosphorRootDir, web } = phosphor();
  const root = project(readable, { 'app.html': '<arena-side-nav-item icon="ph-bold ph-bell"></arena-side-nav-item>' });

  const step = iconsStep(options(root), { phosphor: web, arena: null });
  assert.equal(step.code, 0);
  const css = readFileSync(join(root, 'src', ICONS_SHEET), 'utf8');
  assert.match(css, /\.ph-bold\.ph-bell:before/);
  assert.match(css, /\.ph-fill\.ph-bell:before/,
    'without it the icon of the item the user just pressed is the one that disappears');
  assert.match(css, /Phosphor-Fill\.woff2/, 'and the face it needs comes with it');

  rmSync(root, { recursive: true });
  rmSync(phosphorRootDir, { recursive: true });
});

test('the font path is written relative to the stylesheet, so a bundler resolves it', () => {
  const { root: phosphorRootDir, web } = phosphor();
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

test('the icons Arena draws itself come from the list the package ships, not from reading it', () => {
  const { root: phosphorRootDir, web } = phosphor();
  const arena = mkdtempSync(join(tmpdir(), 'arena-package-'));
  writeFileSync(join(arena, ICON_MANIFEST), JSON.stringify({ pairs: { bold: ['ph-sun'] }, loose: [] }));
  writeFileSync(join(arena, 'index.d.ts'), '/** Phosphor class name, e.g. \'ph-bold ph-moon\'. */');
  const root = project();

  iconsStep(options(root), { phosphor: web, arena });
  const css = readFileSync(join(root, 'src', ICONS_SHEET), 'utf8');
  assert.match(css, /ph-sun/, 'a glyph the package declares it draws reaches the sheet');
  assert.doesNotMatch(css, /ph-moon/,
    'a glyph named in a sentence about the API is not one anything draws, and reading the package '
    + 'as text is what could not tell the two apart');

  rmSync(arena, { recursive: true });
  rmSync(root, { recursive: true });
  rmSync(phosphorRootDir, { recursive: true });
});

test('a package with no list beside it says so rather than counting nothing in silence', () => {
  const { root: phosphorRootDir, web } = phosphor();
  const arena = mkdtempSync(join(tmpdir(), 'arena-package-'));
  const root = project();
  const step = iconsStep(options(root), { phosphor: web, arena });
  assert.ok(step.reports.some((one) => one.message.includes(ICON_MANIFEST)));
  rmSync(arena, { recursive: true });
  rmSync(root, { recursive: true });
  rmSync(phosphorRootDir, { recursive: true });
});

test('running outside a package says so, because the icons Arena draws went uncounted', () => {
  const { root: phosphorRootDir, web } = phosphor();
  const root = project();
  const step = iconsStep(options(root), { phosphor: web, arena: null });
  assert.deepEqual(step.reports.map((one) => one.kind), ['environment'],
    'where the command runs is not a glyph Phosphor cannot draw, and a project holding glyph in CI '
    + 'would otherwise hold a note that fires on any bare checkout');
  assert.ok(step.reports.some((one) => one.message.includes('not running from inside an Arena package')));
  rmSync(root, { recursive: true });
  rmSync(phosphorRootDir, { recursive: true });
});

test('a glyph Phosphor does not draw is reported and still writes', () => {
  const { root: phosphorRootDir, web } = phosphor();
  const root = project(readable, { 'app.html': '<i class="ph-bold ph-nope"></i><i class="ph-bold ph-bell"></i>' });

  const step = iconsStep(options(root), { phosphor: web, arena: null });
  assert.equal(step.code, 0);
  assert.ok(step.reports.some((one) => one.kind === 'glyph'
    && one.message.includes('ph-nope is not an icon Phosphor draws at that weight')));
  assert.ok(existsSync(join(root, 'src', ICONS_SHEET)));

  rmSync(root, { recursive: true });
  rmSync(phosphorRootDir, { recursive: true });
});

test('a project naming a glyph and no weight is stopped, because no rule could be written', () => {
  const { root: phosphorRootDir, web } = phosphor();
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

  const { root: phosphorRootDir, web } = phosphor();
  const nowhere = iconsStep({ ...options(root), paths: [join(root, 'nope')] }, { phosphor: web, arena: null });
  assert.equal(nowhere.code, 2);
  assert.equal(existsSync(join(root, 'src', ICONS_SHEET)), false);

  rmSync(root, { recursive: true });
  rmSync(phosphorRootDir, { recursive: true });
});

test('one run writes both files, which is the whole point of one command', () => {
  const { root: phosphorRootDir, web } = phosphor();
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
  const { root: phosphorRootDir, web } = phosphor();
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
  const { root: phosphorRootDir, web } = phosphor();
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
  assert.equal(quietly(() => main(argv(contrast, '--strict=contrast'), environment)).code, 1);
  assert.equal(quietly(() => main(argv(contrast, '--strict=audit'), environment)).code, 0,
    'a brand measured under 4.5:1 is a decision its owner made, and holding the other kinds is '
    + 'what a project in that position is left with');
  assert.equal(quietly(() => main(argv(glyph), environment)).code, 0);
  assert.equal(quietly(() => main(argv(glyph, '--strict'), environment)).code, 1);

  rmSync(contrast, { recursive: true });
  rmSync(glyph, { recursive: true });
  rmSync(phosphorRootDir, { recursive: true });
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
