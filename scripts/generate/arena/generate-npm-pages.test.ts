/* The property that makes this safe to have written at all is that a region is placed by a person
 * and only filled by the script, so these hold both halves: a page with no markers is refused
 * rather than rewritten, and a page with them comes back byte-identical once it is current. The
 * generated text is emitted verbatim, so a page that is current comes back unchanged. */

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { LAYER_TOKENS, FORBIDDEN } from '../../check/arena/check-layer-independence.ts';
import {
  TARGETS, openLine, closeLine, renderRegion, applyRegion, renderTarget, regionsOf,
  ROLE_CONTRACT, BEHAVIOUR_CONTRACT, densityValues, requiredLead, toastIntervals, defaultedRoles, defaultedSentence, defaultsStatement, roleRuns, unansweredCount,
} from './generate-npm-pages.ts';
import { tokenCatalogue, CSS_CHAIN } from '../../lib/arena/package-assembly.ts';
import { NPM_PAGES } from '../../lib/arena/npm-questions.ts';
import { readJson } from '../../utils/read-file.ts';
import { packageSheetName, sheetFamilies } from '../../lib/tailwind/vocabulary.ts';
import { MAX_WORDS, plain, words } from '../../check/arena/check-register.ts';
import { RULE_TAGS, RULE_DESCRIPTIONS } from '../core/arena-cli/audit.ts';
import { run } from '../core/arena-cli/command-init.ts';
import { ARENA_FONT_DEFAULTS, ARENA_FONT_KEYS } from '../core/arena-cli/theme-css.ts';
import { FONT_ROLES } from '../core/arena-cli/palette-keys.ts';
import { captureIo, hostRoot, removeFixtures } from '../core/arena-cli/cli-fixtures.ts';
import { RULES } from '../../lib/arena/language-rules.ts';

after(removeFixtures);

const made: string[] = [];
const track = (dir: string) => { made.push(dir); return dir; };
after(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

const SHARED = ['repository', 'skin', 'defaults', 'sheets', 'toast', 'layout', 'queues'];

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
  assert.deepEqual(regionsOf('skills/design/references/tokens.md'), ['tokens', 'density', 'typography']);
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

test('the sheets region lists the token layer in CSS_CHAIN order and names where the style plugin\'s sheet sits', () => {
  const region = renderRegion('sheets');
  const opener = region.indexOf('The token layer is');
  assert.ok(opener >= 0, 'the sheets region no longer opens a sentence with "The token layer is"');
  const paragraph = region.slice(opener);
  const at = CSS_CHAIN.map(({ to }) => paragraph.indexOf(`\`${to}\``));
  assert.ok(at.every((place) => place >= 0), `a CSS_CHAIN entry is missing from the token layer sentence: ${at}`);
  assert.deepEqual([...at].sort((a, b) => a - b), at, 'the token layer sentence is not in CSS_CHAIN order');
  assert.match(paragraph, /slot your style plugin's sheet takes/);
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
  for (const target of ['skills/design/references/config.md', 'skills/design/references/style-kernel.md'])
    assert.ok(readFileSync(join(repoRoot, target), 'utf8').includes(statement), `${target} carries the statement`);
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

test('the tokens table carries a Tailwind column read from Theme.css', () => {
  const rows = renderRegion('tokens').split('\n').filter((line) => line.startsWith('| `--'));
  const rowOf = (name: string) => rows.find((row) => row.startsWith(`| \`--${name}\` |`))!.split('|').map((cell) => cell.trim());
  assert.equal(rowOf('r-lg')[3], '`rounded-lg`');
  assert.equal(rowOf('shadow-1')[3], '`shadow-1`');
  assert.equal(rowOf('sp-4')[3], '`*-4`');
  assert.equal(rowOf('z-modal')[3], '`z-modal`');
  assert.equal(rowOf('loop-spin')[3], 'none');
  assert.match(renderRegion('tokens'), /\| custom property \| value \| Tailwind \|/);
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
  assert.equal(ctl[3], `\`${compact['ctl-h']!.$value.value}${compact['ctl-h']!.$value.unit}\``);
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
    const held = RULES.filter((rule) => rule.held === tag).map((rule) => rule.short);
    assert.equal(cells[1], held.length ? held.join(' ') : 'none of the language rules', tag);
    assert.equal(cells[2], `${RULE_DESCRIPTIONS[tag]} |`, tag);
  });
  assert.deepEqual(RULES.filter((rule) => rule.held === 'raw-value').length, 2, 'two rules hold raw-value');
  assert.ok(rows[RULE_TAGS.indexOf('raw-value')]!.includes('Tokens are the only styling layer.')
    && rows[RULE_TAGS.indexOf('raw-value')]!.includes('No gradients, on any surface.'));
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
