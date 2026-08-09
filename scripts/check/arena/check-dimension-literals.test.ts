import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isValueCoercion, scanValue, scanText, scanInjectedCss, scanAttributes, scanDefaultsAndCallSites, staleExemptions, stalePassthrough, expressionLeaves, sourceFiles, componentParamCount, zeroComponentParamProblems, EXEMPT } from './check-dimension-literals.ts';

test('a bare number is a violation for a dimension-valued property', () => {
  assert.ok(scanValue('fontSize', '13'));
  assert.ok(scanValue('zIndex', '1000'));
  assert.ok(scanValue('fontWeight', '700'));
  assert.ok(scanValue('lineHeight', '1.55'));
});

test('a raw px length is a violation wherever it appears in the value', () => {
  assert.ok(scanValue('padding', "'0 18px'"));
  assert.ok(scanValue('border', "'1px solid var(--color-base-300)'"));
  assert.ok(scanValue('width', "'14px'"));
});

test('a raw em is a violation for letterSpacing, because em is where tracking is expressed', () => {
  assert.ok(scanValue('letterSpacing', "'.1em'"));
  assert.ok(scanValue('letterSpacing', "'-.02em'"));
  assert.ok(scanValue('letterSpacing', "'0.22em'"));
});

test('a var() into a token is legal', () => {
  assert.equal(scanValue('letterSpacing', "'var(--ls-label)'"), null);
  assert.equal(scanValue('fontSize', 'var(--dz-text)'), null);
  assert.equal(scanValue('padding', "'var(--dz-row-py) var(--dz-row-px)'"), null);
});

test('a calc() over tokens is legal, and its multipliers are not literals', () => {
  assert.equal(scanValue('width', "'calc(var(--sp-1) * 3.5)'"), null);
  assert.equal(scanValue('gap', "'calc(var(--sp-1) * 2.5)'"), null);
});

test('regression: a bare zero beside a calc() in the same shorthand is legal', () => {

  assert.equal(scanValue('padding', "'0 calc(var(--sp-1) * 3)'"), null);
  assert.equal(scanValue('padding', "'0 calc(var(--sp-1) * 6) calc(var(--sp-1) * 5.5)'"), null);
  assert.equal(scanValue('margin', "'0 0 0 calc(var(--sp-1) * 1)'"), null);
});

test('zero is legal, with or without quotes, including zero em', () => {
  assert.equal(scanValue('padding', '0'), null);
  assert.equal(scanValue('margin', "'0'"), null);
  assert.equal(scanValue('letterSpacing', "'0em'"), null);
});

test('a non-dimension unit the layer legitimately uses is legal', () => {
  assert.equal(scanValue('borderRadius', "'50%'"), null);
  assert.equal(scanValue('width', "'100%'"), null);
  assert.equal(scanValue('minWidth', "'0ch'"), null);
});

test('every unit on the free list stays legal', () => {
  for (const raw of ["'8%'", "'2ch'", "'1fr'", "'50vh'", "'50vw'", "'10vmin'", "'10vmax'", "'90deg'", "'1s'", "'200ms'"])
    assert.equal(scanValue('width', raw), null, raw);
});

test('a unit outside the free list fails closed, not just the ones already known', () => {
  assert.ok(scanValue('fontSize', "'12pt'"));
  assert.ok(scanValue('width', "'2cm'"));
  assert.ok(scanValue('width', "'3xyz'"));
});

test('lineHeight 1 is a violation, because it is a role and not a number', () => {
  assert.ok(scanValue('lineHeight', '1'));
});

test('scanText finds the property and the raw value together', () => {
  const found = scanText("const s = { fontSize: 13, padding: '0 18px', color: 'var(--mute)' };");
  assert.deepEqual(found.map((f) => f.prop), ['fontSize', 'padding']);
});

test('a property Arena does not govern is ignored', () => {
  assert.deepEqual(scanText("{ flexGrow: 1, opacity: 0.6, zoom: 2 }"), []);
});

