import test from 'node:test';
import assert from 'node:assert/strict';
import { basename, dirname, join } from 'node:path';
import { DANGER_FLOOR, KEBAB, RESERVED, floorProblems, nameProblems, reservedProblems, rootOnlyFor, withDefaults } from './style-plugin-rules.ts';
import { scopesIn } from './sheets.ts';
import { POLARITIES } from './palette-keys.ts';
import { walkFiles } from '../../../utils/walk-files.ts';
import { repoRoot } from '../../../lib/arena/repo-root.ts';
import { readFamilies } from '../../../lib/tailwind/vocabulary.ts';
import { whileHeld } from './cli-fixtures.ts';

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

const POLARITY_HOOKS = ['polarity-dark', 'polarity-light'];

test('the polarity hooks are the only names held ahead, and a held entry is gone when the case that planted it ends', async () => {
  assert.deepEqual([...RESERVED.keys()], POLARITY_HOOKS);
  await whileHeld('held-name', () => assert.equal(RESERVED.size, 3));
  assert.deepEqual([...RESERVED.keys()], POLARITY_HOOKS);
});

test('a name or a plugin called polarity-dark or polarity-light is refused for the hook a runtime palette wears', () => {
  for (const name of POLARITY_HOOKS) {
    assert.match(reservedProblems(name, 'at')[0] ?? '', /held for the polarity hook a runtime palette wears/, name);
    assert.equal(nameProblems(name, POLARITIES, 'at').length, 1, name);
  }
});

test('every reserved name is kebab, is no polarity, and carries a reason naming its spec and no version (the polarity hooks name a hook instead)', () => {
  for (const [name, reason] of RESERVED) {
    assert.match(name, KEBAB, name);
    assert.ok(!POLARITIES.includes(name), `${name} is a polarity, and a palette may always take its own`);
    if (POLARITY_HOOKS.includes(name)) continue;
    assert.match(reason, /\(spec \d{2}\)$/, name);
    assert.doesNotMatch(reason, /\bv?\d+\.\d+/, `${name} names a version`);
  }
});

test('a reserved name is refused as a style plugin, naming the component that holds it', () => whileHeld('held-name', () => {
  assert.deepEqual(nameProblems('held-name', POLARITIES, 'stylePlugins[1]'), [
    'stylePlugins[1]: "held-name" is held for ArenaHeld, a name held for one case (spec 00), which '
    + 'Arena is going to ship as the class .arena-held-name. A build naming it would fail on the release that ships '
    + 'that class, so the name is refused while renaming costs nothing.',
  ]);
  assert.equal(nameProblems('held-name', POLARITIES, 'at').length, 1);
  assert.equal(nameProblems('held-name', POLARITIES, 'at', ['held-name']).length, 1,
    'a name both shipped and held reports once, as shipped');
  assert.match(nameProblems('held-name', POLARITIES, 'at', ['held-name'])[0] ?? '', /already a class this package ships/);
}));

test('a name held by nobody is not refused', () => {
  assert.deepEqual(nameProblems('tree-view', POLARITIES, 'at'), []);
});

test('a polarity, a near miss and an odd spelling are not reserved', () => {
  for (const name of ['light', 'dark', 'tree-views', 'my-tree-view', 'sticky', 'checkbox-group', 'multi-select',
    'accordion-item', 'brand', 'constructor', '__proto__'])
    assert.deepEqual(reservedProblems(name, 'at'), [], name);
  const odd = nameProblems('TreeView', POLARITIES, 'at');
  assert.equal(odd.length, 1);
  assert.match(odd[0] ?? '', /not kebab-case/);
});

const kernel = {
  'ink-body': {},
  'ink-link': { default: '{ink-body}' },
  'ink-visited': { default: '{ink-link}' },
  'r-popover': { default: '{r.lg}' },
};

test('a silent root plugin takes a default through its own answer to the role the default names', () => {
  const { plugin, defaulted } = withDefaults({ tokens: { 'ink-body': '{color.primary}' }, light: {} }, kernel);
  assert.deepEqual(plugin.tokens, {
    'ink-body': '{color.primary}', 'ink-link': '{color.primary}', 'ink-visited': '{color.primary}', 'r-popover': '{r.lg}',
  });
  assert.deepEqual(defaulted, ['ink-link', 'ink-visited', 'r-popover']);
});

test('an answer the plugin gives is never replaced by a default', () => {
  const { plugin, defaulted } = withDefaults(
    { tokens: { 'ink-body': '{color.primary}', 'ink-link': '{color.accent}' }, light: {} }, kernel);
  assert.equal(plugin.tokens['ink-link'], '{color.accent}');
  assert.equal(plugin.tokens['ink-visited'], '{color.accent}', 'a chain resolves through the plugin\'s answer at each step');
  assert.deepEqual(defaulted, ['ink-visited', 'r-popover']);
});

test('a light answer to the target follows the default, and a light answer of the role\'s own stays', () => {
  const followed = withDefaults(
    { tokens: { 'ink-body': '{color.primary}' }, light: { 'ink-body': '{color.neutral}' } }, kernel).plugin;
  assert.equal(followed.light['ink-link'], '{color.neutral}');
  assert.equal(Object.hasOwn(followed.light, 'r-popover'), false, 'a token alias carries no light answer of its own');
  const own = withDefaults(
    { tokens: { 'ink-body': '{color.primary}' }, light: { 'ink-body': '{color.neutral}', 'ink-link': '{color.info}' } }, kernel).plugin;
  assert.equal(own.light['ink-link'], '{color.info}');
  assert.equal(own.tokens['ink-link'], '{color.primary}');
});

