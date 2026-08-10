import test from 'node:test';
import assert from 'node:assert/strict';
import { themeKeys, checkCompiled, transitionProblems } from './check-tailwind.ts';

const TOKENS = new Set(['color-primary', 'sp-1', 'sp-4', 'r-sm']);

const compiled = (root: string, utilities: string) =>
  `@layer theme {\n  :root, :host {\n${root}\n  }\n}\n@layer utilities {\n${utilities}\n}\n`;

test('reads the emitted theme keys and their values', () => {
  const css = compiled('    --color-primary: var(--color-primary);\n    --spacing: var(--sp-1);', '');
  assert.deepEqual(
    [...themeKeys(css).entries()],
    [['color-primary', 'var(--color-primary)'], ['spacing', 'var(--sp-1)']],
  );
});

test('passes a compiled layer whose classes all emitted and whose keys all resolve', () => {
  const css = compiled(
    '    --color-primary: var(--color-primary);\n    --spacing-4: var(--sp-4);',
    '  .bg-primary { background-color: var(--color-primary); }\n  .p-4 { padding: var(--spacing-4); }',
  );
  const manifests = new Map([['X.manifest.json', { slots: { root: 'bg-primary p-4' } }]]);
  assert.deepEqual(checkCompiled(css, manifests, TOKENS), []);
});

test('fails when zero manifests were found -- a gate that finds nothing must not report a clean pass', () => {
  const css = compiled('', '');
  const errs = checkCompiled(css, new Map(), TOKENS);
  assert.equal(errs.length, 1);
  assert.match(errs[0] ?? '', /0 manifest/i);
});

test('fails a manifest class that emitted no rule', () => {
  const css = compiled('    --color-primary: var(--color-primary);', '  .bg-primary { background-color: var(--color-primary); }');
  const manifests = new Map([['X.manifest.json', { slots: { root: 'bg-primary bg-nonsense' } }]]);
  const errs = checkCompiled(css, manifests, TOKENS);
  assert.equal(errs.length, 1);
  assert.match(errs[0] ?? '', /X\.manifest\.json.*bg-nonsense.*no rule/);
});

test('fails a theme key that does not resolve to an Arena token', () => {
  const css = compiled('    --color-primary: #b52a20;', '  .bg-primary { background-color: var(--color-primary); }');
  const manifests = new Map([['X.manifest.json', { slots: { root: 'bg-primary' } }]]);
  assert.match(checkCompiled(css, manifests, TOKENS).join('\n'), /--color-primary.*not a var\(\) into an Arena token/);
});

test('fails a theme key pointing at a token that does not exist', () => {
  const css = compiled('    --spacing-9: var(--sp-9);', '');
  assert.match(checkCompiled(css, new Map(), TOKENS).join('\n'), /--sp-9.*no such Arena token/);
});

test("fails when Tailwind's default --spacing is reachable", () => {
  const css = compiled('    --spacing: 0.25rem;', '  .p-7 { padding: calc(var(--spacing) * 7); }');
  assert.match(checkCompiled(css, new Map(), TOKENS).join('\n'), /0\.25rem/);
});

test('escaped selectors count as emitted', () => {
  const css = compiled(
    '    --color-primary: var(--color-primary);',
    '  @media (hover: hover) { .hover\\:bg-primary:hover { background-color: var(--color-primary); } }',
  );
  const manifests = new Map([['X.manifest.json', { slots: { root: 'hover:bg-primary' } }]]);
  assert.deepEqual(checkCompiled(css, manifests, TOKENS), []);
});

test('a transition naming transform while the slot paints translate is reported, because v4 emits the individual property', () => {
  const manifest = { component: 'Fixture', slots: { knob: 'transition-[transform] translate-x-full' } };
  const problems = transitionProblems(manifest);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /Fixture:knob/);
  assert.match(problems[0] ?? '', /translate/);
});

test('a transition naming the property the slot actually paints is not reported', () => {
  const manifest = { component: 'Fixture', slots: { knob: 'transition-[translate] translate-x-full' } };
  assert.deepEqual(transitionProblems(manifest), []);
});

test('a transitioned property painted only in a variant branch counts as painted', () => {
  const manifest = {
    component: 'Fixture',
    slots: { root: '[transition:scale_120ms_linear]' },
    variants: { pressed: { true: { root: 'scale-95' } } },
  };
  assert.deepEqual(transitionProblems(manifest), []);
});

test('a static centring transform needs no transition, so a slot that transitions nothing is not reported', () => {
  const manifest = { component: 'Fixture', slots: { caret: '-translate-y-1/2' } };
  assert.deepEqual(transitionProblems(manifest), []);
});
