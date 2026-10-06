import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaSideNav } from './ArenaSideNav.tsx';
import { ArenaSideNavItem } from '../arena-side-nav-item/ArenaSideNavItem.tsx';
import { ArenaSideNavSection } from '../arena-side-nav-section/ArenaSideNavSection.tsx';
import { ArenaSideNavCollapsible, arenaSubtreeHasItem } from '../arena-side-nav-collapsible/ArenaSideNavCollapsible.tsx';

const section = (extra = {}) => (
  <ArenaSideNav ariaLabel="Primary" active="prod" {...extra}>
    <ArenaSideNavItem id="home" label="Home" href="#home" />
    <ArenaSideNavSection label="Workspace">
      <ArenaSideNavItem id="prod" label="Production" href="#prod" />
    </ArenaSideNavSection>
  </ArenaSideNav>
);

test('a section is a labelled group, named by the heading a sighted user reads', () => {
  const html = renderToStaticMarkup(section());
  const group = html.match(/<div role="group" aria-labelledby="([^"]+)"/);
  assert.ok(group, 'no role="group" with an aria-labelledby');
  assert.match(html, new RegExp(`id="${group[1]}"[^>]*>Workspace<`),
    'aria-labelledby names no element, or names one that does not read the label');
});

test('a section indents its children by one step and leaves a root item alone', () => {
  const html = renderToStaticMarkup(section());

  assert.match(html, /--arena-side-nav-depth:0/);

  assert.match(html, /style="--arena-side-nav-depth:3"/);
});

test('indentStep multiplies the token, and the caller can only supply a multiplier', () => {
  const html = renderToStaticMarkup(section({ indentStep: 5 }));
  assert.match(html, /--arena-side-nav-depth:5/);
});

test('a section with no children throws -- a childless section is not a legal shape', () => {
  assert.throws(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    () => renderToStaticMarkup(<ArenaSideNav ariaLabel="Primary"><ArenaSideNavSection label="Empty" /></ArenaSideNav>),
    /ArenaSideNavSection: a section with no children is not a legal shape/,
  );
});

test('a section whose only child is a false conditional throws too -- count() counts false, toArray() does not', () => {
  assert.throws(
    () => renderToStaticMarkup(
      <ArenaSideNav ariaLabel="Primary"><ArenaSideNavSection label="Admin">{false && <ArenaSideNavItem id="a" label="A" />}</ArenaSideNavSection></ArenaSideNav>),
    /ArenaSideNavSection: a section with no children is not a legal shape/,
  );
});

test('ArenaSideNavSection: `label` is required and a blank one throws too', () => {
  const one = <ArenaSideNavItem id="a" label="A" />;
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  assert.throws(() => renderToStaticMarkup(<ArenaSideNavSection>{one}</ArenaSideNavSection>),
    /ArenaSideNavSection: `label` is required/);
  assert.throws(() => renderToStaticMarkup(<ArenaSideNavSection label="">{one}</ArenaSideNavSection>),
    /ArenaSideNavSection: `label` is required/);
});

