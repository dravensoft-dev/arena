import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaPagination } from './ArenaPagination.tsx';

test('throws when ariaLabel is absent -- the name says WHAT is paged and nothing can derive it', () => {
  assert.throws(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    () => renderToStaticMarkup(<ArenaPagination page={3} pageCount={12} />),
    /ArenaPagination: `ariaLabel` is required/,
  );
});

test('ariaLabel names the landmark, and no constant is left to fall back to', () => {
  const html = renderToStaticMarkup(<ArenaPagination page={3} pageCount={12} ariaLabel="Deployments" />);
  assert.match(html, /^<nav aria-label="Deployments"/);
  assert.doesNotMatch(html, /aria-label="ArenaPagination"/, 'the retired constant default is back');
});

test('the current page is marked, and only it', () => {
  const html = renderToStaticMarkup(<ArenaPagination page={3} pageCount={12} ariaLabel="Deployments" />);
  assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
  assert.match(html, /aria-current="page"[^>]*>3</);
});

test('ArenaPagination drops a consumer style object -- the ...style escape is gone', () => {
  const html = renderToStaticMarkup(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    <ArenaPagination page={3} pageCount={12} ariaLabel="Deployments" style={{ color: '#ff00ff' }} />,
  );
  assert.doesNotMatch(html, /#ff00ff/, 'a consumer style reached the rendered root -- the R4 escape is back');
});

test('ArenaPagination drops a consumer attribute -- no {...rest} spread reaches the root', () => {
  const html = renderToStaticMarkup(
    <ArenaPagination page={3} pageCount={12} ariaLabel="Deployments" data-stray="x" />,
  );
  assert.doesNotMatch(html, /data-stray/, 'a consumer attribute reached the rendered root -- a {...rest} escape is back');
});

test('page is required and its absence throws', () => {
  assert.throws(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    () => renderToStaticMarkup(<ArenaPagination pageCount={12} ariaLabel="Deployments" />),
    /ArenaPagination: `page` is required/,
  );
});

test('pageCount is required and its absence throws', () => {
  assert.throws(
    // @ts-expect-error the contract refuses this on purpose, and the render is what this asserts
    () => renderToStaticMarkup(<ArenaPagination page={3} ariaLabel="Deployments" />),
    /ArenaPagination: `pageCount` is required/,
  );
});

test('the current page is the current group of the one page slot', () => {
  const html = renderToStaticMarkup(<ArenaPagination page={3} pageCount={12} ariaLabel="Deployments" />);
  assert.equal((html.match(/\barena-pagination__page--current-true\b/g) || []).length, 1);
  assert.match(html, /\barena-pagination__page--current-false\b/);
});
