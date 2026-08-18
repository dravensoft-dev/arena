import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXTERNAL_PROPERTIES, MANIFEST_FETCH, THEME_NAMESPACES, collect, keyframeDepths, preludeProblems,
  propertiesIn, selectorsIn, themeLeaks,
} from './check-component-css.ts';
import { keyframesIn, sheetPath } from '../../build/tailwind/build-tailwind.ts';

test('the gate runs green over the tree as it stands', () => {
  const { manifests, problems } = collect();
  assert.ok(manifests.size > 0, 'no manifest was read, so a green run would prove nothing');
  assert.deepEqual(problems, []);
});

test('a specimen\'s fetches are read whatever path they take, since the sheet it needs is the component\'s', () => {
  const html = "await fetch('./ArenaUnauthCard.manifest.json'); await fetch( \"../../brand/arena-app-logo/ArenaAppLogo.manifest.json\" )";
  assert.deepEqual([...html.matchAll(MANIFEST_FETCH)].map((m) => m[2]), ['ArenaUnauthCard', 'ArenaAppLogo']);
});

test('a stylesheet lands under consume/, at the manifest\'s own category and directory', () => {
  assert.equal(
    sheetPath('frameworks/tailwind/components/display/arena-badge/ArenaBadge.manifest.json'),
    'frameworks/tailwind/consume/components/display/arena-badge/ArenaBadge.styles.generated.css',
  );
});

test('only arena- selectors are collected, so a stray utility cannot be counted as a component rule', () => {
  assert.deepEqual([...selectorsIn('.arena-badge__root:hover { } .px-4 { }')], ['arena-badge__root']);
});

test('a property is collected wherever it is read, including inside calc and a fallback', () => {
  const found = propertiesIn('gap: calc(var(--sp-1) * 2); color: var(--tw-x, var(--y))');
  assert.deepEqual([...found].sort(), ['sp-1', 'tw-x', 'y']);
});

test('a Tailwind theme property is a leak, and an Arena token that merely looks like one is not', () => {
  assert.deepEqual(themeLeaks('gap: var(--spacing-3)'), ['spacing-3']);
  assert.deepEqual(themeLeaks('border-radius: var(--radius-pill)'), ['radius-pill']);
  assert.deepEqual(themeLeaks('gap: var(--sp-3)'), [], 'the Arena token is the stripped form and is what should be there');
  assert.deepEqual(themeLeaks('transition-timing-function: var(--ease-out)'), [],
    'ease is a Tailwind namespace AND an Arena token name, so it is deliberately not on the list');
  assert.ok(!THEME_NAMESPACES.includes('ease'));
  assert.ok(!THEME_NAMESPACES.includes('color'), 'so is color, for the same reason');
  assert.ok(!THEME_NAMESPACES.includes('shadow'), 'and shadow');
  assert.ok(!THEME_NAMESPACES.includes('font'), 'and font');
});

test('the prelude is held to the three things whose absence is silent', () => {
  const missing = preludeProblems('/nowhere');
  assert.equal(missing.length, 1);
  assert.match(missing[0] ?? '', /every border and every focus ring is invalid/);
  assert.deepEqual(preludeProblems(), []);
});

test('a keyframe redefined bare is reported, because that declaration wins for everybody', () => {
  const guarded = '@keyframes pop { from { opacity: 0; transform: none; } }\n'
    + '@media (prefers-reduced-motion: reduce) { @keyframes pop { from { opacity: 0; } } }';
  assert.deepEqual(keyframeDepths(guarded).map((k) => k.depth), [0, 1]);

  const bare = '@keyframes pop { from { opacity: 0; transform: none; } }\n'
    + '@keyframes pop { from { opacity: 0; } }';
  assert.deepEqual(keyframeDepths(bare).map((k) => k.depth), [0, 0]);
});

test('the extractor keeps the at-rule around a keyframe, since the condition is the whole of it', () => {
  const source = '@keyframes pop { from { opacity: 0; transform: none; } }\n'
    + '@media (prefers-reduced-motion: reduce) {\n'
    + '  @keyframes pop { from { opacity: 0; } }\n'
    + '}\n'
    + '@utility pop { animation: pop 1s; @media (prefers-reduced-motion: reduce) { animation: none; } }';
  const blocks = keyframesIn(source);
  assert.equal(blocks.length, 2, 'the guarded redefinition is one block, not a second bare keyframe');
  assert.match(blocks[1] ?? '', /^@media \(prefers-reduced-motion: reduce\) \{/);
  assert.deepEqual(keyframeDepths(blocks.join('\n')).map((k) => k.depth), [0, 1]);
});

test('every external property carries a reason, because an entry with none cannot be judged stale', () => {
  assert.ok(EXTERNAL_PROPERTIES.size > 0);
  for (const [name, reason] of EXTERNAL_PROPERTIES) {
    assert.ok(reason && reason.length > 10, `--${name} has no usable reason`);
  }
});
