/* The sprite writer: ids, the package layout, one symbol per glyph, what a weight lacks, and the
 * content-hashed name. The reader is a map of strings, so no Phosphor install is read. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { budgetFor, deadline } from '../../../lib/arena/deadline.ts';
import { ngcBin } from '../../../lib/angular/ngc-bin.ts';
import { linkDir } from '../../../lib/arena/platform.ts';
import { repoRoot } from '../../../lib/arena/repo-root.ts';
import { toPosix } from '../../../utils/posix-path.ts';
import { symbolId, glyphFile, spriteSvg, contentName, spriteModuleFiles, writesTypeScript } from './sprite.ts';

const svg = (inner: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor">${inner}</svg>`;
const reader = (files: Record<string, string>) => (weight: string, name: string) => files[`${weight}/${name}`] ?? null;

test('symbol ids name weight and glyph, and regular for ph, the id every reader points at', () => {
  assert.equal(symbolId('bold', 'bell'), 'ph-bold-bell');
  assert.equal(symbolId('fill', 'x'), 'ph-fill-x');
  assert.equal(symbolId('regular', 'bell'), 'ph-regular-bell');
});

test('glyphFile follows the package layout, in the separator of the host it reads on', () => {
  assert.equal(toPosix(glyphFile('/c', 'bold', 'x')), '/c/assets/bold/x-bold.svg');
  assert.equal(toPosix(glyphFile('/c', 'regular', 'x')), '/c/assets/regular/x.svg');
});

test('the sprite holds one symbol per glyph, sorted, and the same bytes twice', () => {
  const read = reader({ 'bold/b': svg('<path d="B"/>'), 'bold/a': svg('<path d="A"/>'), 'regular/c': svg('<path d="C"/>') });
  const one = [{ weight: 'regular', glyphs: new Set(['c']) }, { weight: 'bold', glyphs: new Set(['b', 'a']) }];
  const out = spriteSvg(one, read);
  assert.equal(out.kept, 3);
  assert.deepEqual([...out.svg.matchAll(/<symbol id="([^"]+)"/g)].map((m) => m[1]), ['ph-bold-a', 'ph-bold-b', 'ph-regular-c']);
  assert.match(out.svg, /<symbol id="ph-bold-a" viewBox="0 0 256 256" fill="currentColor"><path d="A"\/><\/symbol>/);
  assert.ok(!out.svg.includes('xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill'));
  assert.equal(spriteSvg([...one].reverse(), read).svg, out.svg);
  assert.equal(spriteSvg(one, read).svg, out.svg);
});

test('each symbol carries the fill of the source root, since a use inherits from itself and not from the file', () => {
  const read = reader({ 'bold/a': svg('<path d="A"/>'), 'regular/c': svg('<path d="C"/>') });
  const out = spriteSvg([{ weight: 'bold', glyphs: new Set(['a']) }, { weight: 'regular', glyphs: new Set(['c']) }], read);
  const symbols = [...out.svg.matchAll(/<symbol [^>]*>/g)].map((m) => m[0]);
  assert.equal(symbols.length, 2);
  for (const tag of symbols) assert.match(tag, / fill="currentColor"/);
});

test('a glyph the weight lacks is reported, not drawn', () => {
  const out = spriteSvg([{ weight: 'fill', glyphs: new Set(['bell', 'not-a-glyph']) }], reader({ 'fill/bell': svg('<path/>') }));
  assert.deepEqual([...out.missing], [['fill', ['not-a-glyph']]]);
  assert.equal(out.kept, 1);
  assert.ok(!out.svg.includes('not-a-glyph'));
});

test('contentName changes exactly when the bytes do', () => {
  const a = contentName('arena-icons', 'svg', 'one');
  assert.match(a, /^arena-icons-[0-9a-f]{10}\.svg$/);
  assert.equal(contentName('arena-icons', 'svg', new TextEncoder().encode('one')), a);
  assert.notEqual(contentName('arena-icons', 'svg', 'two'), a);
});

test('spriteModuleFiles: the Angular package writes one TypeScript module, any other package the module and its declaration', () => {
  const body = "export const ARENA_SPRITE = 'arena-icons-0123456789.svg';\n";
  assert.deepEqual(spriteModuleFiles('arena-icons-0123456789.svg', '@dravensoft/arena-angular'),
    [{ name: 'arena.icons.generated.ts', content: body }]);
  assert.deepEqual(spriteModuleFiles('arena-icons-0123456789.svg', '@dravensoft/arena-react'), [
    { name: 'arena.icons.generated.js', content: body },
    { name: 'arena.icons.generated.d.ts', content: 'export declare const ARENA_SPRITE: string;\n' },
  ]);
  assert.equal(writesTypeScript('@dravensoft/arena-angular'), true);
  assert.equal(writesTypeScript('@dravensoft/arena-react'), false);
});

const NGC_RUN = deadline('ngc on a one-file project',
  30_000, 'ngc loads the Angular compiler and the TypeScript program before it emits one file, which takes seconds cold and '
  + 'longer on a loaded machine; the bound only ends a hang');

test('ngc emits the Angular icon list, which a project with no allowJs imports through its .js specifier', {
  timeout: budgetFor(NGC_RUN),
}, () => {
  const dir = mkdtempSync(join(tmpdir(), 'arena-ngc-'));
  try {
    mkdirSync(join(dir, 'src'));
    linkDir(join(repoRoot, 'node_modules'), join(dir, 'node_modules'));
    writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify({
      compilerOptions: { target: 'ES2022', module: 'ES2022', moduleResolution: 'bundler', outDir: './out', rootDir: './src', strict: true, skipLibCheck: true, types: [] },
      files: ['src/main.ts'],
    }));
    writeFileSync(join(dir, 'src', 'main.ts'), "import { ARENA_SPRITE } from './arena.icons.generated.js';\nconsole.log(ARENA_SPRITE);\n");
    const [module] = spriteModuleFiles('icons-0123456789.svg', '@dravensoft/arena-angular');
    writeFileSync(join(dir, 'src', module!.name), module!.content);
    const compiled = spawnSync(process.execPath, [ngcBin(repoRoot), '-p', 'tsconfig.json'], { cwd: dir, encoding: 'utf8' });
    assert.equal(compiled.status, 0, `${compiled.stdout}${compiled.stderr}`);
    assert.match(readFileSync(join(dir, 'out', 'arena.icons.generated.js'), 'utf8'), /icons-0123456789\.svg/);
    assert.match(readFileSync(join(dir, 'out', 'main.js'), 'utf8'), /\.\/arena\.icons\.generated\.js/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
