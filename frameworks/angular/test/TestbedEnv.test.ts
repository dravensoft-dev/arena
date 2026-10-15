import { takeComponentIdCollisions, useTestEnvironment } from './TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

@Component({ selector: 'testbed-env-load-twin', standalone: true, template: '<p>load</p>' })
export class LoadTwinA {}

@Component({ selector: 'testbed-env-load-twin', standalone: true, template: '<p>load</p>' })
export class LoadTwinB {}

const twin = () => Component({ selector: 'testbed-env-twin', standalone: true, template: '<p>twin</p>' })(class {});

test('two decorated hosts that hash alike collide when the file loads, and the first case reads the record', () => {
  const found = takeComponentIdCollisions();
  assert.equal(found.length, 1);
  assert.match(found[0] ?? '', /^NG0912/);
  assert.match(found[0] ?? '', /TestbedEnv\.test\.js/);
});

test('two components that hash alike are recorded as a collision, and nothing is printed', () => {
  TestBed.createComponent(twin()).destroy();
  TestBed.createComponent(twin()).destroy();
  const found = takeComponentIdCollisions();
  assert.equal(found.length, 1);
  assert.match(found[0] ?? '', /^NG0912/);
  assert.match(found[0] ?? '', /TestbedEnv\.test\.js/);
});

test('a component with a selector of its own collides with nothing', () => {
  TestBed.createComponent(Component({ selector: 'testbed-env-alone', standalone: true, template: '<p>alone</p>' })(class {})).destroy();
  assert.deepEqual(takeComponentIdCollisions(), []);
});
