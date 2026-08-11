/* The root slot is NOT host-bound here, and that is forced rather than chosen: `click` is an
 * output whose name is also a native DOM event, and Angular installs both a DOM listener and an
 * output subscription for such a name. On a host that both listens and emits, each emission
 * re-enters the listener, so one real press was measured at 7609. The recipe therefore lands on
 * an inner <div> that stopPropagation()s, which is the shape ArenaSideNavItem and ArenaTableRow already
 * take, and the host goes display: contents. `activated` counts what a CONSUMER hears, and one
 * is the only passing number. */

import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { assertNoNode } from '../../../test/NodeAssert';
import { ArenaAction } from '../../../ProjectionMarkers';
import { ArenaCard } from './ArenaCard';
import { assertPatternCases, isFocusable, ANGULAR_COMPONENTS } from '../../../test/Compliance';

const BINDING = join(ANGULAR_COMPONENTS, 'display/arena-card/ArenaCard.behaviour.json');

@Component({
  standalone: true,
  imports: [ArenaCard, ArenaAction],
  template: `
    <arena-card [title]="title" [eyebrow]="eyebrow" [accent]="accent" [floating]="floating"
                [interactive]="interactive" [disabled]="disabled" [href]="href"
                (click)="activated = activated + 1">
      @if (withAction) {
        <button action type="button">Open</button>
      }
      <p>Everything the client can see.</p>
    </arena-card>
  `,
})
class CardHost {
  title: string | undefined = 'Client Portal';
  eyebrow: string | undefined = 'Delivery';
  accent = false;
  floating = false;
  interactive = false;
  disabled = false;
  withAction = false;
  href: string | undefined = undefined;
  activated = 0;
}

function render(patch: Partial<CardHost> = {}) {
  const fixture = TestBed.createComponent(CardHost);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  return fixture;
}

function rootOf(fixture: ReturnType<typeof render>): HTMLElement {
  const host = fixture.nativeElement.querySelector('arena-card') as HTMLElement;
  return host.firstElementChild as HTMLElement;
}

function press(el: HTMLElement, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  el.dispatchEvent(event);
  return event;
}

test('arena-card meets both of its declared shapes', () => {
  const surface = render();
  const live = render({ interactive: true, title: 'checkout-api', eyebrow: undefined });
  const off = render({ interactive: true, disabled: true, title: 'checkout-api', eyebrow: undefined });
  const routed = render({ href: '/clients/acme', title: 'Acme Corp', eyebrow: undefined });
  try {
    assertPatternCases({
      bindingPath: BINDING,
      cases: {
        link: () => {
          const el = rootOf(routed);
          assert.equal(el.tagName, 'A', 'href must render a real anchor, not a div wearing a role');
          assert.equal(el.getAttribute('href'), '/clients/acme');
          assert.equal(el.getAttribute('role'), null,
            'the anchor already has the link role; naming another would take it away');
          assert.equal(el.hasAttribute('tabindex'), false,
            'an anchor with an href is focusable by the platform, and a tabindex would only be noise');
          assert.match(el.textContent ?? '', /Everything the client can see\./,
            'the projected body must live INSIDE the anchor, or the whole surface is not the target');
          return { root: el, subjects: { default: el } };
        },

        surface: () => {
          const el = rootOf(surface);
          assert.equal(el.getAttribute('role'), null,
            'a surface that claims a role claims an affordance it does not have');
          assert.equal(el.hasAttribute('tabindex'), false,
            'an inert card must not be a tab stop, or every card of every list becomes a dead one');
          for (const node of [el, ...Array.from(el.querySelectorAll('*'))]) {
            assert.equal(isFocusable(node as Element), false,
              `<${node.tagName.toLowerCase()}> is reachable by keyboard, and the caller put nothing focusable here`);
          }
          return { root: el, subjects: { default: el } };
        },

        interactive: () => {
          const el = rootOf(live);
          assert.equal(el.tagName, 'DIV', 'the card is a div, which is why it CAN take role="button"');
          assert.equal(el.getAttribute('role'), 'button');
          assert.equal(el.getAttribute('tabindex'), '0', 'an interactive card is reached by Tab');
          assert.match(el.textContent ?? '', /checkout-api/,
            'the button pattern accepts text content as its name, and the title is that text');

          el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          live.detectChanges();
          assert.equal(live.componentInstance.activated, 1,
            'a consumer binding (click) must hear one press exactly once -- two would be the emit plus '
            + 'the native event reaching them as well, and a runaway count would be the emission re-entering');

          const enter = press(el, 'Enter');
          live.detectChanges();
          assert.equal(live.componentInstance.activated, 2, 'Enter did not activate the card');
          assert.equal(enter.defaultPrevented, true, 'Enter was not claimed by the card');

          const space = press(el, ' ');
          live.detectChanges();
          assert.equal(live.componentInstance.activated, 3, 'Space did not activate the card');
          assert.equal(space.defaultPrevented, true,
            'Space must be prevented, or the page scrolls under the card the user just pressed');

          const dead = rootOf(off);
          assert.equal(dead.getAttribute('aria-disabled'), 'true',
            'a disabled card must announce itself rather than leave the tab order');
          assert.equal(dead.getAttribute('role'), 'button',
            'it is still a button -- a disabled control that stops being one cannot be found at all');
          assert.equal(dead.getAttribute('tabindex'), '0',
            'a disabled control nobody can reach is a control nobody knows exists');
          press(dead, 'Enter');
          dead.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          off.detectChanges();
          assert.equal(off.componentInstance.activated, 0, 'a disabled card activated anyway');

          return {
            root: el,
            subjects: { default: el },
            behavioural: { 'keyboard.Enter': true, 'keyboard.Space': true, 'states.disabled': true },
          };
        },
      },
    });
  } finally {
    routed.destroy();
    surface.destroy();
    live.destroy();
    off.destroy();
  }
});

