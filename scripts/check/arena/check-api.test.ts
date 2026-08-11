import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import {
  bindingName, validateTypes, validateContract, compareSurface, docProblems,
  resolveAngularImplementations, resolveReactImplementations, zeroContractProblems,
} from './check-api.ts';
import { pascal } from '../../utils/case.ts';
import { buildApiModules } from '../../generate/arena/generate-api-types.ts';
import { reactSurface, UnrecognisedShape } from '../../lib/arena/api-surface.ts';
import type { ContractCandidate } from '../../lib/arena/contract-shapes.ts';

const TYPES = new Map([['ArenaTone', 'enum'], ['ArenaCrumb', 'object']]);

const CONTRACT = {
  component: 'ArenaBreadcrumbs',
  api: {
    items: { form: 'array', of: 'ArenaCrumb', required: true },
    separator: { form: 'primitive', type: 'string' },
    navigate: { form: 'event', payload: 'ArenaCrumb' },
  },
};

const TREE = { charts: ['arena-bar-chart'], display: ['arena-tag', 'arena-unauth-card'] };

const layerExists = (layer: string, ext: string) =>
  (tree: Record<string, string[]>, missing: string[] = []) => {
  const gone = new Set(missing);
  const present = new Set();
  for (const [category, dirs] of Object.entries(tree) as [string, string[]][])
    for (const dir of dirs)
      if (!gone.has(dir)) present.add(`frameworks/${layer}/components/${category}/${dir}/${pascal(dir)}.${ext}`);
  return (path: string) => present.has(path);
};
const treeExists = layerExists('angular', 'ts');
const reactTreeExists = layerExists('react', 'd.ts');

test('a complete layer resolves every component to its own PascalCase file and reports nothing', () => {
  const { implementations, problems } = resolveAngularImplementations(TREE, treeExists(TREE));
  assert.deepEqual(problems, []);
  assert.equal(implementations.size, 3);
  assert.equal(implementations.get('ArenaBarChart'), 'frameworks/angular/components/charts/arena-bar-chart/ArenaBarChart.ts');
  assert.equal(implementations.get('ArenaUnauthCard'), 'frameworks/angular/components/display/arena-unauth-card/ArenaUnauthCard.ts');
});

test('a component directory whose PascalCase file is missing is a problem, not a skip -- and the rest of the layer still resolves', () => {

  const { implementations, problems } = resolveAngularImplementations(TREE, treeExists(TREE, ['arena-tag']));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /frameworks\/angular\/components\/display\/arena-tag\/: is a component directory with no ArenaTag\.ts/);
  assert.match(problems[0] ?? '', /clean pass over an unchecked layer/);
  assert.equal(implementations.size, 2);
  assert.ok(!implementations.has('ArenaTag'));
});

test('a layer that yields zero implementations is a failure, not a clean pass', () => {

  const { implementations, problems } = resolveAngularImplementations({}, () => false);
  assert.equal(implementations.size, 0);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /found 0 Angular component implementations/);
  assert.match(problems[0] ?? '', /an empty result set is a failure, not a clean pass/);
});

test('a layer whose every component file is unreadable reports both rules, because both are true', () => {

  const { problems } = resolveAngularImplementations(TREE, () => false);
  assert.equal(problems.length, 4);
  assert.equal(problems.filter((p) => /is a component directory with no/.test(p)).length, 3);
  assert.equal(problems.filter((p) => /found 0 Angular component implementations/.test(p)).length, 1);
});

test('a category holding no directories contributes nothing and is not itself a component', () => {
  const { implementations, problems } = resolveAngularImplementations({ forms: [] }, () => true);
  assert.equal(implementations.size, 0);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /found 0 Angular component implementations/);
});

const REACT_TREE = { charts: ['arena-bar-chart'], display: ['arena-tag', 'arena-unauth-card'] };