test('a .d.ts-shaped declaration yields nothing', () => {

  assert.deepEqual(scanText('export interface ArenaButtonProps { fontSize?: number; padding?: string; }'), []);
});

test('scanText reports the 1-based line of each site', () => {
  const found = scanText("const a = 1;\nconst s = { fontSize: 13 };\nconst b = { padding: '0 18px' };\n");
  assert.deepEqual(found.map((f) => f.line), [2, 3]);
});

test('a percent in unquoted CSS text is captured whole, not truncated to a bare number', () => {
  assert.deepEqual(scanText('left:-40%'), []);
  assert.deepEqual(scanText('width:40%'), []);
});

test('regression: ArenaProgressBar.jsx keyframe text no longer reads as three violations', () => {

  const keyframes =
    '@keyframes arena-prog{0%{left:-40%}100%{left:100%}}' +
    '.arena-prog-ind::after{content:"";position:absolute;top:0;bottom:0;width:40%;border-radius:inherit;background:currentColor;animation:arena-prog 1.15s var(--ease-in-out) infinite}' +
    '@media (prefers-reduced-motion:reduce){.arena-prog-ind::after{animation-duration:2.4s}}';
  assert.deepEqual(scanText(keyframes), []);
});

test("regression: '4 px' (a space before the unit) is a violation, not a legal length", () => {

  assert.ok(scanValue('padding', "'4 px'"));
  assert.ok(scanValue('width', "'12 pt'"));
  assert.deepEqual(scanText("const s = { padding: '4 px' };").map((f) => f.prop), ['padding']);
});

test('regression: a bare zero beside calc() stays legal, and a mixed calc()+px shorthand still flags, with the (?!\\() guard in place', () => {
  assert.equal(scanValue('padding', "'0 calc(var(--sp-1) * 3)'"), null);
  assert.ok(scanValue('width', "'calc(var(--sp-1) * 2) 4px'"));
});

test('a ternary branch that is a bare literal is a violation', () => {
  const found = scanText("const s = { fontWeight: on ? 600 : 400 };");
  assert.deepEqual(found.map((f) => ({ prop: f.prop, raw: f.raw })), [
    { prop: 'fontWeight', raw: '600' },
    { prop: 'fontWeight', raw: '400' },
  ]);
});

test('a ternary whose branches are already tokens is legal on both sides', () => {
  assert.deepEqual(scanText("const s = { width: full ? '100%' : 'auto' };"), []);
  assert.deepEqual(
    scanText("const s = { fontWeight: on ? 'var(--fw-semibold)' : 'var(--fw-medium)' };"),
    []
  );
});

test('a ternary nested inside a string concatenation still resolves its branches', () => {

  const found = scanText(
    "const s = { border: 'var(--bw) solid ' + (locked ? 'var(--danger)' : 'var(--color-base-300)') };"
  );
  assert.deepEqual(found, []);
});

test('a bare literal at a LOGICAL padding or margin side is a violation, like its physical twin', () => {
  for (const prop of [
    'paddingInlineStart', 'paddingInlineEnd', 'paddingBlockStart', 'paddingBlockEnd',
    'marginInline', 'marginBlock',
    'marginInlineStart', 'marginInlineEnd', 'marginBlockStart', 'marginBlockEnd',
  ]) {
    assert.deepEqual(
      scanText(`const s = { ${prop}: '12px' };`).map((f) => ({ prop: f.prop, raw: f.raw })),
      [{ prop, raw: "'12px'" }],
      `${prop} is not governed — a bare literal at it passes the gate`,
    );

    assert.deepEqual(scanText(`const s = { ${prop}: 'var(--sp-3)' };`), []);
  }
});

test('a bare literal in a logical border side is a violation', () => {
  const hits = scanText("const s = { borderInlineStart: '2px solid var(--border)' };");
  assert.equal(hits.length, 1);
  assert.equal(hits[0]?.prop, 'borderInlineStart');
});

