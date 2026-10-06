/* The compiler's output is asserted as text, because the text is the contract with the browser:
 * which selectors, which limit, which declarations, and the layer-order statement that keeps a
 * vocabulary sheet loaded first from ranking utilities below components. Whether the cascade
 * then does what the text says is check:proximity's to measure in Chromium. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  declarations, compileFamily, channelReads, answerOf, answeredFamilies, markupDeclarations, restatedDeclarations, answeringParts, axisWrapped, LIMIT, sheetName, packageSheetName, type Family,
} from './vocabulary.ts';
import { LAYER_ORDER } from './component-sheets.ts';
import type { ComponentManifest } from './manifest-shapes.ts';

const reading = (...parts: string[]): ComponentManifest[] => parts.map((part) => ({
  component: `Arena${part.slice(0, 1).toUpperCase()}${part.slice(1)}`, answers: ['fill'],
  slots: { root: 'w-[var(--arena-fill-width,fit-content)]' },
}));

const witness = (): ComponentManifest[] => [{ component: 'ArenaButton', answers: ['witness'], slots: { root: 'x-[var(--arena-witness-mark,1)]' } }];

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
  assert.equal(compileFamily(FILL, reading('button', 'tooltip')), `${LAYER_ORDER}@property --arena-fill-width {
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
    variants: { 'arena-witness-on': '[--arena-witness-mark:1]' }, default: 'arena-witness-on' }, witness());
  assert.match(context, /@scope \(\.arena-witness-on\) to \(\[data-arena-surface="floating"\]\) \{/);
  assert.doesNotMatch(context, /data-arena-boundary/);
  const axis = compileFamily({ ...FILL, axis: '--arena-fill' }, reading('button'));
  assert.match(axis, /\n  \[data-arena-boundary\] > \* \{\n    --arena-fill: initial;\n  \}\n\}\n$/);
});

test('every sheet opens with the layer order, so loading it first cannot rank utilities lowest', () => {
  assert.ok(compileFamily(FILL, reading('button')).startsWith(LAYER_ORDER));
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
  const sheet = compileFamily(FILL, reading('button'));
  assert.match(sheet, /@property --arena-fill-width \{\n  syntax: '\*';\n  inherits: false;\n\}/);
  const context = compileFamily({ ...FILL, family: 'witness', reach: 'context',
    variants: { 'arena-witness-on': '[--arena-witness-mark:1]' }, default: 'arena-witness-on' }, witness());
  assert.doesNotMatch(context, /@property/);
});

const STACK: Family = {
  family: 'stack', reach: 'box', target: 'markup', description: 'The air between peers.',
  variants: {
    'arena-stack': '[display:flex] [flex-direction:column] [gap:var(--rhythm-component)]',
    'arena-stack--start': '[align-items:flex-start]',
    'arena-stack--end': '[align-items:flex-end]',
  },
};

test('a markup family compiles unlayered, one scope per option over its own root, in the order the file writes them', () => {
  assert.equal(compileFamily(STACK, []), `${LAYER_ORDER}@scope (.arena-stack) {
  :scope {
    display: flex;
    flex-direction: column;
    gap: var(--rhythm-component);
  }
}
@scope (.arena-stack--start) {
  :scope {
    align-items: flex-start;
  }
}
@scope (.arena-stack--end) {
  :scope {
    align-items: flex-end;
  }
}
`);
});

test('no manifest answers a markup family', () => {
  assert.throws(() => compileFamily(STACK, [{ component: 'ArenaButton', answers: ['stack'], slots: { root: 'x-[var(--arena-stack-x,0)]' } }]), /markup family/);
});

test('a markup option is arbitrary CSS properties, and a utility is not one', () => {
  assert.deepEqual(markupDeclarations("[padding-inline:min(var(--gutter),7%)] [font-feature-settings:'tnum']"),
    [['padding-inline', 'min(var(--gutter),7%)'], ['font-feature-settings', "'tnum'"]]);
  assert.throws(() => markupDeclarations('flex'), /not an arbitrary CSS property/);
});

test('a restating option writes the literal values of the contract file it names, and an alias is refused', () => {
  const root = mkdtempSync(join(tmpdir(), 'vocabulary-'));
  mkdirSync(join(root, 'contracts/design'), { recursive: true });
  writeFileSync(join(root, 'contracts/design/x.json'), JSON.stringify({ dz: {
    $type: 'dimension', 'ctl-h': { $value: { value: 32, unit: 'px' } }, lh: { $value: 1 } } }));
  assert.deepEqual(restatedDeclarations('contracts/design/x.json', 'dz', root), [['--dz-ctl-h', '32px'], ['--dz-lh', '1']]);
  writeFileSync(join(root, 'contracts/design/y.json'), JSON.stringify({ dz: { a: { $value: '{sp.1}' } } }));
  assert.throws(() => restatedDeclarations('contracts/design/y.json', 'dz', root), /not a literal value/);
  const density: Family = { family: 'density', reach: 'context', target: 'markup', restates: 'dz', description: 'd',
    variants: { 'arena-compact': 'contracts/design/x.json' } };
  assert.equal(compileFamily(density, [], root), `${LAYER_ORDER}@scope (.arena-compact) {
  :scope {
    --dz-ctl-h: 32px;
    --dz-lh: 1;
  }
}
`);
});

const size: Family = { family: 'probe', reach: 'context', description: 'x', default: 'arena-probe-md',
  variants: { 'arena-probe-sm': '[--arena-probe-h:1px]', 'arena-probe-md': '[--arena-probe-h:2px]', 'arena-probe-xl': '[--arena-probe-h:9px]' } };
const button: ComponentManifest = { component: 'ArenaButton',
  answers: [{ family: 'probe', options: ['arena-probe-sm', 'arena-probe-md'], default: 'arena-probe-md' }],
  slots: { root: 'h-[var(--arena-probe-h,2px)]' } };
const logo: ComponentManifest = { component: 'ArenaAppLogo', answers: ['probe'],
  slots: { root: 'flex', mark: 'size-[var(--arena-probe-h,2px)]' } };

test('an option compiles over the parts that answer it, and a context family over each root part only', () => {
  const css = compileFamily(size, [button, logo]);
  const xl = css.split('.arena-probe-xl')[1]!;
  assert.match(xl, /data-arena-part="app-logo"/);
  assert.doesNotMatch(xl, /data-arena-part="button"|app-logo\.mark/);
  assert.match(css, /@scope \(\.arena-probe-sm\) to \(\[data-arena-surface="floating"\]\)/);
});

test('an option nobody answers emits nothing, and a listed option reaches the component that lists it', () => {
  const only = compileFamily(size, [button]);
  assert.doesNotMatch(only, /arena-probe-xl/);
  assert.match(only, /@scope \(\.arena-probe-sm\)[\s\S]*data-arena-part="button"/);
  assert.deepEqual(answeringParts(size, [button, logo], 'arena-probe-xl'), ['app-logo']);
  assert.deepEqual(answeringParts(size, [button, logo]), ['app-logo', 'button']);
});

test('answerOf and answeredFamilies read a name and an object alike', () => {
  assert.deepEqual(answeredFamilies({ answers: ['fill', { family: 'probe', options: ['a'], default: 'a' }] }), ['fill', 'probe']);
  assert.deepEqual(answerOf(logo, size), { options: ['arena-probe-sm', 'arena-probe-md', 'arena-probe-xl'], default: 'arena-probe-md' });
  assert.deepEqual(answerOf(button, size), { options: ['arena-probe-sm', 'arena-probe-md'], default: 'arena-probe-md' });
  assert.equal(answerOf({ component: 'ArenaCard' }, size), null);
});

test('channelReads returns nested reads with their whole fallback', () => {
  assert.deepEqual(channelReads('w-[var(--arena-o-w,var(--arena-s-long,var(--s-md-long)))]'), [
    { channel: '--arena-o-w', fallback: 'var(--arena-s-long,var(--s-md-long))' },
    { channel: '--arena-s-long', fallback: 'var(--s-md-long)' },
  ]);
  assert.deepEqual(channelReads('bg-[var(--arena-a-x,color-mix(in_oklab,var(--c)_20%,transparent))] p-[var(--arena-a-y)]'), [
    { channel: '--arena-a-x', fallback: 'color-mix(in_oklab,var(--c)_20%,transparent)' },
    { channel: '--arena-a-y', fallback: null },
  ]);
});

const COLUMN = { family: 'column', reach: 'box', target: 'keyed', keyed: 'key', description: 'x', variants: {},
  properties: ['--arena-column-<key>-width', '--arena-column-<key>-align'], channels: ['--arena-column-width', '--arena-column-align'],
  binds: ['ArenaTable'] } as Family;

test('a box family with several axes resets each inside every boundary, and registers none of them', () => {
  const css = compileFamily({ ...FILL, axis: ['--arena-fill-a', '--arena-fill-b'] }, reading('button'));
  assert.match(css, /\[data-arena-boundary\] > \* \{\n    --arena-fill-a: initial;\n  \}/);
  assert.match(css, /\[data-arena-boundary\] > \* \{\n    --arena-fill-b: initial;\n  \}/);
  assert.doesNotMatch(css, /@property --arena-fill-a/);
});

test('a read wrapped in the family axis falls back to the default through it', () => {
  assert.equal(axisWrapped('var(--arena-grid-min,var(--grid-min))', 'var(--grid-min)', ['--arena-grid-min']), true);
  assert.equal(axisWrapped('var(--grid-min)', 'var(--grid-min)', ['--arena-grid-min']), true);
  assert.equal(axisWrapped('var(--arena-other,var(--grid-min))', 'var(--grid-min)', ['--arena-grid-min']), false);
  assert.equal(axisWrapped('var(--arena-grid-min,100%)', 'var(--grid-min)', ['--arena-grid-min']), false);
});

test('a keyed family compiles to no sheet', () => {
  assert.throws(() => compileFamily(COLUMN, []), /keyed family compiles to no sheet/);
});