test('a complete React layer resolves every component to its own .d.ts and reports nothing', () => {
  const { implementations, problems } = resolveReactImplementations(REACT_TREE, reactTreeExists(REACT_TREE));
  assert.deepEqual(problems, []);
  assert.equal(implementations.size, 3);
  assert.equal(implementations.get('ArenaBarChart'), 'frameworks/react/components/charts/arena-bar-chart/ArenaBarChart.d.ts');
  assert.equal(implementations.get('ArenaUnauthCard'), 'frameworks/react/components/display/arena-unauth-card/ArenaUnauthCard.d.ts');
});

test('a React component directory declaring no surface at all is a problem, not a skip -- and the rest of the layer still resolves', () => {

  const { implementations, problems } = resolveReactImplementations(REACT_TREE, reactTreeExists(REACT_TREE, ['arena-tag']));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /frameworks\/react\/components\/display\/arena-tag\/: is a component directory with no ArenaTag\.tsx and no ArenaTag\.d\.ts/);
  assert.match(problems[0] ?? '', /clean pass over an unchecked layer/);
  assert.equal(implementations.size, 2);
  assert.ok(!implementations.has('ArenaTag'));
});

test('a React layer that yields zero implementations is a failure, not a clean pass', () => {

  const { implementations, problems } = resolveReactImplementations({}, () => false);
  assert.equal(implementations.size, 0);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /found 0 React component implementations/);
  assert.match(problems[0] ?? '', /an empty result set is a failure, not a clean pass/);
});

test('a React layer whose every .d.ts is unreadable reports both rules, because both are true', () => {

  const { problems } = resolveReactImplementations(REACT_TREE, () => false);
  assert.equal(problems.length, 4);
  assert.equal(problems.filter((p) => /is a component directory with no/.test(p)).length, 3);
  assert.equal(problems.filter((p) => /found 0 React component implementations/.test(p)).length, 1);
});

test('the binding table is mechanical: content is children, an event x is onX', () => {
  assert.equal(bindingName('content', 'slot', 'react'), 'children');
  assert.equal(bindingName('mark', 'slot', 'react'), 'mark');
  assert.equal(bindingName('navigate', 'event', 'react'), 'onNavigate');
  assert.equal(bindingName('items', 'array', 'react'), 'items');
  for (const [n = '', f = ''] of [['content', 'slot'], ['navigate', 'event'], ['items', 'array']]) {
    assert.equal(bindingName(n, f, 'angular'), n);
  }
});

test('a platform type is reported as an R4 violation, naming the rule', () => {
  const problems = compareSurface(
    { component: 'X', api: {} },
    [{ name: 'style', form: 'platform', type: 'React.CSSProperties', required: false }],
    'react',
  );
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /R4/);
  assert.match(problems[0] ?? '', /React\.CSSProperties/);
});

test('a union between forms is reported as an R5 violation', () => {
  const problems = compareSurface(
    { component: 'X', api: {} },
    [{ name: 'tabs', form: 'union', parts: ['string', 'TabItem'], required: false }],
    'react',
  );
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /R5/);
});

test('an event payload that is a platform type is an R4 violation of its own', () => {
  const problems = compareSurface(
    { component: 'X', api: { navigate: { form: 'event', payload: 'ArenaCrumb' } } },
    [{ name: 'navigate', form: 'event', payload: 'MouseEvent', platformPayload: true, required: false }],
    'angular',
  );
  assert.ok(problems.some((p) => /R4/.test(p) && /MouseEvent/.test(p)));
});

test('a layer declaring exactly the contract agrees, in both idioms', () => {
  const angular = [
    { name: 'items', form: 'array', of: 'ArenaCrumb', required: true },
    { name: 'separator', form: 'primitive', type: 'string', required: false },
    { name: 'navigate', form: 'event', payload: 'ArenaCrumb', required: false },
  ];
  assert.deepEqual(compareSurface(CONTRACT, angular, 'angular'), []);

  const react = [
    { name: 'items', form: 'array', of: 'ArenaCrumb', required: true },
    { name: 'separator', form: 'primitive', type: 'string', required: false },
    { name: 'onNavigate', form: 'event', payload: 'ArenaCrumb', required: false },
  ];
  assert.deepEqual(compareSurface(CONTRACT, react, 'react'), []);
});

