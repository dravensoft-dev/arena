import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readJson } from '../../utils/read-file.ts';
import { flattenTokens, previewFor } from './token-preview.ts';
import { parseDecls } from '../arena/css-decls.ts';
import {
  CATALOGUE, FILES, THEME_SCOPES, extensionsIn,
} from '../../generate/arena/generate-tokens.ts';

test('flattens a nested group into dash-joined custom-property names', () => {
  const out = flattenTokens({
    r: { $type: 'dimension', sm: { $value: { value: 6, unit: 'px' }, $description: 'buttons' } },
  });
  assert.deepEqual(out, [
    { name: 'r-sm', group: 'r', path: ['r', 'sm'], $type: 'dimension', $description: 'buttons' },
  ]);
});

test('inherits $type from the nearest ancestor group', () => {
  const out = flattenTokens({ fw: { $type: 'fontWeight', bold: { $value: 700 } } });
  assert.equal(out[0]?.$type, 'fontWeight');
});

test('handles a top-level leaf token, whose group is its own name', () => {
  const out = flattenTokens({ 'container-max': { $type: 'dimension', $value: { value: 1240, unit: 'px' } } });
  assert.deepEqual(out, [
    { name: 'container-max', group: 'container-max', path: ['container-max'], $type: 'dimension', $description: undefined },
  ]);
});

test('keeps source order and omits group nodes themselves', () => {
  const out = flattenTokens({
    sp: { $type: 'dimension', 0: { $value: { value: 0, unit: 'px' } }, 1: { $value: { value: 4, unit: 'px' } } },
    gutter: { $type: 'dimension', $value: { value: 88, unit: 'px' } },
  });
  assert.deepEqual(out.map((t) => t.name), ['sp-0', 'sp-1', 'gutter']);
});

test('maps each group to its own preview shape', () => {
  assert.equal(previewFor('color', 'color'), 'swatch');
  assert.equal(previewFor('fs', 'dimension'), 'size');
  assert.equal(previewFor('sp', 'dimension'), 'bar');
  assert.equal(previewFor('r', 'dimension'), 'radius');
  assert.equal(previewFor('dz', 'dimension'), 'control');
  assert.equal(previewFor('bp', 'dimension'), 'breakpoint');
  assert.equal(previewFor('shadow', 'shadow'), 'elevation');
  assert.equal(previewFor('ease', 'cubicBezier'), 'easing');
  assert.equal(previewFor('ls', 'number'), 'tracking');
  assert.equal(previewFor('lh', 'number'), 'leading');
});

test('an unmapped group falls back to its type, never to nothing', () => {
  assert.equal(previewFor('brandnew', 'dimension'), 'bar');
  assert.equal(previewFor('brandnew', 'color'), 'swatch');
  assert.equal(previewFor('brandnew', 'duration'), 'duration');
  assert.equal(previewFor('brandnew', 'number'), 'value');
});

test('an unknown type still yields a renderable shape rather than undefined', () => {
  assert.equal(previewFor('brandnew', 'gradient'), 'value');
});

const themeOf = (t: { path?: string[] }) => {
  const first = t.path?.[0] ?? '';
  return THEME_SCOPES.has(first) ? first : '';
};

const isAliasedColour = (node: { $type?: string; $value?: unknown }) =>
  node?.$type === 'color' && typeof node?.$value === 'string' && /^\{.+\}$/.test(node.$value);

function colourReferencesIn(sources: string[]) {
  const names: string[] = [];
  for (const source of sources) {
    for (const [key, node] of Object.entries(readJson(source) as Record<string, any>)) {
      if (!key.startsWith('$') && isAliasedColour(node)) names.push(key);
    }
  }
  return names;
}

function deriveCases(files: { out: string; blocks: { selector: string; source: string }[] }[]) {
  const cases = [];
  for (const file of files) {
    const bySelector = new Map();
    for (const { selector, source } of file.blocks) {
      if (!bySelector.has(selector)) bySelector.set(selector, []);
      bySelector.get(selector).push(`contracts/design/${source}`);
    }
    const catalogued = selectorHoldingTheCatalogue(file);
    const css = `contracts/design-generated/${file.out}`;
    for (const [selector, sources] of bySelector) {
      const tokens: { name: string; path?: string[] }[] =
        sources.flatMap((s: string) => flattenTokens(readJson(s)));
      cases.push([
        tokens.filter((t) => !themeOf(t)).map((t) => t.name)
          .concat(selector === catalogued ? [CATALOGUE] : []),
        css, selector, sources,
      ]);
      const references = colourReferencesIn(sources);
      for (const [theme, scope] of THEME_SCOPES) {
        const themed = tokens.filter((t) => themeOf(t) === theme)
          .map((t) => (t.path ?? []).slice(1).join('-'));
        if (themed.length || references.length)
          cases.push([[...references, ...themed], css, scope(selector), sources]);
      }
    }
  }
  return cases;
}

function selectorHoldingTheCatalogue(file: { blocks: { selector: string; source: string }[] }) {
  return extensionsIn(file.blocks).length ? ':root' : null;
}

test('derived names match the custom properties the build actually emits, in every scope a block carries', () => {
  const cases = deriveCases(FILES);
  assert.ok(cases.length >= 4, 'expected at least one case per output file');
  assert.ok(cases.some(([, , selector]) => String(selector).includes('.arena-light')),
    'no theme-scoped case was derived, so this test would pass without ever reading a theme block');
  for (const [names, css, selector, sources] of cases) {
    const emitted = [...parseDecls(readFileSync(String(css), 'utf8')).get(selector).keys()].sort();
    assert.deepEqual([...(names as string[])].sort(), emitted,
      `${(sources as string[]).join(', ')} -> ${css} ${selector}`);
  }
});

test('the catalogue is the one emitted property no token file declares, and it names every extension', () => {
  const effects = FILES.find((f) => extensionsIn(f.blocks).length);
  assert.ok(effects, 'no output file carries an extension block, so the catalogue has nowhere to live');
  const emitted = parseDecls(readFileSync(`contracts/design-generated/${effects.out}`, 'utf8'));
  assert.equal(emitted.get(':root').get(CATALOGUE), extensionsIn(effects.blocks).join(','));
  for (const name of extensionsIn(effects.blocks)) assert.ok(emitted.has(`.arena-${name}`));
});
