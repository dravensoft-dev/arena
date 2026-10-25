import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaPeopleList } from './ArenaPeopleList';

@Component({
  selector: 'people-list-roles-host',
  standalone: true,
  imports: [ArenaPeopleList],
  template: `<arena-people-list label="Suggested accounts" /><arena-people-list label="Ruby league standings" ordered />`,
})
class PeopleListRolesHost {}

test('an unordered people list keeps its list role where the list style is none', () => {
  const fixture = TestBed.createComponent(PeopleListRolesHost);
  try {
    fixture.detectChanges();
    const list = (fixture.nativeElement as HTMLElement).querySelector('ul')!;
    assert.equal(list.getAttribute('role'), 'list');
  } finally {
    fixture.destroy();
  }
});

test('an ordered people list keeps its list role where the list style is none', () => {
  const fixture = TestBed.createComponent(PeopleListRolesHost);
  try {
    fixture.detectChanges();
    const list = (fixture.nativeElement as HTMLElement).querySelector('ol')!;
    assert.equal(list.getAttribute('role'), 'list');
  } finally {
    fixture.destroy();
  }
});
