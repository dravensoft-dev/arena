/* The vocabulary page is emitted from the family files and the manifests that answer them, so a
 * family is listed by being declared and a component by answering it. Each family has an anchor
 * a prompt links to. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderVocabulary, VOCABULARY_TARGET } from './generate-vocabulary.ts';

test('every family is a row and a section, with its options, its default, its reach and who answers it', () => {
  const page = renderVocabulary();
  assert.match(page, /^<!-- GENERATED from frameworks\/tailwind\/vocabulary\/ by bun run generate:vocabulary\./);
  assert.match(page, /\| \[`fill`\]\(#fill\) \| box \| `arena-fill`, `arena-fit` \(default\) \|/);
  assert.match(page, /\n## fill\n/);
  assert.match(page, /ArenaButton/);
  assert.equal(VOCABULARY_TARGET, 'frameworks/VOCABULARY.md');
});
