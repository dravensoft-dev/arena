import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isValueCoercion, scanValue, scanText, scanInjectedCss, scanAttributes, scanDefaultsAndCallSites, staleExemptions, stalePassthrough, expressionLeaves, sourceFiles, componentParamCount, zeroComponentParamProblems, scanStyleWrites, staleComputed, COMPUTED, EXEMPT, type Passthrough } from './check-dimension-literals.ts';

const VALUE_GROUPS: { name: string; violates: boolean; prop: string; raws: string[] }[] = [
  { name: 'a bare number is a violation for a dimension-valued property', violates: true, prop: 'fontSize', raws: ['13'] },
  { name: 'a bare number is a violation for a dimension-valued property', violates: true, prop: 'zIndex', raws: ['1000'] },
  { name: 'a bare number is a violation for a dimension-valued property', violates: true, prop: 'fontWeight', raws: ['700'] },
  { name: 'a bare number is a violation for a dimension-valued property', violates: true, prop: 'lineHeight', raws: ['1.55'] },
  { name: 'a raw px length is a violation wherever it appears in the value', violates: true, prop: 'padding', raws: ["'0 18px'"] },
  { name: 'a raw px length is a violation wherever it appears in the value', violates: true, prop: 'border', raws: ["'1px solid var(--color-base-300)'"] },
  { name: 'a raw px length is a violation wherever it appears in the value', violates: true, prop: 'width', raws: ["'14px'"] },
  { name: 'a raw em is a violation for letterSpacing, because em is where tracking is expressed', violates: true, prop: 'letterSpacing', raws: ["'.1em'", "'-.02em'", "'0.22em'"] },
  { name: 'a var() into a token is legal', violates: false, prop: 'letterSpacing', raws: ["'var(--ls-label)'"] },
  { name: 'a var() into a token is legal', violates: false, prop: 'fontSize', raws: ['var(--dz-text)'] },
  { name: 'a var() into a token is legal', violates: false, prop: 'padding', raws: ["'var(--dz-row-py) var(--dz-row-px)'"] },
  { name: 'a calc() over tokens is legal, and its multipliers are not literals', violates: false, prop: 'width', raws: ["'calc(var(--sp-1) * 3.5)'"] },
  { name: 'a calc() over tokens is legal, and its multipliers are not literals', violates: false, prop: 'gap', raws: ["'calc(var(--sp-1) * 2.5)'"] },
  { name: 'regression: a bare zero beside a calc() in the same shorthand is legal', violates: false, prop: 'padding',
    raws: ["'0 calc(var(--sp-1) * 3)'", "'0 calc(var(--sp-1) * 6) calc(var(--sp-1) * 5.5)'"] },
  { name: 'regression: a bare zero beside a calc() in the same shorthand is legal', violates: false, prop: 'margin', raws: ["'0 0 0 calc(var(--sp-1) * 1)'"] },
  { name: 'zero is legal, with or without quotes, including zero em', violates: false, prop: 'padding', raws: ['0'] },
  { name: 'zero is legal, with or without quotes, including zero em', violates: false, prop: 'margin', raws: ["'0'"] },
  { name: 'zero is legal, with or without quotes, including zero em', violates: false, prop: 'letterSpacing', raws: ["'0em'"] },
  { name: 'a non-dimension unit the layer legitimately uses is legal', violates: false, prop: 'borderRadius', raws: ["'50%'"] },
  { name: 'a non-dimension unit the layer legitimately uses is legal', violates: false, prop: 'width', raws: ["'100%'"] },
  { name: 'a non-dimension unit the layer legitimately uses is legal', violates: false, prop: 'minWidth', raws: ["'0ch'"] },
  { name: 'every unit on the free list stays legal', violates: false, prop: 'width',
    raws: ["'8%'", "'2ch'", "'1fr'", "'50vh'", "'50vw'", "'10vmin'", "'10vmax'", "'90deg'", "'1s'", "'200ms'"] },
  { name: 'a unit outside the free list fails closed, not just the ones already known', violates: true, prop: 'fontSize', raws: ["'12pt'"] },
  { name: 'a unit outside the free list fails closed, not just the ones already known', violates: true, prop: 'width', raws: ["'2cm'", "'3xyz'"] },
  { name: 'lineHeight 1 is a violation, because it is a role and not a number', violates: true, prop: 'lineHeight', raws: ['1'] },
  { name: "regression: '4 px' (a space before the unit) is a violation, not a legal length", violates: true, prop: 'padding', raws: ["'4 px'"] },
  { name: "regression: '4 px' (a space before the unit) is a violation, not a legal length", violates: true, prop: 'width', raws: ["'12 pt'"] },
  { name: 'regression: a mixed calc()+px shorthand still flags, with the (?!\\() guard in place', violates: true, prop: 'width', raws: ["'calc(var(--sp-1) * 2) 4px'"] },
  { name: 'a focus ring written by hand is a dimension literal', violates: true, prop: 'boxShadow', raws: ["'0 0 0 2px var(--gold-soft)'"] },
  { name: 'a focus ring written by hand is a dimension literal', violates: false, prop: 'boxShadow',
    raws: ["'0 0 0 var(--focus-width) var(--gold-soft)'", "'var(--shadow-2)'", "'none'"] },
  { name: 'a transform carrying a dimension is judged; a ratio or a share is not', violates: true, prop: 'transform', raws: ["'translateX(18px)'"] },
  { name: 'a transform carrying a dimension is judged; a ratio or a share is not', violates: false, prop: 'transform',
    raws: ["'translateX(calc(var(--sp-1) * 4.5))'", "'translate(-50%,-100%)'", "'scale(0.98)'", "'rotate(120deg)'", "'none'"] },
  { name: 'an interpolation does not hide the unit that follows it', violates: true, prop: 'width', raws: ['`max(calc(var(--sp-1) * 2), ${d * 0.28}px)`'] },
  { name: 'an interpolation does not hide the unit that follows it', violates: true, prop: 'height', raws: ['`${size}px`'] },
  { name: 'an interpolation in a unit nothing models is still fine', violates: false, prop: 'width', raws: ['`${share}%`'] },
  { name: 'an interpolated derivation of tokens is fine', violates: false, prop: 'fontSize', raws: ['`calc(${d} * 0.4)`'] },
];

