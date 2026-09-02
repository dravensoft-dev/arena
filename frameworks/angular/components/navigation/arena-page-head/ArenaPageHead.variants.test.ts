import test from 'node:test';
import assert from 'node:assert/strict';
import { DOCUMENT, ElementRef, Injector, runInInjectionContext } from '@angular/core';
import { arenaContainerWidth, forgetArenaBreakpoints, arenaReadBreakpoint } from '../../../ContainerSize';
import { arenaPageHeadStyles } from './ArenaPageHead.variants';

function injectorWith(properties: Record<string, string>): Injector {
  const doc = {
    documentElement: {},
    defaultView: {
      getComputedStyle: () => ({ getPropertyValue: (name: string) => properties[name] ?? '' }),
    },
  } as unknown as Document;
  return Injector.create({ providers: [{ provide: DOCUMENT, useValue: doc }] });
}

test('arenaReadBreakpoint reads --bp-<name> off the document root and returns it as a number of px', () => {
  forgetArenaBreakpoints();
  const value = runInInjectionContext(injectorWith({ '--bp-md': ' 768px ' }), () => arenaReadBreakpoint('md'));
  assert.equal(value, 768);
});

test('a breakpoint is read once per name -- a later document with a different value does not change what was cached', () => {
  const second = runInInjectionContext(injectorWith({ '--bp-md': '1px' }), () => arenaReadBreakpoint('md'));
  assert.equal(second, 768, 'the cached value must win; breakpoints are constants for the life of the document');
});

test('the injection-context contract holds on a cache hit too, not only on the first call for a name', () => {
  runInInjectionContext(injectorWith({ '--bp-md': '768px' }), () => arenaReadBreakpoint('md'));
  assert.throws(
    () => arenaReadBreakpoint('md'),
    /NG0203|injection context/i,
    'a cached breakpoint must still require an injection context -- otherwise the contract depends on call order',
  );
});

test('arenaContainerWidth requires an injection context whether or not it is handed an element to measure', () => {

  assert.throws(() => arenaContainerWidth(), /NG0203|injection context/i);
  const elsewhere = new ElementRef(null as unknown as HTMLElement);
  assert.throws(
    () => arenaContainerWidth(elsewhere),
    /NG0203|injection context/i,
    'the element is optional and the context is not: DestroyRef disconnects the observer and '
    + 'afterNextRender decides when there is a box to measure, and neither is reachable outside one',
  );
});
