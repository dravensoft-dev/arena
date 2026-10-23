/* The per-case suite this item's binding requires, the same shape as ArenaSideNavItem's: with an
 * href it is an <a> and binds `none`, because a link's role, keyboard and focusability are the
 * platform's; without one it is a <button> and binds `button`. `states.disabled` is BEHAVIOURAL,
 * so the verdict is earned by clicking a disabled destination and reading what did not move.
 * The item injects ArenaBottomNavState from the nearest arena-bottom-nav, so every case mounts one. */

import { useTestEnvironment, glyphIds, symbol } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ArenaBottomNav } from '../arena-bottom-nav/ArenaBottomNav';
import { ArenaBottomNavItem } from './ArenaBottomNavItem';
import { assertPatternCases, ANGULAR_COMPONENTS } from '../../../test/Compliance';

const BINDING = join(ANGULAR_COMPONENTS, 'navigation/arena-bottom-nav-item/ArenaBottomNavItem.behaviour.json');

@Component({
  standalone: true,
  imports: [ArenaBottomNav, ArenaBottomNavItem],
  template: `
    <arena-bottom-nav ariaLabel="Primary" [active]="activeId" (nav)="reported.push($event)">
      <arena-bottom-nav-item id="home" icon="ph-bold ph-house" label="Home" href="/home" />
      <arena-bottom-nav-item id="more" icon="ph-bold ph-dots-three" label="More" />
      <arena-bottom-nav-item id="locked" icon="ph-bold ph-lock" label="Locked" disabled />
    </arena-bottom-nav>
  `,
})
class ItemHost {
  activeId = 'home';
  reported: string[] = [];
}

test('arena-bottom-nav-item meets both of the shapes href chooses between', () => {
  let fixture: ComponentFixture<ItemHost> | null = null;
  try {
    fixture = TestBed.createComponent(ItemHost);
    fixture.detectChanges();
    const host = fixture.nativeElement as Element;

    assertPatternCases({
      bindingPath: BINDING,
      cases: {

        link: () => {
          const el = host.querySelector('a') as HTMLElement;
          assert.ok(el, 'with href the destination must be a real anchor, or it navigates by script alone');
          assert.equal(el.getAttribute('href'), '/home');
          assert.equal(el.hasAttribute('role'), false,
            'an <a href> is already a link -- a role attribute here would restate the platform or contradict it');
          assert.equal(el.hasAttribute('tabindex'), false,
            'and it is already focusable, so a tabindex would be a second opinion about the tab order');
          assert.equal(el.getAttribute('aria-current'), 'page',
            'the active destination is what this component adds on top of the anchor');
          return { root: el, subjects: { default: el } };
        },

        button: () => {
          const el = host.querySelectorAll('button')[0] as HTMLElement;
          assert.ok(el, 'with no href there is nowhere to navigate, so the destination is a button');
          assert.equal(el.getAttribute('type'), 'button',
            'without type="button" it submits any form it happens to sit in');
          assert.match(el.textContent ?? '', /More/, 'the button pattern takes its name from its own text');
          assert.equal(el.hasAttribute('aria-current'), false,
            'only the active destination carries aria-current, and this is not it');

          const off = host.querySelectorAll('button')[1] as HTMLElement;
          assert.equal(off.getAttribute('aria-disabled'), 'true',
            'an unavailable destination must announce itself rather than vanish');
          assert.equal(off.tagName, 'BUTTON',
            'it is still a button: a disabled control that stops being one cannot be found at all');
          const before = fixture!.componentInstance.reported.length;
          off.click();
          fixture?.detectChanges();
          assert.equal(fixture!.componentInstance.reported.length, before,
            'a disabled destination reported anyway');

          return {
            root: el,
            subjects: { default: el },
            behavioural: {
              'keyboard.Enter': true,
              'keyboard.Space': true,
              'states.disabled': true,
            },
          };
        },
      },
    });
  } finally {
    fixture?.destroy();
  }
});

test('the active destination is filled and it is the only one, whatever weight the string carried', () => {
  const fixture = TestBed.createComponent(ItemHost);
  fixture.detectChanges();
  try {
    const host = fixture.nativeElement as Element;
    const glyphs = glyphIds(host);
    assert.equal(glyphs.filter((c) => c.startsWith('ph-fill-')).length, 1,
      'exactly one destination is the current one, so exactly one glyph is filled');
    assert.equal(glyphs[0], symbol('fill', 'house'),
      'the active glyph swaps the weight it was given rather than adding a second one');
    assert.equal(glyphs[1], symbol('bold', 'dots-three'), 'and an inactive destination keeps the weight it was given');
    assert.equal(host.querySelectorAll('[aria-current="page"]').length, 1);
  } finally {
    fixture.destroy();
  }
});

