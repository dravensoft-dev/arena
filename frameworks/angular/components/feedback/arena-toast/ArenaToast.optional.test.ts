/* A template binds something or nothing, and there is no spelling for "leave this one out": a
 * consumer holding a value that may be unset has to bind the absence itself. A defaulted input
 * whose write type excludes undefined therefore makes them restate the default the component
 * already owns, in a second place where it can drift. The transform widens what may be bound and
 * leaves what is read alone, which is the convention check:optional-inputs holds. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaToast } from './ArenaToast';
import type { ArenaToastTone } from '../../../Api.generated';

@Component({
  standalone: true,
  imports: [ArenaToast],
  template: `<arena-toast [tone]="tone()" title="Deployment archived" />`,
})
class OptionalHost {
  readonly tone = signal<ArenaToastTone | undefined>(undefined);
}

test('an optional value binds straight through, and the component keeps its own default', () => {
  const fixture = TestBed.createComponent(OptionalHost);
  try {
    fixture.detectChanges();
    const toast = fixture.nativeElement.querySelector('arena-toast') as HTMLElement;
    assert.equal(toast.getAttribute('role'), 'status', 'an absent tone did not fall back to neutral');

    fixture.componentInstance.tone.set('danger');
    fixture.detectChanges();
    assert.equal(toast.getAttribute('role'), 'alert', 'a tone that IS given stopped arriving');

    fixture.componentInstance.tone.set(undefined);
    fixture.detectChanges();
    assert.equal(toast.getAttribute('role'), 'status', 'going back to absent did not go back to the default');
  } finally {
    fixture.destroy();
  }
});