test('a bare literal in a logical inset side is a violation', () => {
  const hits = scanText("const s = { insetBlockStart: '12px' };");
  assert.equal(hits.length, 1);
  assert.equal(hits[0]?.prop, 'insetBlockStart');
});

test('a token in a logical side is not a violation', () => {
  assert.deepEqual(scanText("const s = { borderInlineEnd: 'var(--bw) solid var(--border)' };"), []);
  assert.deepEqual(scanText("const s = { insetInlineStart: 'calc(var(--sp-1) * 2)' };"), []);
});

test('a default parameter whose name is itself a governed CSS property is a violation', () => {
  const src = "function ArenaDialog({ open, title, width = 480 }) {\n  return null;\n}";
  const found = scanDefaultsAndCallSites(src);
  assert.deepEqual(found.map((f) => ({ prop: f.prop, raw: f.raw })), [
    { prop: 'width', raw: '480' },
  ]);
});

test('a default parameter on a named passthrough component resolves through the alias', () => {

  const src = "function ArenaAppLogo({ mark, size = 18, dim = 'soft' }) {\n  return null;\n}";
  const found = scanDefaultsAndCallSites(src);
  assert.deepEqual(found.map((f) => ({ prop: f.prop, raw: f.raw })), [
    { prop: 'width', raw: '18' },
  ]);
});

test('a typed parameter list is read like an untyped one, in both the named and the inline form', () => {
  const named = "function ArenaDialog({ open, width = 480 }: ArenaDialogProps) {\n  return null;\n}";
  const inline = "function ArenaDialog({ open, width = 480 }: { width?: number }) {\n  return null;\n}";
  for (const src of [named, inline])
    assert.deepEqual(scanDefaultsAndCallSites(src).map((f) => ({ prop: f.prop, raw: f.raw })), [
      { prop: 'width', raw: '480' },
    ], src);
});

test('matching no parameter list at all fails the gate, because every default then reads as clean', () => {
  assert.equal(componentParamCount("function ArenaDialog({ width = 480 }: ArenaDialogProps) {\n}"), 1);
  assert.equal(componentParamCount('const x = 1;'), 0);
  assert.equal(zeroComponentParamProblems(0).length, 1);
  assert.match(zeroComponentParamProblems(0)[0] ?? '', /every default value in the tree reports clean/);
  assert.deepEqual(zeroComponentParamProblems(1), []);
});

test('a default parameter whose name is neither a governed prop nor a registered passthrough is ignored', () => {
  const src = "function ArenaToast({ title, tone = 'neutral', persist = false }) {\n  return null;\n}";
  assert.deepEqual(scanDefaultsAndCallSites(src), []);
});

test('a default parameter assigning an already-resolved token is legal', () => {
  const src = "function Icon({ size = 'var(--icon-lg)' }) {\n  return null;\n}";
  assert.deepEqual(scanDefaultsAndCallSites(src), []);
});

test('a plain variable assignment outside a parameter list is never in scope', () => {

  const src = "function f() {\n  const top = Math.min(anchorRect.bottom + 12, 900 - 220);\n  return top;\n}";
  assert.deepEqual(scanDefaultsAndCallSites(src), []);
});

test('a JSX call site overriding a registered passthrough prop with a bare number is a violation', () => {
  const found = scanDefaultsAndCallSites('<ArenaAppLogo name="Draven" size={16} />');
  assert.deepEqual(found.map((f) => ({ prop: f.prop, raw: f.raw })), [
    { prop: 'width', raw: '16' },
  ]);
});

test('a JSX call site passing a token through a registered passthrough prop is legal', () => {
  assert.deepEqual(scanDefaultsAndCallSites('<Icon name="plus" size={\'var(--icon-md)\'} />'), []);
});

