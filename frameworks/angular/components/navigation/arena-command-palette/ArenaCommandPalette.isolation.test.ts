import { ensureDom } from '../../../test/TestbedEnv';
ensureDom();

import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { disposeStrays } from '../../../test/Overlays';

beforeEach(() => disposeStrays(document));

test('a fixture appended to the body is gone before the next case', () => {
  const list = document.body.appendChild(document.createElement('div'));
  list.setAttribute('role', 'listbox');
  list.appendChild(document.createElement('button')).setAttribute('role', 'option');
});

test('so the next case finds no option a previous one left', () => {
  assert.equal(document.body.querySelectorAll('[role=option]').length, 0);
});