test('a member the contract does not name fails, even when it looks harmless', () => {
  const members = [
    { name: 'items', form: 'array', of: 'ArenaCrumb', required: true },
    { name: 'separator', form: 'primitive', type: 'string', required: false },
    { name: 'navigate', form: 'event', payload: 'ArenaCrumb', required: false },
    { name: 'compact', form: 'primitive', type: 'boolean', required: false },
  ];
  const problems = compareSurface(CONTRACT, members, 'angular');
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /compact/);
  assert.match(problems[0] ?? '', /does not name/);
});

test('an OPTIONAL member a layer omits still fails -- required governs the consumer, never the layer', () => {
  const members = [
    { name: 'items', form: 'array', of: 'ArenaCrumb', required: true },
    { name: 'navigate', form: 'event', payload: 'ArenaCrumb', required: false },
  ];
  const problems = compareSurface(CONTRACT, members, 'angular');
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /separator/);
  assert.match(problems[0] ?? '', /does not declare/);
});

test('the same name in the wrong form fails', () => {
  const members = [
    { name: 'items', form: 'array', of: 'ArenaCrumb', required: true },
    { name: 'separator', form: 'slot', required: false },
    { name: 'navigate', form: 'event', payload: 'ArenaCrumb', required: false },
  ];
  const problems = compareSurface(CONTRACT, members, 'angular');
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /separator/);
  assert.match(problems[0] ?? '', /slot/);
  assert.match(problems[0] ?? '', /primitive/);
});

test('an array of the wrong element type fails', () => {
  const members = [
    { name: 'items', form: 'array', of: 'string', required: true },
    { name: 'separator', form: 'primitive', type: 'string', required: false },
    { name: 'navigate', form: 'event', payload: 'ArenaCrumb', required: false },
  ];
  assert.ok(compareSurface(CONTRACT, members, 'angular').some((p) => /items/.test(p)));
});

test('a primitive member typed differently in the layer is a problem', () => {
  const problems = compareSurface(
    { component: 'ArenaBreadcrumbs', api: { separator: { form: 'primitive', type: 'string' } } },
    [{ name: 'separator', required: false, form: 'primitive', type: 'number' }],
    'react',
  );
  assert.deepEqual(problems, [
    'react/ArenaBreadcrumbs.separator: typed number, contract says string',
  ]);
});

test('a primitive member typed the same in both is not a problem', () => {
  const problems = compareSurface(
    { component: 'ArenaBreadcrumbs', api: { separator: { form: 'primitive', type: 'string' } } },
    [{ name: 'separator', required: false, form: 'primitive', type: 'string' }],
    'react',
  );
  assert.deepEqual(problems, []);
});

test('a contract member required: true implemented as optional by a layer is reported', () => {
  const problems = compareSurface(
    { component: 'X', api: { items: { form: 'array', of: 'ArenaCrumb', required: true } } },
    [{ name: 'items', form: 'array', of: 'ArenaCrumb', required: false }],
    'react',
  );
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /items/);
  assert.match(problems[0] ?? '', /required/);
  assert.match(problems[0] ?? '', /optional/);
});

test('a contract member left optional (no `required` key) implemented as required by a layer is reported -- the contract is the authority in both directions', () => {
  const problems = compareSurface(
    { component: 'X', api: { separator: { form: 'primitive', type: 'string' } } },
    [{ name: 'separator', form: 'primitive', type: 'string', required: true }],
    'angular',
  );
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /separator/);
  assert.match(problems[0] ?? '', /required/);
});

