import { useTestEnvironment } from './test/TestbedEnv';
useTestEnvironment();

import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { TestBed } from '@angular/core/testing';
import { ARENA_DEFAULT_LOCALE, ARENA_LOCALE, provideArenaLocale } from './ArenaLocale';

afterEach(() => TestBed.resetTestingModule());

test('with no provider ARENA_LOCALE is the defaults', () => {
  assert.equal(TestBed.inject(ARENA_LOCALE), ARENA_DEFAULT_LOCALE);
});

test('provideArenaLocale merges its partial over the defaults, once', () => {
  TestBed.configureTestingModule({ providers: [provideArenaLocale({ locale: 'es-ES', tagRemove: 'Quitar' })] });
  const locale = TestBed.inject(ARENA_LOCALE);
  assert.equal(locale.locale, 'es-ES');
  assert.equal(locale.tagRemove, 'Quitar');
  assert.equal(locale.alertDismiss, 'Dismiss');
});
