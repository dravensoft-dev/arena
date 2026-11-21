import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  coverageProblems, shapeProblems, seedProblems, slotProblems, bindProblems, fieldProblems, hostProblems,
  valueProblems, objectProblems, nodeProblems, fixtureProblems, citationProblems,
  loadContracts, loadFixtures, loadTypes, citingFiles, basenameIndex, emissionProblems,
  pagePaths, classProblems, variantProblems,
} from './check-playgrounds.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { buildPlaygrounds } from '../../generate/arena/generate-playgrounds.ts';
import type { ComponentContract, TypeContract } from '../../lib/arena/contract-shapes.ts';

const types = new Map<string, TypeContract>([
  ['ArenaTone', { name: 'ArenaTone', kind: 'enum', values: ['neutral', 'accent', 'danger'] }],
  ['ArenaSortDirection', { name: 'ArenaSortDirection', kind: 'enum', values: ['asc', 'desc'] }],
  ['ArenaTableSort', {
    name: 'ArenaTableSort',
    kind: 'object',
    fields: {
      column: { form: 'primitive', type: 'number', required: true, description: 'The column.' },
      direction: { form: 'enum', type: 'ArenaSortDirection', required: true, description: 'The direction.' },
    },
  }],
  ['ArenaTagSet', {
    name: 'ArenaTagSet',
    kind: 'object',
    fields: { values: { form: 'array', of: 'string', required: true, description: 'The tags.' } },
  }],
  ['ArenaTableColumn', {
    name: 'ArenaTableColumn',
    kind: 'object',
    fields: { header: { form: 'primitive', type: 'string', required: true, description: 'The header.' } },
  }],
]);

const widget: ComponentContract = {
  component: 'Widget',
  description: 'A widget.',
  affordances: [],
  api: {
    label: { form: 'primitive', type: 'string', required: true, description: 'The name.' },
    tone: { form: 'enum', type: 'ArenaTone', default: 'neutral', description: 'The tone.' },
    index: { form: 'primitive', type: 'number', description: 'A position.' },
    columns: { form: 'array', of: 'ArenaTableColumn', description: 'The columns.' },
    sort: { form: 'object', type: 'ArenaTableSort', description: 'The sort.' },
    content: { form: 'slot', description: 'The body.' },
    mark: { form: 'slot', required: true, description: 'The mark.' },
    tags: { form: 'array', of: 'string', description: 'The tags.' },
    sortChange: { form: 'event', payload: 'ArenaTableSort', description: 'Sorted.' },
    tagsChange: { form: 'event', payload: 'ArenaTagSet', description: 'Retagged.' },
    countChange: { form: 'event', payload: 'number', description: 'Counted.' },
    close: { form: 'event', description: 'Closed.' },
  },
};

const memberOf = (name: string) => {
  const spec = widget.api?.[name];
  if (!spec) throw new Error(`the widget contract declares no member called ${name}`);
  return spec;
};

const badge: ComponentContract = {
  component: 'ArenaBadge',
  api: { content: { form: 'slot', description: 'The label.' }, tone: { form: 'enum', type: 'ArenaTone', default: 'neutral', description: 'The tone.' } },
};

const contracts = new Map<string, ComponentContract>([['Widget', widget], ['ArenaBadge', badge]]);

const ok = {
  component: 'Widget',
  seed: { label: 'Client Portal' },
  slots: { mark: [{ text: 'W' }] },
};

test('a well-formed fixture has no problems', () => {
  assert.deepEqual(fixtureProblems('Widget', widget, ok, contracts, types), []);
});

test('an empty contract set and an empty fixture set are failures, not clean passes', () => {
  const problems = coverageProblems(new Map(), new Map());
  assert.equal(problems.length, 2);
  assert.match(problems[0] ?? '', /an empty result set is a failure/);
});

test('coverage is bidirectional: a contract with no fixture and a fixture with no contract both fail', () => {
  const problems = coverageProblems(new Map([['A', {}]]) as any, new Map([['B', {}]]) as any);
  assert.match(problems[0] ?? '', /A: contracted but frameworks\/demos\/A\.demo\.json does not exist/);
  assert.match(problems[1] ?? '', /B\.demo\.json: no contract named B/);
});

