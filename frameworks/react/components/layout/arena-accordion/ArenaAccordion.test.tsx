import test from 'node:test';
import assert from 'node:assert/strict';
import { renderIcons, symbols } from '../../../test/IconsHarness.tsx';
import React from 'react';
import { ArenaAccordion, type ArenaAccordionProps } from './ArenaAccordion.tsx';
import { ArenaAccordionItem } from '../arena-accordion-item/ArenaAccordionItem.tsx';

const three = (props: ArenaAccordionProps = {}) => renderIcons(
  <ArenaAccordion {...props}>
    <ArenaAccordionItem value="ship" label="What ships"><p>ship body</p></ArenaAccordionItem>
    <ArenaAccordionItem value="roll" label="How it rolls out"><p>roll body</p></ArenaAccordionItem>
    <ArenaAccordionItem value="back" label="When it rolls back"><p>back body</p></ArenaAccordionItem>
  </ArenaAccordion>,
);

const tags = (html: string, re: RegExp) => html.match(re) ?? [];
const triggers = (html: string) => tags(html, /<button\b[^>]*>/g);
const panels = (html: string) => tags(html, /<div\b[^>]*role="group"[^>]*>/g);
const attr = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];

test('each header is a button inside a heading of the declared level, h3 when none is given', () => {
  assert.equal(tags(three(), /<h3\b[^>]*><button\b/g).length, 3);
  assert.equal(tags(three({ headingLevel: 'h2' }), /<h2\b[^>]*><button\b/g).length, 3);
});

test('every panel mounts, each named by its own header, and only the open ones are shown', () => {
  const html = three({ defaultValue: 'roll' });
  const [buttons, groups] = [triggers(html), panels(html)];
  assert.equal(groups.length, 3, 'a closed panel is hidden, never unmounted, so every aria-controls resolves');
  for (let i = 0; i < 3; i++) {
    assert.equal(attr(buttons[i]!, 'aria-controls'), attr(groups[i]!, 'id'));
    assert.equal(attr(groups[i]!, 'aria-labelledby'), attr(buttons[i]!, 'id'));
  }
  assert.deepEqual(buttons.map((b) => attr(b, 'aria-expanded')), ['false', 'true', 'false']);
  assert.deepEqual(groups.map((g) => / hidden=""/.test(g)), [true, false, true]);
  assert.match(html, /ship body/, 'a closed panel keeps its content');
});

test('the caret swaps glyph with the state and is hidden from a reader', () => {
  const html = three({ defaultValue: 'ship' });
  assert.deepEqual(symbols(html), ['bold-caret-down', 'bold-caret-right', 'bold-caret-right']);
  assert.equal(tags(html, /<svg\b[^>]*aria-hidden="true"/g).length, 3);
});

test('a header whose panel may not close says so, and only that one', () => {
  const html = three({ defaultValue: 'roll', collapsible: false });
  assert.deepEqual(triggers(html).map((b) => attr(b, 'aria-disabled')), [undefined, 'true', undefined]);
  assert.equal(triggers(three({ defaultValue: 'roll' })).some((b) => / aria-disabled=/.test(b)), false);
  assert.equal(triggers(three({ multiple: true, defaultValues: ['roll'], collapsible: false })).some((b) => / aria-disabled=/.test(b)), false,
    'collapsible means nothing with multiple, where every press toggles');
});

test('the empty string and a value no item has open nothing', () => {
  for (const value of ['', 'nowhere']) {
    assert.deepEqual(triggers(three({ value })).map((b) => attr(b, 'aria-expanded')), ['false', 'false', 'false'], value);
  }
  assert.deepEqual(triggers(three({ multiple: true, values: ['back', 'nowhere'] })).map((b) => attr(b, 'aria-expanded')), ['false', 'false', 'true']);
});

test('a blank label, a blank value and a heading level of none throw', () => {
  assert.throws(() => renderIcons(<ArenaAccordionItem value="a" label="  " />), /^Error: ArenaAccordionItem: `label`/);
  assert.throws(() => renderIcons(<ArenaAccordionItem value=" " label="A" />), /^Error: ArenaAccordionItem: `value`/);
  assert.throws(() => three({ headingLevel: 'none' }), /^Error: ArenaAccordion: `headingLevel`/);
});

test('the root and every panel are boundaries, since both hold content of yours', () => {
  const html = three();
  assert.match(tags(html, /<div\b[^>]*data-arena-part="accordion"[^>]*>/g)[0] ?? '', /data-arena-boundary=""/);
  assert.equal(panels(html).filter((g) => /data-arena-boundary=""/.test(g)).length, 3);
});
