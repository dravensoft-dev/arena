import { useTestEnvironment } from './test/TestbedEnv';
useTestEnvironment();

import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { REPO } from './test/Compliance';
import { ARENA_DEFAULT_LOCALE, ARENA_LOCALE, arenaMergeLocale, provideArenaLocale } from './ArenaLocale';

const contract = JSON.parse(readFileSync(join(REPO, 'contracts/api/types/arena-locale.json'), 'utf8'));

afterEach(() => TestBed.resetTestingModule());

test('ARENA_DEFAULT_LOCALE is the contract\'s defaults, field for field and in order', () => {
  const expected = Object.fromEntries(Object.entries(contract.fields).map(([name, field]) => [name, (field as { default: string }).default]));
  assert.deepEqual(Object.entries(ARENA_DEFAULT_LOCALE), Object.entries(expected));
});

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

test('arenaMergeLocale ignores a field given as undefined', () => {
  assert.equal(arenaMergeLocale(ARENA_DEFAULT_LOCALE, { tagRemove: undefined }).tagRemove, 'Remove');
});
