/* A region is placed by a person and only filled by the script, so these hold that half: a page
 * with no markers is refused rather than rewritten, a region replaces only what sits between its
 * markers, and each target carries exactly the regions mapped to it. That a committed page is
 * current is held by check:skills. */

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { LAYER_TOKENS, FORBIDDEN } from '../../check/arena/check-layer-independence.ts';
import {
  TARGETS, atDefault, noImportSheets, openLine, closeLine, renderRegion, applyRegion, regionsOf,
  ROLE_CONTRACT, BEHAVIOUR_CONTRACT, densityValues, requiredLead, toastIntervals, defaultedRoles, defaultedSentence, defaultsStatement, roleRuns, unansweredCount,
  SLOT_PAGE, EXAMPLE_SLOT_ANSWERS, brandReaders, quietAnswers, slotGroupPage, slotGroupPages, SLOT_GROUP_DIR, GROUP_PAGES, splitFamilyNames, splitFamilySentence,
} from './generate-npm-pages.ts';
import { readColorSlots, readSlotDeclarations } from '../../lib/core/color-slots.ts';
import { slotAnswer } from '../core/arena-cli/slots.ts';
import { slotReports } from '../core/arena-cli/slot-contrast.ts';
import { levelDefaults } from '../core/arena-cli/levels.ts';
import { rolesFor } from '../core/arena-cli/theme-css.ts';
import { tableCells, MAX_CELL_CHARS, CONTRIBUTOR_PATHS, BANNED_PUNCTUATION } from '../../check/arena/check-docs.ts';
import { tokenCatalogue, CSS_CHAIN, ANGULAR_EXTRA } from '../../lib/arena/package-assembly.ts';
import type { CssChainEntry } from '../../lib/arena/package-assembly.ts';
import { NPM_PAGES } from '../../lib/arena/npm-questions.ts';
import { readJson } from '../../utils/read-file.ts';
import { resolvePosix } from '../../lib/arena/agent-payload.ts';
import { packageSheetName, sheetFamilies } from '../../lib/tailwind/vocabulary.ts';
import { MAX_WORDS, plain, words } from '../../check/arena/check-register.ts';
import { RULE_TAGS, RULE_DESCRIPTIONS } from '../core/arena-cli/audit.ts';
import { run } from '../core/arena-cli/command-init.ts';
import { ARENA_FONT_DEFAULTS, ARENA_FONT_KEYS } from '../core/arena-cli/theme-css.ts';
import { FONT_ROLES } from '../core/arena-cli/palette-keys.ts';
import { captureIo, hostRoot, removeFixtures, whileHeld } from '../core/arena-cli/cli-fixtures.ts';
import { RULES } from '../../lib/arena/language-rules.ts';

after(removeFixtures);

const made: string[] = [];
const track = (dir: string) => { made.push(dir); return dir; };
after(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

const SHARED = ['repository', 'skin', 'sheets', 'toast', 'layout', 'queues'];

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
  }
  assert.deepEqual(regionsOf('frameworks/react/PACKAGE.md'), ['repository', 'questions']);
  assert.deepEqual(regionsOf('skills/design/references/config.md'), ['splitFamilies', 'skin']);
  assert.deepEqual(regionsOf('skills/design/references/stylesheets.md'), ['sheets']);
  const scales = 'skills/design/references/tokens/scales';
  assert.deepEqual(regionsOf(`${scales}/spacing-radius-border.md`), ['spacing']);
  assert.deepEqual(regionsOf(`${scales}/motion-and-layers.md`), ['motion']);
  assert.deepEqual(regionsOf(`${scales}/density.md`), ['density']);
  assert.deepEqual(regionsOf(`${scales}/type-scale.md`), ['typography']);
  assert.deepEqual(regionsOf('skills/design/references/style-kernel.md'), []);
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

