import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  playgroundModel, knobFor, bindClass, neutralValue, neutralObject, objectFields, controlFor,
  isTextNodes, collectUses, countSubjects, typeOf, UnmodelledForm,
  PINNED, DEFAULTED, OPTIONAL, SUBJECT,
} from './playground-model.ts';
import type { ComponentContract, TypeContract } from './contract-shapes.ts';
import type { Fixture, PlaygroundModel } from './playground-model.ts';

const types: Record<string, TypeContract> = {
  ArenaTone: { name: 'ArenaTone', kind: 'enum', values: ['neutral', 'accent', 'danger'] },
  ArenaSortDirection: { name: 'ArenaSortDirection', kind: 'enum', values: ['asc', 'desc'] },
  ArenaTableSort: {
    name: 'ArenaTableSort',
    kind: 'object',
    fields: {
      column: { form: 'primitive', type: 'number', required: true, description: 'The column.' },
      direction: { form: 'enum', type: 'ArenaSortDirection', required: true, description: 'The direction.' },
    },
  },
  ArenaTableColumn: {
    name: 'ArenaTableColumn',
    kind: 'object',
    fields: {
      header: { form: 'primitive', type: 'string', required: true, description: 'The header.' },
      align: { form: 'enum', type: 'ArenaTone', default: 'neutral', description: 'The alignment.' },
    },
  },
};

const contract: ComponentContract = {
  component: 'Widget',
  description: 'A widget.',
  affordances: ['hover'],
  api: {
    label: { form: 'primitive', type: 'string', required: true, description: 'The name.' },
    tone: { form: 'enum', type: 'ArenaTone', default: 'neutral', description: 'The tone.' },
    hint: { form: 'primitive', type: 'string', description: 'A hint.' },
    count: { form: 'primitive', type: 'number', description: 'A count.' },
    open: { form: 'primitive', type: 'boolean', default: false, description: 'Whether open.' },
    columns: { form: 'array', of: 'ArenaTableColumn', required: true, description: 'The columns.' },
    labels: { form: 'array', of: 'string', description: 'The labels.' },
    sort: { form: 'object', type: 'ArenaTableSort', description: 'The sort.' },
    content: { form: 'slot', description: 'The body.' },
    action: { form: 'slot', description: 'The action.' },
    close: { form: 'event', description: 'It closed.' },
    sortChange: { form: 'event', payload: 'ArenaTableSort', description: 'The sort changed.' },
  },
};

const fixture: Fixture = {
  component: 'Widget',
  seed: { label: 'Client Portal', hint: 'Seeded and bound', columns: [{ header: 'Service' }] },
  slots: {
    content: [{ text: 'Body copy.' }],
    action: [{ component: 'ArenaBadge', members: { tone: 'accent' }, slots: { content: [{ text: 'New' }] } }],
  },
  bind: { sortChange: 'sort', close: { open: false } },
  host: null,
  note: 'A note.',
};

const model = () => playgroundModel(contract, fixture, types);
const knobIn = (model: PlaygroundModel, name: string) => {
  const found = model.knobs.find((k) => k.member === name);
  if (!found) throw new Error(`the model declares no knob called ${name}`);
  return found;
};

const knob = (name: string) => knobIn(model(), name);

test('typeOf throws by name on a type no contract declares', () => {
  assert.throws(() => typeOf(types, 'Nope'), UnmodelledForm);
});

test('bindClass reads required first, then a default, then neither', () => {
  assert.equal(bindClass({ required: true, default: 'x' }), PINNED);
  assert.equal(bindClass({ default: 'x' }), DEFAULTED);
  assert.equal(bindClass({}), OPTIONAL);
});

