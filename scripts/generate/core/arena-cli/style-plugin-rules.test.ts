import test from 'node:test';
import assert from 'node:assert/strict';
import { basename, dirname, join } from 'node:path';
import { KEBAB, NO_PAINT, colourAnswer, keyProblems, typeProblem, valueProblems, POLARITY_HOOKS, RESERVED, floorProblems, highContrastFor, nameProblems, reservedProblems, rootOnlyFor, withDefaults } from './style-plugin-rules.ts';
import { scopesIn } from './sheets.ts';
import { POLARITIES } from './palette-keys.ts';
import { walkFiles } from '../../../utils/walk-files.ts';
import { repoRoot } from '../../../lib/arena/repo-root.ts';
import { readFamilies } from '../../../lib/tailwind/vocabulary.ts';
import { whileHeld } from './cli-fixtures.ts';
import { readColorSlots } from '../../../lib/core/color-slots.ts';
import { readJson } from '../../../utils/read-file.ts';

const reading = { 'lh-prose': '1.6', 'lh-heading': '1.15', 'measure-prose': '72ch' };

const at = (over: Record<string, string> = {}) => new Map(Object.entries({ ...reading, ...over }));

test('a colour role takes transparent as the absence of paint', () => {
  assert.equal(NO_PAINT, 'transparent');
  assert.equal(colourAnswer('transparent', 'x'), true);
  assert.equal(colourAnswer('Transparent', 'x'), false);
  assert.equal(colourAnswer('none', 'x'), false);
  assert.deepEqual(valueProblems('at', 'hue-danger-fill-strong', { $type: 'color', $value: 'transparent' }, { $type: 'color' }), []);
});