test('a JSX prop on a component NOT in the passthrough registry is never scanned, by design', () => {

  assert.deepEqual(scanDefaultsAndCallSites('<ArenaTextarea rows={3} />'), []);
  assert.deepEqual(scanDefaultsAndCallSites('<input maxLength={20} />'), []);
});

test('an inline arithmetic expression standing as the whole value is a violation', () => {
  const found = scanText('const s = { fontSize: d * 0.4 };');
  assert.deepEqual(found.map((f) => ({ prop: f.prop, raw: f.raw })), [
    { prop: 'fontSize', raw: 'd * 0.4' },
  ]);
});

test('a bare-number argument inside a wrapping call is a violation', () => {
  const found = scanText('const s = { width: Math.max(8, d * 0.28) };');
  assert.deepEqual(found.map((f) => ({ prop: f.prop, raw: f.raw })), [
    { prop: 'width', raw: '8' },
  ]);
});

test('a call with no bare-number argument is legal -- the call result alone is a derived value', () => {
  assert.deepEqual(scanText('const s = { height: y(endMin) };'), []);
  assert.deepEqual(scanText('const s = { top: y(m) };'), []);
});

test('an identifier argument inside a wrapping call is left alone, same as a lone ratio', () => {

  assert.deepEqual(scanText('const s = { width: Math.max(8, d * 0.28) };').map((f) => f.raw), ['8']);
});

test('two governed props on the same line each report their own call argument', () => {
  const found = scanText(
    "const s = { width: Math.max(8, d * 0.28), height: Math.max(8, d * 0.28) };"
  );
  assert.deepEqual(found.map((f) => ({ prop: f.prop, raw: f.raw })), [
    { prop: 'width', raw: '8' },
    { prop: 'height', raw: '8' },
  ]);
});

test('a bare number combined arithmetically with a call result is a violation', () => {

  const found = scanText('const s = { top: y(m) - 5 };');
  assert.deepEqual(found.map((f) => ({ prop: f.prop, raw: f.raw })), [
    { prop: 'top', raw: 'y(m) - 5' },
  ]);
});

test('a call result combined arithmetically with a number, with brackets in the call, still resolves', () => {
  const found = scanText('const s = { top: yOf(values[hover]) - 8 };');
  assert.deepEqual(found.map((f) => ({ prop: f.prop, raw: f.raw })), [
    { prop: 'top', raw: 'yOf(values[hover]) - 8' },
  ]);
});

test('a nested-parens call is deliberately out of scope, not misread', () => {

  assert.deepEqual(scanText('const s = { width: Math.max(8, Math.min(d, 40)) };'), []);
});

test('EXEMPT records the data-to-pixel projections, by name', () => {
  assert.ok(EXEMPT.has('frameworks/react/components/charts/ChartTooltip.ts:top:`calc(${y}px - var(--chart-tooltip-offset))`'));
  assert.ok(EXEMPT.has('frameworks/angular/components/charts/ChartTooltip.ts:top:`calc(${y}px - var(--chart-tooltip-offset))`'));
  assert.ok(!EXEMPT.has('frameworks/react/components/charts/arena-bar-chart/ArenaBarChart.tsx:top:`calc(${yOf(values[hover])}px - var(--sp-2))`'),
    'both charts anchor their tooltip through one paired module now, so neither spells the projection for itself');
  assert.ok(EXEMPT.has('frameworks/react/components/display/arena-calendar/ArenaCalendar.tsx:height:`max(calc(var(--sp-1) * 6.5), ${rawH}px)`'));
  assert.ok(!EXEMPT.has('frameworks/react/components/display/arena-avatar/ArenaAvatar.tsx:fontSize:d * 0.4'));
  assert.ok(!EXEMPT.has('frameworks/react/components/display/arena-calendar/ArenaCalendar.tsx:top:`calc(${y(m)}px - var(--sp-1))`'),
    'the hour label offset is the manifest\'s -mt-1 now, so the projection it exempted is gone');
});