test('a neutral value is the form\'s own empty, and an enum\'s is its first declared value', () => {
  assert.equal(neutralValue({ form: 'primitive', type: 'string' }, types), '');
  assert.equal(neutralValue({ form: 'primitive', type: 'number' }, types), 0);
  assert.equal(neutralValue({ form: 'primitive', type: 'boolean' }, types), false);
  assert.equal(neutralValue({ form: 'enum', type: 'ArenaTone' }, types), 'neutral');
  assert.deepEqual(neutralValue({ form: 'array', of: 'string' }, types), []);
});

test('a neutral object carries every field that is required or defaulted, and nothing else', () => {
  assert.deepEqual(neutralObject(typeOf(types, 'ArenaTableSort'), types), { column: 0, direction: 'asc' });
  assert.deepEqual(neutralObject(typeOf(types, 'ArenaTableColumn'), types), { header: '', align: 'neutral' });
});

test('objectFields carries each field\'s options and initial, so one control can draw them all', () => {
  const fields = objectFields(typeOf(types, 'ArenaTableSort'), types);
  assert.deepEqual(fields.map((f) => f.name), ['column', 'direction']);
  assert.deepEqual(fields[1]?.options, ['asc', 'desc']);
  assert.equal(fields[1]?.initial, 'asc');
  assert.equal(fields[0]?.required, true);
});

test('a control and its codec are decided by form and type together', () => {
  assert.deepEqual(controlFor({ form: 'primitive', type: 'boolean' }, types), { control: 'check', codec: 'flag' });
  assert.deepEqual(controlFor({ form: 'primitive', type: 'number' }, types), { control: 'number', codec: 'number' });
  assert.deepEqual(controlFor({ form: 'primitive', type: 'string' }, types), { control: 'text', codec: 'raw' });
  assert.equal(controlFor({ form: 'enum', type: 'ArenaTone' }, types).control, 'select');
  assert.equal(controlFor({ form: 'array', of: 'number' }, types).control, 'lines');
  assert.equal(controlFor({ form: 'array', of: 'ArenaTableColumn' }, types).control, 'json');
  assert.equal(controlFor({ form: 'object', type: 'ArenaTableSort' }, types).control, 'fields');
});

test('consumerData is refused by name rather than dropped', () => {
  assert.throws(
    () => controlFor({ form: 'consumerData' }, types),
    /consumerData is a record Arena routes and never inspects/,
  );
});

test('a parameterised slot is refused, because no layer may declare a per-item renderer', () => {
  assert.throws(
    () => knobFor('Widget', 'row', { form: 'slot', params: { item: 'string' } }, fixture, types),
    /parameterised slot/,
  );
});

test('a required member with no seed throws and names the fixture that has to supply it', () => {
  assert.throws(
    () => knobFor('Widget', 'label', { form: 'primitive', type: 'string', required: true }, { seed: {} }, types),
    /Widget.demo.json must seed it/,
  );
});

test('a required slot with nothing to fill it throws', () => {
  assert.throws(
    () => knobFor('Widget', 'mark', { form: 'slot', required: true }, { slots: {} }, types),
    /must fill it/,
  );
});

test('a required member takes its initial from the seed and is always bound', () => {
  assert.equal(knob('label').bind, PINNED);
  assert.equal(knob('label').initial, 'Client Portal');
  assert.equal(knob('label').bound, true);
});

test('a defaulted member takes the contract default and is always bound', () => {
  assert.equal(knob('tone').bind, DEFAULTED);
  assert.equal(knob('tone').initial, 'neutral');
  assert.equal(knob('tone').bound, true);
  assert.deepEqual(knob('tone').options, ['neutral', 'accent', 'danger']);
});

test('an optional member the fixture seeds starts BOUND, because a seed is the configuration it chose', () => {
  assert.equal(knob('hint').bind, OPTIONAL);
  assert.equal(knob('hint').bound, true);
  assert.equal(knob('hint').initial, 'Seeded and bound');
});

test('an optional member with no seed holds its form\'s neutral and starts unbound', () => {
  assert.equal(knob('count').initial, 0);
  assert.equal(knob('count').bound, false);
});

