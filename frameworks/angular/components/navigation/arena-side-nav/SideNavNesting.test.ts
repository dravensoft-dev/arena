/* The two container components of the family, together, because what they have to prove is
 * what happens BETWEEN them. Depth could be pushed down a level at a time;
 * Angular cannot, so each container provides a fresh ArenaSideNavState whose depth is the parent's
 * plus one and the leaf pulls from the nearest ancestor. That is the whole design, no gate can
 * see it, and every indent assertion below is what stands in for one. keyboard.Enter and
 * keyboard.Space are earned by the interception test; the rest of `disclosure` is decidable. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component, Type, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { assertSameNode } from '../../../test/NodeAssert';
import { assertPattern, ANGULAR_COMPONENTS } from '../../../test/Compliance';
import { ArenaSideNavItem } from '../arena-side-nav-item/ArenaSideNavItem';
import { ArenaSideNavSection } from '../arena-side-nav-section/ArenaSideNavSection';
import { ArenaSideNavCollapsible } from '../arena-side-nav-collapsible/ArenaSideNavCollapsible';
import { ArenaSideNav } from './ArenaSideNav';

const SECTION_BINDING = join(ANGULAR_COMPONENTS, 'navigation/arena-side-nav-section/ArenaSideNavSection.behaviour.json');
const COLLAPSIBLE_BINDING = join(ANGULAR_COMPONENTS, 'navigation/arena-side-nav-collapsible/ArenaSideNavCollapsible.behaviour.json');

@Component({
  standalone: true,
  imports: [ArenaSideNav, ArenaSideNavItem, ArenaSideNavSection, ArenaSideNavCollapsible],
  template: `
    <arena-side-nav ariaLabel="Primary" [active]="active()" (nav)="chosen.push($event)">
      <arena-side-nav-item id="dashboard" label="Projects" href="#projects" />
      <arena-side-nav-section label="Workspace">
        <arena-side-nav-item id="members" label="Members" />
        <arena-side-nav-collapsible id="deploys" label="Deployments" (toggle)="toggles.push($event)">
          <arena-side-nav-item id="prod" label="Production" href="#prod" />
          <arena-side-nav-item id="staging" label="Staging" href="#staging" />
        </arena-side-nav-collapsible>
      </arena-side-nav-section>
    </arena-side-nav>
  `,
})
class NestedHost {
  readonly active = signal<string | undefined>(undefined);
  readonly chosen: string[] = [];
  readonly toggles: boolean[] = [];
}

@Component({
  standalone: true,
  imports: [ArenaSideNav, ArenaSideNavItem, ArenaSideNavCollapsible],
  template: `
    <arena-side-nav ariaLabel="Primary" [active]="active()">
      <arena-side-nav-collapsible id="outer" label="Outer">
        <arena-side-nav-collapsible id="inner" label="Inner">
          <arena-side-nav-item id="prod" label="Production" href="#prod" />
        </arena-side-nav-collapsible>
      </arena-side-nav-collapsible>
    </arena-side-nav>
  `,
})
class DeepHost {
  readonly active = signal<string | undefined>(undefined);
}

function render<T>(type: Type<T>) {
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  const nav = fixture.nativeElement.querySelector('arena-side-nav') as HTMLElement;
  return { fixture, nav };
}

function indentOf(el: Element): string {
  return (el as HTMLElement).style.getPropertyValue('--arena-side-nav-depth');
}

function rowFor(nav: Element, text: string): HTMLElement {
  const rows = Array.from(nav.querySelectorAll<HTMLElement>('a, button'));
  const found = rows.find((row) => row.textContent?.trim() === text);
  assert.ok(found, `the fixture must render a row reading "${text}"`);
  return found!;
}

test('a section is a labelled group, and its heading is what names it', () => {
  const { fixture, nav } = render(NestedHost);
  try {
    const section = nav.querySelector('arena-side-nav-section') as HTMLElement;
    assert.equal(section.getAttribute('role'), 'group');
    const labelId = section.getAttribute('aria-labelledby');
    assert.ok(labelId, 'a group with no name is not a group');
    const heading = nav.querySelector(`#${labelId}`) as HTMLElement;
    assert.equal(heading.textContent?.trim(), 'Workspace',
      'aria-labelledby must resolve to the text a sighted user reads');

    assertPattern({ root: nav, bindingPath: SECTION_BINDING, subjects: { default: section } });
  } finally {
    fixture.destroy();
  }
});

test('a section with no children throws, because its heading would name nothing', () => {
  @Component({
    standalone: true,
    imports: [ArenaSideNav, ArenaSideNavSection],
    template: `<arena-side-nav ariaLabel="Primary"><arena-side-nav-section label="Empty" /></arena-side-nav>`,
  })
  class EmptyHost {}

  const fixture = TestBed.createComponent(EmptyHost);
  try {
    assert.throws(() => fixture.detectChanges(), /a section with no children is not a legal shape/);
  } finally {
    fixture.destroy();
  }
});

test('depth compounds one step per container, and the leaf pulls it rather than being handed it', () => {
  const { fixture, nav } = render(NestedHost);
  try {
    assert.equal(indentOf(rowFor(nav, 'Projects')), '0',
      'depth 0: a row directly under the nav sits at the flat base');
    assert.equal(indentOf(rowFor(nav, 'Members')), '3',
      'depth 1: one section deep');
    assert.equal(indentOf(rowFor(nav, 'Deployments')), '3',
      'a collapsible trigger sits at its OWN depth, alongside its siblings, not at its region\'s');
    assert.equal(indentOf(rowFor(nav, 'Production')), '6',
      'depth 2: a section and a collapsible compound');

    const heading = nav.querySelector('arena-side-nav-section div') as HTMLElement;
    assert.equal(indentOf(heading), '0',
      'a section heading is indented at its own depth, so it lines up with its siblings and not with its children');
  } finally {
    fixture.destroy();
  }
});

test('nesting is arbitrary: two collapsibles deep still compounds, with no context anywhere', () => {
  const { fixture, nav } = render(DeepHost);
  try {
    assert.equal(indentOf(rowFor(nav, 'Outer')), '0');
    assert.equal(indentOf(rowFor(nav, 'Inner')), '3');
    assert.equal(indentOf(rowFor(nav, 'Production')), '6');
  } finally {
    fixture.destroy();
  }
});

test('arena-side-nav-collapsible meets the disclosure pattern it binds', () => {
  const { fixture, nav } = render(NestedHost);
  try {
    const trigger = rowFor(nav, 'Deployments');
    assert.equal(trigger.tagName, 'BUTTON');
    assert.equal(trigger.getAttribute('type'), 'button');
    assert.equal(trigger.getAttribute('aria-expanded'), 'false');
    const regionId = trigger.getAttribute('aria-controls');
    const region = nav.querySelector(`#${regionId}`) as HTMLElement;
    assert.ok(region, 'aria-controls must never point at nothing, which is why the region is always rendered');
    assert.equal(region.hasAttribute('hidden'), true, 'a collapsed region is hidden, not absent');

    assertPattern({
      root: nav,
      bindingPath: COLLAPSIBLE_BINDING,
      subjects: { default: trigger },
      behavioural: { 'keyboard.Enter': true, 'keyboard.Space': true },
    });
  } finally {
    fixture.destroy();
  }
});

test('Enter and Space are intercepted and toggle it, so the platform does not also synthesize a click', () => {
  for (const key of ['Enter', ' ']) {
    const { fixture, nav } = render(NestedHost);
    try {
      const trigger = rowFor(nav, 'Deployments');
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      trigger.dispatchEvent(event);
      fixture.detectChanges();
      assert.equal(event.defaultPrevented, true, `${key} must be intercepted, or a browser opens it twice`);
      assert.equal(trigger.getAttribute('aria-expanded'), 'true', `${key} must toggle the region`);
      assert.deepEqual(fixture.componentInstance.toggles, [true], 'and report exactly one boolean per press');
    } finally {
      fixture.destroy();
    }
  }
});

test('a press moves the attribute, the hidden region and the caret together, and reports one boolean', () => {
  const { fixture, nav } = render(NestedHost);
  try {
    const trigger = rowFor(nav, 'Deployments');
    const region = nav.querySelector(`#${trigger.getAttribute('aria-controls')}`) as HTMLElement;
    const caret = trigger.querySelectorAll('i')[trigger.querySelectorAll('i').length - 1];

    trigger.click();
    fixture.detectChanges();
    assert.equal(trigger.getAttribute('aria-expanded'), 'true');
    assert.equal(region.hasAttribute('hidden'), false);
    assert.match(caret.className, /ph-caret-down/);

    trigger.click();
    fixture.detectChanges();
    assert.equal(trigger.getAttribute('aria-expanded'), 'false');
    assert.equal(region.hasAttribute('hidden'), true);
    assert.match(caret.className, /ph-caret-right/);
    assert.deepEqual(fixture.componentInstance.toggles, [true, false]);
  } finally {
    fixture.destroy();
  }
});

test('a route change into a collapsed subtree opens it, and that is Arena\'s decision rather than the user\'s, so it reports nothing', () => {
  const { fixture, nav } = render(NestedHost);
  try {
    const trigger = rowFor(nav, 'Deployments');
    assert.equal(trigger.getAttribute('aria-expanded'), 'false');

    fixture.componentInstance.active.set('staging');
    fixture.detectChanges();
    assert.equal(trigger.getAttribute('aria-expanded'), 'true',
      'the destination is inside this group, so the group opens to show where the user is');
    assert.deepEqual(fixture.componentInstance.toggles, [],
      'an automatic expansion is not a press, and reporting it would be a lie a consumer persists');
    assertSameNode(nav.querySelector('[aria-current="page"]'), rowFor(nav, 'Staging'));
  } finally {
    fixture.destroy();
  }
});

test('the user may collapse a group holding the active destination, and it does not reopen itself against them', () => {
  const { fixture, nav } = render(NestedHost);
  try {
    fixture.componentInstance.active.set('staging');
    fixture.detectChanges();
    const trigger = rowFor(nav, 'Deployments');
    assert.equal(trigger.getAttribute('aria-expanded'), 'true');

    trigger.click();
    fixture.detectChanges();
    assert.equal(trigger.getAttribute('aria-expanded'), 'false');
    assert.deepEqual(fixture.componentInstance.toggles, [false]);

    fixture.detectChanges();
    assert.equal(trigger.getAttribute('aria-expanded'), 'false',
      'the group stays closed: expanded state is derived at the seed and then owned by the user');
  } finally {
    fixture.destroy();
  }
});

test('a nested collapsible opens independently of its parent -- two disclosures, never a treeview', () => {
  const { fixture, nav } = render(DeepHost);
  try {
    const outer = rowFor(nav, 'Outer');
    const inner = rowFor(nav, 'Inner');

    outer.click();
    fixture.detectChanges();
    assert.equal(outer.getAttribute('aria-expanded'), 'true');
    assert.equal(inner.getAttribute('aria-expanded'), 'false', 'opening the outer must not open the inner');

    inner.click();
    fixture.detectChanges();
    assert.equal(inner.getAttribute('aria-expanded'), 'true');
    assert.equal(outer.getAttribute('aria-expanded'), 'true', 'opening the inner must not close the outer');

    for (const trigger of [outer, inner]) {
      assert.equal(trigger.getAttribute('aria-level'), null,
        'treeview is refused, not merely unimplemented: no aria-level anywhere');
      assert.equal(trigger.getAttribute('tabindex'), null, 'and no roving tab stop');
    }
  } finally {
    fixture.destroy();
  }
});

test('an active destination two collapsibles deep opens both, because holdsActive is a subtree question', () => {
  const fixture = TestBed.createComponent(DeepHost);
  try {
    fixture.componentInstance.active.set('prod');
    fixture.detectChanges();
    const nav = fixture.nativeElement.querySelector('arena-side-nav') as HTMLElement;
    assert.equal(rowFor(nav, 'Outer').getAttribute('aria-expanded'), 'true');
    assert.equal(rowFor(nav, 'Inner').getAttribute('aria-expanded'), 'true');
  } finally {
    fixture.destroy();
  }
});
