import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDecls } from './css-decls.ts';
import { crossKeys, scopeOn } from '../../generate/core/arena-cli/style-plugin-rules.ts';

test('parses one selector block into name/value pairs', () => {
  const out = parseDecls(':root{\n  --sp-0:0;\n  --sp-1:4px;\n}\n');
  assert.deepEqual([...out.keys()], [':root']);
  assert.equal(out.get(':root').get('sp-0'), '0');
  assert.equal(out.get(':root').get('sp-1'), '4px');
});

test('parses multiple selector blocks and keeps them separate', () => {
  const out = parseDecls(':root{--a:1px}\n.arena-light{--a:2px}\n');
  assert.equal(out.get(':root').get('a'), '1px');
  assert.equal(out.get('.arena-light').get('a'), '2px');
});

test('strips block comments, including ones between declarations', () => {
  const css = '/* header */\n:root{\n  /* note */\n  --a:1px; /* trailing */\n  --b:2px;\n}\n';
  const out = parseDecls(css);
  assert.deepEqual([...out.get(':root').entries()], [['a', '1px'], ['b', '2px']]);
});

test('keeps values containing commas, parens and spaces intact', () => {
  const out = parseDecls(":root{--shadow-1:0 2px 6px -2px rgba(0,0,0,.5);--font-body:'Familjen Grotesk',system-ui,sans-serif;}");
  assert.equal(out.get(':root').get('shadow-1'), '0 2px 6px -2px rgba(0,0,0,.5)');
  assert.equal(out.get(':root').get('font-body'), "'Familjen Grotesk',system-ui,sans-serif");
});

test('ignores non-custom-property declarations', () => {
  const out = parseDecls(':root{color:red;--a:1px}');
  assert.deepEqual([...out.get(':root').keys()], ['a']);
});

test('scopeOn over :root is the class alone, and over another selector two @scope rules', () => {
  assert.equal(scopeOn('.arena-light')(':root', 'x'), '.arena-light{x}');
  assert.equal(scopeOn('.arena-light')('.arena-complete', 'x'),
    '@scope (.arena-light) {\n:where(:scope).arena-complete, .arena-complete{x}\n}\n'
    + '@scope (.arena-complete) {\n.arena-light{x}\n}');
});

test('a cross parses to the two keys crossKeys lists, and not to the comma list it writes', () => {
  const out = parseDecls(scopeOn('.arena-light')('.arena-complete', '--a:1px'));
  assert.deepEqual([...out.keys()], crossKeys('.arena-light', '.arena-complete'));
  assert.ok(!out.has(':where(:scope).arena-complete, .arena-complete'));
  assert.equal(out.get('@scope (.arena-light) .arena-complete').get('a'), '1px');
  assert.equal(out.get('@scope (.arena-complete) .arena-light').get('a'), '1px');
});

test('two scopes over one inner selector stay two keys', () => {
  const out = parseDecls(scopeOn('.arena-light')('.arena-complete', '--a:1px')
    + scopeOn('.arena-compact')('.arena-complete', '--a:2px'));
  assert.equal(out.get('@scope (.arena-light) .arena-complete').get('a'), '1px');
  assert.equal(out.get('@scope (.arena-compact) .arena-complete').get('a'), '2px');
  assert.equal(out.size, 4);
});

test('a rule nested in @media keeps apart from the same selector outside it', () => {
  const out = parseDecls('.b{--y:2}\n@media (min-width:1px){.b{--y:3}.a{--x:1}}\n');
  assert.deepEqual([...out.keys()], ['.b', '@media (min-width:1px) .b', '@media (min-width:1px) .a']);
  assert.equal(out.get('.b').get('y'), '2');
  assert.equal(out.get('@media (min-width:1px) .b').get('y'), '3');
});

test('an @media inside @scope keys by both preludes, and an unnested key is unchanged', () => {
  const out = parseDecls('@scope (.p) {\n@media (x) {\n:where(:scope).b{--y:1}\n}\n.c{--z:2}\n}\n.d{--w:3}');
  assert.deepEqual([...out.keys()], ['@scope (.p) @media (x) .b', '@scope (.p) .c', '.d']);
});

test('an @scope with a lower bound throws', () => {
  assert.throws(() => parseDecls('@scope (.a) to (.b) {\n.c{--x:1}\n}'), /cannot key/);
});
