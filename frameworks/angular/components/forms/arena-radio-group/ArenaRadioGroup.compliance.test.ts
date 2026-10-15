/* Three of this pattern's requirements -- focus.roving, ArrowKeys and Space -- are the PLATFORM's
 * rather than Arena's: native radios sharing one `name` get a single tab stop and arrow selection
 * from the browser, and happy-dom implements none of it. A test dispatching ArrowDown would pass
 * identically against a working group and a broken one, so what is asserted is the structural
 * precondition the browser needs. ArenaRadioGroup and ArenaRadio bind the same pattern over the same DOM,
 * so one render answers both bindings, which is the only arrangement the two patterns allow. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { assertSameNode } from '../../../test/NodeAssert';
import { join } from 'node:path';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaRadio } from '../arena-radio/ArenaRadio';
import { ArenaRadioGroup } from './ArenaRadioGroup';
import { assertPattern, ANGULAR_COMPONENTS } from '../../../test/Compliance';

const GROUP_BINDING = join(ANGULAR_COMPONENTS, 'forms/arena-radio-group/ArenaRadioGroup.behaviour.json');
const RADIO_BINDING = join(ANGULAR_COMPONENTS, 'forms/arena-radio/ArenaRadio.behaviour.json');

@Component({
  standalone: true,
  imports: [ArenaRadioGroup, ArenaRadio],
  template: `
    <arena-radio-group [ariaLabel]="ariaLabel" [name]="name" [value]="value"
                       (change)="chosen.push($event)">
      <arena-radio value="production" label="Production" hint="Serves real traffic" />
      <arena-radio value="staging" label="Staging" />
      <arena-radio value="qa" label="QA" [disabled]="qaDisabled" />
    </arena-radio-group>
  `,
})
class RadioGroupHost {
  ariaLabel = 'Deployment target';
  name: string | undefined = 'env';
  value: string | undefined = 'staging';
  qaDisabled = false;
  chosen: string[] = [];
}

function render(patch: Partial<RadioGroupHost> = {}) {
  const fixture = TestBed.createComponent(RadioGroupHost);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const group = host.querySelector('[role="radiogroup"]') as HTMLElement;
  const radios = Array.from(host.querySelectorAll('input[type="radio"]')) as HTMLInputElement[];
  return { fixture, host, group, radios };
}

test('the group is the host itself, carrying the role and the name it is asked for', () => {
  const { fixture, host, group, radios } = render();
  try {
    assert.equal(radios.length, 3, 'sanity: the fixture must render three options');
    assert.equal(group.tagName, 'ARENA-RADIO-GROUP',
      'the role must be on the host, not on a wrapper inside it');
    assertSameNode(group, host.querySelector('arena-radio-group'));
    assert.equal(group.getAttribute('aria-label'), 'Deployment target',
      'the group names what is being chosen; each option names only itself');
    assert.match(group.getAttribute('class') ?? '', /arena-radio__group/);
  } finally {
    fixture.destroy();
  }
});

test('one shared name across the options is what the browser roves, and Arena authors no tabindex', () => {
  const { fixture, host, radios } = render();
  try {
    const names = new Set(radios.map((r) => r.getAttribute('name')));
    assert.equal(names.size, 1,
      'one shared name is what makes the browser treat these as ONE tab stop and one arrow cycle');
    assert.equal(names.has('env'), true, 'the shared name must be the one the caller supplied');
    assert.equal(host.querySelectorAll('[tabindex]').length, 0,
      'Arena must author no tabindex here -- doing so would fight the roving stop the browser gives');
  } finally {
    fixture.destroy();
  }
});

test('an omitted name is generated, still shared, and never collides with a second group', () => {
  const first = render({ name: undefined });
  const second = render({ name: undefined });
  try {
    const a = new Set(first.radios.map((r) => r.getAttribute('name')));
    const b = new Set(second.radios.map((r) => r.getAttribute('name')));
    assert.equal(a.size, 1);
    assert.equal(b.size, 1);
    assert.notDeepEqual([...a], [...b],
      'two groups sharing a generated name would rove as one, so the fallback must be per instance');
  } finally {
    first.fixture.destroy();
    second.fixture.destroy();
  }
});

test('a blank name is generated like an omitted one, because a radio named "" belongs to no group', () => {
  const { fixture, radios } = render({ name: '' });
  try {
    const names = new Set(radios.map((r) => r.getAttribute('name')));
    assert.equal(names.size, 1);
    assert.notEqual([...names][0], '');
  } finally {
    fixture.destroy();
  }
});

test('exactly one option is checked, and it is the one matching the group value', () => {
  const { fixture, radios } = render();
  try {
    assert.equal(radios.filter((r) => r.checked).length, 1,
      'exactly one option checked is what decides where focus lands on entry');
    assert.equal(radios[1].checked, true, 'the checked option must be the one matching `value`');
  } finally {
    fixture.destroy();
  }
});

test('the option pulls its state from the group rather than being handed it', () => {
  const { fixture, host, radios } = render({ value: 'qa' });
  try {
    assert.equal(radios[2].checked, true);
    const dots = host.querySelectorAll('arena-radio span span');
    assert.ok(dots.length > 0, 'the selected option drew no dot');
    const rings = Array.from(host.querySelectorAll('arena-radio label > span:first-child'));
    assert.equal(rings.filter((r) => r.children.length === 1).length, 1,
      'exactly one ring holds a dot, and the option decided that from the group\'s value alone');
  } finally {
    fixture.destroy();
  }
});

test('choosing an option reports through the group, once, carrying the value', () => {
  const { fixture, radios } = render();
  try {
    radios[0].checked = true;
    radios[0].dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    assert.deepEqual(fixture.componentInstance.chosen, ['production'],
      'the option reports to the group and the group emits -- twice would mean the native event escaped too');
  } finally {
    fixture.destroy();
  }
});

test('an uncontrolled group governs itself, so the selection moves without the consumer', () => {
  const { fixture, radios } = render({ value: undefined });
  try {
    assert.equal(radios.filter((r) => r.checked).length, 0,
      'with no value and no default, nothing is checked -- which is what puts focus on the first option');
    radios[2].checked = true;
    radios[2].dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    const after = Array.from(fixture.nativeElement.querySelectorAll('input[type="radio"]')) as HTMLInputElement[];
    assert.equal(after[2].checked, true, 'an uncontrolled group must show the choice it just reported');
  } finally {
    fixture.destroy();
  }
});

test('a disabled option sets the native attribute and reports nothing', () => {
  const { fixture, radios } = render({ qaDisabled: true });
  try {
    assert.equal(radios[2].disabled, true);
    assert.ok(radios[2].hasAttribute('disabled'),
      'the attribute is what makes the browser skip this option while roving');
    radios[2].dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    assert.deepEqual(fixture.componentInstance.chosen, []);
  } finally {
    fixture.destroy();
  }
});

test('the hint renders under its own label and only where one was given', () => {
  const { fixture, host } = render();
  try {
    const options = Array.from(host.querySelectorAll('arena-radio'));
    assert.equal(options[0].textContent?.includes('Serves real traffic'), true);
    assert.equal(options[1].textContent?.includes('Serves real traffic'), false);
  } finally {
    fixture.destroy();
  }
});

for (const [subject, bindingPath] of [['ArenaRadioGroup', GROUP_BINDING], ['ArenaRadio', RADIO_BINDING]] as const) {
  test(`${subject} meets the radiogroup pattern it binds`, () => {
    const { fixture, host, group, radios } = render();
    try {
      assertPattern({
        root: host,
        bindingPath,
        subjects: { default: group, 'roles.item': radios[0], 'states.checked': radios },
        behavioural: { 'focus.roving': true, 'keyboard.ArrowKeys': true, 'keyboard.Space': true },
      });
    } finally {
      fixture.destroy();
    }
  });
}

test('an ariaLabel bound to nothing throws, because input.required only proves it was bound', () => {
  const fixture = TestBed.createComponent(RadioGroupHost);
  fixture.componentInstance.ariaLabel = '  ';
  try {
    assert.throws(() => fixture.detectChanges(), /ArenaRadioGroup: .ariaLabel. is required/,
      'a radiogroup with a whitespace name is announced unlabelled, which is what the member exists to prevent');
  } finally {
    try {
      fixture.destroy();
    } catch {
      return;
    }
  }
});