test('EXEMPT records the three ARENA_SR_ONLY visually-hidden literals, by name', () => {
  assert.ok(EXEMPT.has("frameworks/angular/DataVisuals.ts:width:'1px'"));
  assert.ok(EXEMPT.has("frameworks/angular/DataVisuals.ts:height:'1px'"));
  assert.ok(EXEMPT.has("frameworks/angular/DataVisuals.ts:margin:'-1px'"));

  assert.ok(!EXEMPT.has("frameworks/angular/DataVisuals.ts:padding:'0'"));
  assert.ok(!EXEMPT.has("frameworks/angular/DataVisuals.ts:border:'0'"));
});

test('no exemption names a demo entry, since a hand-written one no longer exists to carry a literal', () => {
  for (const key of EXEMPT.keys()) {
    assert.doesNotMatch(key, /\.card\.entry\.tsx:/,
      `${key} names a page entry this layer stopped hand-writing; a generated one binds every value through a knob`);
  }
});

test('the ARENA_SR_ONLY object shape produces exactly the raws those keys are cut from', () => {

  const hits = scanText(
    "export const ARENA_SR_ONLY = { position: 'absolute', width: '1px', height: '1px',"
    + " padding: '0', margin: '-1px', overflow: 'hidden', clip: 'rect(0 0 0 0)',"
    + " whiteSpace: 'nowrap', border: '0' };",
  );
  assert.deepEqual(hits.map((h) => `${h.prop}:${h.raw}`), ["width:'1px'", "height:'1px'", "margin:'-1px'"]);
});

test('no local-stacking zIndex literal is exempt any more, because none is written', () => {
  for (const key of EXEMPT.keys()) {
    assert.doesNotMatch(key, /zIndex/,
      'a zIndex literal is exempt again; the calendar pair took theirs from the manifest instead');
  }
});

test('every current EXEMPT key is matched by this run -- none are stale', () => {

  const allKeys = new Set(EXEMPT.keys());
  assert.deepEqual(staleExemptions(allKeys), []);
});

test('an EXEMPT key absent from the matched set is reported as stale', () => {
  const oneMissing = new Set(EXEMPT.keys());
  const [firstKey] = EXEMPT.keys();
  assert.ok(firstKey, 'EXEMPT is empty, so this asserts nothing');
  oneMissing.delete(firstKey);
  assert.deepEqual(staleExemptions(oneMissing), [firstKey]);
});

test('an empty matched set reports every EXEMPT entry as stale', () => {
  assert.deepEqual(staleExemptions(new Set()), [...EXEMPT.keys()]);
});

test('a parenthesised nested ternary resolves every leaf', () => {
  assert.deepEqual(expressionLeaves("a ? (b ? 12 : 14) : 16"), ['12', '14', '16']);
});

test('a right-chained nested ternary (no parens) resolves every leaf', () => {
  assert.deepEqual(expressionLeaves("size === 'sm' ? 4 : size === 'lg' ? 10 : 6"), ['4', '10', '6']);
});

test('all three literals of a nested ternary at a governed colon are flagged', () => {
  const found = scanText('const s = { fontSize: a ? (b ? 12 : 14) : 16 };');
  assert.deepEqual(found.map((f) => f.raw), ['12', '14', '16']);
});

test('a nested ternary whose leaves are all tokens stays legal', () => {
  assert.deepEqual(
    scanText("const s = { fontWeight: a ? (b ? 'var(--fw-bold)' : 'var(--fw-medium)') : 'var(--fw-regular)' };"),
    []
  );
});

test('a literal reached through an intermediate variable is a violation, attributed to the declaration line', () => {
  const src = [
    "function ArenaProgressBar({ size }) {",
    "  const h = size === 'sm' ? 4 : size === 'lg' ? 10 : 6;",
    "  return React.createElement('div', { style: { height: h } });",
    "}",
  ].join('\n');
  const found = scanText(src);
  assert.deepEqual(found.map((f) => ({ raw: f.raw, prop: f.prop, line: f.line })), [
    { raw: '4', prop: 'height', line: 2 },
    { raw: '10', prop: 'height', line: 2 },
    { raw: '6', prop: 'height', line: 2 },
  ]);
});

