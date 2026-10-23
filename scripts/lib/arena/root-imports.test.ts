/* The layering pin: no root module of a layer imports a component, but the row window. A root module
 * that imports a component drags that component into every chunk the root lands in, so Arena could not
 * sit in a chunk of its own. The real tree is read, because a fixture would prove the reader. */

import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { repoRoot } from './repo-root.ts';
import { ALLOWED_ROOT_IMPORTS, rootComponentImports } from './root-imports.ts';

const FIXTURE = join(repoRoot, '.cache', 'root-imports-fixture');
after(() => rmSync(FIXTURE, { recursive: true, force: true }));

function writeFixture(path: string, text: string) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

for (const layer of ['react', 'angular'] as const) {
  test(`no root module imports a component, but the row window (${layer})`, () => {
    const found = rootComponentImports(layer).filter(({ file }) => ALLOWED_ROOT_IMPORTS[file] === undefined);
    assert.deepEqual(found, []);
  });
}

test('the row window is the one allowed exception, and the reader sees it', () => {
  assert.ok(rootComponentImports('react').some(({ file }) => file === 'UseArenaRowWindow.ts'));
  assert.ok(rootComponentImports('angular').some(({ file }) => file === 'RowWindow.ts'));
  assert.deepEqual(Object.keys(ALLOWED_ROOT_IMPORTS).sort(), ['RowWindow.ts', 'UseArenaRowWindow.ts']);
});

test('a root import into components/ is listed, and a generated or test file is not read', () => {
  const root = FIXTURE;
  const lib = `${root}/frameworks/react`;
  for (const [name, text] of Object.entries({
    'A.ts': "import { X } from './components/a/b/X.tsx';",
    'B.ts': "import { Y } from './Other.ts';",
    'C.generated.ts': "import { X } from './components/a/b/X.tsx';",
    'D.test.ts': "import { X } from './components/a/b/X.tsx';",
  })) {
    writeFixture(`${lib}/${name}`, text);
  }
  assert.deepEqual(rootComponentImports('react', root), [{ file: 'A.ts', specifier: './components/a/b/X.tsx' }]);
});
