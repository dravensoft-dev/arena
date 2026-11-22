/* Two overlays of the project's own, one inside the other, wired as the exports page wires one:
 * Escape in the inner panel closes the inner overlay only, and a second Escape in the outer panel
 * closes the outer one. */

import { useTestEnvironment } from './TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component, DOCUMENT, ElementRef, inject, input, output, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { arenaTrapTabKey } from '../FocusTrap';

@Component({
  selector: 'app-lightbox',
  host: { '(keydown)': 'onKeydown($event)' },
  template: `<div #panel role="dialog" aria-modal="true" [attr.aria-label]="label()" tabindex="-1"><button type="button" [id]="label() + '-button'">{{ label() }}</button><ng-content /></div>`,
})
class Lightbox {
  readonly label = input.required<string>();
  readonly close = output<void>();
  private readonly doc = inject(DOCUMENT);
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  protected onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (event.defaultPrevented) return;
      event.preventDefault();
      this.close.emit();
      return;
    }
    const panel = this.panel()?.nativeElement;
    if (event.key === 'Tab' && panel) arenaTrapTabKey(panel, event, this.doc.activeElement);
  }
}

@Component({
  selector: 'app-nested',
  imports: [Lightbox],
  template: `<app-lightbox label="outer" (close)="dismissed.push('outer')"><app-lightbox label="inner" (close)="dismissed.push('inner')" /></app-lightbox>`,
})
class Nested {
  readonly dismissed: string[] = [];
}

test('Escape closes the innermost overlay of your own and no other', () => {
  const fixture = TestBed.createComponent(Nested);
  fixture.detectChanges();
  const press = (id: string) => {
    const target = document.getElementById(id)!;
    target.focus();
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  };
  press('inner-button');
  assert.deepEqual(fixture.componentInstance.dismissed, ['inner'], 'Escape in the inner panel must close the inner overlay and not the outer one');
  press('outer-button');
  assert.deepEqual(fixture.componentInstance.dismissed, ['inner', 'outer'], 'a second Escape, in the outer panel, closes the outer overlay');
});
