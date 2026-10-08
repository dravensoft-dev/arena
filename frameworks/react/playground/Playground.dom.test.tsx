import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup, act } from '../test/Harness.tsx';
import { Playground } from './Playground.tsx';
import {
  baseState, readState, writeSearch, boundValues, applyBind, encode, decode,
} from './PlaygroundCodec.generated.ts';
import { usePlayground } from './PlaygroundState.ts';
import type { Knob, KnobModel, PlaygroundState } from './PlaygroundCodec.generated.ts';

afterEach(cleanup);

function knob(over: Partial<Knob>): Knob {
  return {
    member: 'x',
    form: 'primitive',
    type: 'string',
    bind: 'optional',
    bound: false,
    control: 'text',
    codec: 'raw',
    initial: '',
    nodes: null,
    doc: 'A member.',
    ...over,
  };
}

const model: KnobModel = {
  component: 'Widget',
  description: 'A widget.',
  note: 'A note.',
  affordances: [],
  knobs: [
    knob({ member: 'label', type: 'string', bind: 'pinned', bound: true, initial: 'Client Portal' }),
    knob({ member: 'tone', form: 'enum', type: 'ArenaTone', bind: 'defaulted', bound: true, control: 'select', options: ['neutral', 'accent'], initial: 'neutral' }),
    knob({ member: 'slot', form: 'enum', type: 'ArenaCatSlot', bind: 'defaulted', bound: true, control: 'select', options: [1, 2, 3], initial: 1 }),
    knob({ member: 'open', type: 'boolean', control: 'check', codec: 'flag', bind: 'defaulted', bound: true, initial: false }),
    knob({ member: 'hint', bind: 'optional', bound: false, initial: 'unset' }),
    knob({ member: 'index', type: 'number', control: 'number', codec: 'number', bind: 'defaulted', bound: true, initial: 0 }),
    knob({
      member: 'sort',
      form: 'object',
      type: 'ArenaTableSort',
      control: 'fields',
      codec: 'json',
      bind: 'optional',
      bound: true,
      initial: { column: 0, direction: 'asc' },
      fields: [
        { name: 'column', form: 'primitive', type: 'number', required: true, initial: 0 },
        { name: 'direction', form: 'enum', type: 'ArenaSortDirection', required: true, options: ['asc', 'desc'], initial: 'asc' },
      ],
    }),
  ],
  events: [
    { name: 'sortChange', payload: 'ArenaTableSort', bind: 'sort', doc: 'Sorted.' },
    { name: 'pageChange', payload: 'number', bind: 'sort.column', doc: 'Paged.' },
    { name: 'next', payload: null, bind: { index: { $delta: 1 } }, doc: 'Next.' },
    { name: 'close', payload: null, bind: { open: false }, doc: 'Closed.' },
    { name: 'poke', payload: 'string', bind: null, doc: 'Poked.' },
  ],
  host: null,
  uses: [],
};

const held = (state: PlaygroundState, member: string) => state.held[member];

test('the base state is every knob\'s initial and every knob\'s declared boundness', () => {
  const state = baseState(model);
  assert.equal(held(state, 'label'), 'Client Portal');
  assert.equal(state.bound.label, true);
  assert.equal(state.bound.hint, false);
});

test('an unbound knob reads as undefined, which is what expresses "the member was not passed"', () => {
  const values = boundValues(model, baseState(model));
  assert.equal(values.hint, undefined);
  assert.equal(values.label, 'Client Portal');
});

test('a flag decodes from either spelling, and a number that is not one falls back to the initial', () => {
  const flag = model.knobs.find((k) => k.member === 'open')!;
  assert.equal(decode(flag, '1'), true);
  assert.equal(decode(flag, 'true'), true);
  assert.equal(decode(flag, '0'), false);
  const number = model.knobs.find((k) => k.member === 'index')!;
  assert.equal(decode(number, 'nonsense'), 0);
});

test('a numeric enum decodes back to a number, so ArenaCatSlot does not arrive as a string', () => {
  const slot = model.knobs.find((k) => k.member === 'slot')!;
  assert.equal(decode(slot, '3'), 3);
  assert.equal(encode(slot, 3), '3');
});

test('the query carries only what moved, so an untouched page has an empty one', () => {
  assert.equal(writeSearch(model, baseState(model), ''), '');
});

test('a moved value appears, and binding an off-by-default member appears even unmoved', () => {
  const state = baseState(model);
  state.held.tone = 'accent';
  state.bound.hint = true;
  const search = writeSearch(model, state, '');
  assert.match(search, /tone=accent/);
  assert.match(search, /hint=unset/);
});

test('unbinding a bound-by-default member is spelt in off=, which absence alone could not say', () => {
  const state = baseState(model);
  state.bound.tone = false;
  assert.match(writeSearch(model, state, ''), /off=tone/);
});

test('state round-trips through the query it writes', () => {
  const state = baseState(model);
  state.held.tone = 'accent';
  state.held.index = 7;
  state.held.open = true;
  state.held.sort = { column: 2, direction: 'desc' };
  state.bound.hint = true;
  state.bound.label = true;
  const back = readState(model, writeSearch(model, state, ''));
  assert.deepEqual(back, state);
});

test('the theme and density parameters survive a rewrite, or the shared URL stops reproducing the view', () => {
  const search = writeSearch(model, baseState(model), '?theme=light&density=compact');
  const params = new URLSearchParams(search);
  assert.equal(params.get('theme'), 'light');
  assert.equal(params.get('density'), 'compact');
});