test('matching required-ness on a primitive and an array member reports nothing', () => {
  const problems = compareSurface(
    {
      component: 'X',
      api: {
        items: { form: 'array', of: 'ArenaCrumb', required: true },
        separator: { form: 'primitive', type: 'string' },
      },
    },
    [
      { name: 'items', form: 'array', of: 'ArenaCrumb', required: true },
      { name: 'separator', form: 'primitive', type: 'string', required: false },
    ],
    'react',
  );
  assert.deepEqual(problems, []);
});

test('a required slot mismatched against an optional layer member reports nothing -- Angular\'s <ng-content> cannot declare projected content mandatory', () => {
  const problems = compareSurface(
    { component: 'X', api: { mark: { form: 'slot', required: true } } },
    [{ name: 'mark', form: 'slot', required: false }],
    'angular',
  );
  assert.deepEqual(problems, []);
});

test('an event with mismatched required-ness reports nothing -- an outbound member is never "required", a consumer is always free not to listen', () => {
  const problems = compareSurface(
    { component: 'X', api: { navigate: { form: 'event', payload: 'ArenaCrumb', required: true } } },
    [{ name: 'navigate', form: 'event', payload: 'ArenaCrumb', required: false }],
    'angular',
  );
  assert.deepEqual(problems, []);
});

test('a member name declared twice in one layer\'s surface is reported as a duplicate', () => {
  const contract = { component: 'X', api: { icon: { form: 'slot' } } };
  const members = [
    { name: 'icon', form: 'slot', required: false },
    { name: 'icon', form: 'slot', required: false },
  ];
  const problems = compareSurface(contract, members, 'angular');
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /icon/);
  assert.match(problems[0] ?? '', /twice/);
});

const LOGO_SIZE_TYPES = new Map([
  ['ArenaLogoSize', { name: 'ArenaLogoSize', kind: 'enum', values: ['sm', 'md', 'lg', 'xl'] }],
]);

test('an inline literal union whose values match the contract enum reports nothing', () => {
  const contract = { component: 'X', api: { size: { form: 'enum', type: 'ArenaLogoSize' } } };
  const members = [{ name: 'size', form: 'enum', values: ['sm', 'md', 'lg', 'xl'], required: false }];
  assert.deepEqual(compareSurface(contract, members, 'react', LOGO_SIZE_TYPES), []);
});

test('an inline literal union whose values differ from the contract enum is reported, naming both sets', () => {
  const contract = { component: 'X', api: { size: { form: 'enum', type: 'ArenaLogoSize' } } };
  const members = [{ name: 'size', form: 'enum', values: ['sm', 'md'], required: false }];
  const problems = compareSurface(contract, members, 'react', LOGO_SIZE_TYPES);
  assert.equal(problems.length, 1);
  for (const value of ['sm', 'md', 'lg', 'xl']) assert.match(problems[0] ?? '', new RegExp(value));
});

test('an inline literal union naming an enum absent from the types map reports nothing -- resolution is not this function\'s job', () => {
  const contract = { component: 'X', api: { size: { form: 'enum', type: 'ArenaLogoSize' } } };
  const members = [{ name: 'size', form: 'enum', values: ['sm', 'md'], required: false }];
  assert.deepEqual(compareSurface(contract, members, 'react'), []);
});

test('a named member resolves against an enum contract member, and a type mismatch still fails', () => {
  const contract = { component: 'X', api: { tone: { form: 'enum', type: 'ArenaTone' } } };
  assert.deepEqual(
    compareSurface(contract, [{ name: 'tone', form: 'named', type: 'ArenaTone', required: false }], 'react'),
    [],
  );
  const problems = compareSurface(
    contract,
    [{ name: 'tone', form: 'named', type: 'Status', required: false }],
    'react',
  );
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /Status/);
  assert.match(problems[0] ?? '', /ArenaTone/);
});