test('shapeProblems refuses a fixture whose component, keys, vars or variants break the shape, and passes a clean vars map', () => {
  const rows: { name: string; fixture: object; count?: number; at?: RegExp[]; joined?: RegExp[] }[] = [
    { name: 'a fixture whose component disagrees with its filename fails', fixture: { component: 'Gadget' }, at: [/declares component "Gadget"/] },
    { name: 'a fixture carrying a key the schema does not know fails', fixture: { component: 'Widget', extras: {} }, at: [/carries extras/] },
    { name: 'a fixture\'s vars naming --arena-* properties and holding strings pass', fixture: { ...ok, vars: { '--arena-column-status-align': 'right' } }, count: 0 },
    { name: 'a var that is not an --arena-* property fails', fixture: { ...ok, vars: { color: 'red' } },
      joined: [/vars sets color, and a fixture sets only --arena-\* properties/] },
    { name: 'a var whose name smuggles a declaration fails', fixture: { ...ok, vars: { '--arena-x}; color: red': 'a' } },
      joined: [/vars sets --arena-x\}; color: red, and a fixture sets only --arena-\* properties/] },
    { name: 'a var holding a number fails', fixture: { ...ok, vars: { '--arena-x': 1 } }, joined: [/vars --arena-x holds number/] },
    { name: 'vars that is not a map fails', fixture: { ...ok, vars: 'x' }, joined: [/vars is a map/] },
    ...['a"b', 'a;b', 'a{b', 'a}b', 'a<b'].map((bad) => ({
      name: `a var value ${bad} would break the style attribute`, fixture: { ...ok, vars: { '--arena-x': bad } }, joined: [/would break the style attribute/],
    })),
    { name: 'a var value built from tokens passes', fixture: { ...ok, vars: { '--arena-x': 'calc(var(--sp-1) * 4)' } }, count: 0 },
    { name: 'a variant is named in lower-case words, and is an object of members',
      fixture: { component: 'Widget', variants: { 'At Min': {}, plain: 3 } }, count: 2, at: [/variants names "At Min"/, /variants\.plain is a partial seed/] },
  ];
  for (const row of rows) {
    const problems = shapeProblems('Widget', row.fixture as any);
    if (row.count !== undefined) assert.equal(problems.length, row.count, `${row.name}: finding count`);
    (row.at ?? []).forEach((pattern, index) => assert.match(problems[index] ?? '', pattern, `${row.name}: ${pattern}`));
    for (const pattern of row.joined ?? []) assert.match(problems.join('\n'), pattern, `${row.name}: ${pattern}`);
  }
});