test('the sheets region lists the token layer in CSS_CHAIN order and names where the style plugin\'s sheet sits', () => {
  const region = renderRegion('sheets');
  const opener = region.indexOf('The token layer is');
  assert.ok(opener >= 0, 'the sheets region no longer opens a sentence with "The token layer is"');
  const paragraph = region.slice(opener);
  const at = CSS_CHAIN.map(({ to }) => paragraph.indexOf(`\`${to}\``));
  assert.ok(at.every((place) => place >= 0), `a CSS_CHAIN entry is missing from the token layer sentence: ${at}`);
  assert.deepEqual([...at].sort((a, b) => a - b), at, 'the token layer sentence is not in CSS_CHAIN order');
  assert.match(paragraph, /the root plugin's place/);
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
  const base = track(mkdtempSync(join(tmpdir(), 'npm-sheets-')));
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
  const base = track(mkdtempSync(join(tmpdir(), 'npm-roles-')));
  mkdirSync(join(base, 'contracts/design'), { recursive: true });
  const write = (roles: object) => writeFileSync(join(base, ROLE_CONTRACT), JSON.stringify(roles));
  write({ 'r-surface': { $type: 'dimension' }, 'gap-row': { $type: 'dimension' } });
  assert.deepEqual(defaultedRoles(base), []);
  assert.match(defaultedSentence([], 2), /^No role in this package carries a default, so your root style plugin answers every one of the 2 roles/);
  assert.equal(unansweredCount(base), 2);
  write({ 'r-surface': { $type: 'dimension' }, 'gap-row': { $type: 'dimension', $extensions: { 'com.dravensoft.arena': { default: '{sp.3}' } } } });
  assert.deepEqual(defaultedRoles(base), ['gap-row']);
  assert.match(defaultedSentence(['gap-row'], 1), /^The 1 roles carrying a default are `gap-row`\. Your root plugin answers the other 1\.$/);
  assert.equal(unansweredCount(base), 1);
  assert.match(defaultsStatement(base), /^The 1 roles carrying a default are `gap-row`\. Your root plugin answers the other \d+\./);
  assert.ok(renderRegion('skin').includes(defaultsStatement()),
    'the region on the page says what roles.json carries');
});

test('a long list of roles carrying a default is named in sentences the register reads', () => {
  const roles = Array.from({ length: 29 }, (_, i) => `role-${String.fromCharCode(97 + (i % 26))}${i > 25 ? 'x' : ''}`);
  const sentence = defaultedSentence(roles, 239);
  for (const one of plain(sentence).split(/(?<=\.)\s+/))
    assert.ok(words(one).length <= MAX_WORDS, `a sentence of ${words(one).length} words: ${one.slice(0, 60)}`);
  assert.match(sentence, /^The 29 roles carrying a default include `role-a`/);
  assert.match(sentence, /Roles carrying a default also include `role-u`.* Your root plugin answers the other 239\.$/);
  for (const role of roles) assert.ok(sentence.includes(`\`${role}\``), role);
});

test('the skin region\'s key table names every ArenaFont field with its default', () => {
  const rows = renderRegion('skin').split('\n').filter((line) => line.startsWith('| `'));
  const row = (key: string) => rows.find((line) => line.startsWith(`| \`${key}\` |`)) ?? '';
  for (const key of ARENA_FONT_KEYS) assert.ok(row(`fonts.<role>.${key}`), `a row for ${key}`);
  for (const key of ['style', 'weight', 'display'] as const) {
    assert.ok(row(`fonts.<role>.${key}`).includes(`\`${ARENA_FONT_DEFAULTS[key]}\``), key);
  }
  for (const [role, list] of Object.entries(FONT_ROLES)) {
    assert.ok(row('fonts.<role>.fallback').includes(`${role} \`${list.join(', ')}\``), role);
  }
  assert.match(row('stylesheet.preflight'), /\| `true` \|$/);
});

test('the skin region says what a stylePlugins path resolves against and links the catalogue configs', () => {
  const region = renderRegion('skin');
  assert.ok(region.includes('A `stylePlugins` path resolves against the directory that holds `arena.config.json`.'));
  assert.ok(region.includes('plugin-style-store/catalogue/*/arena.config.json'));
});

test('a numbered run of three or more roles is written as its two ends, and a shorter run is spelt out', () => {
  assert.deepEqual(roleRuns(['ff-key', 'heat-step-1', 'heat-step-2', 'heat-step-3', 'ink-link']),
    ['`ff-key`', '`heat-step-1` to `heat-step-3`', '`ink-link`']);
  assert.deepEqual(roleRuns(['pad-1', 'pad-2', 'pad-4']), ['`pad-1`', '`pad-2`', '`pad-4`']);
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
  assert.ok(readFileSync(join(repoRoot, 'skills/design/references/config.md'), 'utf8').includes(statement), 'config.md carries the statement');
});

test('the toast region writes the intervals the behaviour contract holds, and no number is typed by hand', () => {
  const base = track(mkdtempSync(join(tmpdir(), 'npm-toast-')));
  mkdirSync(join(base, 'contracts/design'), { recursive: true });
  writeFileSync(join(base, BEHAVIOUR_CONTRACT), JSON.stringify({
    dismiss: { default: { $value: { value: 111, unit: 'ms' } }, actionable: { $value: { value: 222, unit: 'ms' } } },
  }));
  assert.deepEqual(toastIntervals(base), { standard: '111 ms', actionable: '222 ms' });
  const region = renderRegion('toast', base);
  assert.match(region, /default interval is 111 ms\. The interval for a notice carrying an `actionLabel` is 222 ms/);
  assert.match(region, /`persist`, or with `tone: 'danger'`, has no timer/);
});

test('the queues region tables each field of a notice and of a confirmation request, in contract order', () => {
  const exportsPage = 'skills/design/references/exports.md';
  assert.ok(regionsOf(exportsPage).includes('queues'), 'the exports page carries the queues region');
  const region = renderRegion('queues', repoRoot, exportsPage);
  const [noticeHalf = '', requestHalf = ''] = region.split('**`ask(request)` takes an `ArenaConfirmRequest`.**');
  assert.ok(noticeHalf?.includes('**`raise(notice)` takes an `ArenaToastNotice`.**') && requestHalf !== '', 'each table is led by the method that takes it');
  for (const [half, file] of [[noticeHalf, 'arena-toast-notice'], [requestHalf, 'arena-confirm-request']] as const) {
    const fields = Object.entries((readJson(join(repoRoot, `contracts/api/types/${file}.json`)) as {
      fields: Record<string, { required?: boolean; default?: unknown }>;
    }).fields);
    assert.ok(fields.length > 0, `${file} declares fields`);
    const own = half.split('\n').filter((line) => line.startsWith('| `'));
    assert.deepEqual(own.map((line) => line.split(' | ')[0]), fields.map(([name]) => `| \`${name}\``), `${file} rows follow contract order`);
    fields.forEach(([, field], at) => {
      const cells = own[at]!.split(' | ');
      assert.equal(cells[2], field.required ? 'yes' : 'no');
      if (field.default === undefined) assert.equal(cells[3], 'none');
      else assert.equal(cells[3], `\`${String(field.default)}\``);
    });
    assert.equal(own.filter((line) => / \| yes \| /.test(line)).length, fields.filter(([, field]) => field.required).length, `${file} marks exactly its required fields`);
  }
  assert.match(region, /\| `title` \| `string` \| yes \|/);
  assert.match(noticeHalf, /ArenaToastNotice`\.\*\* Every field is optional\./);
  assert.match(requestHalf, /^ Only `title` is required\./);
});

test('the lead of a queues table is read off the required flags of its contract', () => {
  const base = track(mkdtempSync(join(tmpdir(), 'arena-lead-')));
  try {
    const write = (fields: Record<string, { required?: boolean }>) => {
      mkdirSync(join(base, 'contracts/api/types'), { recursive: true });
      writeFileSync(join(base, 'contracts/api/types/t.json'), JSON.stringify({ fields }));
    };
    const file = 'contracts/api/types/t.json';
    write({ a: {}, b: {} });
    assert.equal(requiredLead(base, file), 'Every field is optional.');
    write({ a: { required: true }, b: {} });
    assert.equal(requiredLead(base, file), 'Only `a` is required.');
    write({ a: { required: true }, b: { required: true }, c: {} });
    assert.equal(requiredLead(base, file), '`a` and `b` are required.');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('a density value of a shape the table cannot show is refused, naming the file and the key', () => {
  const base = track(mkdtempSync(join(tmpdir(), 'arena-density-')));
  try {
    const file = 'contracts/design/density.compact.json';
    mkdirSync(join(base, 'contracts/design'), { recursive: true });
    writeFileSync(join(base, file), JSON.stringify({ dz: {
      a: { $value: { value: 2, unit: 'px' } }, b: { $value: 3 }, c: { $value: '{dz.a}' }, d: { $value: { amount: 2 } },
    } }));
    const read = densityValues(base, file);
    assert.deepEqual(['a', 'b', 'c', 'zz'].map(read), ['2px', '3', '{dz.a}', undefined]);
    assert.throws(() => read('d'), /density\.compact\.json dz\.d has a \$value that is neither/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

const joined = () => `${renderRegion('spacing')}\n${renderRegion('motion')}`;

test('the scale regions table every value of its nine groups that no role answers, and no role at all', () => {
  const { tokens } = tokenCatalogue(repoRoot);
  const roles = new Set(Object.keys(readJson(join(repoRoot, ROLE_CONTRACT)) as Record<string, unknown>));
  const region = joined();
  for (const group of ['sp', 'r', 'bw', 'shadow', 'dur', 'loop', 'ease', 'z', 'bp']) {
    const names = Object.keys(tokens).filter((name) => (name === group || name.startsWith(`${group}-`)) && !roles.has(name));
    assert.ok(names.length > 0, `the catalogue holds the ${group} group`);
    for (const name of names)
      assert.ok(region.includes(`| \`--${name}\` | ${atDefault(String(tokens[name]))} |`), `--${name} is a row with its value`);
  }
  for (const role of roles) assert.ok(!region.includes(`| \`--${role}\` |`), `--${role} is a role a style plugin answers`);
  assert.ok(roles.has('r-surface') && region.includes('--r-xs'), 'the scale stays and the role goes');
  assert.ok(!region.includes('--fs-'), 'a group outside the nine is not tabled');
});

