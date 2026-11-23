/* The item renders an <a href> or a <button>, so no single interactive pattern always applies --
 * which is why it bound `none` with prose for as long as the schema could not say "this pattern
 * applies only when href is absent". It can, so it does. The `link` case binds `none` on purpose:
 * there is no link pattern, because a link's role, keyboard and focusability all come from the
 * platform, and `none` there means "verified presentational" only in the sense that this
 * component adds no affordance of its own beyond the anchor.
 * `states.disabled` is BEHAVIOURAL, so the verdict below is earned by rendering a disabled item
 * and acting on it rather than declared. The component gained `disabled` because casing it made
 * the gap visible: bound to `none` the requirement never applied, and a real <button> with no
 * disabled concept read as having no interactive pattern at all. The last case reads the generated sheet for the fade's slots. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { assertPatternCases, REACT_COMPONENTS } from '../../../test/AssertPattern.tsx';
import { commandButtonVerdict } from '../../../test/StateVerdicts.ts';
import { ArenaSideNav } from '../arena-side-nav/ArenaSideNav.tsx';
import { ArenaSideNavItem } from './ArenaSideNavItem.tsx';

afterEach(cleanup);

const BINDING = join(REACT_COMPONENTS, 'navigation/arena-side-nav-item/ArenaSideNavItem.behaviour.json');

function press(el: Element, key: string) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  act(() => { el.dispatchEvent(event); });
  return event;
}

test('ArenaSideNavItem meets both of the shapes href chooses between', () => {
  assertPatternCases({
    bindingPath: BINDING,
    cases: {

      link: () => {
        const root = mount(<ArenaSideNavItem id="overview" label="Overview" href="/overview" activeId="overview" />);
        const el = root.firstElementChild;

        assert.equal(el!.tagName, 'A', 'with href the item must be a real anchor, or it navigates by script alone');
        assert.equal(el!.getAttribute('href'), '/overview');
        assert.equal(el!.hasAttribute('role'), false,
          'an <a href> is already a link -- a role attribute here would restate the platform or contradict it');
        assert.equal(el!.hasAttribute('tabindex'), false,
          'and it is already focusable, so a tabindex would be a second opinion about the tab order');
        assert.equal(el!.getAttribute('aria-current'), 'page',
          'the active destination is what this component adds on top of the anchor');

        return { root, subjects: { default: el } };
      },

      button: () => {
        let activated = 0;
        const root = mount(
          <ArenaSideNavItem id="settings" label="Settings" onActivate={() => { activated += 1; }} />,
        );
        const el = root.firstElementChild;

        assert.equal(el!.tagName, 'BUTTON', 'with no href there is nowhere to navigate, so the item is a button');
        assert.equal(el!.getAttribute('type'), 'button',
          'without type="button" it submits any form it happens to sit in');
        assert.match(el!.textContent, /Settings/, 'the button pattern takes its name from its own text');

        act(() => { (el as HTMLElement).click(); });
        assert.equal(activated, 1, 'the button did not reach onActivate');

        let blocked = 0;
        const off = mount(
          <ArenaSideNavItem id="billing" label="Billing" disabled onActivate={() => { blocked += 1; }} />,
        );
        const offEl = off.firstElementChild;
        assert.equal(offEl!.getAttribute('aria-disabled'), 'true',
          'an unavailable destination must announce itself rather than vanish -- seeing it is what tells a user it exists');
        assert.equal(offEl!.tagName, 'BUTTON',
          'it is still a button: a disabled control that stops being one cannot be found at all');
        act(() => { (offEl as HTMLElement).click(); });
        assert.equal(blocked, 0, 'a disabled item activated anyway');

        return {
          root,
          subjects: { default: el },
          behavioural: {
            'keyboard.Enter': true,
            'keyboard.Space': true,
            'states.disabled': true,
            'states.pressed': commandButtonVerdict(el!),
          },
        };
      },
    },
  });
});

test('a native button answers Enter and Space without the component handling either, which is why the case declares them met', () => {
  let activated = 0;
  const root = mount(<ArenaSideNavItem id="settings" label="Settings" onActivate={() => { activated += 1; }} />);
  const el = root.firstElementChild;

  const enter = press(el!, 'Enter');
  const space = press(el!, ' ');
  assert.equal(enter.defaultPrevented, false,
    'the component must not claim Enter -- the platform activates a button on it, and preventing it would break that');
  assert.equal(space.defaultPrevented, false, 'and the same for Space');
  assert.equal(activated, 0,
    'a dispatched keydown is not a platform activation; happy-dom does not synthesise the click a real browser would, '
    + 'which is exactly why keyboard.Enter and keyboard.Space are BEHAVIOURAL and declared rather than measured here');
});

const SIDE_NAV_SHEET = new URL('../../../../tailwind/consume/components/navigation/arena-side-nav/ArenaSideNav.styles.generated.css', import.meta.url);

test('a disabled item fades through its own slot, and a current one through the selected-disabled slot', () => {
  const root = mount(
    <ArenaSideNav ariaLabel="Workspace navigation" active="overview">
      <ArenaSideNavItem id="overview" label="Overview" disabled />
      <ArenaSideNavItem id="billing" label="Billing" disabled />
    </ArenaSideNav>,
  );
  const [current, rest] = [...root.querySelectorAll('.arena-side-nav__item')] as [Element, Element];
  assert.ok(current && rest, 'both items render');
  assert.equal(current.getAttribute('aria-current'), 'page', 'the overview item is the current one');
  assert.equal(rest.hasAttribute('aria-current'), false, 'and the other is not');
  assert.equal(current.getAttribute('aria-disabled'), 'true');
  assert.equal(rest.getAttribute('aria-disabled'), 'true');
  const css = readFileSync(SIDE_NAV_SHEET, 'utf8');
  assert.match(css, /opacity:\s*var\(--navigation-item-fade-disabled,/);
  assert.match(css, /opacity:\s*var\(--navigation-item-fade-selected-disabled,/);
  assert.match(css, /\[aria-disabled="true"\]\s*\{\s*&:active\s*\{\s*--tw-scale-x: 100%/, 'a refused item does not press');
});
