import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { flattenImports } from './flat-sheet.ts';

const PKG = '@dravensoft/arena-react';
const made: string[] = [];
after(() => { for (const dir of made) rmSync(dir, { recursive: true, force: true }); });

function packageRoot(files: Record<string, string>) {
  const outer = mkdtempSync(join(tmpdir(), 'arena-flat-'));
  made.push(outer);
  const root = join(outer, 'pkg');
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, name)), { recursive: true });
    writeFileSync(join(root, name), text);
  }
  return root;
}
const top = [`@import '${PKG}/arena.css';`];

test('nested relative imports are inlined in place and in order, each file under its marker', () => {
  const root = packageRoot({
    'arena.css': "a{}\n@import './css/one.css';\nb{}\n@import './css/two.css';\n",
    'css/one.css': "@import './deep/x.css';\none{}\n",
    'css/deep/x.css': 'x{}\n',
    'css/two.css': 'two{}\n',
  });
  const { css, problems } = flattenImports(top, root, PKG);
  assert.deepEqual(problems, []);
  assert.doesNotMatch(css, /@import/);
  const order = ['arena.css', 'css/one.css', 'css/deep/x.css', 'one{}', 'b{}', 'css/two.css', 'two{}'].map((s) => css.indexOf(s));
  assert.ok(order.every((at, i) => at >= 0 && (i === 0 || at > order[i - 1]!)), css);
  assert.ok(css.indexOf('a{}') < css.indexOf(`/* ${PKG}/css/one.css */`));
  assert.ok(css.includes(`/* ${PKG}/css/deep/x.css */`));
});

test('a sheet imported from three files appears once, where first met, with one marker', () => {
  const root = packageRoot({
    'arena.css': "@import './a.css';\n@import './b.css';\n@import './c.css';\n",
    'a.css': "@import './p.css';\na{}\n",
    'b.css': "@import './p.css';\nb{}\n",
    'c.css': "@import './p.css';\nc{}\n",
    'p.css': '@layer one;\n',
  });
  const { css, problems } = flattenImports(top, root, PKG);
  assert.deepEqual(problems, []);
  assert.equal(css.split('@layer one;').length, 2);
  assert.equal(css.split(`/* ${PKG}/p.css */`).length, 2);
  assert.ok(css.indexOf('@layer one;') < css.indexOf('a{}'));
});

test('a missing file is one problem naming the file and the import', () => {
  const root = packageRoot({ 'arena.css': "@import './gone.css';\n" });
  const { problems } = flattenImports(top, root, PKG);
  assert.equal(problems.length, 1);
  assert.match(problems[0]!, /arena\.css/);
  assert.match(problems[0]!, /\.\/gone\.css/);
});

test('an import that leaves the package root is a problem, even when the file exists', () => {
  const root = packageRoot({ 'arena.css': "@import '../outside.css';\n" });
  writeFileSync(join(resolve(root, '..'), 'outside.css'), 'o{}');
  assert.ok(existsSync(join(root, '..', 'outside.css')));
  const { css, problems } = flattenImports(top, root, PKG);
  assert.equal(problems.length, 1);
  assert.match(problems[0]!, /outside\.css/);
  assert.doesNotMatch(css, /o\{\}/);
});

test('an import that is not a quoted relative path is a problem', () => {
  const root = packageRoot({ 'arena.css': "@import 'tailwindcss';\n@import url(https://x.test/a.css);\n@import './ok.css' layer(x);\n", 'ok.css': 'k{}' });
  const { problems } = flattenImports(top, root, PKG);
  assert.equal(problems.length, 3);
  for (const one of problems) assert.match(one, /not a quoted relative path/);
});

test('a line that is not a specifier of the package is a problem', () => {
  const root = packageRoot({ 'arena.css': 'a{}' });
  const { problems } = flattenImports(["@import 'other/arena.css';"], root, PKG);
  assert.equal(problems.length, 1);
});

test('a url() other than inline data or a fragment is a problem, and data: and #id are not', () => {
  const bad = packageRoot({ 'arena.css': '@font-face{src:url(fonts/x.woff2)}' });
  const one = flattenImports(top, bad, PKG).problems;
  assert.equal(one.length, 1);
  assert.match(one[0]!, /arena\.css.*fonts\/x\.woff2/);
  const good = packageRoot({ 'arena.css': "a{background:url(\"data:image/svg+xml;utf8,<svg/>\")}b{background:url(data:image/png;base64,AAAA)}" });
  assert.deepEqual(flattenImports(top, good, PKG).problems, []);
  const fragment = packageRoot({ 'arena.css': 'a{mask:url(#m)}' });
  assert.deepEqual(flattenImports(top, fragment, PKG).problems, []);
  const mixed = packageRoot({ 'arena.css': 'a{mask:url(#m)}b{background:url(img.png)}c{background:url(x.svg#m)}' });
  assert.equal(flattenImports(top, mixed, PKG).problems.length, 2);
});

test('a comment that mentions url() does not stop the build', () => {
  const root = packageRoot({ 'arena.css': '/* the font url(fonts/x.woff2) is cut */\na{b:c}' });
  assert.deepEqual(flattenImports(top, root, PKG).problems, []);
});

test('markers read /* <package>/<path from root> */', () => {
  const root = packageRoot({ 'arena.css': "@import './css/x.css';", 'css/x.css': 'x{}' });
  const { css } = flattenImports(top, root, PKG);
  assert.match(css, /^\/\* @dravensoft\/arena-react\/arena\.css \*\/\n/);
  assert.ok(css.includes('/* @dravensoft/arena-react/css/x.css */\nx{}'));
});