test('ArenaSideNavSection drops a consumer style object', () => {
  const html = renderToStaticMarkup(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    <ArenaSideNavSection label="W" style={{ color: '#ff00ff' }}><ArenaSideNavItem id="a" label="A" /></ArenaSideNavSection>);
  assert.doesNotMatch(html, /#ff00ff/, 'a consumer style reached the rendered root -- the R4 escape is back');
});

test('ArenaSideNavSection drops a consumer attribute -- no {...rest} spread reaches the root', () => {
  const html = renderToStaticMarkup(
    <ArenaSideNavSection label="W" data-stray="x"><ArenaSideNavItem id="a" label="A" /></ArenaSideNavSection>);
  assert.doesNotMatch(html, /data-stray/, 'a consumer attribute reached the rendered root');
});

const nested = (props = {}) => (
  <ArenaSideNav ariaLabel="Primary" {...props}>
    <ArenaSideNavSection label="Workspace">
      <ArenaSideNavCollapsible id="deploys" label="Deployments" icon="ph-bold ph-rocket-launch">
        <ArenaSideNavItem id="prod" label="Production" href="#prod" />
      </ArenaSideNavCollapsible>
    </ArenaSideNavSection>
  </ArenaSideNav>
);

test('the trigger is a native button wired to the region it controls', () => {
  const html = renderToStaticMarkup(nested());
  assert.match(html, /<button [^>]*type="button"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /aria-controls="deploys-region"/);
  assert.match(html, /id="deploys-region"/);
  assert.match(html, /id="deploys-trigger"/);
});

test('a collapsed region is rendered rather than dropped, and hidden takes it out of the flow', () => {
  const html = renderToStaticMarkup(nested());
  assert.match(html, /id="deploys-region"[^>]*hidden/);
  assert.match(html, /id="deploys-region"/,
    'the region and its children stay in the tree, so the ids aria-controls names resolve');
});

test('defaultExpanded opens it on the first pass', () => {
  const html = renderToStaticMarkup(
    <ArenaSideNav ariaLabel="Primary">
      <ArenaSideNavCollapsible id="d" label="D" defaultExpanded>
        <ArenaSideNavItem id="p" label="P" href="#p" />
      </ArenaSideNavCollapsible>
    </ArenaSideNav>);
  assert.match(html, /aria-expanded="true"/);
  assert.doesNotMatch(html, /id="d-region"[^>]*hidden/);
});

test('a subtree holding the active id renders expanded with no effect having run', () => {
  const html = renderToStaticMarkup(nested({ active: 'prod' }));
  assert.match(html, /aria-expanded="true"/);
  assert.match(html, /aria-current="page"/);
});

test('nesting compounds the indent: an item inside a section inside a collapsible sits at depth 2', () => {
  const html = renderToStaticMarkup(nested({ active: 'prod' }));
  assert.match(html, /--arena-side-nav-depth:6/);
});

test('ArenaSideNavCollapsible: `id` and `label` are required, blank included', () => {
  const kid = <ArenaSideNavItem id="a" label="A" />;
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  assert.throws(() => renderToStaticMarkup(<ArenaSideNavCollapsible label="D">{kid}</ArenaSideNavCollapsible>),
    /ArenaSideNavCollapsible: `id` is required/);
  assert.throws(() => renderToStaticMarkup(<ArenaSideNavCollapsible id="" label="D">{kid}</ArenaSideNavCollapsible>),
    /ArenaSideNavCollapsible: `id` is required/);
  // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
  assert.throws(() => renderToStaticMarkup(<ArenaSideNavCollapsible id="d">{kid}</ArenaSideNavCollapsible>),
    /ArenaSideNavCollapsible: `label` is required/);
  assert.throws(() => renderToStaticMarkup(<ArenaSideNavCollapsible id="d" label="">{kid}</ArenaSideNavCollapsible>),
    /ArenaSideNavCollapsible: `label` is required/);
});

const item = <ArenaSideNavItem id="prod" label="Production" href="#prod" />;

test('arenaSubtreeHasItem matches an ArenaSideNavItem by TYPE, so a group named after a destination is not one', () => {

  assert.equal(arenaSubtreeHasItem(item, 'prod'), true);
  assert.equal(arenaSubtreeHasItem(
    <ArenaSideNavCollapsible id="inner" label="Inner">{item}</ArenaSideNavCollapsible>, 'prod'), true,
    'a destination nested inside a collapsible was not found');

  assert.equal(arenaSubtreeHasItem(
    <ArenaSideNavCollapsible id="inner" label="Inner">{item}</ArenaSideNavCollapsible>, 'inner'), false,
    'a collapsible carrying the active id counted as holding it -- the type check is gone');

  assert.equal(arenaSubtreeHasItem(
    <ArenaSideNavSection label="Workspace">{item}</ArenaSideNavSection>, 'prod'), true);
});

test('a group whose own id is the active one does not open itself around it', () => {
  const html = renderToStaticMarkup(
    <ArenaSideNav ariaLabel="Primary" active="inner">
      <ArenaSideNavCollapsible id="outer" label="Outer">
        <ArenaSideNavCollapsible id="inner" label="Inner">{item}</ArenaSideNavCollapsible>
      </ArenaSideNavCollapsible>
    </ArenaSideNav>);

  assert.doesNotMatch(html, /aria-expanded="true"/,
    'a collapsible opened around a group rather than a destination');
  assert.match(html, /id="outer-region"[^>]*hidden/);
  assert.match(html, /id="inner-region"[^>]*hidden/);
});

test('ArenaSideNavCollapsible drops a consumer style object', () => {
  const html = renderToStaticMarkup(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    <ArenaSideNavCollapsible id="d" label="D" style={{ color: '#ff00ff' }}>
      <ArenaSideNavItem id="a" label="A" /></ArenaSideNavCollapsible>);
  assert.doesNotMatch(html, /#ff00ff/, 'a consumer style reached the rendered root -- the R4 escape is back');
});

test('ArenaSideNavCollapsible drops a consumer attribute -- no {...rest} spread reaches the root', () => {
  const html = renderToStaticMarkup(
    <ArenaSideNavCollapsible id="d" label="D" data-stray="x">
      <ArenaSideNavItem id="a" label="A" /></ArenaSideNavCollapsible>);
  assert.doesNotMatch(html, /data-stray/, 'a consumer attribute reached the rendered root');
});

test('a collapsed nav renders no depth channel and no inline padding', () => {
  const html = renderToStaticMarkup(
    <ArenaSideNav ariaLabel="Primary" collapsed>
      <ArenaSideNavItem id="a" label="A" icon="ph ph-house" />
    </ArenaSideNav>,
  );
  assert.doesNotMatch(html, /--arena-side-nav-depth/);
  assert.doesNotMatch(html, /padding-inline-start/);
});
