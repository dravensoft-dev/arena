import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaProgressBar } from './ArenaProgressBar.tsx';

test('progressPercentage drives the fill width and aria-valuenow', () => {
  const html = renderToStaticMarkup(<ArenaProgressBar label="Deploying" progressPercentage={64} />);
  assert.match(html, /aria-valuenow="64"/);
  assert.match(html, /width:64%/, 'the fill was not drawn at the given percentage');
});

test('progressPercentage above 100 is clamped to 100', () => {
  const html = renderToStaticMarkup(<ArenaProgressBar label="Uploading build" progressPercentage={150} />);
  assert.match(html, /aria-valuenow="100"/);
  assert.match(html, /width:100%/);
  assert.doesNotMatch(html, /150/, 'the out-of-range percentage reached the page unclamped');
});

test('progressPercentage below 0 is clamped to 0', () => {
  const html = renderToStaticMarkup(<ArenaProgressBar label="Uploading build" progressPercentage={-20} />);
  assert.match(html, /aria-valuenow="0"/);
  assert.match(html, /width:0%/);
  assert.doesNotMatch(html, /-20/, 'the out-of-range percentage reached the page unclamped');
});

test('indeterminate ignores progressPercentage: no fill, no aria-valuenow', () => {
  const html = renderToStaticMarkup(<ArenaProgressBar indeterminate label="Connecting" progressPercentage={64} />);
  assert.doesNotMatch(html, /aria-valuenow/, 'an indeterminate bar reported a value');
  assert.doesNotMatch(html, /width:64%/, 'an indeterminate bar drew a fill from progressPercentage');

  assert.match(html, /\barena-progress-bar__indeterminate\b/,
    'the sweep is the shared utility, whose reduced-motion clause slows it rather than stopping it');
});

test('showPercentage governs the VISIBLE number only, and never the one the live region announces', () => {
  const count = (html: string) => html.split('>64%<').length - 1;

  const shown = renderToStaticMarkup(<ArenaProgressBar label="Deploying" progressPercentage={64} />);
  assert.equal(count(shown), 2, 'by default the percentage is drawn beside the label and announced inside the region');

  const hidden = renderToStaticMarkup(<ArenaProgressBar label="Deploying" progressPercentage={64} showPercentage={false} />);
  assert.equal(count(hidden), 1,
    'showPercentage={false} is a visual choice: it drops the number beside the label and must leave the '
    + 'announcement inside the live region, which is the only content change a screen reader has to report');
  assert.match(hidden, />Deploying</, 'showPercentage={false} also removed the label');
});

test('showPercentage draws nothing in indeterminate mode -- there is no percentage to show', () => {
  const html = renderToStaticMarkup(<ArenaProgressBar label="Connecting" indeterminate showPercentage />);
  assert.doesNotMatch(html, /%</, 'an indeterminate bar drew a percentage');
});