test('scanValue flags a bare number, a raw length or an unmodelled unit, and passes a token, a calc over tokens, zero and a free unit', () => {
  assert.ok(VALUE_GROUPS.length > 0, 'the table holds rows');
  for (const row of VALUE_GROUPS) {
    for (const raw of row.raws) {
      if (row.violates) assert.ok(scanValue(row.prop, raw), `${row.name}: ${row.prop} ${raw} is a violation`);
      else assert.equal(scanValue(row.prop, raw), null, `${row.name}: ${row.prop} ${raw} is legal`);
    }
  }
});

const LOGICAL_PROPS = [
  'paddingInlineStart', 'paddingInlineEnd', 'paddingBlockStart', 'paddingBlockEnd',
  'marginInline', 'marginBlock',
  'marginInlineStart', 'marginInlineEnd', 'marginBlockStart', 'marginBlockEnd',
];

const KEYFRAMES =
  '@keyframes arena-prog{0%{left:-40%}100%{left:100%}}' +
  '.arena-prog-ind::after{content:"";position:absolute;top:0;bottom:0;width:40%;border-radius:inherit;background:currentColor;animation:arena-prog 1.15s var(--ease-in-out) infinite}' +
  '@media (prefers-reduced-motion:reduce){.arena-prog-ind::after{animation-duration:2.4s}}';

test('scanText finds the property, the raw value and the line of every literal site', () => {
  const found: { name: string; source: string; expected: Partial<{ prop: string; raw: string; line: number }>[] }[] = [
    { name: 'scanText finds the property and the raw value together',
      source: "const s = { fontSize: 13, padding: '0 18px', color: 'var(--mute)' };", expected: [{ prop: 'fontSize' }, { prop: 'padding' }] },
    { name: 'scanText reports the 1-based line of each site',
      source: "const a = 1;\nconst s = { fontSize: 13 };\nconst b = { padding: '0 18px' };\n", expected: [{ line: 2 }, { line: 3 }] },
    { name: "regression: '4 px' (a space before the unit) is a violation, not a legal length",
      source: "const s = { padding: '4 px' };", expected: [{ prop: 'padding' }] },
    { name: 'a ternary branch that is a bare literal is a violation',
      source: 'const s = { fontWeight: on ? 600 : 400 };', expected: [{ prop: 'fontWeight', raw: '600' }, { prop: 'fontWeight', raw: '400' }] },
    { name: 'a bare literal in a logical border side is a violation',
      source: "const s = { borderInlineStart: '2px solid var(--border)' };", expected: [{ prop: 'borderInlineStart' }] },
    { name: 'a bare literal in a logical inset side is a violation',
      source: "const s = { insetBlockStart: '12px' };", expected: [{ prop: 'insetBlockStart' }] },
    { name: 'all three literals of a nested ternary at a governed colon are flagged',
      source: 'const s = { fontSize: a ? (b ? 12 : 14) : 16 };', expected: [{ raw: '12' }, { raw: '14' }, { raw: '16' }] },
    { name: 'a governed property name at the tail of a longer one is not that property, but the property itself is',
      source: 'const a = { maxWidth: 13 };', expected: [{ prop: 'maxWidth' }] },
    ...LOGICAL_PROPS.map((prop) => ({
      name: `a bare literal at the logical ${prop} is a violation, like its physical twin, and ${prop} is governed`,
      source: `const s = { ${prop}: '12px' };`, expected: [{ prop, raw: "'12px'" }],
    })),
  ];
  assert.ok(found.length > 0, 'the table holds rows');
  for (const row of found) {
    const keys = Object.keys(row.expected[0] ?? {}) as ('prop' | 'raw' | 'line')[];
    const hits = scanText(row.source).map((hit) => Object.fromEntries(keys.map((key) => [key, hit[key]])));
    assert.deepEqual(hits, row.expected, row.name);
  }
});

