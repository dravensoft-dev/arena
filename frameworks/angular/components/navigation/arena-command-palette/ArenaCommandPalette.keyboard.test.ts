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

test('arenaScrollRowIntoView asks the row at the given index to scroll itself into view', () => {
  const list = document.createElement('div');
  const rows = [0, 1, 2].map(() => document.createElement('button'));
  list.append(...rows);
  document.body.appendChild(list);

  let calledWith: ScrollIntoViewOptions | undefined;
  rows[1].scrollIntoView = (options?: boolean | ScrollIntoViewOptions) => {
    calledWith = options as ScrollIntoViewOptions;
  };

  arenaScrollRowIntoView(list, 1);

  assert.deepEqual(calledWith, { block: 'nearest' });
});

test('arenaScrollRowIntoView does nothing when no row exists at the given index', () => {
  const list = document.createElement('div');
  document.body.appendChild(list);
  assert.doesNotThrow(() => arenaScrollRowIntoView(list, 0));
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