test('a keypress on a control inside the card does not activate the card as well', () => {
  const fixture = render({ interactive: true, withAction: true });
  try {
    const action = rootOf(fixture).querySelector('button') as HTMLElement;
    press(action, 'Enter');
    fixture.detectChanges();
    assert.equal(fixture.componentInstance.activated, 0,
      'Enter on a control inside the card activated the card, so no card can ever hold one');
  } finally {
    fixture.destroy();
  }
});

test('a control the caller projects stays reachable -- the card adds no affordance and takes none away', () => {
  const fixture = render({ withAction: true });
  try {
    const action = rootOf(fixture).querySelector('button');
    assert.ok(action, 'the [action] slot did not project the caller\'s button');
    assert.equal(isFocusable(action), true, 'the projected control lost its tab stop inside the card');
    assert.equal(rootOf(fixture).getAttribute('role'), null,
      'projecting an action must not turn the surface into a control of its own');
  } finally {
    fixture.destroy();
  }
});

test('the header renders for a title, for an eyebrow, or for an action alone, and for none of them it is absent', () => {
  const headed: Array<Partial<CardHost>> = [
    { title: 'Client Portal', eyebrow: undefined },
    { title: undefined, eyebrow: 'Delivery' },
    { title: undefined, eyebrow: undefined, withAction: true },
  ];
  for (const patch of headed) {
    const fixture = render(patch);
    try {
      assert.ok(rootOf(fixture).children.length > 1,
        `${JSON.stringify(patch)}: the header block did not render, so its content has nowhere to go`);
    } finally {
      fixture.destroy();
    }
  }

  const bare = render({ title: undefined, eyebrow: undefined });
  try {
    const root = rootOf(bare);
    assert.equal(root.children.length, 1, 'a card with nothing to head still drew a header block');
    assertNoNode(root.querySelector(':scope > div > div'), 'the empty header survived as a nested block');
  } finally {
    bare.destroy();
  }
});

test('accent and floating reach the styled root, and the host itself stays out of layout', () => {
  const plain = render();
  const marked = render({ accent: true, floating: true });
  try {
    const host = plain.nativeElement.querySelector('arena-card') as HTMLElement;
    assert.equal(host.getAttribute('class'), null, 'the host carries no recipe classes of its own');
    assert.match(host.getAttribute('style') ?? '', /display:\s*contents/,
      'a bare host must leave layout, or as a flex item it shrinks to fit around the card');

    const plainClass = rootOf(plain).getAttribute('class') ?? '';
    const markedClass = rootOf(marked).getAttribute('class') ?? '';
    assert.notEqual(plainClass, markedClass, 'accent and floating changed nothing on the root');
    assert.match(markedClass, /arena-card__root--accent-true/, 'accent did not reach the styled root');
    assert.match(markedClass, /arena-card__root--floating-true/, 'floating did not reach the styled root');
    assert.doesNotMatch(plainClass, /arena-card__root--floating-true/);
  } finally {
    plain.destroy();
    marked.destroy();
  }
});

function click(el: HTMLElement): MouseEvent {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
  el.dispatchEvent(event);
  return event;
}

test('a pointer click on a control inside the card leaves the press with the control', () => {
  const fixture = render({ interactive: true, withAction: true });
  try {
    const action = rootOf(fixture).querySelector('button') as HTMLElement;
    click(action);
    fixture.detectChanges();
    assert.equal(fixture.componentInstance.activated, 0,
      'one press ran the control and the card, which is what makes a card unable to hold a control');
  } finally {
    fixture.destroy();
  }
});

test('a pointer click on the card itself still activates it, whatever it was rendered over', () => {
  const fixture = render({ interactive: true });
  try {
    const paragraph = rootOf(fixture).querySelector('p') as HTMLElement;
    click(paragraph);
    fixture.detectChanges();
    assert.equal(fixture.componentInstance.activated, 1,
      'a click on the card\'s own content is the card being pressed: guarding on target !== '
      + 'currentTarget instead would refuse every press, since a pointer never lands on the root');
  } finally {
    fixture.destroy();
  }
});