test('an OR-fallback reached through an intermediate variable is a violation', () => {
  const src = [
    "function ArenaSkeleton({ height, width }) {",
    "  const d = height || width || 40;",
    "  return React.createElement('div', { style: { width: d, height: d } });",
    "}",
  ].join('\n');
  const found = scanText(src);
  assert.deepEqual(found.map((f) => f.raw), ['40']);
});

test('a declaration whose identifier never reaches a governed colon is left alone', () => {

  const src = [
    "function Chart({ values }) {",
    "  const pct = Math.max(0, Math.min(100, Math.round(values[0])));",
    "  return React.createElement('span', null, pct + '%');",
    "}",
  ].join('\n');
  assert.deepEqual(scanText(src), []);
});

test('a declaration whose value has no literal at all is left alone even when its identifier is used bare', () => {
  const src = [
    "function ArenaAvatar({ size }) {",
    "  const SIZES = { sm: 32, md: 40 };",
    "  const d = SIZES[size] || SIZES.md;",
    "  return React.createElement('span', { style: { width: d, height: d } });",
    "}",
  ].join('\n');
  assert.deepEqual(scanText(src), []);
});

test('a value already resolved to a token through the variable is legal, not re-flagged', () => {

  const src = [
    "function ArenaProgressBar({ size }) {",
    "  const h = size === 'sm' ? 'var(--sp-1)' : 'calc(var(--sp-1) * 2.5)';",
    "  return React.createElement('div', { style: { height: h } });",
    "}",
  ].join('\n');
  assert.deepEqual(scanText(src), []);
});

test('a flat call written directly at a governed colon with a non-dimension shape IS caught, unlike the same call behind a variable', () => {

  const found = scanText("const s = { width: Math.min(100, val) };");
  assert.deepEqual(found.map((f) => f.raw), ['100']);
});

test('the same shallow non-dimension call is still traced through a variable, since the dataflow rule reuses scanLeaf on the declaration', () => {

  const src = [
    "function Thing({ val }) {",
    "  const pct = Math.min(100, val);",
    "  return React.createElement('div', { style: { width: pct } });",
    "}",
  ].join('\n');
  const found = scanText(src);
  assert.deepEqual(found.map((f) => f.raw), ['100']);
});

test('the real boundary: a nested call behind a variable is not caught, the exact shape ArenaProgressBar\'s own percent clamp has', () => {

  const src = [
    "function Thing({ value }) {",
    "  const pct = Math.max(0, Math.min(100, Math.round(value)));",
    "  return React.createElement('div', { style: { width: pct } });",
    "}",
  ].join('\n');
  assert.deepEqual(scanText(src), []);
});

test('a PASSTHROUGH entry with a match is not stale', () => {
  assert.deepEqual(stalePassthrough(new Set(['ArenaAppLogo'])), []);
});

test('a PASSTHROUGH entry matching nothing in the tree fails as stale', () => {
  assert.deepEqual(stalePassthrough(new Set()), ['ArenaAppLogo']);
});

test('a component the map does not name is not reported', () => {
  assert.deepEqual(stalePassthrough(new Set(['ArenaAppLogo', 'ArenaButton', 'ArenaTag'])), []);
});

test('a line comment shaped like a colon-value is never read as one', () => {
  const src = [
    "function Thing() {",
    "  // The rendered `width:` further down must equal the token below.",
    "  return React.createElement('div', { style: { width: 'var(--sp-4)' } });",
    "}",
  ].join('\n');
  assert.deepEqual(scanText(src), []);
});

