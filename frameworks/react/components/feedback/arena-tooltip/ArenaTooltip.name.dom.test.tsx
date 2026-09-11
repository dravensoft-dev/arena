import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { ArenaTooltip } from './ArenaTooltip.tsx';
import { arenaAccessibleText, arenaTooltipRedundant } from './TooltipName.ts';

afterEach(() => cleanup());

test('arenaTooltipRedundant is containment, ignoring case and spacing', () => {
  assert.equal(arenaTooltipRedundant('Orders  12', 'orders'), true);
  assert.equal(arenaTooltipRedundant('Deploy', 'Ships the build'), false);
  assert.equal(arenaTooltipRedundant('Deploy', ''), false);
});

test('arenaAccessibleText prefers aria-label and skips aria-hidden text', () => {
  const host = mount(<div><button aria-label="Projects"><i aria-hidden="true">x</i></button><a href="#"><i aria-hidden="true">x</i> Orders <span>12</span></a></div>);
  const button = host.querySelector('button')!;
  const link = host.querySelector('a')!;
  assert.equal(arenaAccessibleText(button), 'Projects');
  assert.equal(arenaAccessibleText(link), 'Orders 12');
});

test('a tooltip that repeats its trigger\'s name keeps the reference and contributes no description', () => {
  const host = mount(<ArenaTooltip label="Projects"><button aria-label="Projects">P</button></ArenaTooltip>);
  const trigger = host.querySelector('button')!;
  act(() => { trigger.focus(); });
  const bubble = host.ownerDocument.querySelector('[role="tooltip"]') as HTMLElement;
  assert.equal(trigger.getAttribute('aria-describedby'), bubble.id);
  assert.equal(bubble.textContent, 'Projects');
  assert.equal(bubble.querySelector('[aria-hidden="true"]')?.textContent, 'Projects');
});

test('a tooltip that says something new describes as it always has', () => {
  const host = mount(<ArenaTooltip label="Ships the build"><button>Deploy</button></ArenaTooltip>);
  const trigger = host.querySelector('button')!;
  act(() => { trigger.focus(); });
  const bubble = host.ownerDocument.querySelector('[role="tooltip"]') as HTMLElement;
  assert.equal(bubble.textContent, 'Ships the build');
  assert.equal(bubble.querySelector('[aria-hidden]'), null);
});
