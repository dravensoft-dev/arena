/* The two cases are the point of this file: a danger toast is role="alert" with
 * aria-live="assertive" and every other tone is role="status" with "polite", which
 * is what the status pattern requires and what MatSnackBar could not do at all. The
 * noAutoDismiss verdict is earned by firing every timer the render schedules,
 * the way ArenaAlert's own suite does -- arena-toast owns no clock, and this is what
 * proves it rather than restates it. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { assertNoNode, assertSameNode } from '../../../test/NodeAssert';
import { assertPatternCases, ANGULAR_COMPONENTS, isFocusable } from '../../../test/Compliance';
import type { ArenaToastTone } from '../../../Api.generated';
import { ArenaToast } from './ArenaToast';

const BINDING = join(ANGULAR_COMPONENTS, 'feedback/arena-toast/ArenaToast.behaviour.json');

const TONES = ['neutral', 'success', 'danger'] as const;

function renderToast(tone: ArenaToastTone, inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(ArenaToast);
  fixture.componentRef.setInput('tone', tone);
  fixture.componentRef.setInput('title', 'Deployment failed');
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
  return fixture;
}

test('a danger toast interrupts and every other tone queues -- the live region varies with tone, which is what MatSnackBar never did', () => {
  const seen: Record<string, { role: string | null; live: string | null }> = {};
  for (const tone of TONES) {
    const fixture = renderToast(tone);
    try {
      const host = fixture.nativeElement as Element;
      seen[tone] = { role: host.getAttribute('role'), live: host.getAttribute('aria-live') };
    } finally {
      fixture.destroy();
    }
  }
  assert.deepEqual(seen, {
    neutral: { role: 'status', live: 'polite' },
    success: { role: 'status', live: 'polite' },
    danger: { role: 'alert', live: 'assertive' },
  });
});

test('danger implies persist and ignores an explicit false -- a critical message on a timer is one a user can miss', () => {
  const forced = renderToast('danger', { persist: false });
  try {
    const host = forced.nativeElement as Element;
    assert.equal(host.getAttribute('data-persist'), '', 'a danger toast is pinned whatever the host passed');
    assert.ok(host.textContent?.includes('Pinned'), 'and it says so visibly, not only in an attribute');
  } finally {
    forced.destroy();
  }

  const advisory = renderToast('success', { persist: false });
  try {
    const host = advisory.nativeElement as Element;
    assert.equal(host.getAttribute('data-persist'), null, 'any other tone honours persist: false');
    assert.ok(!host.textContent?.includes('Pinned'));
  } finally {
    advisory.destroy();
  }

  const explicit = renderToast('success', { persist: true });
  try {
    assert.equal((explicit.nativeElement as Element).getAttribute('data-persist'), '',
      'and honours persist: true, which is the only way a non-danger toast stays');
  } finally {
    explicit.destroy();
  }
});

test('the close button is gated on dismissible, because Angular cannot ask whether close has a listener', () => {
  const bare = renderToast('neutral');
  try {
    assertNoNode((bare.nativeElement as Element).querySelector('button[aria-label="Close"]'),
      'a toast that is not dismissible must render no close control');
  } finally {
    bare.destroy();
  }

  const fixture = renderToast('neutral', { dismissible: true, actionLabel: 'Retry' });
  try {
    const host = fixture.nativeElement as Element;
    const close = host.querySelector('button[aria-label="Close"]') as HTMLButtonElement;
    const action = host.querySelector('button:not([aria-label])') as HTMLButtonElement;
    assert.ok(close, 'dismissible must render the close control');
    assert.equal(action.textContent?.trim(), 'Retry');

    let closed = 0;
    let acted = 0;
    fixture.componentInstance.close.subscribe(() => { closed += 1; });
    fixture.componentInstance.action.subscribe(() => { acted += 1; });
    close.click();
    action.click();
    assert.equal(closed, 1, 'the close control must report through close, and once');
    assert.equal(acted, 1, 'the inline action must report through action, and once');
  } finally {
    fixture.destroy();
  }
});

test('arena-toast neither takes focus nor moves it -- focus.unaffected, proved by acting on the tree', () => {
  const anchor = document.createElement('button');
  document.body.appendChild(anchor);
  try {
    anchor.focus();
    assertSameNode(document.activeElement, anchor, 'sanity: focus starts on the anchor button');

    const fixture = renderToast('danger', { dismissible: true });
    try {
      const host = fixture.nativeElement as Element;
      assert.equal(host.getAttribute('tabindex'), null, 'a toast must not be placed in the tab order');
      assert.equal(isFocusable(host), false, 'a toast host must not be able to take focus');
      assertSameNode(document.activeElement, anchor,
        'raising a toast must not steal focus from whatever the user was on');
    } finally {
      fixture.destroy();
    }
  } finally {
    anchor.remove();
  }
});

test('arena-toast survives every timer its own render schedules, fired early -- content.noAutoDismiss', () => {
  const globals = globalThis as unknown as Record<string, unknown>;
  const names = ['setTimeout', 'setInterval', 'requestAnimationFrame'] as const;
  const saved = new Map<string, unknown>(names.map((n) => [n, globals[n]]));
  const captured: (() => void)[] = [];

  for (const name of names) {
    const original = saved.get(name);
    if (typeof original !== 'function') continue;
    globals[name] = (callback: unknown, ...rest: unknown[]) => {
      if (typeof callback === 'function') captured.push(() => (callback as (...a: unknown[]) => void)(0));
      return (original as (...a: unknown[]) => unknown)(callback, ...rest);
    };
  }

  let fixture;
  try {
    fixture = renderToast('danger', { dismissible: true, message: 'Build 482 could not be promoted.' });
  } finally {
    for (const [name, original] of saved) globals[name] = original;
  }

  try {
    const host = fixture!.nativeElement as Element;
    assert.ok(captured.length > 0, 'sanity: a real render does schedule something -- Angular\'s own scheduler does');

    for (const fire of captured) fire();
    fixture!.detectChanges();

    assert.equal(host.getAttribute('role'), 'alert', 'the toast must still be a live region after every timer has fired');
    assert.equal(host.getAttribute('data-persist'), '', 'and must still be pinned');
    assert.ok(host.querySelector('button[aria-label="Close"]'),
      'the toast must still be rendered after every timer it scheduled has fired -- the host owns the clock, not the component');
  } finally {
    fixture!.destroy();
  }
});

test('arena-toast meets both of its declared cases', () => {
  const fixtures: ReturnType<typeof renderToast>[] = [];
  try {
    assertPatternCases({
      bindingPath: BINDING,
      cases: {
        danger: () => {
          const fixture = renderToast('danger');
          fixtures.push(fixture);
          return {
            root: fixture.nativeElement as Element,
            behavioural: { 'focus.unaffected': true, 'content.noAutoDismiss': true },
          };
        },
        advisory: () => {
          const fixture = renderToast('success');
          fixtures.push(fixture);
          return {
            root: fixture.nativeElement as Element,
            behavioural: { 'focus.unaffected': true },
          };
        },
      },
    });
  } finally {
    for (const fixture of fixtures) fixture.destroy();
  }
});
