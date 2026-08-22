/* The gate drives a real browser; these drive its verdict function with the walks a real trap and
 * a real defect produce. The ArenaCommandPalette case is the one that shipped: a modal panel with no
 * Tab handling at all, which every DOM-free suite passed because happy-dom has no sequential
 * focus navigation to leave the panel with. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readJson } from '../../utils/read-file.ts';
import {
  TRAPS, FOCUSABLE, walkProblems, PANEL_HELD, NAVIGATE, FOCUS_MOVED, heldExpression, movedExpression,
  armExpression, BEFORE,
} from './check-focus-trap.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';

const inside = (n: number) => Array.from({ length: n }, (_, i) => ({ press: i + 1, inside: true }));

test('every natively-focusable clause carries its own :not([tabindex="-1"])', () => {
  for (const clause of FOCUSABLE.split(', ')) {
    assert.match(clause, /:not\(\[tabindex="-1"\]\)$/,
      `${clause} would pull a <button tabindex="-1"> back into the tab order, because a selector list is OR'd`);
  }
});

test('the trap table names both layers, or the walk proves half of what it claims', () => {
  assert.ok(TRAPS.length > 0);
  assert.ok(TRAPS.some((t) => t.name.endsWith(':react')));
  assert.ok(TRAPS.some((t) => t.name.endsWith(':angular')));
});

test('every declared page is there, since a walk of a page that 404s reports no trap and no defect', () => {
  for (const trap of TRAPS) {
    assert.ok(existsSync(join(repoRoot, trap.page)), `${trap.name} names ${trap.page}, and nothing is there`);
  }
});

test('a trap opens from its own fixture, so no walk depends on finding a button by its copy', () => {
  for (const trap of TRAPS) {
    assert.ok(!('open' in trap),
      `${trap.name} still clicks something open: a page whose copy moved would walk with nothing open `
      + 'and report a trap that holds');
    const fixture = readJson(join(repoRoot, 'frameworks/demos', `${trap.name.split(':')[0]}.demo.json`));
    assert.equal(fixture.seed.open, true, `${trap.name}'s fixture does not open it`);
  }
});

test('a walk that stayed inside, reached everything and wrapped both ways is clean', () => {
  assert.deepEqual(walkProblems('X', {
    panel: true, focusables: 3, startsInside: true, forward: inside(4), visited: 3,
    wrapsForward: true, wrapsBackward: true,
  }), []);
});

test('focus leaving the panel is reported with the presses it left on', () => {
  const problems = walkProblems('ArenaCommandPalette:react', {
    panel: true, focusables: 1, startsInside: true,
    forward: [{ press: 1, inside: false }, { press: 2, inside: false }],
    visited: 0, wrapsForward: false, wrapsBackward: false,
  });
  assert.match(problems[0] ?? '', /focus left the panel on Tab 1, 2 -- the interior is not trapped/);
});

test('a single-stop trap is valid and is not asked to wrap between elements', () => {
  assert.deepEqual(walkProblems('Palette', {
    panel: true, focusables: 1, startsInside: true, forward: inside(2), visited: 1,
    wrapsForward: false, wrapsBackward: false,
  }), []);
});

test('a panel with no Tab stop at all fails, and a missing panel fails before anything is walked', () => {
  assert.match(walkProblems('X', { panel: true, focusables: 0 })[0] ?? '', /no Tab stop at all/);
  assert.match(walkProblems('X', { panel: false })[0] ?? '', /nothing was walked/);
});

test('a silent page names what it fetched and what it raised, since three failures read alike', () => {
  const problems = walkProblems('X', {
    panel: false,
    silence: {
      readyState: 'complete',
      elements: 4,
      errors: ['failed to load http://127.0.0.1:1/x.demo.entry.generated.js'],
      scripts: ['x.demo.entry.generated.js 404 0B'],
    },
  });
  assert.match(problems[0] ?? '', /404/);
  assert.match(problems[0] ?? '', /failed to load/);
  assert.match(problems[0] ?? '', /complete/,
    'an entry that 404s, a bundle that throws and a component that draws no panel are one '
    + 'sentence apart otherwise, and only the first two are about the page rather than the '
    + 'component this gate is pointed at');
  assert.ok(!(walkProblems('X', { panel: false })[0] ?? '').includes('The document was'),
    'a walk carrying no evidence says exactly what it always said, rather than an empty report');
});

test('an expired wait is reported as not seen in time, and never as a panel that is not there', () => {
  const problems = walkProblems('X', { panel: false, expired: true, waitedMs: PANEL_HELD.ms });
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /not seen within/,
    'a page that renders nothing and a runner slower than the wait produce the same sentence '
    + 'otherwise, and one of those is a component to fix while the other is a deadline to raise');
  assert.match(problems[0] ?? '', new RegExp(`${PANEL_HELD.ms}ms`));
  assert.doesNotMatch(problems[0] ?? '', /rendered no panel/,
    'the expiry says nothing about whether the component draws one, because it never looked '
    + 'after the wait it gave up on');
});

test('a wait that ENDED with no panel is reported as the component, which is a different owner', () => {
  const problems = walkProblems('X', { panel: false });
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /rendered no panel/);
  assert.doesNotMatch(problems[0] ?? '', /not seen within/);
});

test('the wait for a panel is the same order as the wait for the navigation before it', () => {
  assert.ok(PANEL_HELD.ms > NAVIGATE.ms / 2,
    'or the gate gives up on rendering long before it would give up on loading');
});

test('the panel wait answers whether it SAW the panel, so an expiry is not an empty page', () => {
  const source = heldExpression(PANEL_HELD);
  assert.match(source, /resolve\(\{ held: true/, 'the seen answer says it was seen');
  assert.match(source, /resolve\(\{ held: false/, 'and the expiry says it expired');
  assert.doesNotMatch(source, /resolve\(true\)/,
    'resolving the same value either way is what made a slow page and an empty one one problem');
});

test('a keypress waits for focus to MOVE rather than for a span to pass', () => {
  const source = movedExpression(FOCUS_MOVED);
  assert.match(source, /activeElement !== before/, 'the condition is about the subject');
  assert.ok(source.includes(String(FOCUS_MOVED.ms)), 'and the span beside it is the bound');
});

test('the keypress barrier reads a snapshot the press cannot have moved', () => {
  const armed = armExpression();
  assert.match(armed, /document\.activeElement/, 'arming is what takes the snapshot');
  assert.ok(armed.includes(BEFORE), 'and it parks it where the wait looks');
  assert.ok(movedExpression(FOCUS_MOVED).includes(BEFORE),
    'the wait reads the armed snapshot rather than taking its own: one taken after the key was '
    + 'dispatched is already the moved element, so the wait asks for a second move that never '
    + 'comes and spends its whole bound on every press');
  assert.doesNotMatch(movedExpression(FOCUS_MOVED), /const before = document\.activeElement/,
    'which is the line that made this gate a fixed sleep wearing the costume of a wait');
});

test('a panel holding one Tab stop is waited on for containment, not for a move', () => {
  const held = heldExpression(FOCUS_MOVED);
  assert.match(held, /contains\(document\.activeElement\)/,
    'Tab in a one-stop panel returns to the element it started on, so a move is impossible and '
    + 'asking for one spends the bound to learn what the stop count already said');
  assert.ok(held.includes(String(FOCUS_MOVED.ms)),
    'and the keypress bound is what it is spent against, not a second number spelled beside it');
});

test('a trap that never claimed focus on open is reported even when containment holds', () => {
  const problems = walkProblems('X', {
    panel: true, focusables: 2, startsInside: false, forward: inside(3), visited: 2,
    wrapsForward: true, wrapsBackward: true,
  });
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /did not start inside the panel/);
});
