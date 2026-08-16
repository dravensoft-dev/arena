import { useTestEnvironment } from './TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Playground } from '../playground/Playground';
import { PlaygroundStore } from '../playground/PlaygroundState';
import type { Knob, KnobModel } from '../playground/PlaygroundCodec.generated';

const size: Knob = {
  member: 'size', form: 'enum', type: 'ArenaAvatarSize', bind: 'defaulted', bound: true,
  control: 'select', codec: 'raw', options: ['xs', 'sm', 'md', 'lg'], initial: 'md', nodes: null,
  doc: 'The avatar\'s diameter.',
};

const model: KnobModel = {
  component: 'ArenaAvatar', description: '', note: '', affordances: [], knobs: [size], events: [],
  host: null, uses: [],
};

@Component({
  standalone: true,
  imports: [Playground],
  template: '<demo-playground [play]="store" />',
})
class PlaygroundHost {
  readonly store = new PlaygroundStore(model);
}

test('an enum control shows the value it is bound to rather than the first option', () => {
  const fixture = TestBed.createComponent(PlaygroundHost);
  fixture.detectChanges();
  const select = fixture.nativeElement.querySelector('#knob-size') as HTMLSelectElement;
  assert.ok(select, 'the enum knob drew no select at all');
  assert.equal(select.value, 'md',
    'a select takes its value from the option marked selected, and a value written onto the '
    + 'element before its options exist is dropped by the browser with nothing to report it');
});

test('an enum control follows the value the store moves to', () => {
  const fixture = TestBed.createComponent(PlaygroundHost);
  fixture.detectChanges();
  fixture.componentInstance.store.setValue('size', 'lg');
  fixture.detectChanges();
  const select = fixture.nativeElement.querySelector('#knob-size') as HTMLSelectElement;
  assert.equal(select.value, 'lg');
});
