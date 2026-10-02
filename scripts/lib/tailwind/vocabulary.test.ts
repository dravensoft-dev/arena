/* The compiler's output is asserted as text, because the text is the contract with the browser:
 * which selectors, which limit, which declarations, and the layer-order statement that keeps a
 * vocabulary sheet loaded first from ranking utilities below components. Whether the cascade
 * then does what the text says is check:proximity's to measure in Chromium. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  declarations, compileFamily, answeringParts, LIMIT, sheetName, packageSheetName, type Family,
} from './vocabulary.ts';
import { LAYER_ORDER } from './component-sheets.ts';
import type { ComponentManifest } from './manifest-shapes.ts';

const FILL: Family = {
  family: 'fill', reach: 'box', description: 'Whether a component takes its container\'s width.',
  default: 'arena-fit', variants: { 'arena-fill': '[--arena-fill-width:100%]', 'arena-fit': '[--arena-fill-width:fit-content]' },
};

test('an option is arbitrary properties and nothing else, with an underscore meaning a space', () => {
  assert.deepEqual(declarations('[--arena-x-a:1px] [--arena-x-b:calc(var(--sp-1)_*_2)]'),
    [['--arena-x-a', '1px'], ['--arena-x-b', 'calc(var(--sp-1) * 2)']]);
  assert.throws(() => declarations('w-full'), /not an arbitrary property/);
  assert.throws(() => declarations('[width:100%]'), /not an arbitrary property/);
});

test('a box family compiles one scope per option, stopped inside every boundary, selecting each part as root and as descendant', () => {
  assert.equal(compileFamily(FILL, ['button', 'tooltip']), `${LAYER_ORDER}@property --arena-fill-width {
  syntax: '*';
  inherits: false;
}
@layer utilities {
  @scope (.arena-fill) to (${LIMIT}) {
    &[data-arena-part="button"], [data-arena-part="button"],
    &[data-arena-part="tooltip"], [data-arena-part="tooltip"] {
      --arena-fill-width: 100%;
    }
  }
  @scope (.arena-fit) to (${LIMIT}) {
    &[data-arena-part="button"], [data-arena-part="button"],
    &[data-arena-part="tooltip"], [data-arena-part="tooltip"] {
      --arena-fill-width: fit-content;
    }
  }
}
`);
  assert.equal(LIMIT, '[data-arena-boundary] > *, :scope[data-arena-boundary] > *');
});

test('a context family crosses every boundary, and a box family with an axis resets it inside each one', () => {
  const context = compileFamily({ ...FILL, family: 'witness', reach: 'context',
    variants: { 'arena-witness-on': '[--arena-witness-mark:1]' }, default: 'arena-witness-on' }, ['button']);
  assert.match(context, /@scope \(\.arena-witness-on\) \{/);
  assert.doesNotMatch(context, / to \(/);
  const axis = compileFamily({ ...FILL, axis: '--arena-fill' }, ['button']);
  assert.match(axis, /\n  \[data-arena-boundary\] > \* \{\n    --arena-fill: initial;\n  \}\n\}\n$/);
});

test('every sheet opens with the layer order, so loading it first cannot rank utilities lowest', () => {
  assert.ok(compileFamily(FILL, ['button']).startsWith(LAYER_ORDER));
});

test('a family nobody answers is an error, because every rule would select nothing', () => {
  assert.throws(() => compileFamily(FILL, []), /no manifest answers fill/);
});

test('the parts come from the slots that read a channel, under the part partOf gives them, and only for a manifest that answers', () => {
  const manifests: ComponentManifest[] = [
    { component: 'ArenaButton', answers: ['fill'], slots: { root: 'w-[var(--arena-fill-width,fit-content)]', spinner: 'size-3' } },
    { component: 'ArenaSegmentedControl', answers: ['fill'], slots: { track: 'inline-flex', segment: 'px-2' },
      variants: { size: { md: { track: 'w-[var(--arena-fill-width,fit-content)]' } } } },
    { component: 'ArenaMenu', answers: ['fill'], slots: { root: 'x', panelEnd: 'w-[var(--arena-fill-width,fit-content)]' },
      partOf: { panelEnd: 'panel' } },
    { component: 'ArenaCard', slots: { root: 'w-[var(--arena-fill-width,fit-content)]' } },
  ];
  assert.deepEqual(answeringParts('fill', manifests), ['button', 'menu.panel', 'segmented-control.track']);
});

test('a family names its generated sheet and its packaged sheet', () => {
  assert.equal(sheetName('grid-min'), 'GridMin.generated.css');
  assert.equal(packageSheetName('grid-min'), 'css/vocabulary/grid-min.css');
});

test('a box family registers its channels as not inherited, so a value stops where the scope does', () => {
  const sheet = compileFamily(FILL, ['button']);
  assert.match(sheet, /@property --arena-fill-width \{\n  syntax: '\*';\n  inherits: false;\n\}/);
  const context = compileFamily({ ...FILL, family: 'witness', reach: 'context',
    variants: { 'arena-witness-on': '[--arena-witness-mark:1]' }, default: 'arena-witness-on' }, ['button']);
  assert.doesNotMatch(context, /@property/);
});
