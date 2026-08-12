import { ensureDom } from '../../../test/TestbedEnv';
ensureDom();

import test from 'node:test';
import assert from 'node:assert/strict';
import type { ArenaCommand } from '../../../Api.generated';
import {
  arenaActiveOptionId,
  arenaFilterCommands,
  arenaNextActiveIndex,
  arenaOptionRowId,
  arenaScrollRowIntoView,
} from './ArenaCommandPalette';

const COMMANDS: ArenaCommand[] = [
  { id: 'deploy', label: 'Deploy to production', hint: 'client portal', shortcut: '⌘D' },
  { id: 'logs', label: 'View build logs', hint: 'build 4821' },
  { id: 'invite', label: 'Invite teammate', hint: 'members settings' },
  { id: 'theme', label: 'Toggle theme' },
];

test('an empty query keeps every command, in its original order', () => {
  assert.deepEqual(arenaFilterCommands(COMMANDS, ''), COMMANDS);
});

test('the query matches against the label, case-insensitively', () => {
  const result = arenaFilterCommands(COMMANDS, 'DEPLOY');
  assert.deepEqual(result.map((c) => c.id), ['deploy']);
});

test('the query also matches against hint, even though hint is never shown -- a command is findable by a synonym not in its label', () => {
  const result = arenaFilterCommands(COMMANDS, 'members');
  assert.deepEqual(result.map((c) => c.id), ['invite']);
});

test('a command with no hint is still matched by its label alone', () => {
  const result = arenaFilterCommands(COMMANDS, 'toggle');
  assert.deepEqual(result.map((c) => c.id), ['theme']);
});

test('a query matching nothing answers an empty list, not the full one', () => {
  assert.deepEqual(arenaFilterCommands(COMMANDS, 'zzz'), []);
});

test('ArrowDown moves the active index forward by one', () => {
  assert.equal(arenaNextActiveIndex(0, 'ArrowDown', 4), 1);
});

test('ArrowDown at the last row stays put -- it does not wrap', () => {
  assert.equal(arenaNextActiveIndex(3, 'ArrowDown', 4), 3);
});

test('ArrowUp moves the active index back by one', () => {
  assert.equal(arenaNextActiveIndex(2, 'ArrowUp', 4), 1);
});

test('ArrowUp at the first row stays put -- it does not wrap', () => {
  assert.equal(arenaNextActiveIndex(0, 'ArrowUp', 4), 0);
});

test('an empty result list always answers index 0, in either direction', () => {
  assert.equal(arenaNextActiveIndex(0, 'ArrowDown', 0), 0);
  assert.equal(arenaNextActiveIndex(0, 'ArrowUp', 0), 0);
});

function listbox(sizes: number[]) {
  const list = document.createElement('div');
  list.setAttribute('role', 'listbox');
  const groups: HTMLElement[] = [];
  const rows: HTMLElement[] = [];
  const scrolled: { element: HTMLElement; options: ScrollIntoViewOptions | undefined }[] = [];
  for (const size of sizes) {
    const group = document.createElement('div');
    group.setAttribute('role', 'group');
    for (let i = 0; i < size; i++) {
      const row = document.createElement('button');
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', 'false');
      group.appendChild(row);
      rows.push(row);
    }
    list.appendChild(group);
    groups.push(group);
  }
  for (const element of [...groups, ...rows]) {
    element.scrollIntoView = (options?: boolean | ScrollIntoViewOptions) => {
      scrolled.push({ element, options: options as ScrollIntoViewOptions });
    };
  }
  document.body.appendChild(list);
  return { list, groups, rows, scrolled };
}

test('the element scrolled is the row aria-selected names, which groups nest a level below the listbox', () => {
  const { list, rows, scrolled } = listbox([2, 2]);
  rows[1].setAttribute('aria-selected', 'true');

  arenaScrollRowIntoView(list, 1);

  assert.equal(scrolled.length, 1);
  assert.equal(scrolled[0]?.element, list.querySelector('[aria-selected="true"]'));
  assert.deepEqual(scrolled[0]?.options, { block: 'nearest' });
});

test('a row in the second group scrolls itself rather than the group, which is what a child lookup would reach', () => {
  const { list, groups, rows, scrolled } = listbox([2, 2]);
  rows[2].setAttribute('aria-selected', 'true');

  arenaScrollRowIntoView(list, 2);

  assert.deepEqual(scrolled.map((one) => one.element), [rows[2]]);
  assert.equal(scrolled.some((one) => groups.includes(one.element)), false);
});

test('a listbox drawing one unnamed group is read the same way, so every index past the first still finds its row', () => {
  const { list, rows, scrolled } = listbox([3]);
  arenaScrollRowIntoView(list, 2);
  assert.deepEqual(scrolled.map((one) => one.element), [rows[2]]);
});

test('arenaScrollRowIntoView does nothing when no row exists at the given index', () => {
  const { list, scrolled } = listbox([2]);
  assert.doesNotThrow(() => arenaScrollRowIntoView(list, 5));
  assert.deepEqual(scrolled, []);
});

test('arenaOptionRowId formats a row id from the instance prefix and the row index', () => {
  assert.equal(arenaOptionRowId('arena-command-palette-0', 2), 'arena-command-palette-0-option-2');
});

test('arenaActiveOptionId points at the active row\'s real id when a row exists there -- the property aria-activedescendant depends on', () => {
  assert.equal(arenaActiveOptionId('arena-command-palette-0', 1, 4), arenaOptionRowId('arena-command-palette-0', 1));
});

test('arenaActiveOptionId is undefined, not dangling, when the filtered list is empty', () => {
  assert.equal(arenaActiveOptionId('arena-command-palette-0', 0, 0), undefined);
});

test('arenaActiveOptionId is undefined when the active index is out of range for a non-empty list', () => {
  assert.equal(arenaActiveOptionId('arena-command-palette-0', 5, 3), undefined);
});
