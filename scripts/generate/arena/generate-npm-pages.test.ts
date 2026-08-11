/* The property that makes this safe to have written at all is that a region is placed by a person
 * and only filled by the script, so these hold both halves: a page with no markers is refused
 * rather than rewritten, and a page with them comes back byte-identical once it is current. The
 * voice region is the one that is not verbatim, so its two derived parts, the catalogue and the
 * count in its opening sentence, are asserted against the contracts. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { voiceTable, voices } from './generate-voices.ts';
import {
  TARGETS, REGIONS, openLine, closeLine, shipped, renderRegion, applyRegion, renderTarget,
} from './generate-npm-pages.ts';

test('both npm pages carry every shared region, and each is byte-identical between them', () => {
  const [react, angular] = TARGETS.map((t) => readFileSync(join(repoRoot, t), 'utf8'));
  for (const key of Object.keys(REGIONS)) {
    const region = renderRegion(key);
    assert.ok(react?.includes(region), `the React page carries the ${key} region`);
    assert.ok(angular?.includes(region), `the Angular page carries the ${key} region`);
  }
});

test('a page that is current comes back byte-identical, so an emit is never a rewrite', () => {
  for (const target of TARGETS) {
    const source = readFileSync(join(repoRoot, target), 'utf8');
    assert.equal(renderTarget(source), source, `${target} matches a fresh emit`);
  }
});

test('a page with no markers is refused, because a person decides where a section sits', () => {
  assert.throws(() => applyRegion('# a page\n\nwith no markers', 'skin', 'x'),
    /no @shared skin region to write into/);
  assert.throws(() => applyRegion(`${openLine('skin')}\nunclosed`, 'skin', 'x'),
    /opens and never closes/);
  assert.throws(() => renderRegion('nothing-called-this'), /no region called/);
});

test('a region replaces what is between its markers and leaves the page around it alone', () => {
  const page = ['# top', '', openLine('skin'), 'old', closeLine('skin'), '', '## tail'].join('\n');
  const after = applyRegion(page, 'skin', [openLine('skin'), 'new', closeLine('skin')].join('\n'));
  assert.match(after, /# top/);
  assert.match(after, /## tail/);
  assert.match(after, /new/);
  assert.doesNotMatch(after, /old/);
});

test('the voice region carries the catalogue and says how many ship, both from the contracts', () => {
  const region = renderRegion('voices');
  for (const row of voiceTable()) assert.ok(region.includes(row), 'every catalogue row is emitted');
  const { extensions, capitalized } = shipped();
  assert.equal(extensions, voices().length - 1, 'the base voice is not an extension');
  assert.ok(region.includes(`${capitalized} ship today`),
    'the count is a word derived from the catalogue rather than a number somebody typed');
});