test('the tokens table carries a Tailwind column read from Theme.css', () => {
  const rows = joined().split('\n').filter((line) => line.startsWith('| `--'));
  const rowOf = (name: string) => rows.find((row) => row.startsWith(`| \`--${name}\` |`))!.split('|').map((cell) => cell.trim());
  assert.equal(rowOf('r-lg')[3], '`rounded-lg`');
  assert.equal(rowOf('shadow-1')[3], '`shadow-1`');
  assert.equal(rowOf('sp-4')[3], '`*-4`');
  assert.equal(rowOf('sp-0')[3], '`*-0`');
  assert.equal(rowOf('sp-0-5')[3], '`*-0.5`');
  assert.equal(rowOf('z-modal')[3], '`z-modal`');
  assert.equal(rowOf('bp-md')[3], '`md:`');
  assert.equal(rowOf('loop-spin')[3], 'none');
  assert.match(renderRegion('spacing'), /\| custom property \| value \| Tailwind \|/);
});

test('the density table says what each property sizes, from its $description', () => {
  const rows = renderRegion('density').split('\n').filter((line) => line.startsWith('| `--dz-'));
  const cells = (name: string) => rows.find((row) => row.startsWith(`| \`--${name}\` |`))!.split('|').map((cell) => cell.trim());
  assert.match(cells('dz-row-py')[6]!, /table\/list row vertical padding/);
  assert.ok(rows.length > 0 && rows.every((row) => row.split('|')[6]!.trim() !== ''), 'no row is empty');
});

test('the locale table names the member that outranks a field', () => {
  const rows = renderRegion('locale').split('\n').filter((line) => /^\| `[a-z][A-Za-z]+` \|/.test(line));
  const cells = (name: string) => rows.find((row) => row.startsWith(`| \`${name}\` |`))!.split('|').map((cell) => cell.trim());
  assert.equal(cells('bulkActionBarNoun')[4], '`ArenaBulkActionBar.noun`');
  assert.equal(cells('calendarToday')[4], 'none');
});

const unreadButRead = (rows: string[], theme: string) => rows.map((row) => row.split('|').map((cell) => cell.trim()))
  .filter((cells) => cells[5] === 'none' && theme.includes(`var(${cells[1]!.replace(/`/g, '')})`)).map((cells) => cells[1]!);

test('the density region tables every --dz property once, with the value each class gives it and the utility that reads it', () => {
  const { tokens } = tokenCatalogue(repoRoot);
  const compact = (readJson(join(repoRoot, 'contracts/design/density.compact.json')) as { dz: Record<string, { $value: { value: number; unit: string } }> }).dz;
  const rows = renderRegion('density').split('\n').filter((line) => line.startsWith('| `--dz-'));
  const names = Object.keys(tokens).filter((name) => name.startsWith('dz-'));
  assert.ok(names.length > 0, 'the catalogue holds the dz group');
  assert.deepEqual(rows.map((row) => row.split('|')[1]!.trim()), names.map((name) => `\`--${name}\``));
  const rowOf = (name: string) => rows.find((row) => row.startsWith(`| \`--${name}\` |`))!.split('|').map((cell) => cell.trim());
  const ctl = rowOf('dz-ctl-h');
  assert.equal(ctl[3], atDefault(`${compact['ctl-h']!.$value.value}${compact['ctl-h']!.$value.unit}`));
  assert.equal(ctl[5], '`*-ctl-h`');
  assert.equal(rowOf('dz-text-lg')[4], 'base');
  assert.equal(rowOf('dz-row-scale-x')[5], '`*-row-x`, `*-nav-row-x`, `*-row-floating-x`');
  const theme = readFileSync(join(repoRoot, 'frameworks/tailwind/Theme.css'), 'utf8');
  assert.deepEqual(unreadButRead(rows, theme), []);
  const planted = '| `--dz-planted` | `1px` | base | base | none |';
  assert.deepEqual(unreadButRead([...rows, planted], `${theme}\n  --spacing-planted: var(--dz-planted);`), ['`--dz-planted`']);
  assert.match(renderRegion('density'), /`\*-` stands for any spacing utility, such as `h-` or `py-`\./);
});

