/* The per-case suite this item's binding requires. It renders an <a href> or a <button>, so no
 * single interactive pattern always applies -- which is why it bound `none` with prose for as
 * long as the schema could not say "this pattern applies only when href is absent". It can, so it
 * does. The `link` case binds `none` on purpose: there is no link pattern, because a link's role,
 * keyboard and focusability all come from the platform.
 * `states.disabled` is BEHAVIOURAL, so the verdict below is earned by rendering a disabled item
 * and acting on it rather than declared. The component gained `disabled` because casing it made
 * the gap visible: bound to `none` the requirement never applied.
 * The item pulls ArenaSideNavState from the nearest arena-side-nav, so both cases mount one. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ArenaSideNav } from '../arena-side-nav/ArenaSideNav';
import { ArenaSideNavItem } from './ArenaSideNavItem';
import { assertPatternCases, ANGULAR_COMPONENTS } from '../../../test/Compliance';
import { commandButtonVerdict } from '../../../test/StateVerdicts';

const BINDING = join(ANGULAR_COMPONENTS, 'navigation/arena-side-nav-item/ArenaSideNavItem.behaviour.json');

@Component({
  standalone: true,
  imports: [ArenaSideNav, ArenaSideNavItem],
  template: `
    <arena-side-nav ariaLabel="Workspace navigation" [active]="activeId">
      <arena-side-nav-item id="overview" label="Overview" href="/overview" />
      <arena-side-nav-item id="settings" label="Settings" />
      <arena-side-nav-item id="billing" label="Billing" disabled />
    </arena-side-nav>
  `,
})
class ItemHost {
  activeId = 'overview';
}

test('arena-side-nav-item meets both of the shapes href chooses between', () => {
  let fixture: ComponentFixture<ItemHost> | null = null;
  try {
    fixture = TestBed.createComponent(ItemHost);
    fixture.detectChanges();
    const host = fixture.nativeElement as Element;
    const active = () => host.querySelectorAll('[aria-current="page"]').length;

    assertPatternCases({
      bindingPath: BINDING,
      cases: {

        link: () => {
          const el = host.querySelector('a') as HTMLElement;
          assert.ok(el, 'with href the item must be a real anchor, or it navigates by script alone');
          assert.equal(el.getAttribute('href'), '/overview');
          assert.equal(el.hasAttribute('role'), false,
            'an <a href> is already a link -- a role attribute here would restate the platform or contradict it');
          assert.equal(el.hasAttribute('tabindex'), false,
            'and it is already focusable, so a tabindex would be a second opinion about the tab order');
          assert.equal(el.getAttribute('aria-current'), 'page',
            'the active destination is what this component adds on top of the anchor');
          return { root: el, subjects: { default: el } };
        },

        button: () => {
          const el = host.querySelector('button') as HTMLElement;
          assert.ok(el, 'with no href there is nowhere to navigate, so the item is a button');
          assert.equal(el.getAttribute('type'), 'button',
            'without type="button" it submits any form it happens to sit in');
          assert.match(el.textContent ?? '', /Settings/, 'the button pattern takes its name from its own text');
          assert.equal(el.hasAttribute('aria-current'), false,
            'only the active destination carries aria-current, and this is not it');

          const off = host.querySelectorAll('button')[1] as HTMLElement;
          assert.equal(off.getAttribute('aria-disabled'), 'true',
            'an unavailable destination must announce itself rather than vanish -- seeing it is what tells a user it exists');
          assert.equal(off.tagName, 'BUTTON',
            'it is still a button: a disabled control that stops being one cannot be found at all');
          const before = active();
          off.click();
          fixture?.detectChanges();
          assert.equal(active(), before, 'a disabled item activated anyway');

          return {
            root: el,
            subjects: { default: el },
            behavioural: {
              'keyboard.Enter': true,
              'keyboard.Space': true,
              'states.disabled': true,
              'states.pressed': commandButtonVerdict(el),
            },
          };
        },
      },
    });
  } finally {
    fixture?.destroy();
  }
});