test('a bind writes the payload into its knob and binds it', () => {
  const after = applyBind(baseState(model), 'sort', { column: 4, direction: 'desc' });
  assert.deepEqual(held(after, 'sort'), { column: 4, direction: 'desc' });
  assert.equal(after.bound.sort, true);
});

test('a dotted bind writes one field and leaves the rest of the object alone', () => {
  const after = applyBind(baseState(model), 'sort.column', 5);
  assert.deepEqual(held(after, 'sort'), { column: 5, direction: 'asc' });
});

test('a patch bind writes literals, and $delta steps rather than replaces', () => {
  const patched = applyBind(baseState(model), { open: true }, undefined);
  assert.equal(held(patched, 'open'), true);
  const stepped = applyBind(baseState(model), { index: { $delta: 1 } }, undefined);
  assert.equal(held(stepped, 'index'), 1);
  assert.equal(held(applyBind(stepped, { index: { $delta: -1 } }, undefined), 'index'), 0);
});

function Probe({ onReady }: { onReady: (play: ReturnType<typeof usePlayground>) => void }) {
  const play = usePlayground(model);
  onReady(play);
  return <Playground model={model} play={play}><span data-testid="stage">stage</span></Playground>;
}

function mountProbe() {
  let latest: ReturnType<typeof usePlayground> | null = null;
  const container = mount(<Probe onReady={(play) => { latest = play; }} />);
  return { container, play: () => latest! };
}

test('the panel draws one row per knob and the stage draws its children', () => {
  const { container } = mountProbe();
  assert.equal(container.querySelectorAll('.pg-knob-name').length, model.knobs.length);
  assert.equal(container.querySelector('.pg-stage span')?.getAttribute('data-testid'), 'stage');
});

test('a required member carries no presence box, because it can never be unbound', () => {
  const { container } = mountProbe();
  const rows = [...container.querySelectorAll('.pg-knob')];
  const pinned = rows.find((row) => row.querySelector('.pg-knob-name')?.textContent === 'label');
  assert.equal(pinned?.querySelector('.pg-presence'), null);
});

test('firing an event logs it and applies its bind, so a controlled component is not dead on the page', () => {
  const { container, play } = mountProbe();
  act(() => { play().fire('sortChange', { column: 3, direction: 'desc' }); });
  assert.deepEqual(play().values.sort, { column: 3, direction: 'desc' });
  assert.match(container.querySelector('.pg-log-row')?.textContent ?? '', /sortChange/);
});

test('an event with no bind is logged and changes nothing', () => {
  const { play } = mountProbe();
  const before = play().values.sort;
  act(() => { play().fire('poke', 'hello'); });
  assert.deepEqual(play().values.sort, before);
  assert.equal(play().entries[0]?.name, 'poke');
});

test('the newest event is first, and the log does not grow without bound', () => {
  const { play } = mountProbe();
  act(() => { for (let i = 0; i < 45; i += 1) play().fire('poke', String(i)); });
  assert.equal(play().entries.length, 40);
  assert.equal(play().entries[0]?.payload, '44');
});

test('setting a value moves what the component reads, and unbinding removes it', () => {
  const { play } = mountProbe();
  act(() => { play().setValue('tone', 'accent'); });
  assert.equal(play().values.tone, 'accent');
  act(() => { play().setBound('tone', false); });
  assert.equal(play().values.tone, undefined);
});

test('reset returns every knob to what the fixture and the contract said', () => {
  const { play } = mountProbe();
  act(() => { play().setValue('tone', 'accent'); play().setBound('hint', true); });
  act(() => { play().reset(); });
  assert.equal(play().values.tone, 'neutral');
  assert.equal(play().values.hint, undefined);
});

test('the URL follows the state, and it is replaced rather than pushed', () => {
  const calls: string[] = [];
  const realReplace = window.history.replaceState;
  const realPush = window.history.pushState;
  let pushed = 0;
  window.history.replaceState = ((_s: unknown, _t: string, url: string) => { calls.push(url); }) as typeof realReplace;
  window.history.pushState = (() => { pushed += 1; }) as typeof realPush;
  try {
    const { play } = mountProbe();
    act(() => { play().setValue('tone', 'accent'); });
    assert.match(calls[calls.length - 1] ?? '', /tone=accent/);
    act(() => { play().reset(); });
    assert.doesNotMatch(calls[calls.length - 1] ?? '', /tone=accent/);
    assert.equal(pushed, 0, 'a pushed entry would make Back walk knob states instead of leaving the page');
  } finally {
    window.history.replaceState = realReplace;
    window.history.pushState = realPush;
  }
});

test('the stage carries the model\'s vars as its style, and a model without any leaves it bare', () => {
  const vars = { '--arena-column-status-align': 'right', '--arena-column-status-width': '8rem' };
  const withVars: KnobModel = { ...model, vars };
  const probe = (shown: KnobModel) => {
    function Own() { const play = usePlayground(shown); return <Playground model={shown} play={play}>x</Playground>; }
    return mount(<Own />).querySelector('.pg-stage') as HTMLElement;
  };
  const stage = probe(withVars);
  for (const [name, value] of Object.entries(vars)) assert.equal(stage.style.getPropertyValue(name), value);
  cleanup();
  assert.equal(probe(model).getAttribute('style'), null);
});