test('the typography region tables every font, weight, size, leading and tracking token no role answers', () => {
  const { tokens } = tokenCatalogue(repoRoot);
  const roles = new Set(Object.keys(readJson(join(repoRoot, ROLE_CONTRACT)) as Record<string, unknown>));
  const region = renderRegion('typography');
  const rows = region.split('\n').filter((line) => line.startsWith('| `--'));
  const names = ['font', 'fw', 'fs', 'lh', 'ls'].flatMap((group) => Object.keys(tokens)
    .filter((name) => !roles.has(name) && (name === group || name.startsWith(`${group}-`))));
  assert.ok(names.length > 0, 'the catalogue holds the type groups');
  assert.deepEqual(rows.map((row) => row.split('|')[1]!.trim()), names.map((name) => `\`--${name}\``));
  const rowOf = (name: string) => rows.find((row) => row.startsWith(`| \`--${name}\` |`))!.split('|').map((cell) => cell.trim());
  assert.equal(rowOf('fw-bold')[3], '`font-bold`');
  assert.equal(rowOf('lh-root')[3], 'none');
});

const CLI_PAGE = 'skills/design/references/cli.md';

test('the audit region has one row per tag in RULE_TAGS order, with the rules that tag holds and what fires it', () => {
  assert.ok(regionsOf(CLI_PAGE).includes('audit'), 'the command reference carries the audit region');
  const rows = renderRegion('audit', repoRoot, CLI_PAGE).split('\n').filter((line) => /^\| `/.test(line));
  assert.deepEqual(rows.map((row) => row.split(' | ')[0]), RULE_TAGS.map((tag) => `| \`${tag}\``));
  RULE_TAGS.forEach((tag, at) => {
    const cells = rows[at]!.split(' | ');
    const held = RULES.filter((rule) => rule.held === tag || rule.alsoHeld?.includes(tag)).map((rule) => rule.short);
    assert.equal(cells[1], held.length ? held.join(' ') : 'none of the language rules', tag);
    assert.equal(cells[2], `${RULE_DESCRIPTIONS[tag]} |`, tag);
  });
  assert.ok(rows[RULE_TAGS.indexOf('raw-glyph')]!.includes('a raw ph-* element paints nothing'), 'raw-glyph names the rule it enforces');
  assert.ok(rows[RULE_TAGS.indexOf('raw-value')]!.includes('Tokens are the only styling layer.'));
});