test('a line comment containing an unmatched backtick does not swallow the rest of the file', () => {
  const src = [
    "// a stray ` backtick with no partner on this line",
    "const s = { fontSize: 13 };",
  ].join('\n');
  const found = scanText(src);
  assert.deepEqual(found.map((f) => ({ raw: f.raw, line: f.line })), [{ raw: '13', line: 2 }]);
});

test('a block comment containing a colon-shaped fragment is never read as a value', () => {
  const src = [
    "/* padding: 999 -- an old note, not live code */",
    "const s = { padding: 'var(--sp-2)' };",
  ].join('\n');
  assert.deepEqual(scanText(src), []);
});

test('a `//` or `/*` inside a real string is not mistaken for a comment', () => {
  assert.deepEqual(scanText("const s = { content: '// not a comment', width: 'var(--sp-4)' };"), []);
});

test('blanking comments preserves line numbers exactly', () => {
  const src = [
    "// line 1 comment, `fontSize:` mentioned here",
    "// line 2 comment",
    "const s = { fontSize: 13 };",
  ].join('\n');
  const found = scanText(src);
  assert.deepEqual(found[0]?.line, 3);
});

test('a focus ring written by hand is a dimension literal', () => {
  assert.ok(scanValue('boxShadow', "'0 0 0 2px var(--gold-soft)'"));
  assert.equal(scanValue('boxShadow', "'0 0 0 var(--focus-width) var(--gold-soft)'"), null);
  assert.equal(scanValue('boxShadow', "'var(--shadow-2)'"), null);
  assert.equal(scanValue('boxShadow', "'none'"), null);
});

test('a transform carrying a dimension is judged; a ratio or a share is not', () => {
  assert.ok(scanValue('transform', "'translateX(18px)'"));
  assert.equal(scanValue('transform', "'translateX(calc(var(--sp-1) * 4.5))'"), null);
  assert.equal(scanValue('transform', "'translate(-50%,-100%)'"), null);
  assert.equal(scanValue('transform', "'scale(0.98)'"), null);
  assert.equal(scanValue('transform', "'rotate(120deg)'"), null);
  assert.equal(scanValue('transform', "'none'"), null);
});

test('a dimension inside injected CSS is judged like any other', () => {
  const source = [
    "const s = document.createElement('style');",
    "s.textContent = '@keyframes arena-pop{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}';",
  ].join('\n');
  const hits = scanInjectedCss(source);
  assert.equal(hits.length, 1);
  assert.equal(hits[0]?.prop, 'transform');
  assert.match(hits[0]?.reason ?? '', /raw px/);
  assert.equal(hits[0]?.line, 2);
});

test('injected CSS built from tokens is clean', () => {
  const source = "s.textContent = '.a{animation:x var(--loop-spin) linear infinite;transform:translateY(var(--sp-2))}';";
  assert.deepEqual(scanInjectedCss(source), []);
});

test('a percentage inside injected CSS is not a dimension', () => {
  const source = "s.textContent = '@keyframes a{0%{left:-140%}100%{left:140%}}';";
  assert.deepEqual(scanInjectedCss(source), []);
});

test('a string that is not CSS is left alone', () => {
  assert.deepEqual(scanInjectedCss("const label = 'Step 1 of 4: 12px away';"), []);
});

test('a kebab-case CSS property is judged under its camelCase name', () => {
  const hits = scanInjectedCss("s.textContent = '.a{border-width:2px;box-shadow:0 0 0 2px var(--gold-soft)}';");
  assert.deepEqual(hits.map((h) => h.prop).sort(), ['borderWidth', 'boxShadow']);
});

test('CSS split across `+`-concatenated string literals is read as one rule', () => {
  assert.equal(scanInjectedCss("s.textContent = '.a{margin-top:8px}';").length, 1);
  const hits = scanInjectedCss("s.textContent = '.a{' + 'margin-top:8px}';");
  assert.equal(hits.length, 1);
  assert.equal(hits[0]?.prop, 'marginTop');
});

