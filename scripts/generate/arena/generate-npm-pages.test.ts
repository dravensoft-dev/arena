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
  ROLE_CONTRACT, BEHAVIOUR_CONTRACT, toastIntervals, defaultedRoles, defaultedSentence, defaultsStatement, unansweredCount,
} from './generate-npm-pages.ts';
import { tokenCatalogue } from '../../lib/arena/package-assembly.ts';
import { NPM_PAGES } from '../../lib/arena/npm-questions.ts';
import { readJson } from '../../utils/read-file.ts';
import { packageSheetName, sheetFamilies } from '../../lib/tailwind/vocabulary.ts';
import { MAX_WORDS, plain, words } from '../../check/arena/check-register.ts';

const SHARED = ['repository', 'skin', 'defaults', 'sheets', 'toast', 'layout'];

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
  assert.deepEqual(regionsOf('skills/design/references/tokens.md'), ['tokens']);
  assert.deepEqual(regionsOf('skills/design/references/style-kernel.md'), ['defaults']);
  assert.deepEqual(regionsOf('skills/design/references/style.md'), ['layout']);
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
  assert.ok(region.includes('[mcp.md](https:'));
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
  mkdirSync(join(base, 'frameworks/tailwind'), { recursive: true });
  writeFileSync(join(base, 'frameworks/tailwind/Hues.json'), JSON.stringify({ hues: { danger: { ink: 'x', 'on-ink': 'y' } } }));
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

test('the skin region names which roles carry a default, so an empty set reads as empty rather than as a promise', () => {
  const base = mkdtempSync(join(tmpdir(), 'npm-roles-'));
  mkdirSync(join(base, 'contracts/design'), { recursive: true });
  const write = (roles: object) => writeFileSync(join(base, ROLE_CONTRACT), JSON.stringify(roles));
  write({ 'r-surface': { $type: 'dimension' }, 'gap-row': { $type: 'dimension' } });
  assert.deepEqual(defaultedRoles(base), []);
  assert.match(defaultedSentence([], 2), /^No role in this package carries a default, so your root style plugin answers every one of the 2 roles/);
  assert.equal(unansweredCount(base), 2);
  write({ 'r-surface': { $type: 'dimension' }, 'gap-row': { $type: 'dimension', $extensions: { 'com.dravensoft.arena': { default: '{sp.3}' } } } });
  assert.deepEqual(defaultedRoles(base), ['gap-row']);
  assert.match(defaultedSentence(['gap-row'], 1), /The roles carrying a default are `gap-row`, and your root style plugin answers the other 1/);
  assert.equal(unansweredCount(base), 1);
  assert.match(defaultsStatement(base), /^The roles carrying a default are `gap-row`/);
  assert.ok(renderRegion('skin').includes(defaultsStatement()),
    'the region on the page says what roles.json carries');
});

test('the defaults statement leads with the fact and cites the roles the roles-without-default list gives', () => {
  const silent = JSON.parse(readFileSync(join(repoRoot, 'scripts/check/core/roles-without-default.json'), 'utf8')) as string[];
  const carried = new Set(defaultedRoles());
  const withoutDefault = Object.keys(JSON.parse(readFileSync(join(repoRoot, ROLE_CONTRACT), 'utf8')) as object)
    .filter((role) => !carried.has(role)).sort();
  assert.deepEqual(withoutDefault, [...silent].sort(), 'roles.json and the roles-without-default list name the same roles');
  assert.equal(unansweredCount(), withoutDefault.length);
  const statement = defaultsStatement();
  const fact = defaultedSentence(defaultedRoles(), unansweredCount());
  assert.equal(statement.indexOf(fact), 0, 'the statement opens on the sentence naming the roles with a default');
  if (carried.size === 0) assert.ok(fact.startsWith(`No role in this package carries a default, so your root style plugin answers every one of the ${silent.length} roles`));
  const mechanism = statement.indexOf('A minor release may add a role');
  assert.ok(mechanism > 0, 'the mechanism sentence is present');
  assert.ok(statement.indexOf(fact) + fact.length <= mechanism, 'the fact sentence ends before the mechanism sentence begins');
  for (const target of ['skills/design/references/config.md', 'skills/design/references/style-kernel.md'])
    assert.ok(readFileSync(join(repoRoot, target), 'utf8').includes(statement), `${target} carries the statement`);
});

test('the toast region writes the intervals the behaviour contract holds, and no number is typed by hand', () => {
  const base = mkdtempSync(join(tmpdir(), 'npm-toast-'));
  mkdirSync(join(base, 'contracts/design'), { recursive: true });
  writeFileSync(join(base, BEHAVIOUR_CONTRACT), JSON.stringify({
    dismiss: { default: { $value: { value: 111, unit: 'ms' } }, actionable: { $value: { value: 222, unit: 'ms' } } },
  }));
  assert.deepEqual(toastIntervals(base), { standard: '111 ms', actionable: '222 ms' });
  const region = renderRegion('toast', base);
  assert.match(region, /default interval is 111 ms\. The interval for a notice carrying an `actionLabel` is 222 ms/);
  assert.match(region, /`persist`, or with `tone: 'danger'`, has no timer/);
});

test('the tokens region tables every value of its nine groups that no role answers, and no role at all', () => {
  const { tokens } = tokenCatalogue(repoRoot);
  const roles = new Set(Object.keys(readJson(join(repoRoot, ROLE_CONTRACT)) as Record<string, unknown>));
  const region = renderRegion('tokens');
  for (const group of ['sp', 'r', 'bw', 'shadow', 'dur', 'loop', 'ease', 'z', 'bp']) {
    const names = Object.keys(tokens).filter((name) => (name === group || name.startsWith(`${group}-`)) && !roles.has(name));
    assert.ok(names.length > 0, `the catalogue holds the ${group} group`);
    for (const name of names)
      assert.ok(region.includes(`| \`--${name}\` | \`${tokens[name]}\` |`), `--${name} is a row with its value`);
  }
  for (const role of roles) assert.ok(!region.includes(`| \`--${role}\` |`), `--${role} is a role a style plugin answers`);
  assert.ok(roles.has('r-surface') && region.includes('--r-xs'), 'the scale stays and the role goes');
  assert.ok(!region.includes('--fs-'), 'a group outside the nine is not tabled');
});
