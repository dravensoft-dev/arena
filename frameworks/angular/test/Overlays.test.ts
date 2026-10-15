import { useTestEnvironment } from './TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaPopover } from '../components/feedback/arena-popover/ArenaPopover';
import { disposeOverlays, disposeStrays } from './Overlays';

@Component({
  selector: 'overlays-popover-host',
  standalone: true,
  imports: [ArenaPopover],
  template: `<arena-popover label="Notes" [open]="true"><button trigger type="button">Notes</button><p>Nothing to press.</p></arena-popover>`,
})
class PopoverHost {}

test('disposeStrays keeps the overlay container and removes everything else in the body', () => {
  const container = document.body.appendChild(document.createElement('div'));
  container.className = 'cdk-overlay-container';
  const list = document.body.appendChild(document.createElement('div'));
  list.setAttribute('role', 'listbox');
  const button = document.body.appendChild(document.createElement('button'));
  disposeStrays(document);
  assert.ok(!list.isConnected, 'the listbox is removed');
  assert.ok(!button.isConnected, 'the button is removed');
  assert.ok(container.parentElement === document.body, 'the container stays in the body');
  for (const child of document.body.children) assert.ok(child.classList.contains('cdk-overlay-container'), 'every child left is an overlay container');
  container.remove();
});

test('an overlay opened after disposeStrays attaches its pane inside the live overlay container', () => {
  const paneOf = () => document.body.querySelector<HTMLElement>('.cdk-overlay-container .cdk-overlay-pane');
  const first = TestBed.createComponent(PopoverHost);
  first.detectChanges();
  assert.ok(paneOf(), 'the first popover left no pane inside the overlay container');
  first.destroy();
  disposeOverlays();
  disposeStrays(document);
  const second = TestBed.createComponent(PopoverHost);
  try {
    second.detectChanges();
    const pane = paneOf();
    assert.ok(pane, 'the popover opened after disposeStrays left no pane inside the overlay container');
    assert.ok(document.contains(pane), 'the pane is not in the document');
  } finally {
    second.destroy();
    disposeOverlays();
  }
});
