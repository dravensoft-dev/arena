/* ARENA_ICONS holds the URL of the sprite a project serves: null until a provider hands one, so a
 * server render or a forgotten provider reaches ArenaIcon as an absent sprite, and the factory
 * and the provider read no document, window or fetch. */
import { useTestEnvironment } from './test/TestbedEnv';
useTestEnvironment();

import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createApplication } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { REPO } from './test/Compliance';
import { ARENA_ICONS, provideArenaIcons } from './ArenaIcons';

afterEach(() => TestBed.resetTestingModule());

test('with no provider ARENA_ICONS is null', async () => {
  const app = await createApplication();
  try {
    assert.equal(app.injector.get(ARENA_ICONS), null);
  } finally {
    app.destroy();
  }
});

test('provideArenaIcons hands the href it was given', () => {
  TestBed.configureTestingModule({ providers: [provideArenaIcons('/a/icons-1.svg')] });
  assert.equal(TestBed.inject(ARENA_ICONS), '/a/icons-1.svg');
});

test('the module reads no document, window or fetch', () => {
  const source = readFileSync(join(REPO, 'frameworks/angular/ArenaIcons.ts'), 'utf8');
  assert.doesNotMatch(source, /\b(document|window|fetch)\b/);
});
