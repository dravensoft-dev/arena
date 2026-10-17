import { takeComponentIdCollisions, takeUnassertedWarnings, useTestEnvironment } from './TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component, reflectComponentType } from '@angular/core';
import { TestBed } from '@angular/core/testing';

@Component({ selector: 'testbed-env-load-twin', standalone: true, template: '<p>load</p>' })
export class LoadTwinA {}

@Component({ selector: 'testbed-env-load-twin', standalone: true, template: '<p>load</p>' })
export class LoadTwinB {}

const twin = () => Component({ selector: 'testbed-env-twin', standalone: true, template: '<p>twin</p>' })(class {});

test('two decorated hosts that hash alike collide once both are defined, and the first case reads the record', () => {
  assert.ok(reflectComponentType(LoadTwinA) && reflectComponentType(LoadTwinB));
  const found = takeComponentIdCollisions();
  assert.equal(found.length, 1);
  assert.match(found[0] ?? '', /^NG0912/);
  assert.match(found[0] ?? '', /TestbedEnv\.test\.[jt]s/);
});

test('two components that hash alike are recorded as a collision, and nothing is printed', () => {
  TestBed.createComponent(twin()).destroy();
  TestBed.createComponent(twin()).destroy();
  const found = takeComponentIdCollisions();
  assert.equal(found.length, 1);
  assert.match(found[0] ?? '', /^NG0912/);
  assert.match(found[0] ?? '', /TestbedEnv\.test\.[jt]s/);
});

test('a component with a selector of its own collides with nothing', () => {
  TestBed.createComponent(Component({ selector: 'testbed-env-alone', standalone: true, template: '<p>alone</p>' })(class {})).destroy();
  assert.deepEqual(takeComponentIdCollisions(), []);
});

test('an Arena warning no test captured is recorded, not printed', () => {
  console.warn('[arena] probe: a warning nothing asserted');
  const found = takeUnassertedWarnings();
  assert.equal(found.length, 1);
  assert.match(found[0] ?? '', /^\[arena\] probe: a warning nothing asserted, printed .*TestbedEnv\.test\.[jt]s/);
});

test('a warning a test captures for itself never reaches the guard', () => {
  const saved = console.warn;
  const heard: string[] = [];
  console.warn = (message: string) => { heard.push(message); };
  try { console.warn('[arena] probe: asserted'); } finally { console.warn = saved; }
  assert.deepEqual(heard, ['[arena] probe: asserted']);
  assert.deepEqual(takeUnassertedWarnings(), []);
});
