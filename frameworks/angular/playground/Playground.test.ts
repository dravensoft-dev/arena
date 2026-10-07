/* Every assertion here that is not about the rendered panel is about the SHARED codec,
 * copied byte for byte from frameworks/demos/PlaygroundCodec.ts into both layers. It is
 * asserted again in this layer rather than trusted from the other one, because the copy
 * is what this layer compiles and a copy nobody exercises is a copy that can be stale. */

import { useTestEnvironment } from '../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { assertNoNode } from '../test/NodeAssert';
import {
  applyBind, baseState, boundValues, decode, encode, readState, writeSearch,
} from './PlaygroundCodec.generated';
import type { Knob, KnobModel, PlaygroundState } from './PlaygroundCodec.generated';
import { PlaygroundStore } from './PlaygroundState';
import { Playground } from './Playground';

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
    knob({ member: 'label', bind: 'pinned', bound: true, initial: 'Client Portal' }),
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
    { name: 'poke', payload: 'string', bind: null, doc: 'Poked.' },
  ],
  host: null,
  uses: [],
};

const held = (state: PlaygroundState, member: string): unknown => state.held[member];

@Component({
  standalone: true,
  imports: [Playground],
  template: '<demo-playground [play]="play"><span data-stage="1">stage</span></demo-playground>',
})
class Host {
  play = new PlaygroundStore(model);
}

function render() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  return fixture;
}

test('the base state is every knob\'s initial and every knob\'s declared boundness', () => {
  const state = baseState(model);
  assert.equal(held(state, 'label'), 'Client Portal');
  assert.equal(state.bound['label'], true);
  assert.equal(state.bound['hint'], false);
});

test('an unbound knob reads as undefined, which is what expresses "the member was not passed"', () => {
  const values = boundValues(model, baseState(model));
  assert.equal(values['hint'], undefined);
  assert.equal(values['label'], 'Client Portal');
});

test('a flag decodes from either spelling, and a number that is not one falls back to the initial', () => {
  const flag = model.knobs[3]!;
  assert.equal(decode(flag, '1'), true);
  assert.equal(decode(flag, 'true'), true);
  assert.equal(decode(flag, '0'), false);
  assert.equal(decode(model.knobs[5]!, 'nonsense'), 0);
});

test('a numeric enum decodes back to a number, so ArenaCatSlot does not arrive as a string', () => {
  const slot = model.knobs[2]!;
  assert.equal(decode(slot, '3'), 3);
  assert.equal(encode(slot, 3), '3');
});

test('the query carries only what moved, so an untouched page has an empty one', () => {
  assert.equal(writeSearch(model, baseState(model), ''), '');
});

test('unbinding a bound-by-default member is spelt in off=, which absence alone could not say', () => {
  const state = baseState(model);
  state.bound['tone'] = false;
  assert.match(writeSearch(model, state, ''), /off=tone/);
});

test('state round-trips through the query it writes', () => {
  const state = baseState(model);
  state.held['tone'] = 'accent';
  state.held['index'] = 7;
  state.held['open'] = true;
  state.held['sort'] = { column: 2, direction: 'desc' };
  state.bound['hint'] = true;
  assert.deepEqual(readState(model, writeSearch(model, state, '')), state);
});

test('the theme and density parameters survive a rewrite, or the shared URL stops reproducing the view', () => {
  const params = new URLSearchParams(writeSearch(model, baseState(model), '?theme=light&density=compact'));
  assert.equal(params.get('theme'), 'light');
  assert.equal(params.get('density'), 'compact');
});

test('a dotted bind writes one field and leaves the rest of the object alone', () => {
  assert.deepEqual(held(applyBind(baseState(model), 'sort.column', 5), 'sort'), { column: 5, direction: 'asc' });
});

test('$delta steps rather than replaces', () => {
  const stepped = applyBind(baseState(model), { index: { $delta: 1 } }, undefined);
  assert.equal(held(stepped, 'index'), 1);
});