test('scanText finds nothing in a token, a non-site or a property Arena does not govern', () => {
  const clean: { name: string; sources: string[]; why?: string }[] = [
    { name: 'a property Arena does not govern is ignored', sources: ['{ flexGrow: 1, opacity: 0.6, zoom: 2 }'] },
    { name: 'a .d.ts-shaped declaration yields nothing', sources: ['export interface ArenaButtonProps { fontSize?: number; padding?: string; }'] },
    { name: 'a percent in unquoted CSS text is captured whole, not truncated to a bare number', sources: ['left:-40%', 'width:40%'] },
    { name: 'regression: ArenaProgressBar.jsx keyframe text reads as no violation', sources: [KEYFRAMES] },
    { name: 'a ternary whose branches are already tokens is legal on both sides',
      sources: ["const s = { width: full ? '100%' : 'auto' };", "const s = { fontWeight: on ? 'var(--fw-semibold)' : 'var(--fw-medium)' };"] },
    { name: 'a ternary nested inside a string concatenation still resolves its branches',
      sources: ["const s = { border: 'var(--bw) solid ' + (locked ? 'var(--danger)' : 'var(--color-base-300)') };"] },
    { name: 'a token in a logical side is not a violation',
      sources: ["const s = { borderInlineEnd: 'var(--bw) solid var(--border)' };", "const s = { insetInlineStart: 'calc(var(--sp-1) * 2)' };",
        ...LOGICAL_PROPS.map((prop) => `const s = { ${prop}: 'var(--sp-3)' };`)] },
    { name: 'a nested ternary whose leaves are all tokens stays legal',
      sources: ["const s = { fontWeight: a ? (b ? 'var(--fw-bold)' : 'var(--fw-medium)') : 'var(--fw-regular)' };"] },
    { name: 'a governed property name at the tail of a longer one is not that property',
      sources: ["const a = 'stroke-width: var(--bw);';", "const a = { strokeWidth: 'var(--bw)' };", 'const a = `max-width: 13px`;'],
      why: 'a kebab-case declaration in a bare string is nobody\'s: scanText reads camelCase and scanInjectedCss '
        + 'requires a rule body, which is the kebab-case blind spot the gate header records rather than one this fix adds' },
    { name: 'the lookbehind matters because a mismatched property swallows past the string it was found in',
      sources: ["const a = 'stroke-width: var(--bw);';\nconst b = 'p95 line chart';\n"],
      why: 'reading `width` out of `stroke-width` stops the value at the closing quote and reports no '
        + 'bare literal at a site that has none -- naming a file and a property that were not the defect' },
  ];
  assert.ok(clean.length > 0, 'the table holds rows');
  for (const row of clean) {
    for (const source of row.sources) assert.deepEqual(scanText(source), [], `${row.name}: ${source}${row.why ? ` (${row.why})` : ''}`);
  }
});