test('a seed outranks a contract default, and the member stays bound either way', () => {
  const seeded = playgroundModel(contract, { ...fixture, seed: { ...fixture.seed, tone: 'danger' } }, types);
  const tone = knobIn(seeded, 'tone');
  assert.equal(tone.initial, 'danger');
  assert.equal(tone.bound, true);
  assert.equal(tone.bind, DEFAULTED);
});

test('a slot listed in the fixture starts BOUND, the same rule a seeded member follows', () => {
  assert.equal(knob('content').bound, true);
  assert.equal(knob('action').bound, true);
});

test('a slot holding one text node is editable; one holding a component is presence only', () => {
  assert.equal(knob('content').control, 'slotText');
  assert.equal(knob('content').initial, 'Body copy.');
  assert.equal(knob('action').control, 'slotPresence');
  assert.equal(knob('action').initial, true);
});

test('isTextNodes accepts exactly one text node and nothing else', () => {
  assert.equal(isTextNodes([{ text: 'x' }]), true);
  assert.equal(isTextNodes([{ text: 'x' }, { text: 'y' }]), false);
  assert.equal(isTextNodes([{ component: 'ArenaBadge' }]), false);
  assert.equal(isTextNodes(null), false);
});

test('events are not knobs, and each carries its payload and its write-back target', () => {
  assert.deepEqual(model().knobs.map((k) => k.member).filter((m) => m === 'close'), []);
  const events = model().events;
  assert.deepEqual(events.map((e) => e.name), ['close', 'sortChange']);
  assert.equal(events[0]?.payload, null);
  assert.deepEqual(events[0]?.bind, { open: false });
  assert.equal(events[1]?.payload, 'ArenaTableSort');
  assert.equal(events[1]?.bind, 'sort');
});

test('knobs keep contract order, which is the order every reader already sees', () => {
  assert.deepEqual(
    model().knobs.map((k) => k.member),
    ['label', 'tone', 'hint', 'count', 'open', 'columns', 'labels', 'sort', 'content', 'action'],
  );
});

test('countSubjects reaches through nested slots', () => {
  assert.equal(countSubjects(null), 0);
  assert.equal(countSubjects({ component: 'ArenaTable', slots: { content: [{ component: 'ArenaTableRow', slots: { content: [SUBJECT] } }] } }), 1);
  assert.equal(countSubjects({ component: 'ArenaTable', slots: { content: [SUBJECT, SUBJECT] } }), 2);
});

test('a host with anything but one placeholder throws, naming how many it found', () => {
  assert.throws(
    () => playgroundModel(contract, { ...fixture, host: { component: 'ArenaTable', slots: { content: [] } } }, types),
    /holding 0 "\$subject" placeholders/,
  );
});

test('uses lists every component a host or a slot instantiates, once, in the order met', () => {
  const withHost = playgroundModel(
    contract,
    { ...fixture, host: { component: 'ArenaTable', slots: { content: [{ component: 'ArenaTableRow', slots: { content: [SUBJECT] } }] } } },
    types,
  );
  assert.deepEqual(withHost.uses, ['ArenaTable', 'ArenaTableRow', 'ArenaBadge']);
});

test('a model carries the component\'s own prose and affordances so the page needs no second read', () => {
  const m = model();
  assert.equal(m.component, 'Widget');
  assert.equal(m.description, 'A widget.');
  assert.equal(m.note, 'A note.');
  assert.deepEqual(m.affordances, ['hover']);
});

test('a form outside the nine is refused by name', () => {
  assert.throws(
    () => playgroundModel({ component: 'W', api: { x: { form: 'consumerData' } } }, { seed: {} }, types),
    /consumerData/,
  );
});

test('a fixture\'s vars reach the model, and a fixture without any leaves the field out', () => {
  const vars = { '--arena-column-status-align': 'right' };
  assert.deepEqual(playgroundModel(contract, { ...fixture, vars }, types).vars, vars);
  assert.equal('vars' in model(), false);
});
