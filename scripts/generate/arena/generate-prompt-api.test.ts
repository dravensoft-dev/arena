import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { axesOf, readFamilies, type Family } from '../../lib/tailwind/vocabulary.ts';
import {
  typeCell, defaultCell, memberRow, renderRegion, applyRegion, fenceEnd, signature,
  promptPaths, writePromptApis, openLine, CLOSE_LINE, CONSUMER_DATA,
  renderAnswersRegion, applyAnswersRegion, renderRulesRegion, ANSWERS_CLOSE_LINE, ANSWERS_OPEN_LINE, answeredFamilies,
} from './generate-prompt-api.ts';

test('an array names what it holds, and consumer data keeps its one spelling', () => {
  assert.equal(typeCell({ form: 'array', of: 'ArenaCrumb' }), '`readonly ArenaCrumb[]`');
  assert.equal(typeCell({ form: 'array', of: 'consumerData' }), `\`readonly ${CONSUMER_DATA}[]\``);
  assert.equal(typeCell({ form: 'consumerData' }), `\`${CONSUMER_DATA}\``);
});

test('an event with no payload has no type, because there is nothing to carry', () => {
  assert.equal(typeCell({ form: 'event' }), '');
  assert.equal(typeCell({ form: 'event', payload: 'boolean' }), '`boolean`');
});

test('a functionInput renders the signature the contract models', () => {
  assert.equal(
    typeCell({ form: 'functionInput', params: { value: 'string' }, returns: 'string' }),
    '`(value: string) => string`',
  );
  assert.equal(signature({ a: 'string', b: 'number' }), 'a: string, b: number');
});

test('a slot carries a type only when it is parameterised', () => {
  assert.equal(typeCell({ form: 'slot' }), '');
  assert.equal(typeCell({ form: 'slot', params: { row: 'ArenaTableColumn' } }), '`(row: ArenaTableColumn)`');
});

test('a default is written in its JSON form, so a string zero is not read as a number', () => {
  assert.equal(defaultCell({ default: 'md' }), '`"md"`');
  assert.equal(defaultCell({ default: 0 }), '`0`');
  assert.equal(defaultCell({ default: false }), '`false`');
  assert.equal(defaultCell({}), '');
});

test('a member row binds the name to the layer and stars a required one', () => {
  const spec = { form: 'slot', required: true, description: 'The label text.' };
  assert.equal(memberRow('content', spec, 'react'), '| `children*` | slot |  |  | The label text. |');
  assert.equal(memberRow('content', spec, 'angular'), '| `content*` | slot |  |  | The label text. |');
});

test('a description spanning lines becomes one cell, and a pipe cannot split the row', () => {
  const spec = { form: 'primitive', type: 'string', description: 'one\ntwo | three' };
  assert.match(memberRow('a', spec, 'react'), /\| one two \\\| three \|$/);
});

test('a component declaring no member says so rather than drawing an empty table', () => {
  const region = renderRegion({ component: 'X', api: {} }, 'react');
  assert.ok(region.includes('declares none'));
  assert.ok(!region.includes('| Member |'));
  assert.ok(region.startsWith(openLine('X')));
  assert.ok(region.endsWith(CLOSE_LINE));
});

test('the region lands after the first example when the markers are absent', () => {
  const source = 'What it is.\n\n```tsx\n<X />\n```\n\nDo not do that.\n';
  const out = applyRegion(source, 'REGION');
  assert.equal(out, 'What it is.\n\n```tsx\n<X />\n```\n\nREGION\n\nDo not do that.\n');
});

test('a second run replaces the region in place rather than adding another', () => {
  const first = applyRegion('What it is.\n\n```tsx\n<X />\n```\n', renderRegion({ component: 'X', api: {} }, 'react'));
  const second = applyRegion(first, renderRegion({ component: 'X', api: {} }, 'react'));
  assert.equal(first, second);
  assert.equal(second.split(CLOSE_LINE).length - 1, 1);
});

test('a fence closes only on a run at least as long as the one that opened it', () => {
  assert.equal(fenceEnd('````\n```\n````\n'), 2);
  assert.equal(fenceEnd('no fence here\n'), -1);
});

test('a prompt with no example to place the region after is an error, never a silent skip', () => {
  assert.throws(() => applyRegion('Just prose.\n', 'REGION'), /no fenced example/);
});

test('a region that opens and never closes is an error rather than a second region', () => {
  assert.throws(() => applyRegion(`${openLine('X')}\nrows\n`, 'REGION'), /never closes/);
});

test('every prompt in the tree is reached, in both layers', () => {
  const paths = promptPaths();
  assert.ok(paths.length > 100, `reached only ${paths.length} prompt(s)`);
  for (const layer of ['react', 'angular']) {
    assert.ok(paths.some((p) => p.layer === layer), `reached no ${layer} prompt`);
  }
});

test('a fresh run over the committed tree writes nothing, which is what the gate asserts', () => {
  const written = writePromptApis({ write: () => { throw new Error('wrote a file'); } });
  assert.deepEqual(written, []);
});

const FILL = {
  family: 'fill', reach: 'box', description: 'd', default: 'arena-fit',
  variants: { 'arena-fill': '[--arena-fill-width:100%]', 'arena-fit': '[--arena-fill-width:fit-content]' },
} as const;

