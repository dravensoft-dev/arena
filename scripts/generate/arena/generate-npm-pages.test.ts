/* The property that makes this safe to have written at all is that a region is placed by a person
 * and only filled by the script, so these hold both halves: a page with no markers is refused
 * rather than rewritten, and a page with them comes back byte-identical once it is current. The
 * generated text is emitted verbatim, so a page that is current comes back unchanged. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { LAYER_TOKENS, FORBIDDEN } from '../../check/arena/check-layer-independence.ts';
import {
  TARGETS, openLine, closeLine, renderRegion, applyRegion, renderTarget, regionsOf,
} from './generate-npm-pages.ts';
import { NPM_PAGES } from '../../lib/arena/npm-questions.ts';
import { packageSheetName, sheetFamilies } from '../../lib/tailwind/vocabulary.ts';
import { MAX_WORDS, plain, words } from '../../check/arena/check-register.ts';

const SHARED = ['repository', 'skin', 'sheets'];

test('a region shared by several pages names no layer, because it is written into each at once', () => {
  const tokens = Object.entries(LAYER_TOKENS)
    .flatMap(([layer, entries]) => entries.map(([token, re]) => ({ layer, token, re })));
  for (const key of SHARED)
    for (const [index, line] of renderRegion(key).split('\n').entries())
      for (const { layer, token, re } of tokens)
        assert.ok(!re.test(line), `the ${key} region names ${layer} ("${token}") on line ${index + 1}: `
          + `${line.trim()}. A fact true of one package only is that package's own paragraph, `
          + 'hand-written outside the markers, and it states what its own package does.');
});

test('each target carries exactly the regions mapped to it', () => {
  for (const target of TARGETS) {
    const text = readFileSync(join(repoRoot, target), 'utf8');
    const carried = [...text.matchAll(/^<!-- @shared (\S+) GENERATED /gm)].map((match) => match[1]);
    assert.deepEqual(carried.sort(), regionsOf(target).sort(), `${target} carries its mapped regions and no other`);
    for (const key of regionsOf(target))
      assert.ok(text.includes(renderRegion(key, repoRoot, target)), `${target} carries a fresh ${key} region`);
  }
  assert.deepEqual(regionsOf('frameworks/react/PACKAGE.md'), ['repository', 'questions']);
  assert.deepEqual(regionsOf('skills/design/references/config.md'), ['skin']);
  assert.deepEqual(regionsOf('skills/design/references/stylesheets.md'), ['sheets']);
  assert.deepEqual(regionsOf('mcp/NPM.md'), ['questions']);
});

test('the question region differs per page and names no other layer than its own', () => {
  const react = renderRegion('questions', repoRoot, 'frameworks/react/PACKAGE.md');
  const angular = renderRegion('questions', repoRoot, 'frameworks/angular/PACKAGE.md');
  assert.notEqual(react, angular);
  for (const [text, layer] of [[react, 'react'], [angular, 'angular']] as const) {
    const foreign = Object.entries(LAYER_TOKENS).filter(([name]) => (FORBIDDEN[layer] ?? []).includes(name));
    for (const [index, line] of text.split('\n').entries())
      for (const [name, entries] of foreign)
        for (const [token, re] of entries)
          assert.ok(!re.test(line), `the ${layer} questions name ${name} ("${token}") on line ${index + 1}: ${line}`);
  }
});

test('a question row links the tag of the release and the anchor GitHub gives its heading', () => {
  const version = JSON.parse(readFileSync(join(repoRoot, '.claude-plugin/plugin.json'), 'utf8')).version;
  const region = renderRegion('questions', repoRoot, 'mcp/NPM.md');
  assert.ok(region.includes('| Question | Answer |'));
  assert.ok(region.includes(`(https://github.com/dravensoft-dev/arena/blob/v${version}/skills/design/references/mcp.md#how-do-i-install-the-server)`));
  assert.ok(region.includes('[mcp.md: How do I install the server?]'));
});

test('a question table cell stays under 2000 characters', () => {
  for (const page of NPM_PAGES)
    for (const line of renderRegion('questions', repoRoot, page).split('\n'))
      for (const cell of line.split(' | ')) assert.ok(cell.length < 2000, `a cell of ${cell.length} characters`);
});

test('a page that is current comes back byte-identical, so an emit is never a rewrite', () => {
  for (const target of TARGETS) {
    const source = readFileSync(join(repoRoot, target), 'utf8');
    assert.equal(renderTarget(source, target), source, `${target} matches a fresh emit`);
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

test('the sheets region names the vocabulary sheets and the spacing sheet, and no hand-written rhythm sheet', () => {
  const region = renderRegion('sheets');
  assert.ok(region.includes('css/vocabulary/stack.css'));
  assert.ok(region.includes('css/spacing.css'));
  assert.ok(!region.includes('css/rhythm.css'));
});

const sheetNamesIn = (region: string) => {
  const cell = region.split('\n').find((line) => line.startsWith('| `css/vocabulary/`')) ?? '';
  return [...cell.matchAll(/`(css\/vocabulary\/[^`]+\.css)`/g)].map((match) => match[1]);
};

test('the sheets region names each vocabulary sheet once, as sheetFamilies and packageSheetName give them', () => {
  const named = sheetNamesIn(renderRegion('sheets'));
  const expected = sheetFamilies().map((family) => family.family).sort().map(packageSheetName);
  assert.ok(expected.length > 0, 'the source has sheet families');
  assert.deepEqual(named, expected);
});

test('the sheets region splits a long list into sentences within the register word limit', () => {
  const base = mkdtempSync(join(tmpdir(), 'npm-sheets-'));
  for (let at = 0; at < 45; at++) {
    const dir = `f${String(at).padStart(2, '0')}`;
    mkdirSync(join(base, 'frameworks/tailwind/vocabulary', dir), { recursive: true });
    writeFileSync(join(base, 'frameworks/tailwind/vocabulary', dir, `${dir}.family.json`),
      JSON.stringify({ family: dir, reach: 'box', description: 'd', variants: { [`arena-${dir}`]: '[display:flex]' } }));
  }
  const region = renderRegion('sheets', base);
  const named = sheetNamesIn(region);
  assert.equal(named.length, 45);
  assert.deepEqual(named, sheetFamilies(base).map((family) => family.family).sort().map(packageSheetName));
  const cell = region.split('\n').find((line) => line.startsWith('| `css/vocabulary/`')) ?? '';
  const sentences = plain(cell.split('|')[2] ?? '').split(/(?<=\.)\s+/);
  assert.ok(sentences.length >= 3, 'more than two chunks');
  for (const sentence of sentences)
    assert.ok(words(sentence).length <= MAX_WORDS, `a sentence of ${words(sentence).length} words: ${sentence.slice(0, 60)}`);
});
