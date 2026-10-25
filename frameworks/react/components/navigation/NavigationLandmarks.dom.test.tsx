/* Both bindings name the `navigation` pattern and both requirements are decidable
 * from one element, so the only behavioural verdict is ArenaBreadcrumbs'
 * `alternative.jsonLd`, earned beside it by the JSON-LD tests in
 * ArenaBreadcrumbs.test.tsx. What the suite adds beyond the wrapper is the half a
 * single render cannot show: that two instances carry DIFFERENT names, which is
 * the whole point of the requirement and the thing a hardcoded constant satisfied
 * mechanically while failing. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import React from 'react';
import { mount, cleanup } from '../../test/Harness.tsx';
import { assertPattern, REACT_COMPONENTS } from '../../test/AssertPattern.tsx';
import { ArenaBreadcrumbs } from './arena-breadcrumbs/ArenaBreadcrumbs.tsx';
import { ArenaPagination } from './arena-pagination/ArenaPagination.tsx';
import { ArenaSideNav } from './arena-side-nav/ArenaSideNav.tsx';
import { ArenaSideNavItem } from './arena-side-nav-item/ArenaSideNavItem.tsx';

afterEach(cleanup);

const CRUMBS = [{ label: 'Clients', href: '/clients' }, { label: 'Overview' }];

test('ArenaBreadcrumbs is a named nav landmark, and two of them are told apart', () => {
  const root = mount(<ArenaBreadcrumbs ariaLabel="Project navigation" items={CRUMBS} />);
  const nav = root.querySelector<HTMLElement>('nav');
  assert.equal(nav!.getAttribute('aria-label'), 'Project navigation',
    'the name must be the member, not a constant the component owns');

  const other = mount(<ArenaBreadcrumbs ariaLabel="Client navigation" items={CRUMBS} />);
  assert.notEqual(other.querySelector<HTMLElement>('nav')!.getAttribute('aria-label'), nav!.getAttribute('aria-label'),
    'two trails on one page must be distinguishable, which a shared constant made impossible');

  assertPattern({
    root,
    bindingPath: join(REACT_COMPONENTS, 'navigation/arena-breadcrumbs/ArenaBreadcrumbs.behaviour.json'),
    subjects: { default: nav },
    behavioural: { 'alternative.jsonLd': true },
  });
});

test('ArenaPagination is a named nav landmark, and two of them are told apart', () => {
  const root = mount(<ArenaPagination page={3} pageCount={12} ariaLabel="Deployments" />);
  const nav = root.querySelector<HTMLElement>('nav');
  assert.equal(nav!.getAttribute('aria-label'), 'Deployments',
    'the name must say what is being paged, and it must come from the member');

  const other = mount(<ArenaPagination page={1} pageCount={4} ariaLabel="Environments" />);
  assert.notEqual(other.querySelector<HTMLElement>('nav')!.getAttribute('aria-label'), nav!.getAttribute('aria-label'),
    'two paginated tables in one dashboard is a routine layout and they must not share a name');

  assertPattern({
    root,
    bindingPath: join(REACT_COMPONENTS, 'navigation/arena-pagination/ArenaPagination.behaviour.json'),
    subjects: { default: nav },
  });
});

test('ArenaSideNav is a named nav landmark, and two of them are told apart', () => {
  const root = mount(
    <ArenaSideNav ariaLabel="Project sections" active="overview" onNav={() => {}}>
      <ArenaSideNavItem id="overview" label="Overview" />
      <ArenaSideNavItem id="deployments" label="Deployments" />
    </ArenaSideNav>,
  );
  const nav = root.querySelector<HTMLElement>('nav');
  assert.equal(nav!.getAttribute('aria-label'), 'Project sections',
    'a sidebar and a breadcrumb trail on one page are two landmarks and must not share a name');

  const other = mount(
    <ArenaSideNav ariaLabel="Account sections" onNav={() => {}}><ArenaSideNavItem id="billing" label="Billing" /></ArenaSideNav>,
  );
  assert.notEqual(other.querySelector<HTMLElement>('nav')!.getAttribute('aria-label'), nav!.getAttribute('aria-label'));

  assertPattern({
    root,
    bindingPath: join(REACT_COMPONENTS, 'navigation/arena-side-nav/ArenaSideNav.behaviour.json'),
    subjects: { default: nav },
  });
});
