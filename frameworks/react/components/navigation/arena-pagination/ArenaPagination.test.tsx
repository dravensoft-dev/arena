import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaPagination } from './ArenaPagination.tsx';

test('the current page is the current group of the one page slot', () => {
  const html = renderToStaticMarkup(<ArenaPagination page={3} pageCount={12} ariaLabel="Deployments" />);
  assert.equal((html.match(/data-arena-part="pagination.page"[^>]*\bdata-arena-current=""/g) || []).length, 1);
  assert.match(html, /data-arena-part="pagination.page"(?:(?!data-arena-current=)[^>])*>/);
});
