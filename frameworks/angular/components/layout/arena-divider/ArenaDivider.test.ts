/* What a reader meets is decided by the element, so the markup is the whole question here: an <hr>
 * with no label, which the platform names a separator, and with a label the word as plain text
 * between two rules nobody hears. The host draws no box, so a vocabulary class written on it
 * reaches the rule through the custom properties it sets; how a vertical rule stretches is a
 * layout question a browser answers, and the prompt carries it as a by-hand check. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { assertNoNode } from '../../../test/NodeAssert';
import { ArenaDivider } from './ArenaDivider';

@Component({
  selector: 'divider-test-host',
  standalone: true,
  imports: [ArenaDivider],
  template: '<arena-divider [label]="label" class="arena-orientation-vertical" />',
})
class DividerHost { label: string | undefined = undefined; }

function render(label?: string) {
  const fixture = TestBed.createComponent(DividerHost);
  fixture.componentInstance.label = label;
  fixture.detectChanges();
  return fixture;
}

test('with no label it is one hr, which a reader meets as a separator', () => {
  const fixture = render();
  try {
    const host = fixture.nativeElement.querySelector('arena-divider') as HTMLElement;
    const rule = host.firstElementChild as HTMLElement;
    assert.equal(rule.tagName, 'HR', 'a rule drawn on a div is a line nobody hears as a separator');
    assert.equal(host.children.length, 1);
    assert.equal(rule.hasAttribute('aria-hidden'), false, 'hiding the hr takes away the one thing the element says');
    assert.equal(rule.getAttribute('role'), null, 'naming a role on an hr replaces the separator the element already is');
    assert.equal(rule.getAttribute('data-arena-part'), 'divider');
  } finally { fixture.destroy(); }
});

test('a blank label draws the plain rule, because a space between two rules names nothing', () => {
  const fixture = render('   ');
  try {
    assert.equal((fixture.nativeElement.querySelector('arena-divider') as HTMLElement).firstElementChild?.tagName, 'HR');
  } finally { fixture.destroy(); }
});

test('with a label the word is text between two rules a reader never hears', () => {
  const fixture = render('or');
  try {
    const host = fixture.nativeElement.querySelector('arena-divider') as HTMLElement;
    const root = host.firstElementChild as HTMLElement;
    assert.equal(root.tagName, 'DIV', 'the labelled rule claims no role, so its wrapper is a plain element');
    assertNoNode(host.querySelector('hr'), 'a word inside a separator can be dropped by a reader, so no hr holds it');
    const rules = [...root.querySelectorAll('[data-arena-part="divider.rule"]')];
    assert.equal(rules.length, 2);
    for (const one of rules) assert.equal(one.getAttribute('aria-hidden'), 'true', 'both lines are decorative');
    const word = root.querySelector('[data-arena-part="divider.label"]') as HTMLElement;
    assert.equal(word.textContent, 'or', 'the word is one text run of its own, never hidden');
    assert.equal(word.hasAttribute('aria-hidden'), false);
  } finally { fixture.destroy(); }
});

test('the host draws no box and keeps the vocabulary class, so the rule reads the channels it sets', () => {
  const fixture = render();
  try {
    const host = fixture.nativeElement.querySelector('arena-divider') as HTMLElement;
    assert.match(host.getAttribute('style') ?? '', /display:\s*contents/);
    assert.ok(host.classList.contains('arena-orientation-vertical'));
  } finally { fixture.destroy(); }
});
