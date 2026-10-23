import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mount, cleanup } from '../../../test/Harness.tsx';
import { ArenaPeopleList } from './ArenaPeopleList.tsx';
import { ArenaPersonRow } from '../arena-person-row/ArenaPersonRow.tsx';

afterEach(cleanup);

test('an unordered people list keeps its list role where the list style is none', () => {
  const root = mount(<ArenaPeopleList label="Suggested accounts"><ArenaPersonRow name="Ada" /></ArenaPeopleList>);
  const list = root.querySelector('ul')!;
  assert.equal(list.getAttribute('role'), 'list');
  assert.equal(root.querySelector('ol'), null);
});

test('an ordered people list keeps its list role where the list style is none', () => {
  const root = mount(<ArenaPeopleList label="Ruby league standings" ordered><ArenaPersonRow name="Ada" /></ArenaPeopleList>);
  const list = root.querySelector('ol')!;
  assert.equal(list.getAttribute('role'), 'list');
  assert.equal(root.querySelector('ul'), null);
});
