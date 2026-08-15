/* contracts/api/README.md requires a guarded name to be refused when it is blank AFTER TRIMMING:
 * a name of nothing but spaces satisfies a falsiness test and names nothing, and it is the one
 * input the guard exists to catch. The set is derived from the contracts rather than listed here,
 * so an eighth guarded name joins by being declared. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { REACT_COMPONENTS } from './AssertPattern.tsx';
import { ArenaSideNav } from '../components/navigation/arena-side-nav/ArenaSideNav.tsx';
import { ArenaSideNavItem } from '../components/navigation/arena-side-nav-item/ArenaSideNavItem.tsx';
import { ArenaSideNavSection } from '../components/navigation/arena-side-nav-section/ArenaSideNavSection.tsx';
import { ArenaRadioGroup } from '../components/forms/arena-radio-group/ArenaRadioGroup.tsx';
import { ArenaBreadcrumbs } from '../components/navigation/arena-breadcrumbs/ArenaBreadcrumbs.tsx';
import { ArenaActivityFeed } from '../components/display/arena-activity-feed/ArenaActivityFeed.tsx';
import { ArenaPeopleList } from '../components/display/arena-people-list/ArenaPeopleList.tsx';
import { ArenaPersonRow } from '../components/display/arena-person-row/ArenaPersonRow.tsx';
import { ArenaTable } from '../components/display/arena-table/ArenaTable.tsx';
import { ArenaScroller } from '../components/layout/arena-scroller/ArenaScroller.tsx';
import { ArenaSection } from '../components/layout/arena-section/ArenaSection.tsx';
import { ArenaHero } from '../components/layout/arena-hero/ArenaHero.tsx';
import { ArenaPagination } from '../components/navigation/arena-pagination/ArenaPagination.tsx';
import { ArenaBottomNav } from '../components/navigation/arena-bottom-nav/ArenaBottomNav.tsx';
import { ArenaSheet } from '../components/feedback/arena-sheet/ArenaSheet.tsx';

interface MemberSpec { form?: string; type?: string; required?: boolean; description?: string }
const CONTRACTS = join(REACT_COMPONENTS, '../../../contracts/api/components');
const BLANK = '   ';

const WITH_A_BLANK_NAME = new Map([
  ['ArenaSideNav', () => <ArenaSideNav ariaLabel={BLANK}><ArenaSideNavItem id="a" label="Alpha" /></ArenaSideNav>],
  ['ArenaSideNavSection', () => <ArenaSideNavSection label={BLANK}><ArenaSideNavItem id="a" label="Alpha" /></ArenaSideNavSection>],
  ['ArenaRadioGroup', () => <ArenaRadioGroup ariaLabel={BLANK} value="a" />],
  ['ArenaBreadcrumbs', () => <ArenaBreadcrumbs ariaLabel={BLANK} items={[{ label: 'Home' }]} />],
  ['ArenaActivityFeed', () => <ArenaActivityFeed label={BLANK} items={[]} />],
  ['ArenaPeopleList', () => <ArenaPeopleList label={BLANK}><ArenaPersonRow name="Ada" /></ArenaPeopleList>],
  ['ArenaPersonRow', () => <ArenaPersonRow name={BLANK} />],
  ['ArenaTable', () => <ArenaTable label={BLANK} columns={[{ header: 'A' }]} />],
  ['ArenaScroller', () => <ArenaScroller label={BLANK}><span>One</span></ArenaScroller>],
  ['ArenaSection', () => <ArenaSection title={BLANK}><span>One</span></ArenaSection>],
  ['ArenaHero', () => <ArenaHero title={BLANK} />],
  ['ArenaPagination', () => <ArenaPagination ariaLabel={BLANK} page={1} pageCount={3} />],
  ['ArenaSheet', () => <ArenaSheet open title={BLANK}>Two line items.</ArenaSheet>],
  ['ArenaBottomNav', () => <ArenaBottomNav ariaLabel={BLANK} />],
]);

export function guardedNames(dir: string, read = readFileSync, list = readdirSync) {
  const found = [];
  for (const file of list(dir).filter((f) => f.endsWith('.json')).sort()) {
    const contract = JSON.parse(read(join(dir, file), 'utf8'));
    for (const [member, spec] of Object.entries(contract.api ?? {}) as [string, MemberSpec][]) {
      if (spec.form === 'primitive' && spec.type === 'string'
        && /guarded at runtime/.test(spec.description ?? '')) {
        found.push({ component: contract.component, member });
      }
    }
  }
  return found;
}

test('a name of nothing but spaces is refused, which is what the contract asks of a guard', () => {
  const declared = guardedNames(CONTRACTS);
  assert.ok(declared.length > 0, 'no contract declares a guarded name -- this suite matched nothing, so it proves nothing');

  for (const { component, member } of declared) {
    const render = WITH_A_BLANK_NAME.get(component);
    assert.ok(render, `${component}.${member} is a guarded name and this suite has no case for it -- add one`);
    assert.throws(
      () => renderToStaticMarkup(render()),
      (error) => error instanceof Error && error.message.startsWith(`${component}:`),
      `${component} accepted a \`${member}\` of nothing but spaces. A guard trims before it decides, `
      + 'or it misses the one value a present-but-useless name arrives as.',
    );
  }
});

test('the cases are the guarded names and nothing else, so a retired one cannot sit here unnoticed', () => {
  const declared = new Set(guardedNames(CONTRACTS).map((g) => g.component));
  for (const component of WITH_A_BLANK_NAME.keys()) {
    assert.ok(declared.has(component), `${component} has a case here and declares no guarded name -- stale, delete it`);
  }
});