test('each fenced arena:audit script is what arena init writes for that layer', () => {
  for (const [key, name] of [['scriptsReact', '@dravensoft/arena-react'], ['scriptsAngular', '@dravensoft/arena-angular']] as const) {
    assert.ok(regionsOf(CLI_PAGE).includes(key), `${CLI_PAGE} carries ${key}`);
    const cwd = track(mkdtempSync(join(tmpdir(), 'arena-cli-fence-')));
    try {
      writeFileSync(join(cwd, 'package.json'), '{}\n');
      const { io } = captureIo(cwd, { arena: hostRoot(name, '1.0.0', { 'arena.config.example.json': '{}\n' }) });
      assert.equal(run([], io), 0);
      const written = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8')).scripts;
      const fence = renderRegion(key, repoRoot, CLI_PAGE);
      const body = fence.slice(fence.indexOf('```json') + 7, fence.lastIndexOf('```'));
      assert.deepEqual(JSON.parse(body).scripts, written, key);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  }
});

test('the noImport region lists what each package arena.css imports less the default plugin sheet, in order, and leaves the generated sheet to a file of its own', () => {
  assert.ok(regionsOf(CLI_PAGE).includes('noImport'), `${CLI_PAGE} carries noImport`);
  for (const [layer, extra] of [['react', []], ['angular', ANGULAR_EXTRA]] as [string, CssChainEntry[]][]) {
    const name = `@dravensoft/arena-${layer}`;
    const lines = noImportSheets(name, repoRoot, extra);
    assert.ok(!lines.some((line) => line.includes('style-plugin-default.css')));
    const names = lines.map((line) => line.slice(`@import '${name}/`.length, -2));
    const chain = CSS_CHAIN.map(({ to }) => to).filter((to) => to !== 'css/style-plugin-default.css');
    assert.deepEqual(names.slice(0, chain.length), chain);
    assert.deepEqual(names.slice(chain.length), ['css/base.css', 'css/prelude.css', 'css/components/<component>.css', 'css/vocabulary/<family>.css', ...extra.map(({ to }) => to)]);
  }
  const region = renderRegion('noImport', repoRoot, CLI_PAGE);
  assert.ok(!region.includes("@import './arena.generated.css'"));
  assert.match(region, /`arena\.generated\.css` goes in a stylesheet of its own, imported after the list/);
  assert.match(region, /The `"default"` root adds `css\/style-plugin-default\.css` in its place/);
  assert.doesNotMatch(region, /every component sheet when the config names none/);
});

const JOINED_TOKEN_ROWS = [
  '| `--sp-0` | `0px` | `*-0` |',
  '| `--sp-1` | `4px` | `*-1` |',
  '| `--sp-2` | `8px` | `*-2` |',
  '| `--sp-3` | `12px` | `*-3` |',
  '| `--sp-4` | `16px` | `*-4` |',
  '| `--sp-5` | `20px` | `*-5` |',
  '| `--sp-6` | `24px` | `*-6` |',
  '| `--sp-8` | `32px` | `*-8` |',
  '| `--sp-10` | `40px` | `*-10` |',
  '| `--sp-12` | `48px` | `*-12` |',
  '| `--sp-16` | `64px` | `*-16` |',
  '| `--sp-20` | `80px` | `*-20` |',
  '| `--sp-24` | `96px` | `*-24` |',
  '| `--sp-0-5` | `2px` | `*-0.5` |',
  '| `--rhythm-group` | `12px` | `gap-group` |',
  '| `--rhythm-component` | `16px` | `gap-component` |',
  '| `--rhythm-section` | `24px` | `gap-section` |',
  '| `--r-xs` | `4px` | `rounded-xs` |',
  '| `--r-sm` | `6px` | `rounded-sm` |',
  '| `--r-md` | `10px` | `rounded-md` |',
  '| `--r-lg` | `14px` | `rounded-lg` |',
  '| `--r-xl` | `22px` | `rounded-xl` |',
  '| `--r-2xl` | `34px` | `rounded-2xl` |',
  '| `--r-pill` | `999px` | `rounded-pill` |',
  '| `--bw` | `1px` | none |',
  '| `--bw-strong` | `2px` | none |',
  '| `--shadow-1` | `0px 2px 6px -2px rgba(0,0,0,.5)` | `shadow-1` |',
  '| `--shadow-2` | `0px 12px 28px -12px rgba(0,0,0,.6)` | `shadow-2` |',
  '| `--shadow-3` | `0px 30px 60px -20px rgba(0,0,0,.7)` | `shadow-3` |',
  '| `--dur-fast` | `120ms` | none |',
  '| `--dur-mid` | `220ms` | none |',
  '| `--dur-slow` | `420ms` | none |',
  '| `--loop-spin` | `700ms` | none |',
  '| `--loop-sweep` | `1150ms` | none |',
  '| `--loop-shimmer` | `1400ms` | none |',
  '| `--loop-brand` | `8000ms` | none |',
  '| `--loop-reduced` | `2400ms` | none |',
  '| `--loop-brand-reduced` | `24000ms` | none |',
  '| `--ease-out` | `cubic-bezier(.2,.7,.3,1)` | `ease-out` |',
  '| `--ease-in-out` | `cubic-bezier(.4,0,.2,1)` | `ease-in-out` |',
  '| `--ease-emphatic` | `cubic-bezier(.2,.9,.1,1)` | `ease-emphatic` |',
  '| `--z-nav` | `800` | `z-nav` |',
  '| `--z-skip` | `820` | `z-skip` |',
  '| `--z-sheet` | `850` | `z-sheet` |',
  '| `--z-dropdown` | `900` | `z-dropdown` |',
  '| `--z-tooltip` | `950` | `z-tooltip` |',
  '| `--z-modal` | `1000` | `z-modal` |',
  '| `--z-modal-nested` | `1050` | `z-modal-nested` |',
  '| `--z-palette` | `1100` | `z-palette` |',
  '| `--z-onboarding` | `1200` | `z-onboarding` |',
  '| `--z-toast` | `1300` | `z-toast` |',
  '| `--bp-sm` | `30rem` = 480px at the browser default | `sm:` |',
  '| `--bp-md` | `48rem` = 768px at the browser default | `md:` |',
  '| `--bp-lg` | `64rem` = 1024px at the browser default | `lg:` |',
];

test('a rem value shows its pixel at the browser default', () => {
  assert.equal(atDefault('0.8125rem'), '`0.8125rem` = 13px at the browser default');
  assert.equal(atDefault('48rem'), '`48rem` = 768px at the browser default');
  assert.equal(atDefault('13px'), '`13px`');
  assert.equal(atDefault('700ms'), '`700ms`');
  assert.equal(atDefault('1.5'), '`1.5`');
});

const ROW_FORMATS: { name: string; region: string; prefix: string; cell3?: string; includes?: string; endsWith?: string }[] = [
  {
    name: 'the compact column shows a text size in rem with its pixel',
    region: 'density',
    prefix: '| `--dz-text` |',
    cell3: '`0.8125rem` = 13px at the browser default',
  },
  {
    name: 'the type table shows fs in rem with its pixel',
    region: 'typography',
    prefix: '| `--fs-h1` |',
    includes: '`2.75rem` = 44px at the browser default',
  },
  {
    name: 'breakpoint rows keep their variant',
    region: 'spacing',
    prefix: '| `--bp-md` |',
    includes: '`48rem` = 768px at the browser default',
    endsWith: '`md:` |',
  },
  { name: 'a spacing step keeps its multiple', region: 'spacing', prefix: '| `--sp-4` |', includes: '| `16px` |', endsWith: '`*-4` |' },
];

test('a token row shows its value, its pixel and its variant as the page writes them', () => {
  assert.ok(ROW_FORMATS.length > 0, 'the table has rows');
  for (const row of ROW_FORMATS) {
    const line = renderRegion(row.region).split('\n').find((l) => l.startsWith(row.prefix));
    assert.ok(line, `${row.name}: the region has a row starting ${row.prefix}`);
    if (row.cell3 !== undefined) assert.equal(line.split('|')[3]!.trim(), row.cell3, row.name);
    if (row.includes !== undefined) assert.ok(line.includes(row.includes), `${row.name}: ${line}`);
    if (row.endsWith !== undefined) assert.ok(line.endsWith(row.endsWith), `${row.name}: ${line}`);
  }
});

const rowsOf = (region: string) => region.split('\n').filter((line) => line.startsWith('| `--'));

test('the scale regions keep every row of the joined table', () => {
  const rows = [...rowsOf(renderRegion('spacing')), ...rowsOf(renderRegion('motion'))];
  assert.deepEqual(rows.sort(), [...JOINED_TOKEN_ROWS].sort());
});

test('a scale region says only what its groups need', () => {
  const spacing = renderRegion('spacing');
  const motion = renderRegion('motion');
  assert.ok(spacing.includes('The sheet sets the spacing base') && !motion.includes('The sheet sets the spacing base'));
  assert.ok(spacing.includes('(radius and shadow)') && motion.includes('(ease)'));
  assert.ok(spacing.includes('A breakpoint row names') && !motion.includes('A breakpoint row names'));
});

const decl = readSlotDeclarations(repoRoot);
const cat = readColorSlots(repoRoot);
const groupText = () => Object.keys(decl.groups!).map((group) => slotGroupPage(group, decl, cat)).join('\n');
const slotRegions = () => [...['slotExample', 'slotQuiet', 'slotAccepts', 'slotGroups'].map((key) => renderRegion(key)), groupText()].join('\n');

test('the slot page carries the four slot regions', () => {
  assert.deepEqual(regionsOf(SLOT_PAGE).sort(), ['slotAccepts', 'slotExample', 'slotGroups', 'slotQuiet']);
});

test('every declared group has a page, in declaration order', () => {
  const headings = [...groupText().matchAll(/^# Colouring the `([a-z]+)` group$/gm)].map((m) => m[1]);
  assert.deepEqual(headings, Object.keys(decl.groups!));
});

test('every derived slot has the row of its part and option', () => {
  const text = groupText();
  for (const s of Object.values(cat.slots))
    assert.ok(text.includes(`| \`${s.part}\` | ${s.option === undefined ? '' : `\`${s.option}\``} |`), `${s.group}.${s.part} ${s.option ?? ''}`);
});

test('a row names the rest default of its part', () => {
  const text = groupText();
  assert.match(text, /\| `box` \|  \| fill, edge \|[^\n]*fill `\{fill-control\}`, edge `\{edge-control\}`/);
  assert.match(text, /\| `field` \| `error` \|[^\n]*edge `\{edge-invalid\}`/);
  assert.match(text, /\| `body` \|  \|[^\n]*ink `\{ink-body\}` at `level-ink-body`/);
});

test('a part with no rest shows its selected answer', () => {
  assert.match(groupText(), /\| `mark` \|  \| ink \| selected \|[^\n]*ink `\{emphasis-primary-ink\}`/);
});

test('a part that derives no slot says Arena paints it', () => {
  const text = groupText();
  for (const part of ['solid', 'skeleton'])
    assert.match(text, new RegExp(`\\| \`${part}\` \\|[^\\n]*Arena paints it, and no slot answers it`));
});

test('every hover with a role of its own is listed under its group', () => {
  const text = groupText();
  for (const [name, s] of Object.entries(cat.slots))
    if (!['rest', 'selected'].includes(s.state) && s.property !== 'icon' && s.default !== undefined && s.derive === undefined)
      assert.ok(text.includes(`\`${name}\` reads \`${s.default}\``), name);
});

test('the slot regions print no decision, no gate and no contributor path', () => {
  const text = slotRegions();
  assert.doesNotMatch(text, /\b[DR]\d+\b/);
  assert.doesNotMatch(text, /\bcheck:[a-z-]+/);
  for (const [pattern] of CONTRIBUTOR_PATHS) assert.doesNotMatch(text, new RegExp((pattern as RegExp).source));
  for (const [character] of BANNED_PUNCTUATION) assert.ok(!text.includes(character!));
});

test('no slot table cell passes the cell cap', () => {
  for (const { line, chars } of tableCells(slotRegions())) assert.ok(chars <= MAX_CELL_CHARS, `line ${line}: ${chars}`);
});

test('the example answers are slots that accept them', () => {
  const roles = readJson(join(repoRoot, ROLE_CONTRACT)) as Record<string, { $type: string }>;
  const colour = new Set(Object.keys(roles).filter((name) => roles[name]!.$type === 'color'));
  for (const [name, value] of Object.entries(EXAMPLE_SLOT_ANSWERS))
    assert.ok(slotAnswer(value, name, cat, colour), `${name}: ${value}`);
});

test('the example answers clear their floors over the default plugin', () => {
  const catalogue = tokenCatalogue();
  const levels = levelDefaults(readFileSync(join(repoRoot, 'contracts/design/colors.css'), 'utf8'));
  for (const theme of ['dark', 'light']) {
    const palette = readJson(join(repoRoot, `contracts/design/palette.${theme}.json`)) as { color: Record<string, { $value?: { hex?: string } }> };
    const colours = Object.fromEntries(Object.entries(palette.color).filter(([, t]) => t.$value?.hex).map(([k, t]) => [k, t.$value!.hex!]));
    const roles = rolesFor(null, catalogue, theme);
    const answers = new Map(Object.entries(EXAMPLE_SLOT_ANSWERS).map(([name, value]) => [name, roles.get(value.slice(1, -1)) as string]));
    const lines = slotReports(catalogue.slots, answers, roles, colours, theme, levels).map((one) => one.message)
      .filter((line) => /^--(choices-(box|mark|knob)|navigation-(item|badge))-/.test(line));
    assert.deepEqual(lines, [], theme);
  }
});

const NOWHERE_ELSE = [
  { name: 'every role whose silent answer reads the brand outside the primary action is in the nowhere-else list', entry: 'ink-eyebrow', answer: '{ink-body}' },
  { name: 'a toggled button and a selected option are quieted through the selected fill role', entry: 'fill-selected', answer: '{fill-marker}' },
  { name: 'a solid icon button is quieted the way the secondary emphasis is answered', entry: 'emphasis-solid-fill', answer: '{emphasis-secondary-fill}' },
  { name: 'the current step is quieted in its own slots', entry: 'steps-current-marker-fill-rest', answer: '{fill-mark}' },
  { name: 'the now marker of a calendar is quieted in its own slots', entry: 'data-now-edge-rest', answer: '{edge-mark}' },
];

test('the nowhere-else list answers every silent reader of the brand outside the primary action', () => {
  const answers = quietAnswers();
  for (const row of NOWHERE_ELSE) assert.equal(answers[row.entry], row.answer, row.name);
  const { roles, slots } = brandReaders();
  assert.deepEqual(Object.keys(answers).sort(), [...roles, ...slots].sort());
  for (const name of Object.keys(answers)) {
    assert.ok(!name.startsWith('actions-primary-') && !name.startsWith('emphasis-primary-'), name);
    assert.ok(!(name in EXAMPLE_SLOT_ANSWERS), name);
  }
});

const BRAND_ROLES = ['fill-control-on', 'fill-knob', 'ink-knob', 'edge-tab-selected', 'edge-selected'];

test('the nowhere-else list answers every role the default plugin points at the brand, markup of yours included', () => {
  type Entry = { $value?: unknown };
  const tokens = readJson(join(repoRoot, 'plugin-style-store/default/plugin.tokens.json')) as Record<string, Record<string, Entry> | Entry>;
  const own = (block: Record<string, unknown>) => Object.entries(block).filter(([name, entry]) => !name.startsWith('$') && typeof entry === 'object' && entry !== null && '$type' in entry);
  const pointed = new Set<string>();
  for (const polarity of ['dark', 'light']) {
    const at = new Map<string, string>([...own(tokens), ...own((tokens[polarity] ?? {}) as Record<string, unknown>)].map(([name, entry]) => [name, JSON.stringify(entry)]));
    const reads = (name: string, seen: string[]): boolean => {
      const text = at.get(name) ?? '';
      return /\{color\.primary[-}]/.test(text) || [...text.matchAll(/\{([a-z][a-z0-9-]*)\}/g)].some(([, next]) => !seen.includes(next!) && reads(next!, [...seen, next!]));
    };
    for (const name of at.keys()) if (!name.startsWith('emphasis-primary-') && reads(name, [name])) pointed.add(name);
  }
  const answers = quietAnswers();
  for (const role of pointed) assert.ok(role in answers, role);
  for (const role of BRAND_ROLES) assert.ok(pointed.has(role) && role in answers, role);
});

test('the nowhere-else answers leave no slot reading the brand under the default plugin', () => {
  const catalogue = tokenCatalogue();
  const answers = quietAnswers();
  const bare = (value: string) => value.slice(1, -1);
  for (const theme of ['dark', 'light']) {
    const roles = rolesFor(null, catalogue, theme);
    for (const [name, slot] of Object.entries(catalogue.slots.slots)) {
      if (slot.default === undefined || (slot.group === 'actions' && slot.option === 'primary')) continue;
      const answered = EXAMPLE_SLOT_ANSWERS[name] ?? answers[name] ?? answers[bare(slot.default)] ?? slot.default;
      assert.ok(!/--color-primary\b/.test(roles.get(bare(answered)) as string), `${theme} ${name}`);
    }
  }
});

test('the example quiets the navigation selection in both polarities', () => {
  const catalogue = tokenCatalogue();
  const names = ['navigation-item-fill-selected', 'navigation-item-edge-selected', 'navigation-badge-fill-selected', 'navigation-badge-ink-selected'];
  for (const name of names) assert.ok(name in EXAMPLE_SLOT_ANSWERS, name);
  for (const theme of ['dark', 'light']) {
    const roles = rolesFor(null, catalogue, theme);
    for (const name of names) {
      const value = roles.get((EXAMPLE_SLOT_ANSWERS[name] as string).slice(1, -1)) as string;
      assert.ok(value, `${theme} ${name}`);
      assert.ok(!value.includes('--color-primary'), `${theme} ${name}`);
    }
  }
});

test('a member default is named under the group whose slot it stands in for', () => {
  const text = groupText();
  for (const [key, member] of Object.entries(cat.members))
    for (const [slot, value] of Object.entries(member.defaults ?? {}))
      assert.ok(text.includes(`\`${key}\` paints \`${slot}\` with \`${value}\``), `${key} ${slot}`);
  assert.match(text, /`ArenaIconButton\.root` paints `actions-ghost-root-edge-rest` with `\{emphasis-ghost-icon-edge\}`/);
});

test('the skin refuses a shipped name and promises no future one', async () => {
  const skin = renderRegion('skin');
  assert.ok(skin.includes('The command refuses a palette or style plugin named after a class Arena ships.'));
  assert.ok(!skin.includes('going to ship') && !skin.includes('held ahead'));
  const held = await whileHeld('held-name', () => renderRegion('skin'));
  assert.ok(held.includes('held-name') && held.includes('ArenaHeld'));
});

test('the skin links theme.md where it says what a subtree takes', () => {
  assert.ok(renderRegion('skin').includes('[`theme.md`](./theme.md#how-do-i-put-a-palette-on-part-of-a-page)'));
});

test('the split families are the ones the build splits', () => {
  assert.deepEqual(splitFamilyNames(), ['accent', 'emphasis']);
  for (const key of ['noImport', 'sheets', 'splitFamilies']) {
    const text = renderRegion(key);
    for (const name of splitFamilyNames()) assert.ok(text.includes(`\`${name}\``), `${key} names ${name}`);
    assert.ok(!text.includes('whose components carry colour slots'), key);
  }
});

test('the split family sentence reads true for one family and for none', () => {
  const dir = track(mkdtempSync(join(tmpdir(), 'arena-split-')));
  assert.equal(splitFamilyNames(dir).length, 0);
  assert.equal(splitFamilySentence(dir), 'No family enters as a sheet per component.');
  const full = splitFamilySentence();
  assert.match(full, /The families `accent` and `emphasis` are the ones/);
  assert.ok(!full.includes('read the colour slots'));
});

type SlotGroupJson = { parts?: Record<string, { options?: string[] | Record<string, unknown> }> };

const rowPrefixesOf = (group: SlotGroupJson) => Object.entries(group.parts ?? {}).flatMap(([part, one]) => {
  const options = one.options === undefined ? [undefined] : Array.isArray(one.options) ? one.options : Object.keys(one.options);
  return options.map((option) => (option === undefined ? `| \`${part}\` | ` : `| \`${part}\` | \`${option}\` | `));
});

const markdownLinks = (text: string) => [...text.replace(/```[\s\S]*?```/g, '').matchAll(/\]\(([^)\s]+)\)/g)].map((match) => match[1] ?? '');