test('a named member resolves against an object contract member, and a type mismatch still fails', () => {
  const contract = { component: 'X', api: { crumb: { form: 'object', type: 'ArenaCrumb' } } };
  assert.deepEqual(
    compareSurface(contract, [{ name: 'crumb', form: 'named', type: 'ArenaCrumb', required: false }], 'react'),
    [],
  );
  const problems = compareSurface(
    contract,
    [{ name: 'crumb', form: 'named', type: 'Widget', required: false }],
    'react',
  );
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /Widget/);
  assert.match(problems[0] ?? '', /ArenaCrumb/);
});

test('a named member against a primitive contract member is reported, not coerced into matching', () => {
  const problems = compareSurface(
    { component: 'X', api: { separator: { form: 'primitive', type: 'string' } } },
    [{ name: 'separator', form: 'named', type: 'ArenaDirection', required: false }],
    'react',
  );
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /ArenaDirection/);
  assert.match(problems[0] ?? '', /primitive/);
});

test('a named member against an event contract member is reported, not coerced into matching', () => {
  const problems = compareSurface(
    { component: 'X', api: { navigate: { form: 'event', payload: null } } },
    [{ name: 'onNavigate', form: 'named', type: 'ClickHandler', required: false }],
    'react',
  );
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /ClickHandler/);
  assert.match(problems[0] ?? '', /event/);
});

test('two contract members binding to the same name in one layer is reported as a collision', () => {
  const contract = {
    component: 'X',
    api: {
      content: { form: 'slot' },
      children: { form: 'primitive', type: 'string' },
    },
  };
  const problems = compareSurface(contract, [{ name: 'children', form: 'slot', required: false }], 'react');
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /content/);
  assert.match(problems[0] ?? '', /children/);
  assert.match(problems[0] ?? '', /collide/);
});

test('a collided bound name still reports the member\'s own R4 violation (platform type)', () => {
  const contract = {
    component: 'X',
    api: {
      content: { form: 'slot' },
      children: { form: 'primitive', type: 'string' },
    },
  };
  const problems = compareSurface(
    contract,
    [{ name: 'children', form: 'platform', type: 'React.CSSProperties', required: false }],
    'react',
  );
  assert.equal(problems.length, 2);
  assert.ok(problems.some((p) => /collide/.test(p) && /content/.test(p) && /children/.test(p)));
  assert.ok(problems.some((p) => /R4/.test(p) && /React\.CSSProperties/.test(p)));
});

test('a collided bound name still reports the member\'s own R5 violation (union)', () => {
  const contract = {
    component: 'X',
    api: {
      content: { form: 'slot' },
      children: { form: 'primitive', type: 'string' },
    },
  };
  const problems = compareSurface(
    contract,
    [{ name: 'children', form: 'union', parts: ['string', 'TabItem'], required: false }],
    'react',
  );
  assert.equal(problems.length, 2);
  assert.ok(problems.some((p) => /collide/.test(p) && /content/.test(p) && /children/.test(p)));
  assert.ok(problems.some((p) => /R5/.test(p)));
});

test('an event member colliding with a literally-named onX member is reported, naming both', () => {
  const contract: ContractCandidate = {
    component: 'X',
    api: {
      x: { form: 'event', payload: null },
      onX: { form: 'primitive', type: 'string' },
    },
  };
  const problems = compareSurface(
    contract,
    [{ name: 'onX', form: 'primitive', type: 'string', required: false }],
    'react',
  );
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /collide/);
  assert.match(problems[0] ?? '', /"x"/);
  assert.match(problems[0] ?? '', /"onX"/);
});

test('R1: a predefined object may not carry a slot or an event field', () => {
  const problems = validateTypes([{
    name: 'ArenaCrumb', kind: 'object',
    fields: { label: { form: 'primitive', type: 'string' }, onClick: { form: 'event' } },
  }]);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /R1/);
  assert.match(problems[0] ?? '', /onClick/);
});

