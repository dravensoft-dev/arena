/* The `contentinfo` pattern asks for one thing, the landmark, and assertPattern reads it off the
 * element. The rest of what the binding claims, that a footer is inert and that its columns come
 * from the room rather than from a breakpoint, is what the hand assertions check. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaSiteFooter } from './ArenaSiteFooter';
import { assertPattern, isFocusable, ANGULAR_COMPONENTS } from '../../../test/Compliance';
import { assertNoNode } from '../../../test/NodeAssert';

const BINDING = join(ANGULAR_COMPONENTS, 'layout/arena-site-footer/ArenaSiteFooter.behaviour.json');

@Component({
  standalone: true,
  imports: [ArenaSiteFooter],
  template: `
    <arena-site-footer [note]="note">
      <span>Shop</span>
      <span>Company</span>
    </arena-site-footer>
  `,
})
class FooterHost {
  note: string | undefined = 'Roasted in Bilbao.';
}

function render(patch: Partial<FooterHost> = {}) {
  const fixture = TestBed.createComponent(FooterHost);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  return fixture;
}

const footerOf = (fixture: ReturnType<typeof render>) =>
  fixture.nativeElement.querySelector('footer') as HTMLElement;

test('arena-site-footer is the contentinfo landmark it binds', () => {
  const fixture = render();
  try {
    const footer = footerOf(fixture);
    assert.ok(footer, 'the component renders no footer element at all');
    assert.equal(footer.getAttribute('role'), null);

    for (const el of [footer, ...Array.from(footer.querySelectorAll('*'))]) {
      assert.equal(isFocusable(el as Element), false,
        `<${el.tagName.toLowerCase()}> inside the footer is reachable by keyboard, so a user tabs to something inert`);
    }

    assertPattern({ root: footer, bindingPath: BINDING, subjects: { default: footer } });
  } finally { fixture.destroy(); }
});

test('the column count comes from the room, off the same role a grid reads', () => {
  const fixture = render();
  try {
    const columns = footerOf(fixture).querySelector('div > div') as HTMLElement;
    assert.match(columns.style.getPropertyValue('grid-template-columns'), /var\(--grid-min\)/,
      'a voice that widens a card must widen a footer column with it');
  } finally { fixture.destroy(); }
});

test('the note is drawn only when given', () => {
  const withNote = render();
  try {
    assert.match(footerOf(withNote).textContent ?? '', /Roasted in Bilbao\./);
  } finally { withNote.destroy(); }

  const without = render({ note: undefined });
  try {
    assertNoNode(footerOf(without).querySelector('p'),
      'an empty line under the columns is a line the reader has to account for');
  } finally { without.destroy(); }
});
