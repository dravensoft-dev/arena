/* The property that makes this safe to have written at all is that a region is placed by a person
 * and only filled by the script, so these hold both halves: a page with no markers is refused
 * rather than rewritten, and a page with them comes back byte-identical once it is current. The
 * every region is verbatim, so a page that is current comes back unchanged. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { LAYER_TOKENS } from '../../check/arena/check-layer-independence.ts';
import {
  TARGETS, REGIONS, openLine, closeLine, renderRegion, applyRegion, renderTarget,
} from './generate-npm-pages.ts';

test('a shared region names no layer, because it is written into every layer at once', () => {
  const tokens = Object.entries(LAYER_TOKENS)
    .flatMap(([layer, entries]) => entries.map(([token, re]) => ({ layer, token, re })));
  for (const key of Object.keys(REGIONS))
    for (const [index, line] of renderRegion(key).split('\n').entries())
      for (const { layer, token, re } of tokens)
        assert.ok(!re.test(line), `the ${key} region names ${layer} ("${token}") on line ${index + 1}: `
          + `${line.trim()}. A fact true of one package only is that package's own paragraph, `
          + 'hand-written outside the markers, and it states what its own package does.');
});

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

test('the vocabulary region names arena-fill and stays under 900 characters', () => {
  const region = renderRegion('vocabulary');
  assert.ok(region.includes('arena-fill'), 'vocabulary region names arena-fill');
  const lines = region.split('\n');
  const regionContent = lines.slice(2, -1).join('\n');
  assert.ok(regionContent.length < 900, `vocabulary region is ${regionContent.length} characters, under 900`);
});


test('the vocabulary region ends on its text, names each class with its dot, and has no dangling conjunction', () => {
  const region = renderRegion('vocabulary');
  assert.ok(!/\n\n\n/.test(region), 'no double blank line');
  assert.ok(!region.includes(', and\n'), 'no dangling ", and"');
  assert.ok(region.includes('`.arena-fill`'), 'class names carry the dot check:classes reads');
});

test('the vocabulary region puts a markup class in the markup sentence and never in the component one', () => {
  const base = mkdtempSync(join(tmpdir(), 'npm-vocabulary-'));
  const family = (dir: string, body: object) => {
    mkdirSync(join(base, 'frameworks/tailwind/vocabulary', dir), { recursive: true });
    writeFileSync(join(base, 'frameworks/tailwind/vocabulary', dir, `${dir}.family.json`), JSON.stringify(body));
  };
  family('fill', { family: 'fill', reach: 'box', description: 'd', default: 'arena-fit',
    variants: { 'arena-fill': '[--arena-fill-width:100%]', 'arena-fit': '[--arena-fill-width:fit-content]' } });
  family('stack', { family: 'stack', reach: 'box', target: 'markup', description: 'd', variants: { 'arena-stack': '[display:flex]' } });
  const region = renderRegion('vocabulary', base);
  assert.ok(region.includes('`.arena-fill`') && region.includes('`.arena-stack`'));
  const sentences = region.split(/(?<=\.)\s/);
  assert.ok(sentences.some((one) => one.includes('.arena-stack') && one.includes('markup you write')));
  assert.ok(!sentences.some((one) => one.includes('.arena-stack') && one.includes('this version ships')));
});