test('seedProblems refuses a member the contract does not declare, a required member with no value, a wrong primitive and a value outside an enum', () => {
  const rows: { name: string; seed: object; pattern: RegExp }[] = [
    { name: 'a seed naming a member the contract does not declare fails', seed: { label: 'x', nope: 1 }, pattern: /seed\.nope: the contract declares no such member/ },
    { name: 'a required member with no default and no seed fails, naming the fixture', seed: {}, pattern: /label is required and carries no default/ },
    { name: 'a seed of the wrong primitive type fails, and this is what stops a page that renders and lies', seed: { label: 42 },
      pattern: /declares string and the fixture holds number/ },
    { name: 'a seed outside an enum\'s declared values fails, naming the values', seed: { label: 'x', tone: 'gold' },
      pattern: /"gold" is not one of ArenaTone's \["neutral","accent","danger"\]/ },
  ];
  for (const row of rows) assert.match(seedProblems('Widget', widget, { seed: row.seed } as any, types)[0] ?? '', row.pattern, row.name);
});

test('an array seed is checked item by item', () => {
  assert.match(
    valueProblems('w.columns', memberOf('columns'), [{ header: 'Service' }, { header: 7 }], types)[0] ?? '',
    /columns\[1\]\.header: declares string and the fixture holds number/,
  );
});

test('an object seed is checked field by field, including a field the type does not declare', () => {
  assert.match(objectProblems('w.sort', 'ArenaTableSort', { column: 0, direction: 'asc', nope: 1 }, types)[0] ?? '', /ArenaTableSort declares no such field/);
});

test('an object seed omitting a required field fails', () => {
  assert.match(objectProblems('w.sort', 'ArenaTableSort', { column: 0 }, types)[0] ?? '', /ArenaTableSort.direction is required and the fixture omits it/);
});

test('slotProblems refuses a slot the contract does not declare, a required slot left empty, an uncontracted component and a member the component does not declare', () => {
  const rows: { name: string; slots: object; pattern: RegExp }[] = [
    { name: 'a slot the contract does not declare fails', slots: { footer: [] }, pattern: /declares no such slot/ },
    { name: 'a required slot the fixture leaves empty fails', slots: {}, pattern: /mark is a required slot/ },
    { name: 'a slot node naming an uncontracted component fails', slots: { mark: [{ component: 'Nope' }] }, pattern: /no component named Nope is contracted/ },
    { name: 'a slot node setting a member the named component does not declare fails',
      slots: { mark: [{ component: 'ArenaBadge', members: { size: 'lg' } }] }, pattern: /ArenaBadge declares no such member/ },
  ];
  for (const row of rows) assert.match(slotProblems('Widget', widget, { slots: row.slots } as any, contracts, types)[0] ?? '', row.pattern, row.name);
});

test('the subject placeholder is refused outside a host, where it would mark nothing', () => {
  assert.match(
    nodeProblems('w.slots.mark[0]', '$subject', contracts, types, { allowSubject: false })[0] ?? '',
    /belongs in a host, nowhere else/,
  );
});

test('a host holding no placeholder fails, and one holding two fails', () => {
  const none = fixtureProblems('Widget', widget, { ...ok, host: { component: 'ArenaBadge', slots: { content: [] } } }, contracts, types);
  assert.match(none[0] ?? '', /holding 0 "\$subject" placeholders/);
  const two = fixtureProblems('Widget', widget, { ...ok, host: { component: 'ArenaBadge', slots: { content: ['$subject', '$subject'] } } }, contracts, types);
  assert.match(two[0] ?? '', /holding 2 "\$subject" placeholders/);
});

test('a host node is checked like any other node', () => {
  assert.match(
    hostProblems('Widget', { host: { component: 'ArenaBadge', members: { tone: 'gold' }, slots: { content: ['$subject'] } } }, contracts, types)[0] ?? '',
    /is not one of ArenaTone's/,
  );
});

test('an element node holds children, the subject among them, and a list of nodes is all it holds', () => {
  const paragraph = { element: 'p', children: [{ text: 'Read ' }, '$subject' as const, { text: ' first.' }] };
  assert.deepEqual(hostProblems('Widget', { host: paragraph }, contracts, types), []);
  assert.match(nodeProblems('w', paragraph, contracts, types, { allowSubject: false })[0] ?? '',
    /^w\.children\[1\]: "\$subject" marks where the component under test goes and belongs in a host/);
  assert.match(nodeProblems('w', { element: 'p', children: 'Read' } as any, contracts, types, {})[0] ?? '',
    /^w\.children: an element holds a list of nodes and this is string/);
  assert.match(nodeProblems('w', { element: 'p', text: 'Read', children: [] } as any, contracts, types, {})[0] ?? '',
    /^w: a node carries text or children, never both/);
  assert.match(nodeProblems('w', { element: 'p', children: [{ component: 'ArenaBadge', members: { tone: 'gold' } }] }, contracts, types, {})[0] ?? '',
    /^w\.children\[0\]\.tone: .*is not one of ArenaTone's/);
  assert.match(nodeProblems('w', { element: 'p', slots: {} } as any, contracts, types, {})[0] ?? '',
    /^w: an element node carries element, attrs and text or children, never slots/);
});

test('a host counts the placeholder inside an element\'s children', () => {
  const nested = { component: 'ArenaBadge', slots: { content: [{ element: 'p', children: ['$subject' as const, '$subject' as const] }] } };
  const two = fixtureProblems('Widget', widget, { ...ok, host: nested }, contracts, types);
  assert.match(two[0] ?? '', /holding 2 "\$subject" placeholders/);
});

test('bindProblems refuses a bind that is no event, a payload into another type, a void event with a payload, a wrong patch, a $delta on a non-number and a mismatched $field', () => {
  const field = (target: unknown, event = 'tagsChange') => ({ [event]: target });
  const rows: { name: string; component?: string; contract?: unknown; bind: object; count?: number; pattern?: RegExp }[] = [
    { name: 'a bind naming something that is not an event fails', bind: { label: 'tone' }, pattern: /declares no event called label/ },
    { name: 'a bind writing a payload into a member of another type fails', bind: { sortChange: 'index' }, pattern: /carries ArenaTableSort and index holds number/ },
    { name: 'a bind writing into a field of an object member is resolved through the type', component: 'W',
      contract: { api: { page: { form: 'object', type: 'ArenaTableSort' }, ev: { form: 'event', payload: 'number' } } }, bind: { ev: 'page.column' }, count: 0 },
    { name: 'a void event cannot write a payload anywhere, and says so', bind: { close: 'tone' }, pattern: /carries no payload/ },
    { name: 'a patch is type-checked against the member it writes', bind: { close: { tone: 'gold' } }, pattern: /is not one of ArenaTone's/ },
    { name: '$delta steps a number', bind: { close: { index: { $delta: 1 } } }, count: 0 },
    { name: '$delta is refused on anything else', bind: { close: { tone: { $delta: 1 } } }, pattern: /\$delta steps a number/ },
    { name: '$field copies a payload field into a knob of the same shape', bind: field({ tags: { $field: 'values' } }), count: 0 },
    { name: '$field composes with a step in one patch', bind: field({ tags: { $field: 'values' }, index: { $delta: 1 } }), count: 0 },
    { name: '$field naming a field the payload type lacks is refused', bind: field({ tags: { $field: 'nope' } }), pattern: /ArenaTagSet declares no field called nope/ },
    { name: '$field on an event with no payload is refused', bind: field({ tags: { $field: 'values' } }, 'close'), pattern: /close carries no payload/ },
    { name: '$field on a payload that is not an object is refused', bind: field({ tags: { $field: 'values' } }, 'countChange'),
      pattern: /reads a field of an object and countChange carries number/ },
    { name: '$field into a knob of another shape is refused', bind: field({ index: { $field: 'values' } }), pattern: /\$field values is array<string> and index is primitive<number>/ },
    { name: '$field beside another directive is refused', bind: field({ tags: { $field: 'values', $delta: 1 } }), pattern: /holds a \$field directive and nothing else/ },
    { name: '$field naming a non-string is refused', bind: field({ tags: { $field: 3 } }), pattern: /holds the name of a payload field and this holds number/ },
    { name: '$field into a string knob from a number field is refused', bind: field({ label: { $field: 'column' } }, 'sortChange'),
      pattern: /\$field column is primitive<number> and label is primitive<string>/ },
  ];
  for (const row of rows) {
    const problems = bindProblems(row.component ?? 'Widget', (row.contract ?? widget) as any, { bind: row.bind } as any, types);
    if (row.count !== undefined) assert.equal(problems.length, row.count, `${row.name}: finding count`);
    if (row.pattern) assert.match(problems[0] ?? '', row.pattern, row.name);
  }
});

test('$field compares the array item and not only the form', () => {
  const numbers = { form: 'array', of: 'number', description: 'Numbers.' } as const;
  const tagsChange = { form: 'event', payload: 'ArenaTagSet', description: 'Retagged.' } as const;
  assert.match(fieldProblems('W', 'tagsChange', tagsChange, 'n', numbers, { $field: 'values' }, types)[0] ?? '',
    /array<string> and n is array<number>/);
});

test('the citation check fires on a page name no file carries, which a bare filename is how prose rots', () => {
  const cited = [...citingFiles()];
  const blind = citationProblems(root, cited, new Set());
  assert.ok(
    blind.some((p) => /names \w+\.card\.html, and no file under frameworks\/ is called that/.test(p)),
    'with an empty name index every page a prompt names should be reported, and none was',
  );
});

test('the same citations pass against the real index, so the check is not merely noisy', () => {
  const cited = [...citingFiles()];
  assert.deepEqual(citationProblems(root, cited, basenameIndex(root)), []);
});

test('every real fixture in the tree holds against its real contract', () => {
  const real = loadContracts();
  const fixtures = loadFixtures();
  const realTypes = loadTypes();
  assert.deepEqual(coverageProblems(real, fixtures), []);
  const problems = [...real].flatMap(([name, contract]) =>
    fixtureProblems(name, contract, fixtures.get(name), real, realTypes));
  assert.deepEqual(problems, []);
});

const made: string[] = [];
after(() => { for (const dir of made) rmSync(dir, { recursive: true, force: true }); });

test('citingFiles reads a checks file', () => {
  const temp = mkdtempSync(join(tmpdir(), 'arena-citing-'));
  made.push(temp);
  const dir = join(temp, 'frameworks/react/components/forms/arena-slider');
  mkdirSync(dir, { recursive: true });
  for (const name of ['ArenaSlider.checks.md', 'ArenaSlider.prompt.md', 'ArenaSlider.notes.md']) {
    writeFileSync(join(dir, name), 'text\n');
  }
  const read = citingFiles(temp).map((path) => relPosix(dir, path)).sort();
  assert.deepEqual(read, ['ArenaSlider.checks.md', 'ArenaSlider.prompt.md']);
});

test('the codec emission is compared against the source, so a hand-edited copy fails', () => {
  const files = buildPlaygrounds(root).files;
  const temp = mkdtempSync(join(tmpdir(), 'arena-playgrounds-'));
  made.push(temp);
  for (const [rel, body] of files) {
    mkdirSync(dirname(join(temp, rel)), { recursive: true });
    writeFileSync(join(temp, rel), body);
  }
  assert.deepEqual(emissionProblems(temp, files), []);
  const codec = 'frameworks/react/playground/PlaygroundCodec.generated.ts';
  writeFileSync(join(temp, codec), 'not what is on disk');
  assert.match(emissionProblems(temp, files)[0] ?? '', /stale — run bun run generate:playgrounds/);
  rmSync(join(temp, codec));
  assert.match(emissionProblems(temp, files)[0] ?? '', /missing — run bun run generate:playgrounds/);
});

test('copies that are not byte-identical fail, which is the claim the whole emission exists to make', () => {
  const files = new Map([
    ['frameworks/react/playground/PlaygroundCodec.generated.ts', 'a'],
    ['frameworks/angular/playground/PlaygroundCodec.generated.ts', 'b'],
  ]);
  assert.ok(emissionProblems(root, files).some((p) => /the same URL can resolve to two different views/.test(p)));
});

test('an emission of nothing is a failure rather than a clean pass', () => {
  assert.match(emissionProblems(root, new Map())[0] ?? '', /an empty emit is a failure/);
});

test('every component gets an emitted page in both layers, which is what a citation resolves against', () => {
  const pages = pagePaths(root);
  assert.equal(pages.length, 200);
  assert.equal(pages.filter((p) => p.startsWith('frameworks/react/')).length, 100);
  assert.equal(pages.filter((p) => p.startsWith('frameworks/angular/')).length, 100);
});

test('a class on a component that answers its family passes, and one it does not answer fails', () => {
  const button: ComponentContract = { component: 'ArenaButton', api: { content: { form: 'slot', description: 'The label.' } } };
  const all = new Map([...contracts, ['ArenaButton', button]]);
  assert.deepEqual(nodeProblems('w', { component: 'ArenaButton', class: 'arena-fill' }, all, types, {}), []);
  assert.match(
    nodeProblems('w', { component: 'ArenaBadge', class: 'arena-fill' }, all, types, {})[0] ?? '',
    /ArenaBadge does not answer the fill family/,
  );
});

test('a class that is no option of any family fails', () => {
  assert.match(
    nodeProblems('w', { component: 'ArenaBadge', class: 'arena-wide' }, contracts, types, {})[0] ?? '',
    /arena-wide is not an option of any family/,
  );
});

test('two options of one family on one node fail, on a node and on the fixture', () => {
  const two = { component: 'ArenaButton', class: 'arena-fill arena-fit' };
  const button: ComponentContract = { component: 'ArenaButton', api: { content: { form: 'slot', description: 'The label.' } } };
  const all = new Map([...contracts, ['ArenaButton', button]]);
  assert.ok(nodeProblems('w', two, all, types, {}).some((p) => /two options of the fill family/.test(p)));
  assert.ok(fixtureProblems('ArenaButton', button, { component: 'ArenaButton', class: 'arena-fill arena-fit' }, all, types)
    .some((p) => /two options of the fill family/.test(p)));
});

test('a text node carries no class, and a fixture may hold the class key', () => {
  assert.match(nodeProblems('w', { text: 'a', class: 'arena-fill' } as any, contracts, types, {})[0] ?? '', /never class/);
  assert.deepEqual(shapeProblems('Widget', { ...ok, class: 'arena-fill' } as any), []);
});

test('a context class on a component that answers the family without that option fails, and one it does not answer at all is reach', () => {
  const families = new Map([['size', {
    family: 'size', reach: 'context' as const, description: 'The size.',
    variants: { 'arena-size-md': '', 'arena-size-xl': '' },
  }]]);
  const answering = { answers: [{ family: 'size', options: ['arena-size-md'], default: 'arena-size-md' }] };
  const source = (manifest: unknown) => ({ families, manifest: () => manifest as any });
  assert.deepEqual(classProblems('w', 'ArenaButton', 'arena-size-md', source(answering)), []);
  assert.match(classProblems('w', 'ArenaButton', 'arena-size-xl', source(answering))[0] ?? '',
    /ArenaButton answers the size family without arena-size-xl/);
  assert.deepEqual(classProblems('w', 'ArenaCard', 'arena-size-xl', source({ answers: [] })), []);
  assert.deepEqual(classProblems('w', 'ArenaCard', 'arena-size-xl', source(null)), []);
});

test('variantProblems checks a variant as a partial seed: a wrong value, an unknown member, a repeat of the seed, a required member taken out', () => {
  const seed = { label: 'Client Portal' };
  const rows: { name: string; component?: string; fixture: object; count?: number; pattern?: RegExp; whole?: boolean }[] = [
    { name: 'a variant is a partial seed laid over the seed, and each member it holds is checked like a seed member', whole: true, count: 0,
      fixture: { component: 'Widget', seed, variants: { loud: { tone: 'danger' } } } },
    { name: 'a variant holding a wrong value names the variant', fixture: { component: 'Widget', seed, variants: { odd: { tone: 'loud' } } },
      pattern: /Widget\.variants\.odd\.seed\.tone/ },
    { name: 'a variant holding an unknown member names the variant', fixture: { component: 'Widget', seed, variants: { odd: { nope: 1 } } },
      pattern: /Widget\.variants\.odd\.seed\.nope: the contract declares no such member/ },
    { name: 'a variant holding nothing new fails', fixture: { component: 'Widget', seed, variants: { same: { label: 'Client Portal' } } },
      pattern: /draws the seed unchanged/ },
    { name: 'a variant may repeat the seed where SEED_REPEATS says so', component: 'ArenaPaletteScope', count: 0,
      fixture: { component: 'ArenaPaletteScope', seed, variants: { light: { label: 'Client Portal' } } } },
    { name: 'the SEED_REPEATS entry fails once it stops repeating', component: 'ArenaPaletteScope',
      fixture: { component: 'ArenaPaletteScope', seed, variants: { light: { label: 'Other' } } }, pattern: /outlived what it was written for/ },
    { name: 'a variant taking a required member out of the seed fails, since the chart would throw',
      fixture: { component: 'Widget', seed: { label: 'x' }, variants: { bare: { label: null } } }, pattern: /label is required and carries no default/ },
  ];
  for (const row of rows) {
    const component = row.component ?? 'Widget';
    const problems = variantProblems(component, widget, row.fixture as any, types);
    if (row.count !== undefined) assert.equal(problems.length, row.count, `${row.name}: finding count`);
    if (row.pattern) assert.match(problems[0] ?? '', row.pattern, row.name);
    if (row.whole) assert.deepEqual(fixtureProblems(component, widget, { ...ok, variants: (row.fixture as any).variants }, contracts, types), [], `${row.name}: the whole fixture`);
  }
});
