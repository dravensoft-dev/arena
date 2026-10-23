/* arena check against throwaway projects: the reports of the plan and of the marker check, the strict
 * set and the exit codes. A project is a temp directory, so every case reads real files. */
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from './command-check.ts';
import { wiredScripts } from './command-init.ts';
import { fontToolRoots } from './host.ts';
import { captureIo, colors, phosphor, readable, removeFixtures } from './cli-fixtures.ts';
import type { ComponentMap } from './components.ts';

const made: string[] = [];
const track = (dir: string) => { made.push(dir); return dir; };
after(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
  removeFixtures();
});

const DIM = { ...readable, palettes: [{ ...readable.palettes[0]!, colors: colors({
  'base-content': '#1a1a1a', 'cat-1': '#3c7b0a', 'cat-2': '#3b63be', 'cat-3': '#0a924b', 'cat-4': '#6a59bc',
  'cat-5': '#00a3c0', 'cat-6': '#884da9', 'cat-7': '#00a99a', 'cat-8': '#984697' }) }] };
const GLYPHS = '<i class="ph-bold ph-nope"></i><i class="ph-bold ph-bell"></i>';
const MARKED = "@Component({ imports: [ArenaDialog], template: `<arena-dialog><div footer>ok</div></arena-dialog>` })";
const MAP: ComponentMap = { match: 'selector', draws: {}, needs: {}, markers: { 'arena-dialog': ['footer'] } };
const WASHED = { layers: ['css/base.css'], components: ['button'], levels: [],
  washes: [{ selector: '.arena-button__root', variable: 'color-error', percent: 14 }],
  catalogue: { tokens: {}, roles: {} } };

function setup(files: Record<string, string>, config: unknown = readable) {
  const root = track(mkdtempSync(join(tmpdir(), 'arena-check-')));
  mkdirSync(join(root, 'src'), { recursive: true });
  if (config) writeFileSync(join(root, 'arena.config.json'), JSON.stringify(config));
  for (const [name, content] of Object.entries(files)) writeFileSync(join(root, 'src', name), content);
  return root;
}

function tree(root: string): string[] {
  return readdirSync(root, { recursive: true, encoding: 'utf8' }).sort()
    .map((name) => (statSync(join(root, name)).isFile() ? `${name}=${readFileSync(join(root, name), 'utf8')}` : name));
}

async function check(root: string, argv: string[] = [], extra: Record<string, unknown> = {}) {
  const { core } = phosphor();
  const captured = captureIo(root, { arena: null, map: null, sheets: null, vocabulary: null, phosphor: core, ...extra });
  const code = await run(argv, captured.io);
  return { code, out: captured.out, err: captured.err };
}

test('check writes nothing: the tree is byte-identical before and after', async () => {
  const root = setup({ 'app.html': GLYPHS }, DIM);
  const before = tree(root);
  await check(root, ['--strict']);
  assert.deepEqual(tree(root), before);
});

test('check prints each report with its kind, markers included', async () => {
  const root = setup({ 'app.html': GLYPHS, 'dialog.ts': MARKED.replace('[ArenaDialog]', '[]') }, DIM);
  const result = await check(root, [], { map: MAP });
  const said = result.err.join('\n');
  assert.match(said, /\[contrast\] /);
  assert.ok(result.err.includes('arena check: [glyph] bold: ph-nope is not an icon Phosphor draws at that weight'), said);
  assert.match(said, /\[markers\] .*dialog\.ts projects into the `footer` slot/);
  assert.match(result.out.join('\n'), /\d+ report\(s\)/);
});

test('a report without --strict exits 0', async () => {
  const root = setup({ 'app.html': GLYPHS }, DIM);
  assert.equal((await check(root)).code, 0);
});

test('--strict holds a check kind and exits 1 with heldMessage', async () => {
  const root = setup({ 'app.html': GLYPHS }, DIM);
  const result = await check(root, ['--strict']);
  assert.equal(result.code, 1);
  assert.match(result.err.join('\n'),
    /--strict holds components, contrast, ramp, weight, font, glyph, markers, heat, and this run reports \d+ of them: contrast, font, glyph/);
});

test('--strict=components does not hold a glyph report', async () => {
  const root = setup({ 'app.html': GLYPHS });
  const result = await check(root, ['--strict=components']);
  assert.match(result.err.join('\n'), /\[glyph\]/);
  assert.equal(result.code, 0);
});