const SLOT_INDEX = `${SLOT_GROUP_DIR}/index.md`;

test('every group page is linked from the slot page, and no link names a group anchor there', () => {
  const declared = (readJson(join(repoRoot, 'contracts/design/color-slots.json')) as { groups: Record<string, SlotGroupJson> }).groups;
  const groups = Object.keys(declared);
  assert.equal(groups.length, 13);
  const slotPage = readFileSync(join(repoRoot, SLOT_PAGE), 'utf8');
  for (const group of groups) {
    const page = readFileSync(join(repoRoot, SLOT_GROUP_DIR, `${group}.md`), 'utf8');
    assert.ok(page.startsWith('# '), `${group}: opens with a heading`);
    assert.match(page, /\nRead this /, `${group}: Read this sentence`);
    const prefixes = rowPrefixesOf(declared[group]!);
    assert.ok(prefixes.length > 0, `${group}: declared rows`);
    for (const prefix of prefixes) assert.ok(page.includes(`\n${prefix}`), `${group}: a row opens ${prefix}`);
    assert.ok(page.includes('](./index.md)'), `${group}: links back`);
    assert.ok(slotPage.includes(`](./${group}.md)`), `${group}: linked from the slot page`);
    const hits = spawnSync('git', ['grep', '-l', `color-slots/index.md#${group}`, '--', ':!.superpowers', ':!docs', ':!scripts/generate/arena/generate-npm-pages.test.ts'], { cwd: repoRoot, encoding: 'utf8' });
    assert.equal(hits.stdout, '', `${group}: anchor links`);
  }
  assert.deepEqual(GROUP_PAGES, groups.map((group) => `${SLOT_GROUP_DIR}/${group}.md`));
  assert.equal(slotGroupPages().length, groups.length);
});

