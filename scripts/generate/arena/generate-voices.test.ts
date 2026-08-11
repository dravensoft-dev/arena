/* The catalogue is what a reader picks a voice from before they write anything, so these hold the
 * two halves that could go wrong quietly: a shipped voice missing from the table, and a table
 * written into a document that has no region to receive it. The base voice is asserted by name
 * because it is the one row with no contract behind it. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { extensionFiles, extensionName, RESERVED_NAME } from '../../check/core/check-extensions.ts';
import {
  BASE_VOICE, VOICES_TARGET, CLOSE_LINE, OPEN_LINE,
  voices, classOf, renderRegion, applyRegion, saysOf,
} from './generate-voices.ts';

test('the base voice is the one row with no contract, and it carries the reason it has none', () => {
  assert.equal(BASE_VOICE.name, RESERVED_NAME);
  assert.ok(BASE_VOICE.job.length > 20, 'it names the work it is for, like every other row');
  assert.ok(BASE_VOICE.why.length > 40, 'it says why no contract file declares it');
  assert.ok(saysOf(BASE_VOICE.grouping).length > 20, 'its grouping principle is one Arena knows');
});

test('the catalogue is the base voice and then every extension the contracts ship', () => {
  const shipped = extensionFiles(join(repoRoot, 'contracts', 'design')).map(extensionName);
  assert.deepEqual(voices().map((v) => v.name), [RESERVED_NAME, ...shipped]);
  for (const voice of voices()) {
    assert.ok(voice.job.length > 20, `${voice.name} names the work it is for`);
    assert.ok(voice.says.length > 20, `${voice.name} names what groups things under it`);
  }
});

test('a voice is offered as the class a reader writes, and the default as the default', () => {
  assert.equal(classOf({ name: 'none', job: '', grouping: '', says: '' }), 'none, the default');
  assert.equal(classOf({ name: 'showcase', job: '', grouping: '', says: '' }), '`.arena-showcase`');
});

test('the region opens with its own marker, closes with it, and carries a row per voice', () => {
  const region = renderRegion();
  const lines = region.split('\n');
  assert.ok(OPEN_LINE.test(lines[0] ?? ''));
  assert.equal(lines.at(-1), CLOSE_LINE);
  assert.equal(lines.filter((l) => l.startsWith('| ') && !l.startsWith('| Voice')).length, voices().length);
});

test('applying a region replaces the one that is there and never appends a second', () => {
  const before = ['# doc', '', '<!-- @voices GENERATED from x -->', 'old', CLOSE_LINE, '', 'tail'].join('\n');
  const after = applyRegion(before, '<!-- @voices GENERATED from y -->\nnew\n<!-- @voices end -->');
  assert.match(after, /new/);
  assert.doesNotMatch(after, /old/);
  assert.match(after, /tail/);
  assert.equal(after.split(CLOSE_LINE).length - 1, 1);
});

test('a document with no region is refused, because a person chooses where the catalogue sits', () => {
  assert.throws(() => applyRegion('# doc\n\nno region here', 'x'), /carries no @voices region/);
});

test('the router carries the region, so the first decision on the route is a held one', () => {
  const source = readFileSync(join(repoRoot, VOICES_TARGET), 'utf8');
  assert.ok(source.includes(CLOSE_LINE));
  assert.ok(source.includes(renderRegion()), 'the committed region matches a fresh emit');
});