test('a wash report is printed and never held', async () => {
  const root = setup({ 'app.html': '<arena-icon icon="ph-bold ph-bell"></arena-icon>' });
  const result = await check(root, ['--strict=components,contrast,glyph,markers,ramp,weight'], { sheets: WASHED });
  assert.match(result.err.join('\n'), /\[wash\] /);
  assert.equal(result.code, 1);
  assert.doesNotMatch(result.err.join('\n'), /this run reports.*wash/);
  assert.match(result.err.join('\n'), /this run reports \d+ of them: contrast$/m);
});

test('a fatal config exits with the plan\'s code', async () => {
  const missing = setup({ 'app.html': GLYPHS }, null);
  const first = await check(missing);
  assert.equal(first.code, 2);
  assert.match(first.err.join('\n'), /cannot read/);
  const invalid = setup({ 'app.html': GLYPHS }, { palettes: [] });
  assert.equal((await check(invalid)).code, 1);
});

test('--strict=audit exits 2 naming arena audit', async () => {
  const root = setup({ 'app.html': GLYPHS });
  const result = await check(root, ['--strict=audit']);
  assert.equal(result.code, 2);
  assert.match(result.err.join('\n'), /arena audit/);
});

const unpinned = (ink: string) => {
  const kept = Object.fromEntries(Object.entries(readable.palettes[0]!.colors).filter(([key]) => !key.startsWith('heat-')));
  return { ...readable, palettes: [{ ...readable.palettes[0]!, colors: { ...kept, 'base-content': ink } }] };
};
const LOW = unpinned('#6a6464');

test('a low-contrast ink prints a heat report for each cramped pair of steps', async () => {
  const root = setup({ 'app.html': '<i class="ph-bold ph-bell"></i>' }, LOW);
  const heat = (await check(root)).err.filter((line) => line.startsWith('arena check: [heat] '));
  assert.ok(heat.length > 0, 'a dim ink on a dark surface leaves the derived ladder cramped');
  assert.match(heat[0]!, /\[heat\] dark: heat, steps 1 and 2: lightness gap 0\.\d{3}, under the 0\.06 a reader needs/);
});

test('a palette with a readable ink and no heat step pinned prints no heat report', async () => {
  const root = setup({ 'app.html': '<i class="ph-bold ph-bell"></i>' }, unpinned('#f3ede5'));
  assert.doesNotMatch((await check(root)).err.join('\n'), /\[heat\]/);
});

test('a palette that pins every heat step is not read for heat', async () => {
  const pinned = { ...LOW, palettes: [{ ...LOW.palettes[0]!, colors: { ...LOW.palettes[0]!.colors,
    'heat-1': '#202020', 'heat-2': '#303030', 'heat-3': '#404040', 'heat-4': '#505050', 'heat-5': '#606060' } }] };
  const root = setup({ 'app.html': '<i class="ph-bold ph-bell"></i>' }, pinned);
  assert.doesNotMatch((await check(root)).err.join('\n'), /\[heat\]/);
});

test('--strict and --strict=heat hold the heat report, and the list arena init writes does not', async () => {
  const root = setup({ 'app.html': '<arena-icon icon="ph-bold ph-bell"></arena-icon>' }, LOW);
  assert.equal((await check(root, ['--strict'])).code, 1);
  const named = await check(root, ['--strict=heat']);
  assert.equal(named.code, 1);
  assert.match(named.err.join('\n'), /--strict holds heat, and this run reports \d+ of them: heat/);
  const initCheck = new Map(wiredScripts([])).get('arena:check')!.split(' ').slice(2);
  assert.equal((await check(root, initCheck)).code, 0);
});

test('check reads a local font\'s axis without harfbuzzjs, since it cuts nothing', async () => {
  const fonts = join(import.meta.dirname, '..', '..', '..', '..', 'assets', 'fonts');
  const root = setup({ 'a.html': '<i class="ph-bold ph-bell"></i>' }, {
    ...readable,
    fonts: {
      display: { family: 'Archivo', src: './fonts/archivo.woff2' },
      body: { family: 'Familjen Grotesk', src: './fonts/familjen-grotesk.woff2' },
      mono: { family: 'Spline Sans Mono', src: './fonts/spline-sans-mono.woff2' },
    },
  });
  mkdirSync(join(root, 'fonts'));
  for (const name of ['archivo', 'familjen-grotesk', 'spline-sans-mono']) {
    writeFileSync(join(root, 'fonts', `${name}.woff2`), readFileSync(join(fonts, `${name}.woff2`)));
  }
  const { code, err } = await check(root, [], { fontTools: { harfbuzz: null, wawoff2: fontToolRoots().wawoff2 } });
  assert.equal(code, 0, err.join('\n'));
});
