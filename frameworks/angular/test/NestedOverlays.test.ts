/* Two overlays of the project's own, one inside the other, wired exactly as the exports page wires one,
 * and two ArenaDialogs nested in place: Escape in the inner panel closes the inner overlay only, a
 * second Escape in the outer panel closes the outer one, and Tab stays in the panel that holds focus. */

import { useTestEnvironment } from './TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Component, DOCUMENT, DestroyRef, ElementRef, afterRenderEffect, inject, input, output, untracked, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type FocusTrapState, arenaHandleOpenTransition, arenaHandleTeardown, arenaTrapTabKey } from '../FocusTrap';
import { ArenaDialog } from '../components/feedback/arena-dialog/ArenaDialog';

const EXPORTS_PAGE = new URL('../../../skills/design/references/exports.md', import.meta.url);

@Component({
  selector: 'app-lightbox',
  host: { '(keydown)': 'onKeydown($event)' },
  template: `@if (open()) {
    <div #panel role="dialog" aria-modal="true" [attr.aria-label]="label()" tabindex="-1"><ng-content /></div>
  }`,
})
class Lightbox {
  readonly open = input.required<boolean>();
  readonly label = input.required<string>();
  readonly close = output<void>();
  private readonly doc = inject(DOCUMENT);
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly trap: FocusTrapState = { wasOpen: false, restoreTo: null };

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      arenaHandleTeardown(this.trap, this.panel()?.nativeElement ?? null, this.doc.activeElement);
    });
    afterRenderEffect(() => {
      const isOpen = this.open();
      untracked(() => arenaHandleOpenTransition(this.trap, isOpen, this.panel()?.nativeElement ?? null, this.doc.activeElement));
    });
  }

  protected onKeydown(event: KeyboardEvent) {
    if (!this.open()) return;
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
  template: `<app-lightbox [open]="true" label="outer" (close)="dismissed.push('outer')"><button type="button" id="outer-button">outer</button><app-lightbox [open]="true" label="inner" (close)="dismissed.push('inner')"><button type="button" id="inner-button">inner</button></app-lightbox></app-lightbox>`,
})
class Nested {
  readonly dismissed: string[] = [];
}

@Component({
  selector: 'app-nested-before',
  imports: [Lightbox],
  template: `<app-lightbox [open]="true" label="outer"><app-lightbox [open]="true" label="inner"><button type="button" id="inner-button">inner</button></app-lightbox><button type="button" id="outer-button">outer</button></app-lightbox>`,
})
class NestedBefore {}

@Component({
  selector: 'app-nested-dialogs',
  imports: [ArenaDialog],
  template: `<arena-dialog [open]="true" title="outer" (close)="dismissed.push('outer')"><button type="button" id="outer-ok">ok</button><arena-dialog [open]="true" title="inner" (close)="dismissed.push('inner')"><button type="button" id="inner-ok">ok</button></arena-dialog></arena-dialog>`,
})
class NestedDialogs {
  readonly dismissed: string[] = [];
}

function press(id: string, key: string, shiftKey = false): void {
  const target = document.getElementById(id)!;
  target.focus();
  target.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true }));
}

const ESCAPE_ROWS = [
  { name: 'two overlays of your own', host: Nested },
  { name: 'two ArenaDialogs', host: NestedDialogs },
] as const;

for (const { name, host } of ESCAPE_ROWS) {
  test(`Escape closes the innermost overlay of your own and no other, for ${name}`, () => {
    const fixture = TestBed.createComponent(host);
    fixture.detectChanges();
    const [inner, outer] = host === Nested ? ['inner-button', 'outer-button'] : ['inner-ok', 'outer-ok'];
    press(inner, 'Escape');
    assert.deepEqual(fixture.componentInstance.dismissed, ['inner'], `${name}: Escape in the inner panel must close the inner overlay and not the outer one`);
    press(outer, 'Escape');
    assert.deepEqual(fixture.componentInstance.dismissed, ['inner', 'outer'], `${name}: a second Escape, in the outer panel, closes the outer overlay`);
  });
}

for (const { row, host, shiftKey } of [
  { row: 'Tab', host: Nested, shiftKey: false },
  { row: 'Shift+Tab', host: NestedBefore, shiftKey: true },
] as const) {
  test(`${row} in the inner panel's only stop stays inside the inner panel`, () => {
    const fixture = TestBed.createComponent(host);
    fixture.detectChanges();
    press('inner-button', 'Tab', shiftKey);
    assert.equal(document.activeElement?.id, 'inner-button', `${row} must not wrap on to the outer panel`);
  });
}

function methodBody(source: string): string {
  const body = source.slice(source.indexOf('{') + 1, source.lastIndexOf('}'));
  return body.replace(/"/g, "'").replace(/\s+/g, ' ').trim();
}

test('the Angular wiring on the exports page handles the key as the tested component does', () => {
  const page = readFileSync(EXPORTS_PAGE, 'utf8');
  const fence = page.split('```ts\n').map((part) => part.split('\n```')[0]!).find((part) => part.includes("selector: 'app-lightbox'"));
  assert.ok(fence, 'the exports page must carry the Angular overlay fence');
  const start = fence.indexOf('protected onKeydown(');
  assert.ok(start >= 0, 'the fence must define onKeydown');
  const end = fence.indexOf('\n  }\n', start);
  const fromPage = methodBody(fence.slice(start, end + 4));
  const tested = methodBody((Lightbox.prototype as unknown as { onKeydown: { toString(): string } }).onKeydown.toString());
  assert.equal(fromPage, tested, 'the onKeydown on the exports page and the one under test must read alike');
});
