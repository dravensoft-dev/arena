/* contracts/api/AGENTS.md requires a guarded name to be refused when it is blank AFTER TRIMMING:
 * a name of nothing but spaces satisfies a falsiness test and names nothing, and it is the one
 * input the guard exists to catch. Each guarded member is refused on its own, in a render that
 * blanks that member only, and the message names it. The set is derived from the contracts
 * rather than listed here, so a guarded name joins by being declared. */
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
import { ArenaFileInput } from '../components/forms/arena-file-input/ArenaFileInput.tsx';
import { ArenaNumberField } from '../components/forms/arena-number-field/ArenaNumberField.tsx';
import { ArenaPinInput } from '../components/forms/arena-pin-input/ArenaPinInput.tsx';
import { ArenaFilterBar } from '../components/navigation/arena-filter-bar/ArenaFilterBar.tsx';
import { ArenaSplitButton } from '../components/forms/arena-split-button/ArenaSplitButton.tsx';
import { ArenaTreeView } from '../components/navigation/arena-tree-view/ArenaTreeView.tsx';
import { ArenaSlider } from '../components/forms/arena-slider/ArenaSlider.tsx';
import { ArenaRadioGroup } from '../components/forms/arena-radio-group/ArenaRadioGroup.tsx';
import { ArenaCheckbox } from '../components/forms/arena-checkbox/ArenaCheckbox.tsx';
import { ArenaCheckboxGroup } from '../components/forms/arena-checkbox-group/ArenaCheckboxGroup.tsx';
import { ArenaBreadcrumbs } from '../components/navigation/arena-breadcrumbs/ArenaBreadcrumbs.tsx';
import { ArenaActivityFeed } from '../components/display/arena-activity-feed/ArenaActivityFeed.tsx';
import { ArenaPeopleList } from '../components/display/arena-people-list/ArenaPeopleList.tsx';
import { ArenaBoard } from '../components/layout/arena-board/ArenaBoard.tsx';
import { ArenaBoardColumn } from '../components/layout/arena-board-column/ArenaBoardColumn.tsx';
import { ArenaPersonRow } from '../components/display/arena-person-row/ArenaPersonRow.tsx';
import { ArenaTable } from '../components/display/arena-table/ArenaTable.tsx';
import { ArenaScroller } from '../components/layout/arena-scroller/ArenaScroller.tsx';
import { ArenaSection } from '../components/layout/arena-section/ArenaSection.tsx';
import { ArenaFieldset } from '../components/forms/arena-fieldset/ArenaFieldset.tsx';
import { ArenaCombobox } from '../components/forms/arena-combobox/ArenaCombobox.tsx';
import { ArenaMultiSelect } from '../components/forms/arena-multi-select/ArenaMultiSelect.tsx';
import { ArenaSkipLink } from '../components/layout/arena-skip-link/ArenaSkipLink.tsx';
import { ArenaAccordionItem } from '../components/layout/arena-accordion-item/ArenaAccordionItem.tsx';
import { ArenaLink } from '../components/navigation/arena-link/ArenaLink.tsx';
import { ArenaMeter } from '../components/feedback/arena-meter/ArenaMeter.tsx';
import { ArenaHero } from '../components/layout/arena-hero/ArenaHero.tsx';
import { ArenaPagination } from '../components/navigation/arena-pagination/ArenaPagination.tsx';
import { ArenaStepper } from '../components/navigation/arena-stepper/ArenaStepper.tsx';
import { ArenaTimeline } from '../components/display/arena-timeline/ArenaTimeline.tsx';
import { ArenaBottomNav } from '../components/navigation/arena-bottom-nav/ArenaBottomNav.tsx';
import { ArenaSheet } from '../components/feedback/arena-sheet/ArenaSheet.tsx';
import { ArenaPopover } from '../components/feedback/arena-popover/ArenaPopover.tsx';

interface MemberSpec { form?: string; type?: string; required?: boolean; description?: string }
const CONTRACTS = join(REACT_COMPONENTS, '../../../contracts/api/components');
const BLANK = '   ';

