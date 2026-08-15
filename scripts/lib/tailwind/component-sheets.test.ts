import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LAYER_ORDER, componentSheet, dedent, matchingBrace, ownersOf, preludeSheet, splitUtilities, topLevelChildren,
} from './component-sheets.ts';

const compiled = `/*! tailwindcss */
@layer properties;
@layer utilities {
  .arena-badge__root {
    display: inline-flex;
  }
  .arena-button__root {
    display: flex;
  }
  @media (prefers-reduced-motion: reduce) {
    .arena-badge__root {
      animation: none;
    }
    .arena-button__root {
      transition-property: none;
    }
  }
}
@property --tw-border-style {
  syntax: "*";
}
`;

const BASES = new Set(['arena-badge', 'arena-button']);

test('braces are matched past a string and a comment, so a selector holding one cannot mis-cut', () => {
  const css = '.a { content: "}"; /* } */ color: red; }';
  assert.equal(matchingBrace(css, css.indexOf('{')), css.length - 1);
});

test('a top-level child is found per rule and per at-rule block', () => {
  const children = topLevelChildren('.a { x: 1 }\n@media print {\n.b { y: 2 }\n}\n');
  assert.equal(children.length, 2);
  assert.equal(children[0]?.head, '.a');
  assert.equal(children[1]?.head, '@media print');
});

test('an owner is the class base, and a longer name is not a prefix of a shorter one', () => {
  const bases = new Set(['arena-toast', 'arena-toast-host']);
  assert.deepEqual([...ownersOf('.arena-toast__root {}', bases)], ['arena-toast']);
  assert.deepEqual([...ownersOf('.arena-toast-host__root {}', bases)], ['arena-toast-host']);
});

test('a class base no manifest declares is refused rather than guessed into an owner', () => {
  assert.throws(
    () => ownersOf('.arena-toast-host__root {}', new Set(['arena-toast'])),
    /no manifest is named by \.arena-toast-host__/,
  );
});

test('a shared at-rule is split per manifest rather than assigned to one of them', () => {
  const { components } = splitUtilities(compiled, BASES);
  assert.deepEqual([...components.keys()].sort(), ['arena-badge', 'arena-button']);

  const badge = components.get('arena-badge').join('\n');
  assert.match(badge, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(badge, /animation: none/);
  assert.ok(!badge.includes('transition-property'),
    'Tailwind merges every motion-reduce variant in the library into one @media block, so a split '
    + 'that assigned it whole would ship one component the rules of twenty-five others');
});

test('everything outside @layer utilities is shared, because every component sheet needs it', () => {
  const { shared } = splitUtilities(compiled, BASES);
  assert.match(shared, /@property --tw-border-style/);
  assert.ok(!shared.includes('.arena-badge__root'));
});

test('a sheet with no @layer utilities block is refused rather than yielding nothing', () => {
  assert.throws(() => splitUtilities('.arena-badge__root { color: red }', BASES), /carries no `@layer utilities` block/);
});

test('a rule belonging to no manifest is refused, because it would ship nowhere', () => {
  assert.throws(
    () => splitUtilities('@layer utilities {\n  .stray { color: red }\n}\n', BASES),
    /belongs to no manifest/,
  );
});

test('a component sheet imports the prelude first, so importing one alone is safe', () => {
  const sheet = componentSheet(['.arena-badge__root {\n  display: flex;\n}'], '../prelude.css');
  assert.match(sheet, /^@import '\.\.\/prelude\.css';/);
  assert.match(sheet, /@layer utilities \{\n {2}\.arena-badge__root \{\n {4}display: flex;\n {2}\}\n\}/);
});

test('dedent removes the common indent and leaves relative depth intact', () => {
  assert.equal(dedent('.a {\n    b: 1;\n      c: 2;\n  }'), '.a {\n  b: 1;\n    c: 2;\n}');
});

test('the prelude declares the layer order and carries the keyframes, and states properties first', () => {
  const prelude = preludeSheet('/*! banner */\n@layer properties;\n@property --tw-shadow { syntax: "*" }', '@keyframes arena-fade { from { opacity: 0 } }');
  assert.ok(prelude.startsWith(LAYER_ORDER), 'the order declaration leads, or the property fallbacks sort above everything');
  assert.match(prelude, /@keyframes arena-fade/);
  assert.match(prelude, /@property --tw-shadow/);
  assert.ok(!prelude.includes('/*!'), 'the compiler banner is replaced by the generator\'s own');
});

test('the reserved layer is declared last, after utilities', () => {
  assert.ok(LAYER_ORDER.includes('@layer theme, base, components, utilities, arena-plugin;'),
    'every compiled component rule lands in utilities at one class of specificity, so a plugin '
    + 'declared earlier would need !important to reach anything, and an escape hatch that needs '
    + '!important is not one');
});
