import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import React from 'react';
import { mount, cleanup, act } from '../../test/Harness.tsx';
import { assertPatternCases, REACT_COMPONENTS } from '../../test/AssertPattern.tsx';
import { ArenaTag } from './arena-tag/ArenaTag.tsx';
import { ArenaCalendarEvent } from './arena-calendar-event/ArenaCalendarEvent.tsx';

afterEach(cleanup);

function assertKeysUnintercepted(el: Element) {
  for (const key of ['Enter', ' ']) {
    const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    act(() => { el.dispatchEvent(ev); });
    assert.equal(ev.defaultPrevented, false,
      `a handler of ours cancelled ${key === ' ' ? 'Space' : key}, suppressing the button's own activation`);
  }
}

test('ArenaTag meets both of its declared cases', () => {
  assertPatternCases({
    bindingPath: join(REACT_COMPONENTS, 'display/arena-tag/ArenaTag.behaviour.json'),
    cases: {

      plain: () => ({ root: mount(<ArenaTag>Backend</ArenaTag>) }),
      removable: () => {
        let removed = false;
        const root = mount(<ArenaTag removable onRemove={() => { removed = true; }}>Backend</ArenaTag>);

        const button = root.querySelector<HTMLElement>('button');
        assertKeysUnintercepted(button!);
        assert.equal(button!.hasAttribute('aria-disabled'), false,
          'an available action must not announce itself as disabled');
        act(() => { button!.click(); });
        assert.equal(removed, true, 'sanity: a real click must reach onRemove');

        let blocked = false;
        const off = mount(<ArenaTag removable disabled onRemove={() => { blocked = true; }}>Backend</ArenaTag>);
        const offButton = off.querySelector<HTMLElement>('button');
        assert.equal(offButton!.getAttribute('aria-disabled'), 'true',
          'a disabled remove must say so through aria-disabled, not by vanishing from the tab order');
        assert.equal(offButton!.hasAttribute('disabled'), false,
          'the native attribute would take the button out of the tab order, which is what aria-disabled exists to avoid');
        act(() => { offButton!.click(); });
        assert.equal(blocked, false, 'a disabled remove still reported through onRemove');

        return {
          root,
          subjects: { default: button },
          behavioural: { 'states.disabled': true, 'keyboard.Space': true, 'keyboard.Enter': true },
        };
      },

    },
  });
});

const CHIP = {
  box: {}, timeLabel: '09:00 - 09:30',
  dateLabel: 'Monday 20 July', tabIndex: -1,
};

test('ArenaCalendarEvent meets all three of its declared shapes, and `interactive` is what picks one', () => {
  assertPatternCases({
    bindingPath: join(REACT_COMPONENTS, 'display/arena-calendar-event/ArenaCalendarEvent.behaviour.json'),
    cases: {

      clickable: () => {
        let clicked = false;
        const root = mount(<ArenaCalendarEvent id="a" title="Standup" start="2026-07-20T09:00:00Z"
          end="2026-07-20T09:30:00Z" interactive onClick={() => { clicked = true; }} {...CHIP} />);
        assertKeysUnintercepted(root.firstElementChild!);
        assert.equal(root.firstElementChild!.hasAttribute('aria-disabled'), false,
          'an activatable chip must not announce itself as disabled');
        act(() => { (root.firstElementChild as HTMLElement).click(); });
        assert.equal(clicked, true, 'sanity: a real click must reach onClick');

        let blocked = false;
        const off = mount(<ArenaCalendarEvent id="a-off" title="Standup" start="2026-07-20T09:00:00Z"
          end="2026-07-20T09:30:00Z" interactive disabled onClick={() => { blocked = true; }} {...CHIP} />);
        assert.equal(off.firstElementChild!.getAttribute('aria-disabled'), 'true',
          'a disabled chip must say so through aria-disabled, keeping its place in the grid\'s Tab sequence');
        act(() => { (off.firstElementChild as HTMLElement).click(); });
        assert.equal(blocked, false, 'a disabled chip still reported through onClick');

        const unbound = mount(<ArenaCalendarEvent id="a-unbound" title="Standup" start="2026-07-20T09:00:00Z"
          end="2026-07-20T09:30:00Z" interactive {...CHIP} />);
        assert.equal(unbound.firstElementChild!.tagName, 'BUTTON',
          'the shape follows `interactive` and never whether onClick was passed -- R6');
        act(() => { (unbound.firstElementChild as HTMLElement).click(); });

        return {
          root,
          behavioural: { 'states.disabled': true, 'keyboard.Space': true, 'keyboard.Enter': true },
        };
      },

      'clickable-with-actions': () => {
        let clicked = false;
        const root = mount(<ArenaCalendarEvent id="b" title="Standup" start="2026-07-20T09:00:00Z"
          end="2026-07-20T09:30:00Z" interactive onClick={() => { clicked = true; }} actionsEnabled
          actions={<button type="button">Delete</button>} {...CHIP} />);
        const body = [...root.querySelectorAll<HTMLElement>('button')]
          .find((b) => /^Standup,/.test(b.getAttribute('aria-label') || ''));

        assertKeysUnintercepted(body!);
        assert.equal(body!.hasAttribute('aria-disabled'), false,
          'an activatable chip body must not announce itself as disabled');
        act(() => { body!.click(); });
        assert.equal(clicked, true, 'sanity: a real click must reach onClick');

        let blocked = false;
        const off = mount(<ArenaCalendarEvent id="b-off" title="Standup" start="2026-07-20T09:00:00Z"
          end="2026-07-20T09:30:00Z" interactive disabled onClick={() => { blocked = true; }} actionsEnabled
          actions={<button type="button">Delete</button>} {...CHIP} />);
        const offBody = [...off.querySelectorAll<HTMLElement>('button')]
          .find((b) => /^Standup,/.test(b.getAttribute('aria-label') || ''));
        assert.equal(offBody!.getAttribute('aria-disabled'), 'true',
          'the disabled state must reach the BODY button, which is where the interactivity moved');
        act(() => { offBody!.click(); });
        assert.equal(blocked, false, 'a disabled chip body still reported through onClick');

        return {
          root,
          subjects: { default: body },
          behavioural: { 'states.disabled': true, 'keyboard.Space': true, 'keyboard.Enter': true },
        };
      },


      inert: () => {
        let clicked = false;
        const plain = mount(<ArenaCalendarEvent id="c" title="Standup" start="2026-07-20T09:00:00Z"
          end="2026-07-20T09:30:00Z" onClick={() => { clicked = true; }} {...CHIP} />);
        assert.equal(plain.firstElementChild!.tagName, 'DIV',
          'a chip the consumer declared non-interactive is a div, even with onClick bound -- '
          + '`interactive` decides the shape, which is the whole point of it being a member');
        assert.equal(plain.querySelector<HTMLElement>('button')!, null, 'and it renders no button at all');
        act(() => { (plain.firstElementChild as HTMLElement).click(); });
        assert.equal(clicked, false, 'a non-interactive chip must not activate');

        const withActions = mount(<ArenaCalendarEvent id="d" title="Standup" start="2026-07-20T09:00:00Z"
          end="2026-07-20T09:30:00Z" actionsEnabled {...CHIP} />);
        const root = withActions.firstElementChild;
        assert.equal(root!.tagName, 'DIV',
          'actionsEnabled draws a kebab but does not make the chip pressable -- the root stays a div');
        assert.equal(root!.hasAttribute('role'), false,
          'and it claims no interactive role, which is what `none` asserts about this case');

        return { root: withActions };
      },
    },
  });
});