const WITH_A_BLANK_NAME = new Map([
  ['ArenaSideNav.ariaLabel', () => <ArenaSideNav ariaLabel={BLANK}><ArenaSideNavItem id="a" label="Alpha" /></ArenaSideNav>],
  ['ArenaSideNavSection.label', () => <ArenaSideNavSection label={BLANK}><ArenaSideNavItem id="a" label="Alpha" /></ArenaSideNavSection>],
  ['ArenaRadioGroup.ariaLabel', () => <ArenaRadioGroup ariaLabel={BLANK} value="a" />],
  ['ArenaCheckbox.label', () => <ArenaCheckbox label={BLANK} />],
  ['ArenaCheckboxGroup.ariaLabel', () => <ArenaCheckboxGroup ariaLabel={BLANK} />],
  ['ArenaCombobox.label', () => <ArenaCombobox label={BLANK} options={[]} />],
  ['ArenaMultiSelect.label', () => <ArenaMultiSelect label={BLANK} options={[]} />],
  ['ArenaBreadcrumbs.ariaLabel', () => <ArenaBreadcrumbs ariaLabel={BLANK} items={[{ label: 'Home' }]} />],
  ['ArenaActivityFeed.label', () => <ArenaActivityFeed label={BLANK} items={[]} />],
  ['ArenaPeopleList.label', () => <ArenaPeopleList label={BLANK}><ArenaPersonRow name="Ada" /></ArenaPeopleList>],
  ['ArenaPersonRow.name', () => <ArenaPersonRow name={BLANK} />],
  ['ArenaBoard.label', () => <ArenaBoard label={BLANK}><ArenaBoardColumn title="To do" /></ArenaBoard>],
  ['ArenaBoardColumn.title', () => <ArenaBoardColumn title={BLANK} />],
  ['ArenaTable.label', () => <ArenaTable label={BLANK} columns={[{ header: 'A' }]} />],
  ['ArenaScroller.label', () => <ArenaScroller label={BLANK}><span>One</span></ArenaScroller>],
  ['ArenaSection.title', () => <ArenaSection title={BLANK}><span>One</span></ArenaSection>],
  ['ArenaFieldset.legend', () => <ArenaFieldset legend={BLANK}><span>One</span></ArenaFieldset>],
  ['ArenaHero.title', () => <ArenaHero title={BLANK} />],
  ['ArenaPagination.ariaLabel', () => <ArenaPagination ariaLabel={BLANK} page={1} pageCount={3} />],
  ['ArenaPopover.label', () => <ArenaPopover label={BLANK} trigger={<button type="button">Filters</button>}><p>Only failing builds.</p></ArenaPopover>],
  ['ArenaSheet.title', () => <ArenaSheet open title={BLANK}>Two line items.</ArenaSheet>],
  ['ArenaBottomNav.ariaLabel', () => <ArenaBottomNav ariaLabel={BLANK} />],
  ['ArenaSkipLink.label', () => <ArenaSkipLink label={BLANK} />],
  ['ArenaFileInput.label', () => <ArenaFileInput label={BLANK} />],
  ['ArenaNumberField.label', () => <ArenaNumberField label={BLANK} />],
  ['ArenaSlider.label', () => <ArenaSlider label={BLANK} />],
  ['ArenaPinInput.label', () => <ArenaPinInput label={BLANK} />],
  ['ArenaFilterBar.label', () => <ArenaFilterBar label={BLANK}><select aria-label="Region" /></ArenaFilterBar>],
  ['ArenaLink.href', () => <ArenaLink href={BLANK}>Release notes</ArenaLink>],
  ['ArenaMeter.label', () => <ArenaMeter label={BLANK} value={1} />],
  ['ArenaAccordionItem.value', () => <ArenaAccordionItem value={BLANK} label="Details" />],
  ['ArenaAccordionItem.label', () => <ArenaAccordionItem value="details" label={BLANK} />],
  ['ArenaStepper.ariaLabel', () => <ArenaStepper ariaLabel={BLANK} steps={[]} />],
  ['ArenaTimeline.label', () => <ArenaTimeline label={BLANK} items={[]} />],
  ['ArenaSplitButton.label', () => <ArenaSplitButton label={BLANK} menuLabel="More deploy options" items={[]}>Deploy</ArenaSplitButton>],
  ['ArenaSplitButton.menuLabel', () => <ArenaSplitButton label="Deploy" menuLabel={BLANK} items={[]}>Deploy</ArenaSplitButton>],
  ['ArenaTreeView.label', () => <ArenaTreeView label={BLANK} nodes={[]} />],
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

test('a name of nothing but spaces is refused, which is what the contract asks of a guard, naming it', () => {
  const declared = guardedNames(CONTRACTS);
  assert.ok(declared.length > 0, 'no contract declares a guarded name -- this suite matched nothing, so it proves nothing');

  for (const { component, member } of declared) {
    const render = WITH_A_BLANK_NAME.get(`${component}.${member}`);
    assert.ok(render, `${component}.${member} is a guarded name and this suite has no case for it -- add one`);
    assert.throws(
      () => renderToStaticMarkup(render()),
      (error) => error instanceof Error && error.message.startsWith(`${component}:`)
        && error.message.includes('`' + member + '`'),
      `${component} accepted a \`${member}\` of nothing but spaces, or refused it without naming it. A guard trims before it decides, `
      + 'or it misses the one value a present-but-useless name arrives as.',
    );
  }
});

test('the cases are the guarded names and nothing else, so a retired one cannot sit here unnoticed', () => {
  const declared = new Set(guardedNames(CONTRACTS).map((g) => `${g.component}.${g.member}`));
  for (const key of WITH_A_BLANK_NAME.keys()) {
    assert.ok(declared.has(key), `${key} has a case here and declares no guarded name -- stale, delete it`);
  }
});
