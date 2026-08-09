/* A data-driven rail is the ordinary shape: one item per destination, from the consumer's own
 * list. Every case here builds its items through @for or behind a wrapper component, which is
 * what separates a container that INSPECTS its children from one that is told about them: a
 * content query sees neither an embedded view created later in the same pass nor anything
 * inside a wrapper's own template, and reading a child's required input from the parent's pass
 * throws NG0950 before any of that matters. Zoneless, that aborts the pass. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component, input, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ArenaSideNav } from './ArenaSideNav';
import { ArenaSideNavItem } from '../arena-side-nav-item/ArenaSideNavItem';
import { ArenaSideNavCollapsible } from '../arena-side-nav-collapsible/ArenaSideNavCollapsible';
import { ArenaSideNavSection } from '../arena-side-nav-section/ArenaSideNavSection';

const DESTINATIONS = [
  { id: 'builds', label: 'Builds' },
  { id: 'logs', label: 'Logs' },
];

@Component({
  standalone: true,
  imports: [ArenaSideNav, ArenaSideNavItem, ArenaSideNavCollapsible],
  template: `
    <arena-side-nav ariaLabel="Primary" [active]="active()">
      <arena-side-nav-collapsible id="delivery" label="Delivery">
        @for (d of destinations; track d.id) {
          <arena-side-nav-item [id]="d.id" [label]="d.label" />
        }
      </arena-side-nav-collapsible>
    </arena-side-nav>
  `,
})
class ForHost {
  readonly active = signal<string | undefined>(undefined);
  protected readonly destinations = DESTINATIONS;
}

@Component({
  selector: 'test-rows',
  standalone: true,
  imports: [ArenaSideNavItem],
  template: `
    @for (d of destinations(); track d.id) {
      <arena-side-nav-item [id]="d.id" [label]="d.label" />
    }
  `,
})
class Rows {
  readonly destinations = input.required<readonly { id: string; label: string }[]>();
}

@Component({
  standalone: true,
  imports: [ArenaSideNav, ArenaSideNavCollapsible, ArenaSideNavSection, Rows],
  template: `
    <arena-side-nav ariaLabel="Primary" [active]="active()">
      <arena-side-nav-collapsible id="delivery" label="Delivery">
        <test-rows [destinations]="destinations" />
      </arena-side-nav-collapsible>
      <arena-side-nav-section label="Account">
        <test-rows [destinations]="destinations" />
      </arena-side-nav-section>
    </arena-side-nav>
  `,
})
class WrapperHost {
  readonly active = signal<string | undefined>(undefined);
  protected readonly destinations = DESTINATIONS;
}

function rendered(element: Element) {
  return [...element.querySelectorAll('[class*="arena-side-nav"]')].length;
}

test('a collapsible holding @for items renders them, styled, with no required-input read across the pass', () => {
  const fixture = TestBed.createComponent(ForHost);
  try {
    fixture.detectChanges();
    const host = fixture.nativeElement;
    assert.equal(host.querySelectorAll('arena-side-nav-item').length, DESTINATIONS.length);
    assert.ok(rendered(host) > 0, 'the items are in the DOM and none of them is styled');
  } finally {
    fixture.destroy();
  }
});

test('the group opens itself when the active destination is one its @for built', () => {
  const fixture = TestBed.createComponent(ForHost);
  try {
    fixture.componentInstance.active.set('logs');
    fixture.detectChanges();
    fixture.detectChanges();
    const region = fixture.nativeElement.querySelector('#delivery-region');
    assert.ok(region, 'the region is not there at all');
    assert.equal(region.hasAttribute('hidden'), false, 'the group holding the active row stayed shut');
  } finally {
    fixture.destroy();
  }
});

test('the group stays shut when the active destination is not one of its own', () => {
  const fixture = TestBed.createComponent(ForHost);
  try {
    fixture.componentInstance.active.set('billing');
    fixture.detectChanges();
    fixture.detectChanges();
    const region = fixture.nativeElement.querySelector('#delivery-region');
    assert.equal(region.hasAttribute('hidden'), true, 'a group that holds nothing active opened anyway');
  } finally {
    fixture.destroy();
  }
});

test("a consumer's own wrapper between two levels is harmless, which is what DI walking past it means", () => {
  const fixture = TestBed.createComponent(WrapperHost);
  try {
    fixture.componentInstance.active.set('builds');
    fixture.detectChanges();
    fixture.detectChanges();
    const region = fixture.nativeElement.querySelector('#delivery-region');
    assert.equal(region.hasAttribute('hidden'), false, 'the group could not see the row inside a wrapper');
  } finally {
    fixture.destroy();
  }
});

test('a row built by @for is the one marked current, and only it', () => {
  const fixture = TestBed.createComponent(ForHost);
  try {
    fixture.componentInstance.active.set('logs');
    fixture.detectChanges();
    fixture.detectChanges();
    const current = fixture.nativeElement.querySelectorAll('[aria-current="page"]');
    assert.equal(current.length, 1);
    assert.equal(current[0]?.textContent?.trim(), 'Logs');
  } finally {
    fixture.destroy();
  }
});