test('a coloured danger strong fill is an ordinary answer', () => {
  assert.deepEqual(floorProblems(at({ 'hue-danger-fill-strong': 'var(--color-error)' }), 'dark', 'at'), []);
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

test('no class is held ahead, and a held entry is gone when the case that planted it ends', async () => {
  assert.equal(RESERVED.size, 0);
  await whileHeld('held-name', () => assert.equal(RESERVED.size, 1));
  assert.equal(RESERVED.size, 0);
});

test('every reserved name is kebab, is no polarity, and carries a reason naming its spec and no version', () => {
  for (const [name, reason] of RESERVED) {
    assert.match(name, KEBAB, name);
    assert.ok(!POLARITIES.includes(name), `${name} is a polarity, and a palette may always take its own`);
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

test('the polarity hooks are refused as a palette name and as a style plugin name', () => {
  assert.deepEqual([...POLARITY_HOOKS], ['polarity-dark', 'polarity-light']);
  for (const name of POLARITY_HOOKS) {
    assert.match(reservedProblems(name, 'at')[0] ?? '', /is the polarity hook a runtime palette wears/, name);
    assert.equal(nameProblems(name, POLARITIES, 'stylePlugins[1]').length, 1, name);
  }
  assert.deepEqual(reservedProblems('polarity', 'at'), [], 'only the two hooks are named');
});

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

test('rootOnlyFor\'s media half is highContrastFor', () => {
  const sources = {
    contrast: '@media (prefers-contrast: more) {\n  :root {\n    --bw-surface: var(--bw-strong);\n  }\n}\n',
    environment: ':root {\n  --title-hero-fit: clamp(1px, 2px, 3px);\n}\n',
  };
  assert.ok(highContrastFor('.arena-x', sources).length > 0);
  assert.ok(rootOnlyFor('.arena-x', sources).startsWith(highContrastFor('.arena-x', sources)));
  assert.equal(highContrastFor('.arena-x', { contrast: '', environment: '' }), '');
});

test('rootOnlyFor takes the :root inside the high-contrast query, not an earlier one, and refuses a sheet with none', () => {
  const contrast = ':root { --early: 1; }\n@media (prefers-contrast: more) {\n  :root { --bw-surface: var(--bw-strong); }\n}\n';
  assert.equal(rootOnlyFor('.arena-x', { contrast, environment: '' }),
    '@media (prefers-contrast: more) {\n.arena-x{\n  --bw-surface:var(--bw-strong);\n}\n}');
  assert.throws(() => rootOnlyFor('.arena-x', { contrast: '.a { --x: 1; }', environment: '' }), /no :root block inside @media/);
  assert.throws(() => rootOnlyFor('.arena-x', { contrast: '', environment: '.a { --x: 1; }' }), /no :root block/);
});

test('a silent root plugin takes transparent for a role whose default is the absence of paint', () => {
  const { plugin, defaulted } = withDefaults({ tokens: {}, light: {} }, { 'hue-danger-fill-strong': { default: NO_PAINT } });
  assert.equal(plugin.tokens['hue-danger-fill-strong'], 'transparent');
  assert.ok(defaulted.includes('hue-danger-fill-strong'));
});

test('a slot answer outside its accepts set is refused', () => {
  const colours = new Set(Object.entries(readJson(join(repoRoot, 'contracts/design/roles.json')) as Record<string, { $type?: string }>)
    .filter(([, role]) => role.$type === 'color').map(([name]) => name));
  const known = { slots: readColorSlots(), colourNames: colours, colourRoles: (name: string) => colours.has(name) };
  const ask = (slot: string, value: string) =>
    valueProblems('at', slot, { $type: 'color', $value: value }, undefined, known);
  const fill = 'actions-primary-root-fill-rest';
  for (const value of ['{color.primary}', '{ink-body}', '#fff', '{edge-focus}', '{actions-secondary-root-fill-rest}']) {
    const problems = ask(fill, value);
    assert.equal(problems.length, 1, `${value}: ${problems.join('\n')}`);
    assert.match(problems[0] as string, new RegExp(`--${fill} is `), value);
    for (const accepted of ['{fill-*}', '{emphasis-*-fill}', '{accent-*-fill-soft}, {overlay-*}, transparent. ']) assert.ok((problems[0] as string).includes(accepted), `${value}: names ${accepted}`);
  }
  assert.deepEqual(ask(fill, '{fill-surface}'), []);
  assert.deepEqual(ask('actions-ghost-root-edge-rest', 'transparent'), []);
  assert.equal(ask('actions-primary-root-ink-rest', 'transparent').length, 1);
});

test('an answer to a removed hue slot is refused as an unknown key', () => {
  const known = { slots: readColorSlots() };
  const token = { $type: 'color', $value: '{hue-danger-ink}', $description: 'x' };
  const problems = keyProblems('at', 'hue-danger-mark-ink-rest', token, undefined, known);
  assert.equal(problems.length, 1, problems.join('\n'));
  assert.match(problems[0] as string, /neither a role/);
});

test('a removed component slot is refused as an unknown key', () => {
  const known = { slots: readColorSlots() };
  const token = { $type: 'color', $value: '{fill-surface}', $description: 'x' };
  const problems = keyProblems('at', 'button-primary-root-fill-rest', token, undefined, known);
  assert.equal(problems.length, 1, problems.join('\n'));
  assert.match(problems[0] as string, /button-primary-root-fill-rest/);
  assert.match(problems[0] as string, /neither a role/);
});

test('typeProblem holds a role, a slot and a step to their types, and a missing type is a mismatch', () => {
  const slots = readColorSlots();
  const slot = Object.keys(slots.slots)[0] as string;
  assert.match(typeProblem('w', 'fill-field', 'keyword', { $type: 'color' }) ?? '', /is a keyword here and a color in roles\.json.*transparent is a colour answer/);
  assert.equal(typeProblem('w', 'fill-field', 'color', { $type: 'color' }), null);
  assert.match(typeProblem('w', 'fs-h3', 'number', undefined) ?? '', /an fs step is a dimension/);
  assert.match(typeProblem('w', slot, undefined, undefined, slots) ?? '', /a colour slot is a colour/);
  assert.equal(typeProblem('w', 'unknown-key', 'x', undefined), null);
  const lines = keyProblems('at', 'fill-field', { $type: 'keyword', $description: 'x', $value: 'a' }, { $type: 'dimension' });
  assert.equal(lines[0], 'at: --fill-field is a keyword here and a dimension in roles.json, and the two cannot disagree');
});