test('an object field naming an enum type nobody declared fails', () => {
  const problems = validateTypes([{
    name: 'ArenaWidget', kind: 'object',
    fields: { tone: { form: 'enum', type: 'Nonexistent' } },
  }]);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /Nonexistent/);
});

test('an object field naming a real type that is an object, not an enum, fails', () => {
  const problems = validateTypes([
    { name: 'ArenaCrumb', kind: 'object', fields: { label: { form: 'primitive', type: 'string' } } },
    { name: 'ArenaWidget', kind: 'object', fields: { thing: { form: 'enum', type: 'ArenaCrumb' } } },
  ]);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /ArenaCrumb/);
});

test('an object field naming a declared enum passes', () => {
  const problems = validateTypes([
    { name: 'ArenaTone', kind: 'enum', values: ['neutral', 'accent'] },
    { name: 'ArenaWidget', kind: 'object', fields: { tone: { form: 'enum', type: 'ArenaTone' } } },
  ]);
  assert.deepEqual(problems, []);
});

test('a contract naming a type nobody declared fails', () => {
  const problems = validateContract(
    { component: 'X', api: { items: { form: 'array', of: 'Widget' } } }, TYPES,
  );
  assert.ok(problems.some((p) => /Widget/.test(p)));
});

test('a contract member with a form outside the eight encoded values fails', () => {
  const problems = validateContract(
    { component: 'X', api: { thing: { form: 'callback' } } }, TYPES,
  );
  assert.ok(problems.some((p) => /callback/.test(p)));
});

test('validateContract accepts an event payload that is a primitive type name', () => {
  const problems = validateContract(
    { component: 'X', api: { change: { form: 'event', payload: 'string' } } }, TYPES,
  );
  assert.deepEqual(problems, []);
});

test('an event payload naming an undeclared, non-primitive type still fails', () => {
  const problems = validateContract(
    { component: 'X', api: { change: { form: 'event', payload: 'Widget' } } }, TYPES,
  );
  assert.ok(problems.some((p) => /Widget/.test(p)));
});

test('an enum member must name a declared enum, not a declared object', () => {
  const problems = validateContract(
    { component: 'X', api: { tone: { form: 'enum', type: 'ArenaCrumb' } } }, TYPES,
  );
  assert.ok(problems.some((p) => /ArenaCrumb/.test(p)));
});

test('the committed generated modules are what contracts/api/types/ generates', () => {
  for (const [path, expected] of buildApiModules()) {
    assert.equal(readFileSync(join(root, path), 'utf8'), expected, `${path} is stale — run bun run generate:api`);
  }
});

test('a member shape the reader cannot read throws rather than reporting no members', () => {
  const src = 'export interface XProps { weird: { [k: string]: unknown }; }';
  assert.throws(() => reactSurface(src, 'XProps'), UnrecognisedShape);
});

test('validateTypes rejects consumer data inside a predefined object', () => {
  const problems = validateTypes([
    { name: 'Row', kind: 'object', fields: { meta: { form: 'consumerData' } } },
  ]);
  assert.ok(problems.some((p) => /Row\.meta/.test(p) && /consumer data/i.test(p)));
});

test('validateContract rejects a consumer-data member with no consumer', () => {
  const problems = validateContract(
    { component: 'X', api: { rows: { form: 'array', of: 'consumerData' } } },
    new Map(),
  );
  assert.ok(problems.some((p) => /rows/.test(p) && /no.*consumer/i.test(p)));
});

test('validateContract accepts consumer data routed back out through a slot parameter', () => {
  const problems = validateContract(
    { component: 'X', api: {
      rows: { form: 'array', of: 'consumerData' },
      cell: { form: 'slot', params: { row: 'consumerData' } },
    } },
    new Map(),
  );
  assert.deepEqual(problems, []);
});

test('validateContract accepts consumer data routed back out through an event payload', () => {
  const problems = validateContract(
    { component: 'X', api: {
      rows: { form: 'array', of: 'consumerData' },
      select: { form: 'event', payload: 'consumerData' },
    } },
    new Map(),
  );
  assert.deepEqual(problems, []);
});