test('a primary click reports once and cancels the anchor; a modified or middle click reports nothing', () => {
  const fixture = TestBed.createComponent(ItemHost);
  fixture.detectChanges();
  try {
    const anchor = (fixture.nativeElement as Element).querySelector('a') as HTMLElement;
    const reported = fixture.componentInstance.reported;

    const primary = new MouseEvent('click', { button: 0, bubbles: true, cancelable: true });
    anchor.dispatchEvent(primary);
    fixture.detectChanges();
    assert.deepEqual(reported, ['home'], 'a primary click must report exactly once');
    assert.equal(primary.defaultPrevented, true, 'and must cancel the anchor, or the router competes with a page load');

    for (const modifier of ['metaKey', 'ctrlKey', 'shiftKey', 'altKey'] as const) {
      const event = new MouseEvent('click', { button: 0, [modifier]: true, bubbles: true, cancelable: true });
      anchor.dispatchEvent(event);
      fixture.detectChanges();
      assert.equal(event.defaultPrevented, false, `${modifier}+click must stay the browser's`);
    }

    const middle = new MouseEvent('click', { button: 1, bubbles: true, cancelable: true });
    anchor.dispatchEvent(middle);
    fixture.detectChanges();
    assert.equal(middle.defaultPrevented, false, 'a middle click must stay the browser\'s');

    assert.deepEqual(reported, ['home'],
      'a reader who asked for a new tab or for the address must get that, and no in-app route');
  } finally {
    fixture.destroy();
  }
});

test('the badge draws nothing at zero, caps at 99+, and is announced rather than hidden', () => {
  @Component({
    standalone: true,
    imports: [ArenaBottomNav, ArenaBottomNavItem],
    template: `
      <arena-bottom-nav ariaLabel="Primary">
        <arena-bottom-nav-item id="a" icon="ph-bold ph-house" label="None" [badge]="0" />
        <arena-bottom-nav-item id="b" icon="ph-bold ph-receipt" label="Some" [badge]="12" />
        <arena-bottom-nav-item id="c" icon="ph-bold ph-bell" label="Many" [badge]="4821" />
      </arena-bottom-nav>
    `,
  })
  class BadgeHost {}

  const fixture = TestBed.createComponent(BadgeHost);
  fixture.detectChanges();
  try {
    const host = fixture.nativeElement as Element;
    const texts = Array.from(host.querySelectorAll('button')).map((b) => b.textContent?.trim());
    assert.deepEqual(texts, ['None', '12Some', '99+Many'],
      'zero draws no mark, and a four-digit count reads 99+ so it cannot widen the column');
    for (const marked of host.querySelectorAll('[aria-hidden="true"]')) {
      assert.equal(marked.tagName, 'svg', 'only the glyph is hidden -- a count nobody can hear is a count that is not there');
    }
  } finally {
    fixture.destroy();
  }
});

@Component({
  standalone: true,
  imports: [ArenaBottomNav, ArenaBottomNavItem],
  template: `<arena-bottom-nav ariaLabel="Primary"><arena-bottom-nav-item id="  " icon="ph-bold ph-house" label="Home" /></arena-bottom-nav>`,
})
class BlankId {}

@Component({
  standalone: true,
  imports: [ArenaBottomNav, ArenaBottomNavItem],
  template: `<arena-bottom-nav ariaLabel="Primary"><arena-bottom-nav-item id="home" icon="ph-bold ph-house" label="  " /></arena-bottom-nav>`,
})
class BlankLabel {}

@Component({
  standalone: true,
  imports: [ArenaBottomNav, ArenaBottomNavItem],
  template: `<arena-bottom-nav ariaLabel="Primary"><arena-bottom-nav-item id="home" icon="  " label="Home" /></arena-bottom-nav>`,
})
class BlankIcon {}

test('a blank id, label or icon throws rather than rendering a destination nothing can name or reach', () => {
  const cases: [string, unknown][] = [['id', BlankId], ['label', BlankLabel], ['icon', BlankIcon]];
  for (const [name, host] of cases) {
    const fixture = TestBed.createComponent(host as never);
    assert.throws(() => fixture.detectChanges(), new RegExp(name),
      `a blank \`${name}\` rendered instead of throwing`);
    fixture.destroy();
  }
});