const WALKED = spawnSync('git', ['ls-files', '*.md', ':!:.superpowers', ':!:docs'], { cwd: repoRoot, encoding: 'utf8' }).stdout.split('\n').filter(Boolean);

const groupFragmentLinks = (from: string, text: string, groups: string[]) => markdownLinks(text).filter((target) => {
  const [path = '', fragment = ''] = target.split('#');
  if (/^[a-z]+:/i.test(path)) return false;
  const resolved = path === '' ? from : resolvePosix(from, path);
  return resolved === SLOT_INDEX && groups.includes(fragment);
});

const ANCHOR_ROWS = [
  { name: 'an absolute-from-root path with a group fragment', from: 'skills/design/SKILL.md', text: '[x](./references/color-slots/index.md#actions)', want: 1 },
  { name: 'a relative anchor from a group page', from: `${SLOT_GROUP_DIR}/menus.md`, text: '[x](./index.md#actions)', want: 1 },
  { name: 'a bare file name from the index', from: SLOT_INDEX, text: '[x](index.md#actions)', want: 1 },
  { name: 'a bare fragment inside the index', from: SLOT_INDEX, text: '[x](#actions)', want: 1 },
  { name: 'a link to the index with no fragment', from: 'skills/design/SKILL.md', text: '[x](./references/color-slots/index.md)', want: 0 },
  { name: 'a link to the index with a heading that is no group', from: 'skills/design/SKILL.md', text: '[x](./references/color-slots/index.md#the-groups)', want: 0 },
  { name: 'a link to a group page', from: `${SLOT_GROUP_DIR}/index.md`, text: '[x](./actions.md)', want: 0 },
  { name: 'a site URL', from: 'skills/design/SKILL.md', text: '[x](https://example.org/color-slots/index.md#actions)', want: 0 },
];