test('a prompt names the families its component answers, in its layer\'s idiom, linked to their rows', () => {
  const react = renderAnswersRegion('ArenaButton', 'react', [FILL]);
  assert.match(react, /\*\*Answers\*\* \[`fill`\]\(\.\.\/\.\.\/\.\.\/\.\.\/VOCABULARY\.md#fill\): `arena-fill`, `arena-fit` \(default\)\. Write one as `className="arena-fill"`/);
  assert.match(renderAnswersRegion('ArenaButton', 'angular', [FILL]), /`class="arena-fill"`/);
  assert.match(renderAnswersRegion('ArenaCard', 'react', []), /No family of the \[vocabulary\]\(\.\.\/\.\.\/\.\.\/\.\.\/VOCABULARY\.md\) decides anything in this component's own box/);
});

test('the region lands after the members table and is replaced in place on a second run', () => {
  const source = 'intro\n<!-- @api GENERATED from x -->\ntable\n<!-- @api end -->\nprose\n';
  const once = applyAnswersRegion(source, renderAnswersRegion('ArenaCard', 'react', []));
  assert.ok(once.indexOf(ANSWERS_CLOSE_LINE) > once.indexOf('<!-- @api end -->'));
  assert.equal(applyAnswersRegion(once, renderAnswersRegion('ArenaCard', 'react', [])), once);
});

test('the rules note says a component takes a class of the vocabulary, with the layer\'s own attribute', () => {
  assert.match(renderRulesRegion('react'), /component takes a class of the vocabulary and no other, so put no `className` of your own on it\./);
  assert.match(renderRulesRegion('angular'), /component takes a class of the vocabulary and no other, so put no `class` of your own on it\./);
  assert.doesNotMatch(renderRulesRegion('react'), /styling surface/);
});

test('a region lists what the component answers of a family, not the family\'s whole set', () => {
  const toast = renderAnswersRegion('ArenaToastHost', 'angular', answeredFamilies('ArenaToastHost'));
  const placement = toast.split('\n').find((line) => line.includes('#placement')) ?? '';
  const named = [...placement.matchAll(/`(arena-placement-[a-z-]+)`/g)].map((m) => m[1]).sort();
  assert.deepEqual(named, ['arena-placement-bottom-end', 'arena-placement-bottom-start', 'arena-placement-top-end', 'arena-placement-top-start']);
  assert.match(placement, /`arena-placement-bottom-end` \(default\)/);
  assert.doesNotMatch(placement, /class="arena-placement-bottom"/);
  const button = renderAnswersRegion('ArenaButton', 'react', answeredFamilies('ArenaButton'));
  assert.doesNotMatch(button, /arena-size-2xl/);
});

const WIDTH = { family: 'grid', reach: 'box', description: 'd', default: 'arena-grid-sm', axis: ['--arena-grid-min', '--arena-grid-gap'],
  variants: { 'arena-grid-sm': '[--arena-grid-size:1px]' } } as Family;
const COLUMN = { family: 'column', reach: 'box', target: 'keyed', keyed: 'key', description: 'd', variants: {},
  properties: ['--arena-column-<key>-width', '--arena-column-<key>-align'], channels: ['--arena-column-width', '--arena-column-align'],
  binds: ['ArenaTable'] } as Family;

function everyAnswersRegion(): [string, string, string][] {
  return promptPaths().map(({ component, layer, path }) => {
    const lines = readFileSync(join(repoRoot, path), 'utf8').split('\n');
    const from = lines.findIndex((line) => ANSWERS_OPEN_LINE.test(line));
    const to = lines.indexOf(ANSWERS_CLOSE_LINE, from);
    assert.ok(from !== -1 && to !== -1, `${path} has no answers region`);
    return [component, layer, lines.slice(from, to + 1).join('\n')];
  });
}

test('every property an answers region names is an axis or a keyed property of a family the component answers', () => {
  const families = readFamilies();
  const regions = everyAnswersRegion();
  assert.ok(regions.length > 100, `read only ${regions.length} answers region(s)`);
  for (const [component, layer, region] of regions) {
    for (const [, property] of region.matchAll(/`(--arena-[a-z<>-]+)`/g)) {
      const owners = [...families.values()].filter((f) => axesOf(f).includes(property!) || (f.properties ?? []).includes(property!));
      assert.ok(owners.length === 1, `${component} (${layer}) names ${property}, which no family declares`);
      const answered = answeredFamilies(component).map((one) => one.family);
      assert.ok(answered.includes(owners[0]!.family), `${component} (${layer}) names ${property}, and does not answer ${owners[0]!.family}`);
    }
  }
});

test('a family with axes names each as a property, and a keyed family the component binds names its own', () => {
  const region = renderAnswersRegion('ArenaGrid', 'react', [WIDTH]);
  assert.match(region, /Property: `--arena-grid-min` \(and `--arena-grid-gap`\), set on a container of yours for a value no option names\./);
  const table = renderAnswersRegion('ArenaTable', 'react', [COLUMN]);
  assert.match(table, /\*\*Answers\*\* \[`column`\]\([^)]*VOCABULARY\.md#column\): keyed by each column's `key`, as `--arena-column-<key>-width` and `--arena-column-<key>-align`, set on the component or a container of yours\./);
  assert.doesNotMatch(renderAnswersRegion('ArenaCard', 'react', [COLUMN]), /column/);
  assert.match(renderAnswersRegion('ArenaCard', 'react', [COLUMN]), /No family of the/);
});

test('a keyed family reaches the prompt of each component it binds, and of no other', () => {
  const families = new Map<string, any>([['column', COLUMN]]);
  const manifests = new Map<string, any>();
  assert.deepEqual(answeredFamilies('ArenaTable', repoRoot, families, manifests).map((one) => one.family), ['column']);
  assert.deepEqual(answeredFamilies('ArenaCard', repoRoot, families, manifests), []);
});
