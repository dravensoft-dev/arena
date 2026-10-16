/* arena-accordion binds accordion and its items bind none, so both are asserted on one render. The
 * pattern's subjects are the header buttons, and roles.heading is decided on the heading each one
 * sits in. Enter and Space are a native button's own; aria-disabled on a header that may not close
 * is asserted before it is declared. Each panel is a group named by its own header, which is Arena's
 * design rather than a requirement of the pattern, so the suite asserts it directly. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { assertSameNode } from '../../../test/NodeAssert';
import { assertPattern, ANGULAR_COMPONENTS } from '../../../test/Compliance';
import { ArenaAccordion } from './ArenaAccordion';
import { ArenaAccordionItem } from '../arena-accordion-item/ArenaAccordionItem';

const BINDING = join(ANGULAR_COMPONENTS, 'layout/arena-accordion/ArenaAccordion.behaviour.json');
const ITEM_BINDING = join(ANGULAR_COMPONENTS, 'layout/arena-accordion-item/ArenaAccordionItem.behaviour.json');

@Component({
  selector: 'accordion-compliance-host',
  standalone: true,
  imports: [ArenaAccordion, ArenaAccordionItem],
  template: `
    <arena-accordion defaultValue="roll" [collapsible]="false" [headingLevel]="level">
      <arena-accordion-item value="ship" label="What ships">Ship body</arena-accordion-item>
      <arena-accordion-item value="roll" label="How it rolls out">Roll body</arena-accordion-item>
      <arena-accordion-item value="back" label="When it rolls back">Back body</arena-accordion-item>
    </arena-accordion>
  `,
})
class ComplianceHost {
  level: 'h2' | 'h3' = 'h3';
}

function render(patch: Partial<ComplianceHost> = {}) {
  const fixture = TestBed.createComponent(ComplianceHost);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const triggers = Array.from(root.querySelectorAll<HTMLElement>('[data-arena-part="accordion.trigger"]'));
  const headings = Array.from(root.querySelectorAll<HTMLElement>('[data-arena-part="accordion.heading"]'));
  const panels = Array.from(root.querySelectorAll<HTMLElement>('[role="group"]'));
  return { fixture, root, triggers, headings, panels };
}

test('arena-accordion meets the accordion pattern on every header', () => {
  const { fixture, root, triggers, headings } = render();
  try {
    assert.equal(triggers.length, 3, 'sanity: the headers rendered');
    assert.equal(triggers[1]!.getAttribute('aria-disabled'), 'true');
    assertPattern({
      root,
      bindingPath: BINDING,
      subjects: { default: triggers[1]!, 'roles.heading': headings, 'roles.controls': triggers },
      behavioural: { 'keyboard.Enter': true, 'keyboard.Space': true, 'states.disabled': true },
    });
  } finally {
    fixture.destroy();
  }
});

test('each header is the only content of a heading at the declared level', () => {
  const { fixture, headings, triggers } = render({ level: 'h2' });
  try {
    assert.deepEqual(headings.map((h) => h.tagName), ['H2', 'H2', 'H2']);
    headings.forEach((heading, i) => {
      assert.equal(heading.children.length, 1, 'the button is the heading\'s only content');
      assertSameNode(heading.children[0] as Element, triggers[i]!, 'the heading holds its own header');
    });
  } finally {
    fixture.destroy();
  }
});

test('every panel mounts as a group named by its own header, and only the open one is shown', () => {
  const { fixture, root, triggers, panels } = render();
  try {
    assert.equal(panels.length, 3);
    panels.forEach((panel, i) => {
      assert.equal(triggers[i]!.getAttribute('aria-controls'), panel.getAttribute('id'));
      const name = root.querySelector(`#${panel.getAttribute('aria-labelledby')}`);
      assertSameNode(name, triggers[i]!, 'each panel is named by its own header');
      assert.equal(panel.hasAttribute('data-arena-boundary'), true);
    });
    assert.deepEqual(panels.map((p) => p.hasAttribute('hidden')), [true, false, true]);
    assert.equal(panels[0]!.textContent?.trim(), 'Ship body', 'a closed panel keeps its content');
    const ids = new Set([...triggers, ...panels].map((el) => el.getAttribute('id')));
    assert.equal(ids.size, 6, 'every id is distinct');
  } finally {
    fixture.destroy();
  }
});

test('arena-accordion-item binds none, because the accordion owns the pattern', () => {
  const { fixture, root } = render();
  try {
    assertPattern({ root, bindingPath: ITEM_BINDING, subjects: { default: root.querySelector('arena-accordion-item') } });
  } finally {
    fixture.destroy();
  }
});