test('the panel draws one row per knob and the stage draws its projected content', () => {
  const fixture = render();
  try {
    const root = fixture.nativeElement as HTMLElement;
    assert.equal(root.querySelectorAll('.pg-knob-name').length, model.knobs.length);
    assert.equal(root.querySelector('.pg-stage span')?.getAttribute('data-stage'), '1');
  } finally {
    fixture.destroy();
  }
});

test('a required member carries no presence box, because it can never be unbound', () => {
  const fixture = render();
  try {
    const rows = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.pg-knob')];
    const pinned = rows.find((row) => row.querySelector('.pg-knob-name')?.textContent?.trim() === 'label');
    assertNoNode(pinned?.querySelector('.pg-presence'), 'a pinned knob rendered a presence box');
  } finally {
    fixture.destroy();
  }
});

test('firing an event logs it and applies its bind, so a controlled component is not dead on the page', () => {
  const fixture = render();
  try {
    const store = fixture.componentInstance.play;
    store.fire('sortChange', { column: 3, direction: 'desc' });
    fixture.detectChanges();
    assert.deepEqual(store.values()['sort'], { column: 3, direction: 'desc' });
    const row = (fixture.nativeElement as HTMLElement).querySelector('.pg-log-row');
    assert.match(row?.textContent ?? '', /sortChange/);
  } finally {
    fixture.destroy();
  }
});

test('an event with no bind is logged and changes nothing', () => {
  const fixture = render();
  try {
    const store = fixture.componentInstance.play;
    const before = store.values()['sort'];
    store.fire('poke', 'hello');
    assert.deepEqual(store.values()['sort'], before);
    assert.equal(store.entries()[0]?.name, 'poke');
  } finally {
    fixture.destroy();
  }
});

test('the newest event is first, and the log does not grow without bound', () => {
  const fixture = render();
  try {
    const store = fixture.componentInstance.play;
    for (let i = 0; i < 45; i += 1) store.fire('poke', String(i));
    assert.equal(store.entries().length, 40);
    assert.equal(store.entries()[0]?.payload, '44');
  } finally {
    fixture.destroy();
  }
});

test('setting a value moves what the component reads, and unbinding removes it', () => {
  const fixture = render();
  try {
    const store = fixture.componentInstance.play;
    store.setValue('tone', 'accent');
    assert.equal(store.values()['tone'], 'accent');
    store.setBound('tone', false);
    assert.equal(store.values()['tone'], undefined);
  } finally {
    fixture.destroy();
  }
});

test('reset returns every knob to what the fixture and the contract said', () => {
  const fixture = render();
  try {
    const store = fixture.componentInstance.play;
    store.setValue('tone', 'accent');
    store.setBound('hint', true);
    store.reset();
    assert.equal(store.values()['tone'], 'neutral');
    assert.equal(store.values()['hint'], undefined);
  } finally {
    fixture.destroy();
  }
});

test('the stage carries the model\'s vars as its style, and a model without any leaves it bare', () => {
  const vars = { '--arena-column-status-align': 'right', '--arena-column-status-width': '8rem' };
  const draw = (shown: KnobModel) => {
    @Component({ standalone: true, imports: [Playground], template: '<demo-playground [play]="play">x</demo-playground>' })
    class Own { play = new PlaygroundStore(shown); }
    const fixture = TestBed.createComponent(Own);
    fixture.detectChanges();
    return fixture;
  };
  const withVars = draw({ ...model, vars });
  const without = draw(model);
  try {
    const stage = (withVars.nativeElement as HTMLElement).querySelector('.pg-stage') as HTMLElement;
    for (const [name, value] of Object.entries(vars)) assert.equal(stage.style.getPropertyValue(name), value);
    assert.equal(((without.nativeElement as HTMLElement).querySelector('.pg-stage') as HTMLElement).getAttribute('style'), null);
  } finally {
    withVars.destroy();
    without.destroy();
  }
});
