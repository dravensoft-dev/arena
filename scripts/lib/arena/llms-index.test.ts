/* The index is derived from the real route, so these hold the properties a rewrite would lose
 * quietly: the specification's fixed order, the summary coming from the router's own frontmatter
 * rather than a second copy, and above all that one layer's corpus carries that layer and no
 * other. The last is the reason the file is split at all, so it is asserted against the tree. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LLMS_INDEX, ROUTER, LAYER_INDEX, BUILD_INTERMEDIATE, layerFile, docUrl, summary,
  categoryIndexes, prompts, layerDocs, servedDocs, index, corpus, nameOf, categoryOf,
} from './llms-index.ts';
import { DOMAIN, LAYERS } from './site-pages.ts';

test('the file is named where the specification says an agent looks for it', () => {
  assert.equal(LLMS_INDEX, 'llms.txt');
  assert.equal(layerFile('react'), 'llms-react.txt');
});

test('the specification fixes the order, and the index holds to it', () => {
  const text = index();
  const lines = text.split('\n');
  assert.equal(lines[0], '# Arena by Dravensoft', 'an H1 comes first');
  assert.match(lines[2] ?? '', /^> /, 'a blockquote summary comes second');
  const firstHeading = lines.findIndex((line, i) => i > 2 && line.startsWith('## '));
  const firstLink = lines.findIndex((line) => line.startsWith('- ['));
  assert.ok(firstHeading < firstLink, 'every link list sits under an H2');
  assert.ok(text.includes('## Optional'), 'and the skippable half is named as the convention has it');
});

test('the summary is the router\'s own frontmatter, so the two cannot describe different projects', () => {
  const stated = /^> (.+)$/m.exec(index())?.[1];
  assert.equal(stated, summary());
  assert.ok(summary().length > 40, 'a summary nobody wrote would pass every other assertion here');
});

test('a corpus carries its own layer and nothing from the other, which is why it is split', () => {
  for (const layer of LAYERS) {
    const text = corpus(layer);
    const other = LAYERS.find((name) => name !== layer) ?? '';
    assert.ok(text.includes(`frameworks/${layer}/components/`), `${layer} carries its own components`);
    assert.ok(!text.includes(`frameworks/${other}/components/`),
      `${layer} carries a document from ${other}, which is the drift the split exists to end`);
  }
});

test('every document of a layer appears in that layer\'s corpus exactly once', () => {
  for (const layer of LAYERS) {
    const text = corpus(layer);
    for (const rel of prompts(layer)) {
      assert.equal(text.split(`<!-- ${rel} -->`).length - 1, 1, `${rel} is in ${layer} once`);
    }
  }
});

test('the router and the cross-layer index lead every corpus, since that is the order they are read in', () => {
  for (const layer of LAYERS) {
    const text = corpus(layer);
    assert.ok(text.indexOf(`<!-- ${ROUTER} -->`) < text.indexOf(`<!-- ${LAYER_INDEX} -->`));
    assert.ok(text.indexOf(`<!-- ${LAYER_INDEX} -->`) < text.indexOf(`<!-- frameworks/${layer}/${ROUTER} -->`));
  }
});

test('a build intermediate is never a document, however much it looks like one', () => {
  for (const rel of servedDocs()) {
    assert.ok(!rel.includes(BUILD_INTERMEDIATE), `${rel} is output, not a document`);
  }
});

test('both layers carry the same component documents, under their own names', () => {
  const counts = LAYERS.map((layer) => prompts(layer).length);
  assert.ok(counts.every((n) => n > 0), 'a layer with no component document would pass silently');
  assert.equal(new Set(counts).size, 1, 'the layers are at parity, and this is where that shows');
  for (const layer of LAYERS) {
    assert.equal(categoryIndexes(layer).length, 7);
    assert.ok(layerDocs(layer).length > prompts(layer).length, 'a layer is its prompts plus its indexes');
  }
});

test('a URL is spelled once, from the domain the site is built for', () => {
  assert.equal(docUrl('a/b c.md'), `https://${DOMAIN}/a/b%20c.md`);
  assert.ok(index().includes(docUrl(ROUTER)));
});

test('a document is named by what it is, not by the path it sits at', () => {
  assert.equal(nameOf('frameworks/react/components/forms/arena-button/ArenaButton.prompt.md'), 'ArenaButton');
  assert.equal(categoryOf('frameworks/react/components/forms/SKILL.md'), 'forms');
});
