/* The one thing that decides whether `href` can exist at all. A card has TWO <ng-content>
 * elements, and Angular hands projected content to the first matching slot, so two branches
 * cannot each carry their own -- the limit ArenaTable.prompt.md records. The way out is one
 * <ng-template> holding both projections, stamped by whichever branch renders. What no
 * documentation settles is whether the content survives when href changes at runtime and the
 * template is re-instantiated. If it does not, this suite is where that is loud. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { assertNoNode } from '../../../test/NodeAssert';
import { ArenaCard } from './ArenaCard';
import { ArenaAction } from '../../../ProjectionMarkers';

@Component({
  standalone: true,
  imports: [ArenaCard, ArenaAction],
  template: `
    <arena-card title="Deployments" [href]="target()">
      <button action type="button">Retry</button>
      <p>Everything shipped this week.</p>
    </arena-card>
  `,
})
class ProjectionHost { readonly target = signal<string | undefined>(undefined); }

test('both projections survive href changing at runtime, in either direction', () => {
  const fixture = TestBed.createComponent(ProjectionHost);
  try {
    fixture.detectChanges();
    const host = fixture.nativeElement as Element;

    const body = () => host.textContent ?? '';
    const root = () => host.querySelector('a[href], [role="button"], div > div');

    assert.match(body(), /Everything shipped this week\./, 'the default slot before any change');
    assert.match(body(), /Retry/, 'the action slot before any change');
    assertNoNode(host.querySelector('a'), 'no href means no anchor');

    fixture.componentInstance.target.set('/deployments');
    fixture.detectChanges();

    const anchor = host.querySelector('a');
    assert.ok(anchor, 'href present must render a real anchor');
    assert.equal(anchor?.getAttribute('href'), '/deployments');
    assert.match(
      anchor?.textContent ?? '',
      /Everything shipped this week\./,
      'the projected body must move INTO the anchor. Angular projects content nodes once, so a '
      + 'template re-instantiated by the other branch can arrive empty, and an empty card is '
      + 'exactly the silent failure this member was allowed on condition of avoiding',
    );
    assert.match(anchor?.textContent ?? '', /Retry/, 'and so must the action slot');

    fixture.componentInstance.target.set(undefined);
    fixture.detectChanges();

    assertNoNode(host.querySelector('a'), 'removing href must go back to the non-anchor root');
    assert.match(body(), /Everything shipped this week\./, 'and the content must come back with it');
    assert.match(body(), /Retry/);
    assert.ok(root(), 'a root must still be rendered');
  } finally { fixture.destroy(); }
});

test('the content is projected once, not duplicated into both branches', () => {
  const fixture = TestBed.createComponent(ProjectionHost);
  try {
    fixture.componentInstance.target.set('/deployments');
    fixture.detectChanges();
    const host = fixture.nativeElement as Element;
    assert.equal(host.querySelectorAll('button[action]').length, 1);
    assert.equal((host.textContent ?? '').split('Everything shipped this week.').length - 1, 1);
  } finally { fixture.destroy(); }
});

@Component({
  standalone: true,
  imports: [ArenaCard, ArenaAction],
  template: `<arena-card><ng-container><button action type="button">Go</button></ng-container></arena-card>`,
})
class ContainerHost {}

@Component({
  standalone: true,
  imports: [ArenaCard, ArenaAction],
  template: `<arena-card>@if (on) {<button action type="button">Go</button>}</arena-card>`,
})
class GuardedHost { on = true; }

test('a marker inside an @if block directly in the card fills the card\'s head part', () => {
  const fixture = TestBed.createComponent(GuardedHost);
  try {
    fixture.detectChanges();
    const head = (fixture.nativeElement as Element).querySelector('[data-arena-part="card.head"]');
    assert.ok(head, 'the card drew no head part for its action');
    assert.ok(head.querySelector('button[action]'), 'the button is not inside the head part');
  } finally {
    fixture.destroy();
  }
});

test('a marker inside an ng-container lands in the card\'s body, not its action part', () => {
  const fixture = TestBed.createComponent(ContainerHost);
  try {
    fixture.detectChanges();
    const host = fixture.nativeElement as Element;
    const button = host.querySelector('button[action]');
    assert.ok(button, 'the button inside the container did not render');
    assertNoNode(host.querySelector('[data-arena-part="card.head"] button[action]'), 'the container carried the marker into the head');
    assert.ok(button.closest('[data-arena-part="card.body"]'), 'the button is not in the default slot');
  } finally {
    fixture.destroy();
  }
});
