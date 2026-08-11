/* An interactive ArenaCard is a role="button" div rather than a <button> element, and that is not a
 * shortcut: a card body is where a consumer puts their own controls, and a control nested inside
 * a control is reachable by nobody. ArenaTableRow's card shape made the same call for the same reason.
 * The surface case passes no slots, because content a consumer projects is theirs: an ArenaButton in
 * the action slot leaves the binding correct and would only make this suite measure the wrong
 * thing. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import React from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { assertPatternCases, REACT_COMPONENTS } from '../../../test/AssertPattern.tsx';
import { ArenaCard } from './ArenaCard.tsx';

afterEach(cleanup);

const BINDING = join(REACT_COMPONENTS, 'display/arena-card/ArenaCard.behaviour.json');

function press(el: Element, key: string) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  act(() => { el.dispatchEvent(event); });
  return event;
}

test('ArenaCard meets both of its declared shapes', () => {
  assertPatternCases({
    bindingPath: BINDING,
    cases: {

      link: () => {
        const root = mount(<ArenaCard title="Acme Corp" href="/clients/acme"><p>Everything the client can see.</p></ArenaCard>);
        const el = root.firstElementChild;
        assert.equal(el!.tagName, 'A', 'href must render a real anchor, not a div wearing a role');
        assert.equal(el!.getAttribute('href'), '/clients/acme');
        assert.equal(el!.hasAttribute('role'), false,
          'the anchor already has the link role; naming another would take it away');
        assert.equal(el!.hasAttribute('tabindex'), false,
          'an anchor with an href is focusable by the platform, and a tabindex would only be noise');
        assert.match(el!.textContent, /Everything the client can see\./,
          'the children must live INSIDE the anchor, or the whole surface is not the target');
        return { root, subjects: { default: el } };
      },

      surface: () => {
        const root = mount(<ArenaCard title="Deployments" />);
        const el = root.firstElementChild;
        assert.equal(el!.hasAttribute('role'), false, 'a plain surface claimed an interactive role');
        assert.equal(el!.hasAttribute('tabindex'), false,
          'an inert card must not be a tab stop, or every card of every list becomes a dead one');
        return { root, subjects: { default: el } };
      },

      interactive: () => {
        let clicked = 0;
        const root = mount(<ArenaCard title="checkout-api" interactive onClick={() => { clicked += 1; }} />);
        const el = root.firstElementChild;

        assert.equal(el!.tagName, 'DIV', 'the card is a div, which is why it CAN take role="button"');
        assert.equal(el!.getAttribute('role'), 'button');
        assert.equal(el!.getAttribute('tabindex'), '0', 'an interactive card is reached by Tab');
        assert.match(el!.textContent, /checkout-api/,
          'the button pattern accepts text content as its name, and the title is that text');

        act(() => { (el as HTMLElement).click(); });
        assert.equal(clicked, 1, 'a pointer press did not activate the card');

        const enter = press(el!, 'Enter');
        assert.equal(clicked, 2, 'Enter did not activate the card');
        assert.equal(enter.defaultPrevented, true, 'Enter was not claimed by the card');

        const space = press(el!, ' ');
        assert.equal(clicked, 3, 'Space did not activate the card');
        assert.equal(space.defaultPrevented, true,
          'Space must be prevented, or the page scrolls under the card the user just pressed');

        let blocked = 0;
        const off = mount(<ArenaCard title="checkout-api" interactive disabled onClick={() => { blocked += 1; }} />);
        const offEl = off.firstElementChild;
        assert.equal(offEl!.getAttribute('aria-disabled'), 'true',
          'a disabled card must announce itself rather than leave the tab order');
        assert.equal(offEl!.getAttribute('role'), 'button',
          'it is still a button -- a disabled control that stops being one cannot be found at all');
        assert.equal(offEl!.getAttribute('tabindex'), '0',
          'a disabled control nobody can reach is a control nobody knows exists');
        press(offEl!, 'Enter');
        act(() => { (offEl as HTMLElement).click(); });
        assert.equal(blocked, 0, 'a disabled card activated anyway');

        return {
          root,
          subjects: { default: el },
          behavioural: { 'keyboard.Enter': true, 'keyboard.Space': true, 'states.disabled': true },
        };
      },
    },
  });
});

test('a keypress on a control inside the card does not activate the card as well', () => {
  let clicked = 0;
  const root = mount(
    <ArenaCard title="checkout-api" interactive onClick={() => { clicked += 1; }}>
      <input aria-label="Rename" />
    </ArenaCard>,
  );
  press(root.querySelector('input')!, 'Enter');
  assert.equal(clicked, 0,
    'Enter typed into a field inside the card activated the card, so no card can ever hold one');
});

function click(el: Element) {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
  act(() => { el.dispatchEvent(event); });
  return event;
}

test('a pointer click on a control inside the card leaves the press with the control', () => {
  let card = 0;
  let button = 0;
  const root = mount(
    <ArenaCard title="checkout-api" interactive onClick={() => { card += 1; }}>
      <button type="button" onClick={() => { button += 1; }}>Rename</button>
    </ArenaCard>,
  );
  click(root.querySelector('button')!);
  assert.equal(button, 1, "the control's own handler is the one the press was for");
  assert.equal(card, 0,
    'one press ran the control and the card, which is what makes a card unable to hold a control');
});

test('a pointer click on the card itself still activates it, whatever it was rendered over', () => {
  let card = 0;
  const root = mount(
    <ArenaCard title="checkout-api" interactive onClick={() => { card += 1; }}>
      <p>Everything the client can see.</p>
    </ArenaCard>,
  );
  click(root.querySelector('p')!);
  assert.equal(card, 1,
    'a click on the card\'s own content is the card being pressed: guarding on target !== '
    + 'currentTarget instead would refuse every press, since a pointer never lands on the root');
});
