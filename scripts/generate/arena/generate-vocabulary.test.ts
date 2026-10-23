/* The vocabulary page is emitted from the family files and the manifests that answer them, so a
 * family is listed by being declared and a component by answering it. Each family has an anchor
 * a prompt links to. */
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderVocabulary, VOCABULARY_TARGET } from './generate-vocabulary.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { layerManifests } from '../../lib/tailwind/tailwind-compile.ts';
import { answerOf, axesOf, readFamilies, targetOf } from '../../lib/tailwind/vocabulary.ts';
import { MAX_WORDS, plain, words } from '../../check/arena/check-register.ts';

const made: string[] = [];
const track = (dir: string) => { made.push(dir); return dir; };
after(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

test('every family is a row and a section, with its options, its default, its reach and who answers it', () => {
  const page = renderVocabulary();
  assert.match(page, /^<!-- GENERATED from frameworks\/tailwind\/vocabulary\/ by bun run generate:vocabulary\./);
  assert.match(page, /\| \[`fill`\]\(#fill\) \| box \| `arena-fill`, `arena-fit` \(default\) \|/);
  assert.match(page, /\n## fill\n/);
  assert.match(page, /ArenaButton/);
  assert.equal(VOCABULARY_TARGET, 'frameworks/VOCABULARY.md');
});

test('the lead names every family written on markup you write', () => {
  const page = renderVocabulary();
  const lead = page.split('\n').find((line) => line.startsWith('**Every vocabulary class'))!;
  const written = page.split('\n').filter((line) => line.startsWith('| [`') && line.endsWith('| markup you write |'))
    .map((line) => /^\| \[`([^`]+)`\]/.exec(line)![1]!);
  assert.ok(written.length >= 8, 'the table holds the markup families');
  for (const name of written) assert.ok(lead.includes(`\`${name}\``), `the lead names ${name}`);
  assert.match(lead, /the `density` context/);
}); 

test('a markup family is answered by markup you write, carries no default, and says where its class goes', () => {
  const base = track(mkdtempSync(join(tmpdir(), 'vocabulary-page-')));
  mkdirSync(join(base, 'frameworks/tailwind/components'), { recursive: true });
  const family = (dir: string, body: object) => {
    mkdirSync(join(base, 'frameworks/tailwind/vocabulary', dir), { recursive: true });
    writeFileSync(join(base, 'frameworks/tailwind/vocabulary', dir, `${dir}.family.json`), JSON.stringify(body));
  };
  family('fill', { family: 'fill', reach: 'box', description: 'd', default: 'arena-fit',
    variants: { 'arena-fill': '[--arena-fill-width:100%]', 'arena-fit': '[--arena-fill-width:fit-content]' } });
  family('stack', { family: 'stack', reach: 'box', target: 'markup', description: 'd', variants: { 'arena-stack': '[display:flex]' } });
  family('density', { family: 'density', reach: 'context', target: 'markup', restates: 'dz', description: 'd',
    variants: { 'arena-compact': 'contracts/design/density.compact.json' } });
  const page = renderVocabulary(base);
  assert.match(page, /\| \[`stack`\]\(#stack\) \| box \| `arena-stack` \| {2}\| markup you write \|/);
  const section = page.split('\n## stack\n')[1]?.split('\n## ')[0] ?? '';
  assert.doesNotMatch(section, /\(default\)/);
  assert.match(section, /- \*\*Written on:\*\* an element you wrote, never a component\./);
  assert.match(section, /it decides that element alone/);
  assert.match(page, /A markup family's box class goes on an element you wrote, never on a component\./);
  assert.match(page, /A markup family's context class, density, goes on an element you wrote or on a component\./);
  assert.match(page, /Tailwind utilities that a manifest names, and not vocabulary classes\./);
  assert.match(page, /- \*\*Values:\*\* `arena-compact` restates `contracts\/design\/density\.compact\.json`\./);
});

test('a component answering a subset of a family, or with a default of its own, says so under Answered by', () => {
  const base = track(mkdtempSync(join(tmpdir(), 'vocabulary-answers-')));
  const dir = join(base, 'frameworks/tailwind/components/forms/arena-probe');
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(base, 'frameworks/tailwind/vocabulary/arena-size'), { recursive: true });
  writeFileSync(join(base, 'frameworks/tailwind/vocabulary/arena-size/Size.family.json'), JSON.stringify({ family: 'size', reach: 'context', description: 'd',
    default: 'arena-size-md', variants: { 'arena-size-sm': '[--arena-size-h:1px]', 'arena-size-md': '[--arena-size-h:2px]', 'arena-size-lg': '[--arena-size-h:3px]' } }));
  const write = (name: string, answers: unknown) => writeFileSync(join(dir, `${name}.manifest.json`),
    JSON.stringify({ component: name, answers, slots: { root: 'x-[var(--arena-size-h,2px)]' } }));
  write('ArenaWhole', ['size']);
  write('ArenaTwin', [{ family: 'size', options: ['arena-size-sm', 'arena-size-md'], default: 'arena-size-md' }]);
  write('ArenaSubset', [{ family: 'size', options: ['arena-size-sm', 'arena-size-md'], default: 'arena-size-md' }]);
  write('ArenaOwn', [{ family: 'size', options: ['arena-size-sm', 'arena-size-md', 'arena-size-lg'], default: 'arena-size-sm' }]);
  const section = renderVocabulary(base).split('\n## size\n')[1] ?? '';
  assert.match(section, /\n {2}- ArenaOwn \(default `arena-size-sm`\)\./);
  assert.match(section, /- \*\*Answered by:\*\*\n/);
  assert.match(section, /ArenaSubset and ArenaTwin \(`arena-size-md`, `arena-size-sm`\)/);
  assert.match(section, /ArenaWhole[,.]/);
  assert.doesNotMatch(section, /ArenaWhole \(/);
});

test('a group of answerers too long for one sentence is cut into lines the register holds, each naming its options', () => {
  const base = track(mkdtempSync(join(tmpdir(), 'vocabulary-long-group-')));
  const dir = join(base, 'frameworks/tailwind/components/forms/arena-probe');
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(base, 'frameworks/tailwind/vocabulary/arena-size'), { recursive: true });
  writeFileSync(join(base, 'frameworks/tailwind/vocabulary/arena-size/Size.family.json'), JSON.stringify({ family: 'size', reach: 'context', description: 'd',
    default: 'arena-size-md', variants: { 'arena-size-sm': '[--arena-size-h:1px]', 'arena-size-md': '[--arena-size-h:2px]', 'arena-size-lg': '[--arena-size-h:3px]', 'arena-size-xl': '[--arena-size-h:4px]' } }));
  const names = Array.from({ length: 40 }, (_, i) => `ArenaProbe${String.fromCharCode(65 + (i % 26))}${i}`);
  for (const name of names) {
    writeFileSync(join(dir, `${name}.manifest.json`), JSON.stringify({ component: name,
      answers: [{ family: 'size', options: ['arena-size-sm', 'arena-size-md', 'arena-size-lg'], default: 'arena-size-md' }], slots: { root: 'x-[var(--arena-size-h,2px)]' } }));
  }
  const section = renderVocabulary(base).split('\n## size\n')[1] ?? '';
  const rows = section.split('\n').filter((line) => line.startsWith('  - '));
  assert.ok(rows.length > 1, 'forty answerers stayed on one line');
  for (const row of rows) {
    assert.match(row, /\(`arena-size-lg`, `arena-size-md`, `arena-size-sm`\)\.$/);
    assert.ok(words(plain(row)).length < MAX_WORDS, `a line of ${words(plain(row)).length} words: ${row}`);
  }
  assert.equal(rows.join(' ').match(/ArenaProbe/g)?.length, 40);
});

const KEYED = { family: 'column', reach: 'box', target: 'keyed', keyed: 'key', description: 'd', variants: {},
  properties: ['--arena-column-<key>-width', '--arena-column-<key>-align'], channels: ['--arena-column-width', '--arena-column-align'],
  binds: ['ArenaTable', 'ArenaTableCell'] };

test('a keyed family is keyed by its field, lists its properties, and is answered by the components that bind it', () => {
  const base = track(mkdtempSync(join(tmpdir(), 'vocabulary-keyed-')));
  mkdirSync(join(base, 'frameworks/tailwind/components'), { recursive: true });
  mkdirSync(join(base, 'frameworks/tailwind/vocabulary/arena-column'), { recursive: true });
  writeFileSync(join(base, 'frameworks/tailwind/vocabulary/arena-column/Column.family.json'), JSON.stringify(KEYED));
  const page = renderVocabulary(base);
  assert.match(page, /\| \[`column`\]\(#column\) \| box \| keyed by `key` \| `--arena-column-<key>-width`, `--arena-column-<key>-align` \| ArenaTable, ArenaTableCell \|/);
  const section = page.split('\n## column\n')[1] ?? '';
  assert.match(section, /- \*\*Options:\*\* keyed by `key`\./);
  assert.match(section, /- \*\*Property:\*\* `--arena-column-<key>-width`, `--arena-column-<key>-align`, set on the component or a container of yours with a token or a derivation of tokens\./);
  assert.match(section, /- \*\*Answered by:\*\* ArenaTable, ArenaTableCell\./);
});

test('the page\'s Property and Answered by cells equal what the families and the manifests say', () => {
  const families = readFamilies();
  const manifests = [...layerManifests(repoRoot).values()];
  const rows = readFileSync(join(repoRoot, VOCABULARY_TARGET), 'utf8').split('\n').filter((line) => line.startsWith('| [`'));
  assert.equal(rows.length, families.size);
  for (const row of rows) {
    const cells = row.split('|').slice(1, -1).map((cell) => cell.trim());
    const family = families.get(/\[`([^`]+)`\]/.exec(cells[0] ?? '')?.[1] ?? '');
    assert.ok(family, `${row} names no family`);
    const properties = targetOf(family) === 'keyed' ? family.properties ?? [] : axesOf(family);
    assert.equal((cells[3] ?? '').replaceAll('`', ''), properties.join(', '), `${family.family} Property`);
    const answered = targetOf(family) === 'keyed' ? family.binds ?? []
      : manifests.filter((one) => answerOf(one, family)).map((one) => one.component);
    const listed = targetOf(family) === 'markup' ? [] : [...new Set(cells[4]?.match(/Arena[A-Za-z]+/g) ?? [])];
    assert.deepEqual(listed.sort(), [...answered].sort(), `${family.family} Answered by`);
  }
});

test('a component with a prompt in a layer links to it, and a table cell too long for links names the components alone', () => {
  const page = renderVocabulary();
  const section = page.split('\n## accent\n')[1]?.split('\n## ')[0] ?? '';
  assert.match(section, /ArenaSpinner \(\[React\]\(\.\/react\/components\/feedback\/arena-spinner\/ArenaSpinner\.prompt\.md\), \[Angular\]\(\.\/angular\/components\/feedback\/arena-spinner\/ArenaSpinner\.prompt\.md\)\)/);
  const row = page.split('\n').find((line) => line.startsWith('| [`size`]'));
  assert.ok(row && !row.includes('.prompt.md'), 'the size row is too long for links');
  for (const line of page.split('\n')) assert.ok(line.length < 2000, line.slice(0, 80));
});

test('a row whose answerers outrun a sentence names them alone and sends the options to the section', () => {
  const base = track(mkdtempSync(join(tmpdir(), 'vocabulary-long-')));
  const dir = join(base, 'frameworks/tailwind/components/forms/arena-probe');
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(base, 'frameworks/tailwind/vocabulary/arena-size'), { recursive: true });
  const options = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'].map((one) => `arena-size-${one}`);
  writeFileSync(join(base, 'frameworks/tailwind/vocabulary/arena-size/Size.family.json'), JSON.stringify({ family: 'size', reach: 'context', description: 'd',
    default: 'arena-size-md', variants: Object.fromEntries(options.map((one, at) => [one, `[--arena-size-h:${at + 1}px]`])) }));
  for (const [at, name] of ['ArenaOne', 'ArenaTwo', 'ArenaThree', 'ArenaFour', 'ArenaFive', 'ArenaSix'].entries())
    writeFileSync(join(dir, `${name}.manifest.json`), JSON.stringify({ component: name, slots: { root: 'x-[var(--arena-size-h,2px)]' },
      answers: [{ family: 'size', options: [0, 1, 2].map((step) => options[(at + step) % 6]!), default: options[at]! }] }));
  const row = renderVocabulary(base).split('\n').find((line) => line.startsWith('| [`size`]')) ?? '';
  assert.match(row, /\| ArenaFive, ArenaFour, ArenaOne, ArenaSix, ArenaThree, ArenaTwo; \[the options each answers\]\(#size\) \|$/);
  const section = renderVocabulary(base).split('\n## size\n')[1] ?? '';
  assert.match(section, /ArenaFive \(`arena-size-2xl`, `arena-size-xl`, `arena-size-xs`; default `arena-size-xl`\)/);
});