test('label is drawn above the bar AND is the bar aria-label', () => {
  const html = renderToStaticMarkup(<ArenaProgressBar label="Deploying build #4821" progressPercentage={10} />);
  assert.match(html, />Deploying build #4821</, 'the label was not drawn');
  assert.match(html, /aria-label="Deploying build #4821"/, 'the label did not become the accessible name');
  assert.doesNotMatch(html, /aria-label="Progress"/, 'a labelled bar still fell back to the generic name');
});

test('an absent label throws rather than falling back to a name that says only what the component is', () => {
  assert.throws(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    () => renderToStaticMarkup(<ArenaProgressBar progressPercentage={10} />),
    /`label` is required/,
    'a generic fallback satisfies roles.label mechanically and tells a screen-reader user nothing',
  );
  const html = renderToStaticMarkup(<ArenaProgressBar label="Uploading build" progressPercentage={10} />);
  assert.match(html, /aria-label="Uploading build"/);
});

test('every tone reaches the bar as its own branch of the recipe', () => {
  const expected = {
    accent: 'arena-progress-bar__track--tone-accent', gold: 'arena-progress-bar__track--tone-gold',
    success: 'arena-progress-bar__track--tone-success',
    danger: 'arena-progress-bar__track--tone-danger', info: 'arena-progress-bar__track--tone-info',
  };
  for (const [tone, cls] of Object.entries(expected)) {
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    const html = renderToStaticMarkup(<ArenaProgressBar label="Uploading build" tone={tone} progressPercentage={50} />);
    assert.ok(new RegExp(`\\b${cls}\\b`).test(html), `tone="${tone}" did not reach the bar as ${cls}`);
  }

  const fallback = renderToStaticMarkup(<ArenaProgressBar label="Uploading build" progressPercentage={50} />);
  assert.match(fallback, /\barena-progress-bar__track--tone-accent\b/);
  assert.match(fallback, /\barena-progress-bar__fill\b/,
    'the fill reads the tone off the track rather than naming a colour of its own');
});

test('ArenaProgressBar drops a consumer style object -- the ...style escape is gone', () => {
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  const html = renderToStaticMarkup(<ArenaProgressBar label="Uploading build" progressPercentage={50} style={{ color: '#ff00ff' }} />);
  assert.doesNotMatch(html, /#ff00ff/, 'a consumer style reached the rendered root -- the R4 escape is back');
});

test('ArenaProgressBar drops a consumer attribute -- no {...rest} spread reaches the root', () => {
  const html = renderToStaticMarkup(<ArenaProgressBar label="Uploading build" progressPercentage={50} data-stray="x" />);
  assert.doesNotMatch(html, /data-stray/, 'a consumer attribute reached the rendered root -- a {...rest} escape is back');
});

test('a radial meter draws a ring whose arc is the percentage, and the figure sits inside it', () => {
  const html = renderToStaticMarkup(<ArenaProgressBar shape="radial" label="Lesson 4" progressPercentage={64} />);
  assert.match(html, /aria-valuenow="64"/);
  assert.match(html, /\barena-progress-bar__ring\b/);
  assert.match(html, /role="progressbar"[^>]*>\s*<circle/,
    'the role sits on the drawing, so a control projected into the middle is a sibling of the meter rather than a presentational child of it');
  assert.match(html, /pathLength="100"/, 'the arc is measured in hundredths of the path, so the radius is free');
  assert.match(html, /stroke-dashoffset:36/, 'the arc was not swept to the given percentage');
  assert.doesNotMatch(html, /\barena-progress-bar__track\b/, 'a ring drew the bar as well');
  assert.doesNotMatch(html, /\barena-progress-bar__head\b/, 'a ring drew the bar head, so the figure is not inside the ring');
});

test('a radial meter keeps the accessible name and the announcement the bar carries', () => {
  const html = renderToStaticMarkup(<ArenaProgressBar shape="radial" label="Lesson 4" progressPercentage={64} showPercentage={false} />);
  assert.match(html, /aria-label="Lesson 4"/);
  assert.match(html, /\barena-progress-bar__announcement\b/,
    'the live region is what a screen reader hears, and hiding the figure is a decision about what is drawn');
});

test('an indeterminate ring turns a fixed arc and reports no value', () => {
  const html = renderToStaticMarkup(<ArenaProgressBar shape="radial" indeterminate label="Connecting" progressPercentage={64} />);
  assert.doesNotMatch(html, /aria-valuenow/);
  assert.match(html, /\barena-progress-bar__ring-indeterminate\b/,
    'the turn is the shared utility, whose reduced-motion clause slows it rather than stopping it');
  assert.match(html, /stroke-dashoffset:75/, 'the arc a wait turns is a fixed quarter and never the percentage');
});

test('the tone reaches the ring the way it reaches the track, and the arc reads it off the ring', () => {
  const html = renderToStaticMarkup(<ArenaProgressBar shape="radial" tone="success" label="Sync" progressPercentage={50} />);
  assert.match(html, /\barena-progress-bar__ring--tone-success\b/);
  assert.match(html, /\barena-progress-bar__ring-fill\b/);
});

test('a ring projects its middle without deriving anything from what arrived there', () => {
  const html = renderToStaticMarkup(
    <ArenaProgressBar shape="radial" label="Lesson 4" progressPercentage={40} showPercentage={false}>
      <button type="button">Start</button>
    </ArenaProgressBar>,
  );
  assert.match(html, /\barena-progress-bar__ring-content\b/);
  assert.match(html, /<button type="button">Start<\/button>/);
  assert.doesNotMatch(html, /\barena-progress-bar__value\b/,
    'showPercentage is what turns the figure off, never the presence of content');

  const empty = renderToStaticMarkup(<ArenaProgressBar shape="radial" label="Lesson 4" progressPercentage={40} />);
  assert.match(empty, /\barena-progress-bar__ring-content\b/,
    'the middle is drawn whether or not anything was projected into it, because one layer cannot see that it was');
  assert.match(empty, /\barena-progress-bar__value\b/);
});
