import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ARENA_DEFAULT_LOCALE, ArenaLocaleProvider, arenaMergeLocale, useArenaLocale } from './ArenaLocale.ts';

const contract = JSON.parse(readFileSync(new URL('../../contracts/api/types/arena-locale.json', import.meta.url), 'utf8'));

test('ARENA_DEFAULT_LOCALE is the contract\'s defaults, field for field and in order', () => {
  const expected = Object.fromEntries(Object.entries(contract.fields).map(([name, field]) => [name, (field as { default: string }).default]));
  assert.deepEqual(Object.entries(ARENA_DEFAULT_LOCALE), Object.entries(expected));
});

function Probe() {
  const locale = useArenaLocale();
  return <span>{`${locale.locale}|${locale.tagRemove}|${locale.alertDismiss}`}</span>;
}

test('with no provider a component reads the defaults', () => {
  assert.equal(renderToStaticMarkup(<Probe />), '<span>en-GB|Remove|Dismiss</span>');
});

test('a provider merges its partial over the defaults, never over an outer provider', () => {
  const html = renderToStaticMarkup(
    <ArenaLocaleProvider value={{ alertDismiss: 'Descartar' }}>
      <ArenaLocaleProvider value={{ locale: 'es-ES', tagRemove: 'Quitar' }}><Probe /></ArenaLocaleProvider>
    </ArenaLocaleProvider>,
  );
  assert.equal(html, '<span>es-ES|Quitar|Dismiss</span>');
});

test('arenaMergeLocale ignores a field given as undefined', () => {
  assert.equal(arenaMergeLocale(ARENA_DEFAULT_LOCALE, { tagRemove: undefined }).tagRemove, 'Remove');
});