test('an interpolation does not hide the unit that follows it', () => {
  assert.ok(scanValue('width', '`max(calc(var(--sp-1) * 2), ${d * 0.28}px)`'));
  assert.ok(scanValue('height', '`${size}px`'));
});

test('an interpolation in a unit nothing models is still fine', () => {
  assert.equal(scanValue('width', '`${share}%`'), null);
});

test('an interpolated derivation of tokens is fine', () => {
  assert.equal(scanValue('fontSize', '`calc(${d} * 0.4)`'), null);
});

test('an SVG presentation attribute is a governed site', () => {
  const hits = scanAttributes('<text fontSize="10" strokeWidth="2">x</text>');
  assert.deepEqual(hits.map((h) => h.prop).sort(), ['fontSize', 'strokeWidth']);
});

test('an attribute reading a token is clean', () => {
  assert.deepEqual(scanAttributes('<line style={{ strokeWidth: \'var(--bw)\' }} />'), []);
  assert.deepEqual(scanAttributes('<svg width="100%" viewBox="0 0 100 100" />'), []);
});

test('an attribute bound to an expression is out of scope', () => {
  assert.deepEqual(scanAttributes('<circle r={hover ? 5 : 4} cx={x} />'), []);
});

test('a hyphen-prefixed attribute whose tail matches a governed name is not misread as that name', () => {

  assert.deepEqual(scanAttributes('<div data-width="20" data-height="10" />'), []);
});

test('a governed property name at the tail of a longer one is not that property', () => {
  assert.deepEqual(scanText("const a = 'stroke-width: var(--bw);';"), []);
  assert.deepEqual(scanText("const a = { strokeWidth: 'var(--bw)' };"), []);
  assert.deepEqual(scanText('const a = `max-width: 13px`;'), [],
    'a kebab-case declaration in a bare string is nobody\'s: scanText reads camelCase and scanInjectedCss '
    + 'requires a rule body, which is the kebab-case blind spot the gate header records rather than one this fix adds');
  assert.deepEqual(scanText('const a = { maxWidth: 13 };').map((f) => f.prop), ['maxWidth']);
});

test('the lookbehind matters because a mismatched property swallows past the string it was found in', () => {
  const src = "const a = 'stroke-width: var(--bw);';\nconst b = 'p95 line chart';\n";
  assert.deepEqual(scanText(src), [],
    'reading `width` out of `stroke-width` used to run the value past the closing quote and report a '
    + 'bare literal at a site that had none -- naming a file and a property that were not the defect');
});

test('a dist tree is assembled output, so the scan never opens it', () => {
  const root = mkdtempSync(join(tmpdir(), 'arena-dimensions-'));
  mkdirSync(join(root, 'react', 'dist', 'components'), { recursive: true });
  writeFileSync(join(root, 'react', 'Widget.jsx'), 'const a = { height: 13 };\n');
  writeFileSync(join(root, 'react', 'dist', 'components', 'Widget.jsx'), 'const a = { height: 13 };\n');
  assert.deepEqual([...sourceFiles(root)], [join(root, 'react', 'Widget.jsx')]);
  rmSync(root, { recursive: true });
});

test('an Angular input transform is not the CSS transform, so the value it resolves to is not a dimension', () => {
  assert.equal(isValueCoercion('transform', '(value) => value ?? 3'), true);
  assert.equal(isValueCoercion('transform', 'booleanAttribute'), false);
  assert.equal(isValueCoercion('transform', '`translateY(4px)`'), false);
  assert.equal(isValueCoercion('width', '(value) => value ?? 3'), false);
  assert.deepEqual(scanText('readonly lines = input<number, number | undefined>(3, { transform: (value) => value ?? 3 });'), []);
  assert.equal(scanText('const s = { transform: `translateY(4px)` };').length, 1,
    'a real CSS transform still has to be a token');
});