test('a later plugin takes a default only through a role it answers, since the root emits every other default', () => {
  const later = { root: null };
  const { plugin, defaulted } = withDefaults({ tokens: { 'ink-link': '{color.accent}' }, light: { 'ink-body': '{color.neutral}' } }, kernel, later);
  assert.deepEqual(plugin.tokens, { 'ink-link': '{color.accent}', 'ink-visited': '{color.accent}' });
  assert.deepEqual(plugin.light, { 'ink-body': '{color.neutral}' }, 'ink-link is its own answer, so the light ink-body stops there');
  assert.deepEqual(defaulted, ['ink-visited']);
  assert.deepEqual(withDefaults({ tokens: {}, light: {} }, kernel, later).plugin.tokens, {});
});

test('a later plugin answering the target and only the light half of the role takes the target for the role\'s dark half', () => {
  const { plugin } = withDefaults(
    { tokens: { 'ink-body': '{color.primary}' }, light: { 'ink-link': '{color.info}' } }, kernel, { root: null });
  assert.equal(plugin.tokens['ink-link'], '{color.primary}');
  assert.equal(plugin.light['ink-link'], '{color.info}');
  const root = withDefaults({ tokens: { 'ink-body': '{color.primary}' }, light: { 'ink-link': '{color.info}' } }, kernel).plugin;
  assert.deepEqual([root.tokens['ink-link'], root.light['ink-link']], [plugin.tokens['ink-link'], plugin.light['ink-link']],
    'a later plugin and a root plugin complete the same answers the same way');
});

test('a root\'s own answer to a defaulted role holds inside a later plugin\'s scope, and a root silent on it lets the later plugin follow', () => {
  const later = { tokens: { 'ink-body': '{color.accent}' }, light: {} };
  const said = withDefaults(later, kernel, { root: { tokens: { 'ink-body': '{color.primary}', 'ink-link': '{color.info}' }, light: {} } }).plugin;
  assert.equal(Object.hasOwn(said.tokens, 'ink-link'), false, 'the root answered ink-link itself, so its answer stands');
  assert.equal(Object.hasOwn(said.tokens, 'ink-visited'), false, 'ink-visited follows ink-link, which does not move here');
  const silent = withDefaults(later, kernel, { root: { tokens: { 'ink-body': '{color.primary}' }, light: {} } }).plugin;
  assert.equal(silent.tokens['ink-link'], '{color.accent}');
  assert.equal(silent.tokens['ink-visited'], '{color.accent}');
});

test('a default naming a role nobody answered, a cycle or a non-alias answers nothing and ends', () => {
  const { plugin, defaulted } = withDefaults({ tokens: {}, light: {} }, {
    'ink-body': {}, 'ink-link': { default: '{ink-body}' },
    a: { default: '{b}' }, b: { default: '{a}' }, self: { default: '{self}' },
    literal: { default: '#ff0000' }, number: { default: 4 },
  });
  assert.deepEqual(plugin.tokens, {});
  assert.deepEqual(defaulted, []);
});

test('with no default declared the plugin comes back as it was, in the same key order', () => {
  const tokens = { 'r-surface': '{r.lg}', 'ink-body': '{color.primary}' };
  const { plugin, defaulted } = withDefaults({ name: 'console', tokens, light: {} },
    { 'r-surface': {}, 'ink-body': {}, constructor: {}, ['__proto__']: {} });
  assert.deepEqual(defaulted, []);
  assert.deepEqual(Object.keys(plugin.tokens), Object.keys(tokens));
  assert.equal(plugin.name, 'console');
});

test('rootOnlyFor restates the :root contrast rule in a media query and the hero fit, and reads only its text', () => {
  const contrast = '/* :root { --no: 1; } */\n@media (prefers-contrast: more) {\n  :root {\n    --bw-surface: var(--bw-strong);\n    --focus-width: var(--sp-1);\n  }\n}\n';
  const environment = ':root {\n  --pad-safe-top: max(var(--sp-0), env(safe-area-inset-top));\n  --title-hero-fit: clamp(1px, calc(2px - (3px - 100cqi) / 24), 4px);\n}\n';
  assert.equal(rootOnlyFor('.arena-x', { contrast, environment }),
    '@media (prefers-contrast: more) {\n.arena-x{\n  --bw-surface:var(--bw-strong);\n  --focus-width:var(--sp-1);\n}\n}\n'
    + '.arena-x{\n  --title-hero-fit:clamp(1px, calc(2px - (3px - 100cqi) / 24), 4px);\n}');
  assert.equal(rootOnlyFor('.arena-x', { contrast: '', environment: '' }), '');
});

test('rootOnlyFor takes the :root inside the high-contrast query, not an earlier one, and refuses a sheet with none', () => {
  const contrast = ':root { --early: 1; }\n@media (prefers-contrast: more) {\n  :root { --bw-surface: var(--bw-strong); }\n}\n';
  assert.equal(rootOnlyFor('.arena-x', { contrast, environment: '' }),
    '@media (prefers-contrast: more) {\n.arena-x{\n  --bw-surface:var(--bw-strong);\n}\n}');
  assert.throws(() => rootOnlyFor('.arena-x', { contrast: '.a { --x: 1; }', environment: '' }), /no :root block inside @media/);
  assert.throws(() => rootOnlyFor('.arena-x', { contrast: '', environment: '.a { --x: 1; }' }), /no :root block/);
});