test('scanInjectedCss judges a dimension inside injected CSS like any other, and leaves tokens, percentages and a string that is not CSS alone', () => {
  const rows: { name: string; source: string; count?: number; props?: string[]; reason?: RegExp; line?: number }[] = [
    { name: 'a dimension inside injected CSS is judged like any other',
      source: [
        "const s = document.createElement('style');",
        "s.textContent = '@keyframes arena-pop{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}';",
      ].join('\n'),
      count: 1, props: ['transform'], reason: /raw px/, line: 2 },
    { name: 'injected CSS built from tokens is clean',
      source: "s.textContent = '.a{animation:x var(--loop-spin) linear infinite;transform:translateY(var(--sp-2))}';", count: 0 },
    { name: 'a percentage inside injected CSS is not a dimension', source: "s.textContent = '@keyframes a{0%{left:-140%}100%{left:140%}}';", count: 0 },
    { name: 'a string that is not CSS is left alone', source: "const label = 'Step 1 of 4: 12px away';", count: 0 },
    { name: 'a kebab-case CSS property is judged under its camelCase name',
      source: "s.textContent = '.a{border-width:2px;box-shadow:0 0 0 2px var(--gold-soft)}';", props: ['borderWidth', 'boxShadow'] },
    { name: 'CSS in one string literal is read as a rule', source: "s.textContent = '.a{margin-top:8px}';", count: 1 },
    { name: 'CSS split across `+`-concatenated string literals is read as one rule', source: "s.textContent = '.a{' + 'margin-top:8px}';", count: 1, props: ['marginTop'] },
  ];
  for (const row of rows) {
    const hits = scanInjectedCss(row.source);
    if (row.count !== undefined) assert.equal(hits.length, row.count, `${row.name}: hit count`);
    if (row.props) assert.deepEqual(hits.map((h) => h.prop).sort(), row.props, `${row.name}: props`);
    if (row.reason) assert.match(hits[0]?.reason ?? '', row.reason, `${row.name}: reason`);
    if (row.line !== undefined) assert.equal(hits[0]?.line, row.line, `${row.name}: line`);
  }
});

test('scanAttributes governs an SVG presentation attribute and leaves a token, an expression and a hyphen-prefixed tail alone', () => {
  const rows: { name: string; source: string; props: string[] }[] = [
    { name: 'an SVG presentation attribute is a governed site', source: '<text fontSize="10" strokeWidth="2">x</text>', props: ['fontSize', 'strokeWidth'] },
    { name: 'an attribute reading a token is clean', source: '<line style={{ strokeWidth: \'var(--bw)\' }} />', props: [] },
    { name: 'a percentage and a viewBox attribute are clean', source: '<svg width="100%" viewBox="0 0 100 100" />', props: [] },
    { name: 'an attribute bound to an expression is out of scope', source: '<circle r={hover ? 5 : 4} cx={x} />', props: [] },
    { name: 'a hyphen-prefixed attribute whose tail matches a governed name is not misread as that name', source: '<div data-width="20" data-height="10" />', props: [] },
  ];
  for (const row of rows) assert.deepEqual(scanAttributes(row.source).map((h) => h.prop).sort(), row.props, row.name);
});

test('expressionLeaves resolves every leaf of a nested ternary, parenthesised or right-chained', () => {
  const rows: [string, string, string[]][] = [
    ['a parenthesised nested ternary resolves every leaf', 'a ? (b ? 12 : 14) : 16', ['12', '14', '16']],
    ['a right-chained nested ternary (no parens) resolves every leaf', "size === 'sm' ? 4 : size === 'lg' ? 10 : 6", ['4', '10', '6']],
  ];
  for (const [name, source, expected] of rows) assert.deepEqual(expressionLeaves(source), expected, name);
});

test('a default parameter whose name is itself a governed CSS property is a violation', () => {
  const src = "function ArenaDialog({ open, title, width = 480 }) {\n  return null;\n}";
  const found = scanDefaultsAndCallSites(src);
  assert.deepEqual(found.map((f) => ({ prop: f.prop, raw: f.raw })), [
    { prop: 'width', raw: '480' },
  ]);
});

const PROBE: Passthrough = new Map([['ArenaAppLogo', { prop: 'size', governs: 'width' }]]);

