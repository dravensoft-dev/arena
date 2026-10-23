/* No component reaches the global vocabulary map: each one passes the list its own classes module
 * holds, so a bundle of one component carries one list and not the 98-entry map. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return /\.(ts|tsx)$/.test(entry.name) && !entry.name.includes('.generated.') && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

test('no file under components imports ARENA_VOCABULARY', () => {
  const files = sources(join(ROOT, 'components'));
  assert.ok(files.length > 0, 'found no component source; an empty sweep is a failure');
  const offenders = files.filter((file) => /\bARENA_VOCABULARY\b(?!_)/.test(readFileSync(file, 'utf8')));
  assert.deepEqual(offenders, []);
});

const ownsManifest = (file: string) => readdirSync(dirname(file)).some((name) => name.endsWith('.classes.generated.ts'));

test('every arenaClassName call passes its own manifest list, or the context list in a part that has no manifest of its own', () => {
  const calls = sources(join(ROOT, 'components')).flatMap((file) => readFileSync(file, 'utf8').split('\n')
    .filter((line) => line.includes('arenaClassName(') && !line.startsWith('import ')).map((line) => ({ file, line })));
  assert.ok(calls.length > 0);
  const bare = calls.filter(({ line }) => !line.includes('manifest.vocabulary') && !line.includes('ARENA_CONTEXT_VOCABULARY'));
  assert.deepEqual(bare, []);
  const contextual = calls.filter(({ line }) => line.includes('ARENA_CONTEXT_VOCABULARY'));
  assert.ok(contextual.length > 0, 'no part passes the context list; an empty sweep is a failure');
  assert.deepEqual(contextual.filter(({ file }) => ownsManifest(file)).map(({ file }) => file), [],
    'a component with a manifest of its own passes it, not the context list');
});

test('VocabularyClass imports no value from Vocabulary.generated except ARENA_VOCABULARY_PAGE', () => {
  const text = readFileSync(join(ROOT, 'VocabularyClass.ts'), 'utf8');
  const imports = [...text.matchAll(/import\s*\{([^}]*)\}\s*from\s*'\.\/Vocabulary\.generated\.ts'/g)];
  const names = imports.flatMap((one) => one[1]!.split(',').map((name) => name.trim()).filter(Boolean));
  assert.deepEqual(names, ['ARENA_VOCABULARY_PAGE']);
});

test('a component imports from Vocabulary.generated once, the type beside the value', () => {
  const twice = sources(join(ROOT, 'components')).filter((file) =>
    (readFileSync(file, 'utf8').match(/from '(?:\.\.\/)+Vocabulary\.generated\.ts'/g) ?? []).length > 1);
  assert.deepEqual(twice, []);
});
