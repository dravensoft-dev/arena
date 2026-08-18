/* The generator exists because a module-level counter is per-process rather than per-render, and
 * a server loads a module once and serves many requests from it. What that costs is asserted here
 * rather than in any component's suite: every component that needs an id needs the same property,
 * and proving it ten times would be proving the counter rather than the rule.
 *
 * Injector.create rather than TestBed, because what is under test is precisely that the count
 * belongs to an injector: a harness that hands back the same root injector twice would assert
 * nothing and pass. */
import { useTestEnvironment } from './test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { APP_ID, Injector } from '@angular/core';
import { ArenaIdGenerator } from './ArenaIds';

const application = (id: string) => Injector.create({
  providers: [{ provide: APP_ID, useValue: id }, { provide: ArenaIdGenerator, deps: [] }],
}).get(ArenaIdGenerator);

test('two ids from one generator never collide', () => {
  const ids = application('app');
  const seen = new Set([...Array(50)].map(() => ids.next('arena-thing')));
  assert.equal(seen.size, 50, 'the whole job of the thing');
});

test('an id says which component asked for it', () => {
  const ids = application('app');
  assert.match(ids.next('arena-tabs'), /^arena-tabs-/,
    'the prefix is what makes a devtools pane readable, and every call site passes its own');
});

test('a second application starts its own count rather than continuing the first', () => {
  const first = application('app').next('arena-tabs');
  const second = application('app').next('arena-tabs');

  assert.equal(first, second,
    'This is the defect the module-level counter had, stated as the property that replaces it. '
    + 'The count belongs to an injector, so a fresh application is a fresh count and the first id '
    + 'a component asks for is the same id whoever is asking. A counter in module scope answered '
    + 'differently: it kept climbing for the life of the process, so a server never returned to '
    + 'zero between requests while every client started there, and the two disagreed.');
});

test('the ids a render produces are reproducible, which is what hydration compares', () => {
  const render = () => {
    const ids = application('app');
    return [ids.next('arena-tabs'), ids.next('arena-dialog'), ids.next('arena-select')];
  };
  assert.deepEqual(render(), render(),
    'a server render and the client render that replaces it are two runs of the same sequence, '
    + 'so an id that differs between them is an aria-controls pointing at nothing after hydration');
});

test('two applications sharing a document do not hand out the same id', () => {
  assert.notEqual(application('one').next('arena-tabs'), application('two').next('arena-tabs'),
    'an id is unique per injector, and a document holding two applications holds two injectors, '
    + 'so the application id is what keeps a duplicate out of the DOM rather than the count');
});
