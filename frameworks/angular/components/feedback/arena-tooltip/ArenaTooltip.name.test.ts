import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaTooltip } from './ArenaTooltip';
import { arenaTooltipRedundant } from './TooltipName';
import { assertNoNode } from '../../../test/NodeAssert';

@Component({
  standalone: true,
  imports: [ArenaTooltip],
  template: `<arena-tooltip label="Projects"><button aria-label="Projects">P</button></arena-tooltip>
    <arena-tooltip label="Ships the build"><button>Deploy</button></arena-tooltip>`,
})
class Host {}

function bubbleFor(trigger: HTMLElement): HTMLElement | null {
  const id = trigger.getAttribute('aria-describedby');
  return id ? document.getElementById(id) : null;
}

test('arenaTooltipRedundant is containment, ignoring case and spacing', () => {
  assert.equal(arenaTooltipRedundant('Orders  12', 'orders'), true);
  assert.equal(arenaTooltipRedundant('Deploy', 'Ships the build'), false);
});

test('a tooltip that repeats its trigger\'s name keeps the reference and contributes no description', () => {
  const fixture = TestBed.createComponent(Host);
  try {
    fixture.detectChanges();
    const trigger = (fixture.nativeElement as HTMLElement).querySelectorAll('button')[0] as HTMLButtonElement;
    trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    fixture.detectChanges();
    const bubble = bubbleFor(trigger);
    assert.ok(bubble, 'the trigger references its bubble');
    assert.equal(bubble.textContent?.trim(), 'Projects');
    assert.equal(bubble.querySelector('[aria-hidden="true"]')?.textContent?.trim(), 'Projects');
  } finally { fixture.destroy(); }
});

test('a tooltip that says something new describes as it always has', () => {
  const fixture = TestBed.createComponent(Host);
  try {
    fixture.detectChanges();
    const trigger = (fixture.nativeElement as HTMLElement).querySelectorAll('button')[1] as HTMLButtonElement;
    trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    fixture.detectChanges();
    const bubble = bubbleFor(trigger);
    assert.ok(bubble, 'the trigger references its bubble');
    assert.equal(bubble.textContent?.trim(), 'Ships the build');
    assertNoNode(bubble.querySelector('[aria-hidden]'), 'a tooltip saying something new hides nothing');
  } finally { fixture.destroy(); }
});

test('the bubble\'s pane carries the palette of the tooltip it belongs to', () => {
  const fixture = TestBed.createComponent(Host);
  try {
    fixture.detectChanges();
    const tooltip = (fixture.nativeElement as HTMLElement).querySelector('arena-tooltip') as HTMLElement;
    tooltip.style.setProperty('--arena-palette', 'light');
    const trigger = tooltip.querySelector('button') as HTMLButtonElement;
    trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    fixture.detectChanges();
    const pane = bubbleFor(trigger)?.closest('.cdk-overlay-pane');
    assert.ok(pane?.classList.contains('arena-light'), 'the bubble pane did not take the palette of its trigger');
  } finally { fixture.destroy(); }
});
