import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaTab } from './ArenaTab.tsx';

test('a tab is a native button carrying role=tab and drawing its label', () => {
  const html = renderToStaticMarkup(<ArenaTab value="ov" label="Overview" />);
  assert.match(html, /<button[^>]*type="button"/);
  assert.match(html, /<button[^>]*role="tab"/);
  assert.match(html, />Overview<\/button>/);
  assert.doesNotMatch(html, />ov</, 'a tab drew its value as its text, not its label');
});

test('the injected wiring reaches the attributes that need it', () => {
  const html = renderToStaticMarkup(
    <ArenaTab value="ov" label="Overview" selected tabId="t-ov" panelId="p-ov" />,
  );
  assert.match(html, /id="t-ov"/);
  assert.match(html, /aria-controls="p-ov"/);
});

test('aria-selected is true when selected and false when not', () => {
  assert.match(renderToStaticMarkup(<ArenaTab value="ov" label="Overview" selected />), /aria-selected="true"/);
  assert.match(renderToStaticMarkup(<ArenaTab value="ov" label="Overview" />), /aria-selected="false"/);
});

test('the tab stop is the injected one, not an inference from `selected`', () => {
  assert.match(renderToStaticMarkup(<ArenaTab value="ov" label="Overview" selected tabStop />), /tabindex="0"/);
  assert.match(renderToStaticMarkup(<ArenaTab value="ov" label="Overview" />), /tabindex="-1"/);
});

test('a tab can hold the stop without being selected, and be selected without holding it', () => {

  const stopOnly = renderToStaticMarkup(<ArenaTab value="ov" label="Overview" tabStop />);
  assert.match(stopOnly, /tabindex="0"/);
  assert.match(stopOnly, /aria-selected="false"/);
  const selectedOnly = renderToStaticMarkup(<ArenaTab value="ov" label="Overview" selected />);
  assert.match(selectedOnly, /tabindex="-1"/);
  assert.match(selectedOnly, /aria-selected="true"/);
});

test('value is required and its absence throws', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  assert.throws(() => renderToStaticMarkup(<ArenaTab label="Overview" />), /ArenaTab: `value` is required/);
});

test('label is required and its absence throws', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  assert.throws(() => renderToStaticMarkup(<ArenaTab value="ov" />), /ArenaTab: `label` is required/);
});

test('a blank label is refused, not drawn', () => {
  assert.throws(() => renderToStaticMarkup(<ArenaTab value="ov" label="" />), /ArenaTab: `label` is required/);
});

test('ArenaTab drops a consumer style object', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  const html = renderToStaticMarkup(<ArenaTab value="ov" label="Overview" style={{ color: '#ff00ff' }} />);
  assert.doesNotMatch(html, /#ff00ff/, 'a consumer style reached the rendered root -- the R4 escape is back');
});

test('ArenaTab drops a consumer attribute -- no {...rest} spread reaches the root', () => {
  const html = renderToStaticMarkup(<ArenaTab value="ov" label="Overview" data-stray="x" />);
  assert.doesNotMatch(html, /data-stray/, 'a consumer attribute reached the rendered root');
});

test('the selected tab wears the underline and the quiet one does not, from one recipe', () => {
  const on = renderToStaticMarkup(<ArenaTab value="a" label="Overview" selected />);
  assert.match(on, /data-arena-part="tabs.tab"[^>]*\bdata-arena-selected=""/);
  assert.match(on, /data-arena-part="tabs.tab"[^>]*\bdata-arena-selected=""/);

  const off = renderToStaticMarkup(<ArenaTab value="a" label="Overview" />);
  assert.match(off, /data-arena-part="tabs.tab"(?:(?!data-arena-selected=)[^>])*>/);
  assert.match(off, /data-arena-part="tabs.tab"(?:(?!data-arena-selected=)[^>])*>/);
  assert.doesNotMatch(off, /inset_0_calc/);
});

test('focus is a modifier the button answers, so nothing reports it to a state', () => {
  assert.match(renderToStaticMarkup(<ArenaTab value="a" label="Overview" />),
    /arena-tabs__tab/);
});
