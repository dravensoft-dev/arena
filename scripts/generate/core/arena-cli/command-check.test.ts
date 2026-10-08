/* arena check against throwaway projects: the reports of the plan and of the marker check, the strict
 * set and the exit codes. A project is a temp directory, so every case reads real files. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from './command-check.ts';
import { captureIo, colors, phosphor, readable } from './cli-fixtures.ts';
import type { ComponentMap } from './components.ts';

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
  const root = mkdtempSync(join(tmpdir(), 'arena-check-'));
  mkdirSync(join(root, 'src'), { recursive: true });
  if (config) writeFileSync(join(root, 'arena.config.json'), JSON.stringify(config));
  for (const [name, content] of Object.entries(files)) writeFileSync(join(root, 'src', name), content);
  return root;
}

function tree(root: string): string[] {
  return readdirSync(root, { recursive: true, encoding: 'utf8' }).sort()
    .map((name) => (statSync(join(root, name)).isFile() ? `${name}=${readFileSync(join(root, name), 'utf8')}` : name));
}

function check(root: string, argv: string[] = [], extra: Record<string, unknown> = {}) {
  const { web } = phosphor();
  const captured = captureIo(root, { arena: null, map: null, sheets: null, vocabulary: null, phosphor: web, ...extra });
  const code = run(argv, captured.io);
  return { code, out: captured.out, err: captured.err };
}

test('check writes nothing: the tree is byte-identical before and after', () => {
  const root = setup({ 'app.html': GLYPHS }, DIM);
  const before = tree(root);
  check(root, ['--strict']);
  assert.deepEqual(tree(root), before);
});

test('check prints each report with its kind, markers included', () => {
  const root = setup({ 'app.html': GLYPHS, 'dialog.ts': MARKED.replace('[ArenaDialog]', '[]') }, DIM);
  const result = check(root, [], { map: MAP });
  const said = result.err.join('\n');
  assert.match(said, /\[contrast\] /);
  assert.ok(result.err.includes('arena check: [glyph] bold: ph-nope is not an icon Phosphor draws at that weight'), said);
  assert.match(said, /\[markers\] .*dialog\.ts projects into the `footer` slot/);
  assert.match(result.out.join('\n'), /\d+ report\(s\)/);
});

test('a report without --strict exits 0', () => {
  const root = setup({ 'app.html': GLYPHS }, DIM);
  assert.equal(check(root).code, 0);
});

test('--strict holds a check kind and exits 1 with heldMessage', () => {
  const root = setup({ 'app.html': GLYPHS }, DIM);
  const result = check(root, ['--strict']);
  assert.equal(result.code, 1);
  assert.match(result.err.join('\n'),
    /--strict holds components, contrast, ramp, weight, glyph, markers, and this run reports \d+ of them: contrast, glyph/);
});

test('--strict=components does not hold a glyph report', () => {
  const root = setup({ 'app.html': GLYPHS });
  const result = check(root, ['--strict=components']);
  assert.match(result.err.join('\n'), /\[glyph\]/);
  assert.equal(result.code, 0);
});

test('a wash report is printed and never held', () => {
  const root = setup({ 'app.html': '<i class="ph-bold ph-bell"></i>' });
  const result = check(root, ['--strict=components,contrast,glyph,markers,ramp,weight'], { sheets: WASHED });
  assert.match(result.err.join('\n'), /\[wash\] /);
  assert.equal(result.code, 1);
  assert.doesNotMatch(result.err.join('\n'), /this run reports.*wash/);
});

test('a fatal config exits with the plan\'s code', () => {
  const missing = setup({ 'app.html': GLYPHS }, null);
  const first = check(missing);
  assert.equal(first.code, 2);
  assert.match(first.err.join('\n'), /cannot read/);
  const invalid = setup({ 'app.html': GLYPHS }, { palettes: [] });
  assert.equal(check(invalid).code, 1);
});

test('--strict=audit exits 2 naming arena audit', () => {
  const root = setup({ 'app.html': GLYPHS });
  const result = check(root, ['--strict=audit']);
  assert.equal(result.code, 2);
  assert.match(result.err.join('\n'), /arena audit/);
});
