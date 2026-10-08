import test from 'node:test';
import assert from 'node:assert/strict';
import { basename, dirname, join } from 'node:path';
import { DANGER_FLOOR, KEBAB, RESERVED, floorProblems, nameProblems, reservedProblems } from './style-plugin-rules.ts';
import { scopesIn } from './sheets.ts';
import { POLARITIES } from './palette-keys.ts';
import { walkFiles } from '../../../utils/walk-files.ts';
import { repoRoot } from '../../../lib/arena/repo-root.ts';
import { readFamilies } from '../../../lib/tailwind/vocabulary.ts';

const reading = { 'lh-prose': '1.6', 'lh-heading': '1.15', 'measure-prose': '72ch' };

const at = (over: Record<string, string> = {}) => new Map(Object.entries({ ...reading, ...over }));

test('the danger floor is the strong fill of the danger hue', () => {
  assert.equal(DANGER_FLOOR, 'hue-danger-fill-strong');
});

test('a danger strong fill that is transparent clears the floor', () => {
  assert.deepEqual(floorProblems(at({ [DANGER_FLOOR]: 'transparent' }), 'dark', 'at'), []);
});

test('a danger strong fill that is a colour fails, naming the value, the scope and where the filled surface is', () => {
  const problems = floorProblems(at({ [DANGER_FLOOR]: '#c00' }), 'light', 'at');
  assert.equal(problems.length, 1);
  assert.equal(problems[0],
    'at: --hue-danger-fill-strong is #c00 in light, and danger is outline: its strong fill is transparent '
    + 'in every answer, and the one filled danger surface reads fill-confirm-final');
});

const shippedInTree = () => {
  const manifests = walkFiles(join(repoRoot, 'frameworks', 'tailwind', 'components'))
    .filter((path) => path.endsWith('.manifest.json'))
    .map((path) => `.${basename(dirname(path))}`);
  const options = [...readFamilies().values()].flatMap((family) => Object.keys(family.variants).map((option) => `.${option}`));
  return new Set([...scopesIn([...manifests, ...options].join(' ')), ...POLARITIES]);
};

const stale = (reserved: ReadonlyMap<string, string>, shipped: ReadonlySet<string>) =>
  [...reserved.keys()].filter((name) => shipped.has(name));

test('the source scan reaches the classes a package ships', () => {
  const shipped = shippedInTree();
  for (const name of ['table', 'scroller-item', 'row', 'fill', 'grid-gap-none', 'comfortable', 'light'])
    assert.ok(shipped.has(name), name);
  assert.ok(shipped.size > 100, `the scan found ${shipped.size} classes`);
});

test('a reserved name is never a class the tree ships, so a component that lands deletes its own entry', () => {
  const shipped = shippedInTree();
  assert.deepEqual(stale(RESERVED, shipped), [],
    'an entry the tree ships is stale: the change that ships the class deletes the entry');
  assert.deepEqual(stale(new Map([...RESERVED, ['table', 'ArenaTable, a planted entry (spec 00)']]), shipped), ['table']);
});

test('every reserved name is kebab, is no polarity, and carries a reason naming its spec and no version', () => {
  assert.equal(RESERVED.size, 24);
  for (const [name, reason] of RESERVED) {
    assert.match(name, KEBAB, name);
    assert.ok(!POLARITIES.includes(name), `${name} is a polarity, and a palette may always take its own`);
    assert.match(reason, /\(spec \d{2}\)$/, name);
    assert.doesNotMatch(reason, /\bv?\d+\.\d+/, `${name} names a version`);
  }
});

test('a reserved name is refused as a style plugin, naming the component that holds it', () => {
  assert.deepEqual(nameProblems('popover', POLARITIES, 'stylePlugins[1]'), [
    'stylePlugins[1]: "popover" is held for ArenaPopover, an anchored panel (spec 21), which Arena is going to '
    + 'ship as the class .arena-popover. A build naming it would fail on the release that ships that class, so '
    + 'the name is refused while renaming costs nothing.',
  ]);
  assert.equal(nameProblems('sticky-head', POLARITIES, 'at').length, 1);
  assert.equal(nameProblems('popover', POLARITIES, 'at', ['popover']).length, 1,
    'a name both shipped and held reports once, as shipped');
  assert.match(nameProblems('popover', POLARITIES, 'at', ['popover'])[0] ?? '', /already a class this package ships/);
});

test('a polarity, a near miss and an odd spelling are not reserved', () => {
  for (const name of ['light', 'dark', 'popovers', 'my-popover', 'sticky', 'checkbox-group', 'multi-select',
    'accordion-item', 'brand', 'constructor', '__proto__'])
    assert.deepEqual(reservedProblems(name, 'at'), [], name);
  const odd = nameProblems('Popover', POLARITIES, 'at');
  assert.equal(odd.length, 1);
  assert.match(odd[0] ?? '', /not kebab-case/);
});
