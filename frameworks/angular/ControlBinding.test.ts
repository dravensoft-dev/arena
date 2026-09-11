import { useTestEnvironment } from './test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Injector } from '@angular/core';
import { ArenaControlBinding, arenaWarnDoubleBinding } from './ControlBinding';
import { forgetArenaWarnings } from './WarnOnce';

test('a fresh binding is unbound, enabled and calls nothing', () => {
  const binding = Injector.create({ providers: [ArenaControlBinding] }).get(ArenaControlBinding);
  assert.equal(binding.bound(), false);
  assert.equal(binding.disabled(), false);
  assert.equal(binding.value(), undefined);
  assert.doesNotThrow(() => binding.onChange('x'));
});

test('arenaWarnDoubleBinding warns once per component and member', () => {
  forgetArenaWarnings();
  const seen: string[] = [];
  const saved = console.warn;
  console.warn = (message: string) => { seen.push(message); };
  try {
    arenaWarnDoubleBinding('ArenaInput', 'value');
    arenaWarnDoubleBinding('ArenaInput', 'value');
  } finally { console.warn = saved; }
  assert.equal(seen.length, 1);
  assert.match(seen[0] ?? '', /ArenaInput.*value.*form directive/);
});