test('validateContract accepts a functionInput in a kind:input contract', () => {
  const problems = validateContract(
    { component: 'ArenaInput', kind: 'input',
      api: { validate: { form: 'functionInput', params: { value: 'string' }, returns: 'string' } } },
    new Map(),
  );
  assert.deepEqual(problems, []);
});

test('validateContract rejects a functionInput outside a kind:input contract', () => {
  const problems = validateContract(
    { component: 'X',
      api: { fmt: { form: 'functionInput', params: { value: 'number' }, returns: 'string' } } },
    new Map(),
  );
  assert.ok(problems.some((p) => /fmt/.test(p) && /kind.*input/i.test(p)));
});

test('validateContract checks a functionInput signature type against contracts/api/types', () => {
  const problems = validateContract(
    { component: 'ArenaInput', kind: 'input',
      api: { validate: { form: 'functionInput', params: { value: 'Nope' }, returns: 'string' } } },
    new Map(),
  );
  assert.ok(problems.some((p) => /Nope/.test(p)));
  assert.ok(problems.some((p) => /functionInput parameter/.test(p)));
});

test('validateContract checks a functionInput RETURN type against contracts/api/types too', () => {
  const problems = validateContract(
    { component: 'ArenaInput', kind: 'input',
      api: { validate: { form: 'functionInput', params: { value: 'string' }, returns: 'Nope' } } },
    new Map(),
  );
  assert.ok(problems.some((p) => /Nope/.test(p) && /return/i.test(p)));

  const missing = validateContract(
    { component: 'ArenaInput', kind: 'input', api: { validate: { form: 'functionInput', params: {} } } },
    new Map(),
  );
  assert.ok(missing.some((p) => /validate/.test(p) && /returns/.test(p)));
});

test('a functionInput whose layer parameter type differs from the contract is reported', () => {
  const contract = {
    component: 'ArenaInput', kind: 'input',
    api: { validate: { form: 'functionInput', params: { value: 'string' }, returns: 'string' } },
  };
  const problems = compareSurface(
    contract,
    [{ name: 'validate', form: 'functionInput', params: { value: 'number' }, returns: 'string', required: false }],
    'react',
  );
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /validate/);
  assert.match(problems[0] ?? '', /value/);
  assert.match(problems[0] ?? '', /number/);
  assert.match(problems[0] ?? '', /string/);
});

test('a functionInput whose layer return differs from the contract is reported', () => {
  const contract = {
    component: 'ArenaInput', kind: 'input',
    api: { validate: { form: 'functionInput', params: { value: 'string' }, returns: 'string' } },
  };
  const problems = compareSurface(
    contract,
    [{ name: 'validate', form: 'functionInput', params: { value: 'string' }, returns: 'boolean', required: false }],
    'react',
  );
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /validate/);
  assert.match(problems[0] ?? '', /boolean/);
  assert.match(problems[0] ?? '', /string/);
});

test('a functionInput matching the contract exactly reports nothing, and binds to a prop of the same name', () => {
  const contract = {
    component: 'ArenaInput', kind: 'input',
    api: { validate: { form: 'functionInput', params: { value: 'string' }, returns: 'string' } },
  };
  assert.deepEqual(
    compareSurface(
      contract,
      [{ name: 'validate', form: 'functionInput', params: { value: 'string' }, returns: 'string', required: false }],
      'react',
    ),
    [],
  );

  assert.equal(bindingName('validate', 'functionInput', 'react'), 'validate');
  assert.equal(bindingName('validate', 'functionInput', 'angular'), 'validate');
});

test('a functionInput required by the contract and optional in the layer is reported', () => {
  const contract = {
    component: 'ArenaInput', kind: 'input',
    api: { validate: { form: 'functionInput', params: { value: 'string' }, returns: 'string', required: true } },
  };
  const problems = compareSurface(
    contract,
    [{ name: 'validate', form: 'functionInput', params: { value: 'string' }, returns: 'string', required: false }],
    'react',
  );
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /required/);
  assert.match(problems[0] ?? '', /optional/);
});

