/* `layout` is injected by ArenaTable, so the cases are driven by passing it directly
 * rather than by mounting an ArenaTable and forcing a container width -- the row is the
 * subject here, not the responsive branch that chooses it. The wide row binds
 * `none` because every requirement that applies to it is a clause of ArenaTable's own
 * `grid` binding; what this suite proves about that case is that the row claims
 * no interactive route of its own, which is what `none` asserts. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import React from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { assertPatternCases, REACT_COMPONENTS } from '../../../test/AssertPattern.tsx';
import { ArenaTableRow } from './ArenaTableRow.tsx';
import { ArenaTableCell } from '../arena-table-cell/ArenaTableCell.tsx';

afterEach(cleanup);

const BINDING = join(REACT_COMPONENTS, 'display/arena-table-row/ArenaTableRow.behaviour.json');

const COLUMNS = [{ header: 'Service' }, { header: 'Status' }];

function card(extra: Record<string, unknown> = {}) {
  return mount(
    <table role="presentation"><tbody role="presentation">
      <ArenaTableRow layout="card" columns={COLUMNS} {...extra}>
        <ArenaTableCell>checkout-api</ArenaTableCell>
        <ArenaTableCell>Healthy</ArenaTableCell>
      </ArenaTableRow>
    </tbody></table>,
  );
}

function press(el: Element, key: string) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  act(() => { el.dispatchEvent(event); });
  return event;
}

test('ArenaTableRow meets all three of its declared shapes', () => {
  assertPatternCases({
    bindingPath: BINDING,
    cases: {

      row: () => {
        const root = mount(
          <table><tbody>
            <ArenaTableRow interactive layout="table" columns={COLUMNS} rowIndex={1} onClick={() => {}}>
              <ArenaTableCell>checkout-api</ArenaTableCell>
              <ArenaTableCell>Healthy</ArenaTableCell>
            </ArenaTableRow>
          </tbody></table>,
        );
        const tr = root.querySelector<HTMLElement>('tr');
        assert.equal(tr!.hasAttribute('role'), false,
          'the element already maps to a row, so writing the role back onto it is the hand-rebuild the '
          + 'contract refuses; ArenaTable\'s grid owns what the row means');
        assert.equal(tr!.hasAttribute('tabindex'), false,
          'the roving stop lives on the CELLS, injected by ArenaTable -- a stop on the row would be a second one');
        return { root, subjects: { default: tr } };
      },

      'card-interactive': () => {
        let clicked = 0;
        const root = card({ interactive: true, onClick: () => { clicked += 1; } });
        const el = root.querySelector<HTMLElement>('tr');

        assert.equal(el!.getAttribute('role'), 'button',
          'the card shape is still a <tr>, and role="button" is what replaces the row role the element carries '
          + 'natively -- the enclosing table is presentational, so nothing is left describing a stack of cards '
          + 'as a table with a button for a row');
        assert.equal(el!.getAttribute('tabindex'), '0', 'a card row is reached by Tab, unlike the wide row');
        assert.match(el!.textContent, /checkout-api/,
          'the button pattern accepts text content as its name, and the cells are that text');

        const enter = press(el!, 'Enter');
        assert.equal(clicked, 1, 'Enter did not activate the card row');
        assert.equal(enter.defaultPrevented, true, 'Enter was not claimed by the row');

        const space = press(el!, ' ');
        assert.equal(clicked, 2, 'Space did not activate the card row');
        assert.equal(space.defaultPrevented, true,
          'Space must be prevented, or the page scrolls under the row the user just pressed');

        let blocked = 0;
        const off = card({ interactive: true, disabled: true, onClick: () => { blocked += 1; } });
        const offEl = off.querySelector<HTMLElement>('tr');
        assert.equal(offEl!.getAttribute('aria-disabled'), 'true',
          'a disabled row must announce itself rather than leave the tab order');
        assert.equal(offEl!.getAttribute('role'), 'button',
          'it is still a button -- a disabled control that stops being one cannot be found at all');
        press(offEl!, 'Enter');
        act(() => { (offEl as HTMLElement).click(); });
        assert.equal(blocked, 0, 'a disabled row activated anyway');

        return {
          root,
          subjects: { default: el },
          behavioural: { 'keyboard.Enter': true, 'keyboard.Space': true, 'states.disabled': true },
        };
      },

      'card-inert': () => {
        const root = card();
        const el = root.querySelector<HTMLElement>('tr');
        assert.equal(el!.getAttribute('role'), 'presentation',
          'with no onClick there is nothing to press, and the table role the element carries natively is '
          + 'stripped rather than left describing a stack of cards as a table');
        assert.equal(el!.hasAttribute('tabindex'), false, 'an inert card must not be in the tab order');
        return { root, subjects: { default: el } };
      },
    },
  });
});
