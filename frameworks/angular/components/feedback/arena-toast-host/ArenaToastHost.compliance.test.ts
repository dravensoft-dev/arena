/* `none` requires nothing, so assertPattern alone would pass over a host that had
 * grown a role, a live region or a tab stop. The claim the binding makes is that the
 * announcement belongs to each notice inside, and that is what the hand assertions
 * below check: a second live region here would announce every notice twice. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { assertSameNode } from '../../../test/NodeAssert';
import { ArenaToastHost } from './ArenaToastHost';
import { ArenaToast } from '../arena-toast/ArenaToast';
import { assertPattern, isFocusable, ANGULAR_COMPONENTS } from '../../../test/Compliance';

const BINDING = join(ANGULAR_COMPONENTS, 'feedback/arena-toast-host/ArenaToastHost.behaviour.json');

@Component({
  standalone: true,
  imports: [ArenaToastHost, ArenaToast],
  template: `
    <arena-toast-host>
      <arena-toast title="First" tone="success" />
      <arena-toast title="Second" tone="danger" />
    </arena-toast-host>
  `,
})
class ToastHostPage {}

function render(patch: Partial<ToastHostPage> = {}) {
  const fixture = TestBed.createComponent(ToastHostPage);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  return fixture;
}

test('arena-toast-host carries no role and no live region of its own -- the notices inside do the announcing', () => {
  const fixture = render();
  try {
    const host = fixture.nativeElement.querySelector('arena-toast-host') as HTMLElement;
    assert.equal(host.getAttribute('role'), null,
      'a role on the container claims an affordance the box does not have');
    assert.equal(host.getAttribute('aria-live'), null,
      'a live region around live regions announces every notice twice');

    const notices = Array.from(host.querySelectorAll('arena-toast'));
    assert.equal(notices.length, 2, 'sanity: both notices projected');
    assert.deepEqual(notices.map((n) => n.getAttribute('aria-live')), ['polite', 'assertive'],
      'each notice must keep announcing for itself, by its own tone');

    assertPattern({
      root: host,
      bindingPath: BINDING,
      subjects: { default: host },
    });
  } finally {
    fixture.destroy();
  }
});

test('nothing in the host is reachable by keyboard except what a notice put there', () => {
  const fixture = render();
  try {
    const host = fixture.nativeElement.querySelector('arena-toast-host') as HTMLElement;
    assert.equal(host.getAttribute('tabindex'), null, 'the container must not be a tab stop');
    assert.equal(isFocusable(host), false, 'the container must not be able to take focus');
  } finally {
    fixture.destroy();
  }
});

test('raising a stack does not move focus off whatever the user was on', () => {
  const anchor = document.createElement('button');
  document.body.appendChild(anchor);
  try {
    anchor.focus();
    assertSameNode(document.activeElement, anchor, 'sanity: focus starts on the anchor button');
    const fixture = render();
    try {
      assertSameNode(document.activeElement, anchor,
        'placing a stack of notices stole focus from whatever the user was doing');
    } finally {
      fixture.destroy();
    }
  } finally {
    anchor.remove();
  }
});

test('the notices come out in the order they went in, so the reading order is the visual order', () => {
  const fixture = render();
  try {
    const host = fixture.nativeElement.querySelector('arena-toast-host') as HTMLElement;
    const read = host.textContent ?? '';
    assert.ok(read.indexOf('First') >= 0 && read.indexOf('First') < read.indexOf('Second'),
      'the stack reordered its children -- the newest would be read last and shown first');
  } finally {
    fixture.destroy();
  }
});

test('the host takes no placement input and writes no placement attribute, because a class on it or above it pins the corner', () => {
  const fixture = render();
  try {
    const hostElement = fixture.nativeElement.querySelector('arena-toast-host') as HTMLElement;
    assert.equal(hostElement.hasAttribute('data-arena-placement'), false);
    assert.ok(hostElement.className.split(/\s+/).includes('arena-toast-host__root'), 'the root class is the slot class');
  } finally {
    fixture.destroy();
  }
});