test('a default parameter on a named passthrough component resolves through the alias', () => {

  const src = "function ArenaAppLogo({ mark, size = 18, dim = 'soft' }) {\n  return null;\n}";
  const found = scanDefaultsAndCallSites(src, PROBE);
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
  const found = scanDefaultsAndCallSites('<ArenaAppLogo name="Draven" size={16} />', PROBE);
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

test('no exemption names a demo entry, since no hand-written one exists to carry a literal', () => {
  for (const key of EXEMPT.keys()) {
    assert.doesNotMatch(key, /\.card\.entry\.tsx:/,
      `${key} names a page entry this layer stopped hand-writing; a generated one binds every value through a knob`);
  }
});

test('the ARENA_SR_ONLY object shape produces exactly the raws those keys are cut from', () => {

  const hits = scanText(
    "export const ARENA_SR_ONLY = { position: 'absolute', width: '1px', height: '1px',"
    + " padding: '0', margin: '-1px', overflow: 'hidden', clipPath: 'inset(50%)',"
    + " whiteSpace: 'nowrap', border: '0' };",
  );
  assert.deepEqual(hits.map((h) => `${h.prop}:${h.raw}`), ["width:'1px'", "height:'1px'", "margin:'-1px'"]);
});

test('no zIndex literal is exempt, so a layer is always a slot answer and never a number in a template', () => {
  const stacking = [...EXEMPT.keys()].filter((key) => /zIndex/.test(key));
  assert.deepEqual(stacking, []);
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

test('stalePassthrough reports a PASSTHROUGH entry matching nothing in the tree, and neither a matched entry nor a component the map does not name', () => {
  const rows: [string, string[], string[]][] = [
    ['a PASSTHROUGH entry with a match is not stale', ['ArenaAppLogo'], []],
    ['a PASSTHROUGH entry matching nothing in the tree fails as stale', [], ['ArenaAppLogo']],
    ['a component the map does not name is not reported', ['ArenaAppLogo', 'ArenaButton', 'ArenaTag'], []],
  ];
  for (const [name, matched, expected] of rows) assert.deepEqual(stalePassthrough(new Set(matched), PROBE), expected, name);
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

test('an Angular style binding of a literal calc is a style write that fails', () => {
  const hits = scanStyleWrites(`<div [style.paddingInlineStart]="'calc(var(--sp-1) * 3)'"></div>`);
  assert.deepEqual(hits.map((h) => h.prop), ['paddingInlineStart']);
});

test('an Angular binding of a channel passes, as does a var() value', () => {
  assert.deepEqual(scanStyleWrites('<div [style.--arena-x]="n()"></div>'), []);
  assert.deepEqual(scanStyleWrites(`<div [style.maxWidth]="'var(--arena-board-column)'"></div>`), []);
  assert.deepEqual(scanStyleWrites(`<div [style.maxWidth]="'var(--a, var(--b))'"></div>`), []);
});

test('an Angular unit binding writes a computed number, so it fails', () => {
  assert.deepEqual(scanStyleWrites('<div [style.top.px]="y()"></div>').map((h) => h.prop), ['top']);
  assert.deepEqual(scanStyleWrites('<div [style.width.%]="p()"></div>').map((h) => h.prop), ['width']);
});

test('an Angular host style binding and a [style] object are read', () => {
  assert.deepEqual(scanStyleWrites("host: { '[style.width]': 'width()' }").map((h) => h.prop), ['width']);
  assert.deepEqual(scanStyleWrites('<div [style]="{ gap: 4 }"></div>').map((h) => h.prop), ['gap']);
});

test('a React style object with a literal calc fails, and a var() passes', () => {
  assert.deepEqual(scanStyleWrites("<div style={{ gap: 'calc(var(--sp-1) * 4)' }} />").map((h) => h.prop), ['gap']);
  assert.deepEqual(scanStyleWrites("<div style={{ gap: 'var(--chart-legend-gap)' }} />"), []);
});

test('a React interpolated width fails until COMPUTED lists it', () => {
  const hits = scanStyleWrites('<div style={{ width: `${pct}%` }} />');
  assert.deepEqual(hits.map((h) => h.prop), ['width']);
});

test('a style value bound to a constant that holds a channel passes', () => {
  assert.deepEqual(scanStyleWrites("const PAGE = 'var(--container-max)';\n<div style={{ maxWidth: PAGE }} />"), []);
});

test('a property outside PROPS is not a style write the gate judges', () => {
  assert.deepEqual(scanStyleWrites('<div style={{ opacity: hover }} />'), []);
});

test('an unused COMPUTED key is stale and a matched one is not', () => {
  const [first] = [...COMPUTED.keys()];
  assert.ok(first);
  assert.deepEqual(staleComputed(new Set(COMPUTED.keys())), []);
  assert.deepEqual(staleComputed(new Set()), [...COMPUTED.keys()]);
});

test('every COMPUTED reason cites a function as path:member(parameters)', () => {
  for (const [key, reason] of COMPUTED)
    assert.match(reason, /`frameworks\/[^`:]+:[\w.]+\([^`]*\)`|`frameworks\/[^`:]+:\w+`/, key);
});
