/* check:api excludes slots from its required-ness comparison, for the reason
 * contracts/api/AGENTS.md gives -- no platform-neutral syntax declares projected content
 * mandatory -- so a contract declaring `"required": true` on a slot is held by nothing else.
 * This is that check: each required slot is refused on its own, omitted and given as a false
 * conditional, and the message names it (React names the `content` slot `children`). It is
 * derived from the contracts rather than listed here, so a required slot joins it by being
 * declared, and the count assertion fails if the set ever empties. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { REACT_COMPONENTS } from './AssertPattern.tsx';
import { ArenaTooltip } from '../components/feedback/arena-tooltip/ArenaTooltip.tsx';
import { ArenaMenu } from '../components/navigation/arena-menu/ArenaMenu.tsx';
import { ArenaPopover } from '../components/feedback/arena-popover/ArenaPopover.tsx';
import { ArenaAppLogo } from '../components/brand/arena-app-logo/ArenaAppLogo.tsx';
import { ArenaSideNavSection } from '../components/navigation/arena-side-nav-section/ArenaSideNavSection.tsx';
import { ArenaScroller } from '../components/layout/arena-scroller/ArenaScroller.tsx';
import { ArenaBoard } from '../components/layout/arena-board/ArenaBoard.tsx';
import { ArenaSection } from '../components/layout/arena-section/ArenaSection.tsx';
import { ArenaFieldset } from '../components/forms/arena-fieldset/ArenaFieldset.tsx';
import { ArenaLink } from '../components/navigation/arena-link/ArenaLink.tsx';
import { ArenaFilterBar } from '../components/navigation/arena-filter-bar/ArenaFilterBar.tsx';
import { ArenaSplitButton } from '../components/forms/arena-split-button/ArenaSplitButton.tsx';

interface MemberSpec { form?: string; type?: string; required?: boolean; description?: string }
const CONTRACTS = join(REACT_COMPONENTS, '../../../contracts/api/components');

const WITHOUT_THE_SLOT = new Map([
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  ['ArenaTooltip.content', () => <ArenaTooltip label="Retry the build" />],
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  ['ArenaMenu.trigger', () => <ArenaMenu items={[]} />],
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  ['ArenaPopover.trigger', () => <ArenaPopover label="Filters"><p>Only failing builds.</p></ArenaPopover>],
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  ['ArenaPopover.content', () => <ArenaPopover label="Filters" trigger={<button type="button">Filters</button>} />],
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  ['ArenaAppLogo.mark', () => <ArenaAppLogo name="Dravensoft" />],
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  ['ArenaSideNavSection.content', () => <ArenaSideNavSection label="Projects" />],
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  ['ArenaScroller.content', () => <ArenaScroller label="Recently landed lots" />],
  ['ArenaBoard.content', () => <ArenaBoard label="Sprint 32 tasks by status">{null}</ArenaBoard>],
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  ['ArenaSection.content', () => <ArenaSection title="Landed recently" />],
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  ['ArenaFieldset.content', () => <ArenaFieldset legend="Notifications" />],
  ['ArenaLink.content', () => <ArenaLink href="/notes" />],
  ['ArenaFilterBar.content', () => <ArenaFilterBar label="Deployment filters">{null}</ArenaFilterBar>],
  ['ArenaSplitButton.content', () => <ArenaSplitButton label="Deployment" menuLabel="More deploy options" items={[]}>{null}</ArenaSplitButton>],
]);

const AS_A_FALSE_CONDITIONAL = new Map([
  ['ArenaTooltip.content', () => <ArenaTooltip label="Retry the build">{false}</ArenaTooltip>],
  ['ArenaMenu.trigger', () => <ArenaMenu items={[]} trigger={false} />],
  ['ArenaPopover.trigger', () => <ArenaPopover label="Filters" trigger={false}><p>Only failing builds.</p></ArenaPopover>],
  ['ArenaPopover.content', () => <ArenaPopover label="Filters" trigger={<button type="button">Filters</button>}>{false}</ArenaPopover>],
  ['ArenaAppLogo.mark', () => <ArenaAppLogo name="Dravensoft" mark={false} />],
  ['ArenaSideNavSection.content', () => <ArenaSideNavSection label="Projects">{false}</ArenaSideNavSection>],
  ['ArenaScroller.content', () => <ArenaScroller label="Recently landed lots">{false}</ArenaScroller>],
  ['ArenaBoard.content', () => <ArenaBoard label="Sprint 32 tasks by status">{false}</ArenaBoard>],
  ['ArenaSection.content', () => <ArenaSection title="Landed recently">{false}</ArenaSection>],
  ['ArenaFieldset.content', () => <ArenaFieldset legend="Notifications">{false}</ArenaFieldset>],
  ['ArenaLink.content', () => <ArenaLink href="/notes">{false}</ArenaLink>],
  ['ArenaFilterBar.content', () => <ArenaFilterBar label="Deployment filters">{false}</ArenaFilterBar>],
  ['ArenaSplitButton.content', () => <ArenaSplitButton label="Deployment" menuLabel="More deploy options" items={[]}>{false}</ArenaSplitButton>],
]);

export function requiredSlots(dir: string, read = readFileSync, list = readdirSync) {
  const found = [];
  for (const file of list(dir).filter((f) => f.endsWith('.json')).sort()) {
    const contract = JSON.parse(read(join(dir, file), 'utf8'));
    for (const [member, spec] of Object.entries(contract.api ?? {}) as [string, MemberSpec][]) {
      if (spec.form === 'slot' && spec.required === true) found.push({ component: contract.component, member });
    }
  }
  return found;
}

const namedInReact = (member: string) => (member === 'content' ? 'children' : member);
const refusalNaming = (component: string, member: string) => (error: unknown) =>
  error instanceof Error && error.message.startsWith(`${component}:`)
  && error.message.includes('`' + namedInReact(member) + '`');

test('every slot a contract declares required throws in React when it is omitted, naming it', () => {
  const declared = requiredSlots(CONTRACTS);
  assert.ok(declared.length > 0, 'no contract declares a required slot -- this suite matched nothing, so it proves nothing');

  for (const { component, member } of declared) {
    const render = WITHOUT_THE_SLOT.get(`${component}.${member}`);
    assert.ok(render, `${component}.${member} is a required slot and this suite has no case for it -- add one`);
    assert.throws(
      () => renderToStaticMarkup(render()),
      refusalNaming(component, member),
      `${component} rendered without its required \`${member}\` slot, or refused it without naming it. A required slot is `
      + 'held at runtime or by nothing at all, since check:api compares no slot for required-ness.',
    );
  }
});

test('a required slot given as a false conditional is absent, and throws the same way, naming it', () => {
  for (const { component, member } of requiredSlots(CONTRACTS)) {
    const render = AS_A_FALSE_CONDITIONAL.get(`${component}.${member}`);
    assert.ok(render, `${component}.${member} is a required slot and this suite has no false-conditional case for it -- add one`);
    assert.throws(
      () => renderToStaticMarkup(render()),
      refusalNaming(component, member),
      `${component} accepted \`${member}\` as \`{false}\`, which is how a conditional that did not hold arrives, `
      + 'or refused it without naming the slot.',
    );
  }
});

test('the cases are the required slots and nothing else, so a retired one cannot sit here unnoticed', () => {
  const declared = new Set(requiredSlots(CONTRACTS).map((s) => `${s.component}.${s.member}`));
  for (const [name, cases] of [['WITHOUT_THE_SLOT', WITHOUT_THE_SLOT], ['AS_A_FALSE_CONDITIONAL', AS_A_FALSE_CONDITIONAL]] as const) {
    for (const key of cases.keys()) {
      assert.ok(declared.has(key), `${name} has a case for ${key} and the contracts declare no such required slot -- stale, delete it`);
    }
  }
});
