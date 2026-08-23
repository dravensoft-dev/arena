import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  entries, catalogue, search, nameOf, categoryOf, words, textOf,
  ROUTER_URI, SUPPORT_URI, ROLES_URI, LAYER_INDEX_URI, CATALOGUE_URI, SCHEME,
} from './catalogue.ts';
import type { Manifest } from './payload.ts';

const MANIFEST: Manifest = {
  name: 'arena', description: 'd', homepage: 'https://arena.dravensoft.org', version: '10.2.2',
  package: '@dravensoft/arena-react', layer: 'react', router: 'skills/design/ROUTER.md',
};

function payload(extra: Record<string, string> = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'arena-mcp-'));
  const files = {
    'skill.json': JSON.stringify(MANIFEST),
    'support.json': '{}',
    'skills/design/ROUTER.md': '# Arena\n\nthe rules\n',
    'skills/design/references/page.md': '# The page\n\nthe floor and the column\n',
    'contracts/design/roles.json': '{}',
    'frameworks/INDEX.md': '# Every component\n',
    'frameworks/react/INDEX.md': '# React\n',
    'frameworks/react/components/forms/INDEX.md': '# Forms\n',
    'frameworks/react/components/forms/arena-input/ArenaInput.prompt.md': 'A single-line text field\n',
    ...extra,
  };
  for (const [rel, body] of Object.entries(files)) {
    const at = join(dir, ...rel.split('/'));
    mkdirSync(join(at, '..'), { recursive: true });
    writeFileSync(at, body);
  }
  return dir;
}

test('every kind of document in a payload gets a URI of its own', () => {
  const dir = payload();
  const uris = entries(dir, MANIFEST).map((one) => one.uri);
  for (const uri of [ROUTER_URI, SUPPORT_URI, ROLES_URI, LAYER_INDEX_URI, CATALOGUE_URI,
    `${SCHEME}://reference/page`, `${SCHEME}://category/forms`, `${SCHEME}://component/ArenaInput`]) {
    assert.ok(uris.includes(uri), `${uri} is not offered`);
  }
  rmSync(dir, { recursive: true });
});

test('a URI resolves to the document it names', () => {
  const dir = payload();
  const { byUri } = catalogue(dir, MANIFEST);
  const input = byUri.get(`${SCHEME}://component/ArenaInput`);
  assert.ok(input);
  assert.match(textOf(dir, input) ?? '', /single-line text field/);
  rmSync(dir, { recursive: true });
});

test('a payload with no component is an error rather than an empty catalogue', () => {
  const dir = mkdtempSync(join(tmpdir(), 'arena-mcp-'));
  writeFileSync(join(dir, 'skill.json'), JSON.stringify(MANIFEST));
  writeFileSync(join(dir, 'support.json'), '{}');
  mkdirSync(join(dir, 'skills', 'design'), { recursive: true });
  writeFileSync(join(dir, 'skills', 'design', 'ROUTER.md'), '# Arena\n');
  assert.throws(() => catalogue(dir, MANIFEST), /carries no component document/);
  rmSync(dir, { recursive: true });
});

test('a component added to Arena is served without this file being told about it', () => {
  const dir = payload({
    'frameworks/react/components/forms/arena-later/ArenaLater.prompt.md': 'a component nobody listed\n',
  });
  const uris = entries(dir, MANIFEST).map((one) => one.uri);
  assert.ok(uris.includes(`${SCHEME}://component/ArenaLater`));
  rmSync(dir, { recursive: true });
});

test('a name is the document and a category is the directory holding it', () => {
  assert.equal(nameOf('frameworks/react/components/forms/arena-input/ArenaInput.prompt.md'), 'ArenaInput');
  assert.equal(nameOf('skills/design/references/page.md'), 'page');
  assert.equal(categoryOf('frameworks/react/components/forms/INDEX.md'), 'forms');
});

test('search ranks by how many words of the question a document answers', () => {
  const dir = payload();
  const found = search(dir, entries(dir, MANIFEST), 'single line text field');
  assert.ok(found.length > 0, 'a question with words in it finds something');
  assert.equal(found[0]?.entry.uri, `${SCHEME}://component/ArenaInput`);
  rmSync(dir, { recursive: true });
});

test('a question with no words finds nothing rather than everything', () => {
  const dir = payload();
  assert.deepEqual(search(dir, entries(dir, MANIFEST), '   ...   '), []);
  rmSync(dir, { recursive: true });
});

test('words are lowercased and split, so a question is matched on its parts', () => {
  assert.deepEqual([...words('Sortable Table, rows')], ['sortable', 'table', 'rows']);
});