test('a link to a group anchor of the slot index is found however it is written', () => {
  for (const { name, from, text, want } of ANCHOR_ROWS) assert.equal(groupFragmentLinks(from, text, ['actions', 'menus']).length, want, name);
});

test('no Markdown link of the corpus resolves to the slot index with a group fragment', () => {
  const groups = Object.keys((readJson(join(repoRoot, 'contracts/design/color-slots.json')) as { groups: Record<string, unknown> }).groups);
  assert.ok(WALKED.includes(SLOT_INDEX), 'the walk reaches the slot index');
  const found = WALKED.flatMap((from) => groupFragmentLinks(from, readFileSync(join(repoRoot, from), 'utf8'), groups).map((target) => `${from} -> ${target}`));
  assert.deepEqual(found, [], 'a link to a group goes to its group page');
});

test('the spacing table carries the rhythm steps', () => {
  type Step = { $value: string };
  const spacing = readJson(join(repoRoot, 'contracts/design/spacing.json')) as {
    sp: Record<string, { $value: { value: number; unit: string } }>;
    rhythm: Record<string, Step | string>;
  };
  const region = renderRegion('spacing');
  const steps = Object.entries(spacing.rhythm).filter(([, step]) => typeof step === 'object' && '$value' in step);
  assert.equal(steps.length, 3, 'the contract holds three rhythm steps');
  for (const [name, step] of steps) {
    const alias = /^\{sp\.([^}]+)\}$/.exec((step as Step).$value)?.[1] ?? '';
    const size = spacing.sp[alias]!.$value;
    assert.ok(region.includes(`| \`--rhythm-${name}\` | \`${size.value}${size.unit}\` | \`gap-${name}\` |`), `rhythm ${name} is a row with its px and its utility`);
  }
  assert.ok(region.includes('style.md#the-air-between-two-components'), 'the table says where the classes are');
});
