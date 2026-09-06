/* The index is derived from the real route, so these hold the properties a rewrite would lose
 * quietly: the specification's fixed order, the summary coming from the router's own frontmatter
 * rather than a second copy, and above all that one layer's corpus carries that layer and no
 * other. The last is the reason the file is split at all, so it is asserted against the tree. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LLMS_INDEX, ROUTER, INDEX, REFERENCE_DIR, LAYER_INDEX, BUILD_INTERMEDIATE, layerFile, docUrl,
  summary, categoryIndexes, prompts, layerDocs, servedDocs, references, headline, blurb, index,
  corpus, nameOf, categoryOf, opening, when, sentenceEnd, balance, lift,
} from './llms-index.ts';
import { DOMAIN, LAYERS } from './site-pages.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { repoRoot } from './repo-root.ts';
import { join } from 'node:path';

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
    assert.ok(text.indexOf(`<!-- ${LAYER_INDEX} -->`) < text.indexOf(`<!-- frameworks/${layer}/${INDEX} -->`));
  }
});

test('every reference is on every corpus and in the index, since each is a decision before the first screen', () => {
  const refs = references();
  const served = servedDocs();
  const listed = index();
  const corpora = LAYERS.map((layer) => corpus(layer));
  assert.ok(refs.length > 1, 'a reference tree nobody reached would pass every assertion below');
  for (const rel of refs) {
    assert.ok(served.includes(rel), `${rel} is off servedDocs, so it reaches no corpus and no index`);
    assert.ok(listed.includes(docUrl(rel)), `the index an agent fetches first does not name ${rel}`);
    for (const text of corpora) {
      assert.ok(text.indexOf(`<!-- ${ROUTER} -->`) < text.indexOf(`<!-- ${rel} -->`));
      assert.ok(text.indexOf(`<!-- ${rel} -->`) < text.indexOf(`<!-- ${LAYER_INDEX} -->`),
        'a decision taken before the components is concatenated before them');
    }
  }
});

test('a reference the router does not link is a reference nothing serves, so the tree is held to the route', () => {
  const onDisk = walkFiles(join(repoRoot, REFERENCE_DIR))
    .map((path) => relPosix(repoRoot, path))
    .filter((rel) => rel.endsWith('.md'))
    .sort();
  assert.deepEqual([...references()].sort(), onDisk,
    'a reference off the router is published nowhere, and one the router names and the tree lacks is a dead link');
});

test('a reference names itself and says when it is read, so no second copy of either is written here', () => {
  for (const rel of references()) {
    assert.ok(headline(rel).length > 10, `${rel} carries no heading to be named by`);
    assert.ok(when(rel).startsWith('Read this'),
      `${rel} states no sentence saying when it is read, so the index can only guess`);
    for (const half of [opening(rel), when(rel)]) {
      assert.ok(half.endsWith('.'),
        `${rel} is described by "${half}", which stops before its sentence does`);
    }
  }
});

test('a blurb is lifted whole, so it closes every span it opens and links to nothing of its own', () => {
  const even = (text: string, mark: string) => (text.split(mark).length - 1) % 2 === 0;
  for (const rel of references()) {
    const text = blurb(rel);
    assert.ok(even(text, '`'), `${rel} is described by an unclosed code span, so the index an agent `
      + `fetches first is markdown that stops parsing where the lift cut it: ${text}`);
    assert.ok(even(text, '**'), `${rel} is described by an emphasis whose partner stayed behind in `
      + `the document, so what reaches the reader is literal asterisks: ${text}`);
    assert.ok(!text.includes(']('), `${rel} carries a link inside its description. Every entry has `
      + 'one link of its own, and a second one is written relative to the document it was lifted '
      + `from: llmsProblems reads absolute targets only, so it resolves in a clone and 404s here: ${text}`);
    assert.ok(!/\[[^\]]*$/.test(text), `${rel} is described by an unclosed link label: ${text}`);
  }
  assert.ok(index().includes(blurb(references()[0] ?? '')), 'the index publishes what this reads');
});

test('a full stop inside a span, a link or an emphasis is punctuation rather than an ending', () => {
  const cut = (text: string, from = 0) => text.slice(0, sentenceEnd(text, from) + 1);
  assert.equal(cut('Read it beside `cold-start.md` and stop.'),
    'Read it beside `cold-start.md` and stop.');
  assert.equal(cut('Read it beside [`a.md`](./a.md) and stop. Then go.'),
    'Read it beside [`a.md`](./a.md) and stop.');
  assert.equal(cut('**Built with bun. None of that binds you**, and so on. More.'),
    '**Built with bun. None of that binds you**, and so on.',
    'the clause that qualifies the claim is inside the emphasis, and cutting early publishes only the claim');
  assert.equal(sentenceEnd('No ending here'), -1);
  assert.equal(cut('First. Second.', 7), 'First. Second.', 'a cut asked for later still ends a sentence');
});

test('what a fragment cannot close it does not publish, and it takes a label over a link', () => {
  assert.equal(balance('routes you to**, because'), 'routes you to, because');
  assert.equal(balance('**both ends** kept'), '**both ends** kept');
  assert.equal(balance('a `*` inside code is not a marker'), 'a `*` inside code is not a marker');
  assert.equal(lift('beside [`cold-start.md`](./cold-start.md) and on'), 'beside `cold-start.md` and on');
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
  assert.equal(categoryOf('frameworks/react/components/forms/INDEX.md'), 'forms');
});