test('validateContract accepts an event payload naming a declared enum', () => {
  const problems = validateContract(
    { component: 'X', api: { pick: { form: 'event', payload: 'ArenaLogoSize' } } },
    new Map([['ArenaLogoSize', 'enum']]),
  );
  assert.deepEqual(problems, []);
});

test('validateContract still rejects an event payload naming no declared type', () => {
  const problems = validateContract(
    { component: 'X', api: { pick: { form: 'event', payload: 'Nope' } } },
    new Map([['ArenaLogoSize', 'enum']]),
  );
  assert.ok(problems.some((p) => /Nope/.test(p)));
});

test('zero contracts is a failure, not a clean pass', () => {
  const problems = zeroContractProblems({ contracts: 0, types: 40 });
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /0 contract/);
  assert.match(problems[0] ?? '', /contracts\/api\/components/);
});

test('zero types is a failure too, named separately', () => {
  const problems = zeroContractProblems({ contracts: 50, types: 0 });
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /0 type/);
  assert.match(problems[0] ?? '', /contracts\/api\/types/);
});

test('both empty are reported as two problems, not one', () => {
  assert.equal(zeroContractProblems({ contracts: 0, types: 0 }).length, 2);
});

test('a populated tree has no zero problems', () => {
  assert.deepEqual(zeroContractProblems({ contracts: 50, types: 40 }), []);
});

test('a contracted member with no doc fails, because the description would reach no consumer', () => {
  const contract = {
    component: 'X',
    api: { floating: { form: 'primitive', type: 'boolean', description: 'The shadow.' } },
  };
  const problems = docProblems(contract, new Map(), 'react');
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /carries no \/\*\* \*\/ doc/);
});

test('a doc that has drifted from its contract fails, which is what stops the copy rotting', () => {
  const contract = {
    component: 'X',
    api: { floating: { form: 'primitive', type: 'boolean', description: 'The shadow.' } },
  };
  assert.deepEqual(docProblems(contract, new Map([['floating', 'The shadow.']]), 'react'), []);
  const drifted = docProblems(contract, new Map([['floating', 'The shadows.']]), 'react');
  assert.equal(drifted.length, 1);
  assert.match(drifted[0] ?? '', /drifted from the contract's description/);
});

test('a doc on something no contract names fails, so the shape check:docs allows is never wider than this', () => {
  const contract = { component: 'X', api: {} };
  const problems = docProblems(contract, new Map([['secretly', 'A hand-written note.']]), 'react');
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /is no contracted member/);
});

test('a React event is looked for under its on- name, and a slot under children', () => {
  const contract = {
    component: 'X',
    api: {
      click: { form: 'event', description: 'It was activated.' },
      content: { form: 'slot', description: 'The body.' },
    },
  };
  const docs = new Map([['onClick', 'It was activated.'], ['children', 'The body.']]);
  assert.deepEqual(docProblems(contract, docs, 'react'), []);
});

test('an Angular slot is exempt, because <ng-content> is not a declaration a doc can sit above', () => {
  const contract = { component: 'X', api: { content: { form: 'slot', description: 'The body.' } } };
  assert.deepEqual(docProblems(contract, new Map(), 'angular'), []);
  assert.deepEqual(docProblems(contract, new Map(), 'react').length, 1);
});

test('a member the contract leaves undescribed demands no doc and permits none', () => {
  const contract = { component: 'X', api: { quiet: { form: 'primitive', type: 'boolean' } } };
  assert.deepEqual(docProblems(contract, new Map(), 'react'), []);
  assert.match(docProblems(contract, new Map([['quiet', 'Invented.']]), 'react')[0] ?? '', /is no contracted member/);
});
