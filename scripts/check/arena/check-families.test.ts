/* The family gate over a tree it is handed, so each mutation is one edit to a valid fixture:
 * an option writing a foreign channel, a channel nobody reads, an answers naming no family, a
 * manifest reading a channel it does not answer, a fallback that is not the family's default,
 * a transparent slot the manifest does not have, and an empty vocabulary. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { familyProblems, pageDriftProblems, strayClassProblems, utilityProblems, sweptProblems, collect } from './check-families.ts';
import type { Family } from '../../lib/tailwind/vocabulary.ts';

const FILL: Family = { family: 'fill', reach: 'box', description: 'Whether a component takes its container\'s width.',
  default: 'arena-fit', variants: { 'arena-fill': '[--arena-fill-width:100%]', 'arena-fit': '[--arena-fill-width:fit-content]' } };
const FILE = 'frameworks/tailwind/vocabulary/arena-fill/Fill.family.json';
const button = () => ({ component: 'ArenaButton', answers: ['fill'], slots: { root: 'inline-flex w-[var(--arena-fill-width,fit-content)]' } });
const STACK: Family = { family: 'stack', reach: 'box', target: 'markup', description: 'The air between peers.',
  variants: { 'arena-stack': '[display:flex] [gap:var(--rhythm-component)]' } };
const STACK_FILE = 'frameworks/tailwind/vocabulary/arena-stack/Stack.family.json';
const run = (families = new Map([['fill', FILL]]), manifests = new Map([['ArenaButton', button()]]) as Map<string, any>, files = [FILE]) =>
  familyProblems(families, files, manifests);

const runWith = (family: Family, manifest: Record<string, unknown>) =>
  familyProblems(new Map([[family.family, family]]), [`frameworks/tailwind/vocabulary/arena-${family.family}/${family.family[0]?.toUpperCase()}${family.family.slice(1)}.family.json`],
    new Map<string, any>([[manifest.component as string, manifest]]));
const keyedRun = (family: Family, manifests: Map<string, any>, source: (layer: string, component: string) => string) =>
  familyProblems(new Map([[family.family, family]]), ['frameworks/tailwind/vocabulary/arena-column/Column.family.json'], manifests, undefined, source);
const COLUMN = { family: 'column', reach: 'box', target: 'keyed', keyed: 'key', description: 'x', variants: {},
  properties: ['--arena-column-<key>-width', '--arena-column-<key>-align'], channels: ['--arena-column-width', '--arena-column-align'],
  binds: ['ArenaTable'] } as Family;

const both = (stack: Family = STACK, manifests = new Map([['ArenaButton', button()]]) as Map<string, any>) =>
  run(new Map([['fill', FILL], ['stack', stack]]), manifests, [FILE, STACK_FILE]);

test('a well-formed family read by the manifest that answers it is clean', () => {
  assert.deepEqual(run(), []);
});

test('an option writing a channel outside its family fails', () => {
  const foreign = { ...FILL, variants: { ...FILL.variants, 'arena-fill': '[--arena-size-ctl-h:1px]' } };
  assert.match(run(new Map([['fill', foreign]])).join('\n'), /arena-fill writes --arena-size-ctl-h, outside --arena-fill-\*/);
});

test('an option that is not an arbitrary property fails', () => {
  assert.match(run(new Map([['fill', { ...FILL, variants: { ...FILL.variants, 'arena-fill': 'w-full' } }]])).join('\n'), /not an arbitrary property/);
});

test('a channel no answering manifest reads fails', () => {
  const extra = { ...FILL, variants: { ...FILL.variants, 'arena-fill': '[--arena-fill-width:100%] [--arena-fill-gap:0]' } };
  assert.match(run(new Map([['fill', extra]])).join('\n'), /--arena-fill-gap is written and no manifest answering fill reads it/);
});

test('answers naming no family, and a read without answers, both fail', () => {
  assert.match(run(undefined, new Map([['ArenaButton', { ...button(), answers: ['size'] }]])).join('\n'), /answers size, which no family declares/);
  assert.match(run(undefined, new Map([['ArenaButton', { ...button(), answers: [] }]])).join('\n'), /reads --arena-fill-width and does not answer fill/);
});

test('a fallback that is not the default option\'s value fails, since the class-free look would differ from the default', () => {
  const wrong = { ...button(), slots: { root: 'w-[var(--arena-fill-width,100%)]' } };
  assert.match(run(undefined, new Map([['ArenaButton', wrong]])).join('\n'), /falls back to 100% and the default arena-fit writes fit-content/);
});

test('a default outside the options, an unknown reach, a missing description, a misplaced file and a non-arena option fail', () => {
  const bad = { ...FILL, default: 'arena-nope', reach: 'wide' as never, description: '', variants: { ...FILL.variants, fill: '[--arena-fill-width:1px]' } };
  const text = run(new Map([['fill', bad]]), undefined, ['frameworks/tailwind/vocabulary/fill/Fill.family.json']).join('\n');
  for (const want of [/default arena-nope is none of its options/, /reach "wide"/, /no description/, /arena-fill\/Fill\.family\.json/, /option "fill" does not start with arena-/])
    assert.match(text, want);
});

test('an axis that is not the family\'s own property, or on a context family, fails', () => {
  assert.match(run(new Map([['fill', { ...FILL, axis: '--arena-grid-min' }]])).join('\n'), /axis --arena-grid-min is not --arena-fill/);
});

test('an axis is --arena-<family> or --arena-<family>-<suffix>, on a box family, and no option writes it', () => {
  const readsBoth = { component: 'ArenaButton', answers: ['fill'],
    slots: { root: 'w-[var(--arena-fill-width,var(--arena-fill,fit-content))] h-[var(--arena-fill-height,auto)]' } };
  assert.deepEqual(runWith({ ...FILL, axis: ['--arena-fill', '--arena-fill-height'] }, readsBoth), []);
  assert.match(run(new Map([['fill', { ...FILL, axis: ['--arena-other'] }]])).join('\n'), /axis --arena-other is not --arena-fill/);
  assert.match(run(new Map([['fill', { ...FILL, axis: '--arena-fill-width' }]])).join('\n'),
    /option arena-fill writes --arena-fill-width, which is an axis/);
});

test('a channel read may fall back through its family axis, and an axis nobody reads fails', () => {
  const axisFill = { ...FILL, axis: '--arena-fill' };
  const reads = (classes: string) => ({ component: 'ArenaButton', answers: ['fill'], slots: { root: classes } });
  assert.deepEqual(runWith(axisFill, reads('w-[var(--arena-fill-width,var(--arena-fill,fit-content))]')), []);
  assert.match(runWith(axisFill, reads('w-[var(--arena-fill-width,fit-content)]')).join('\n'),
    /axis --arena-fill is read by no answering manifest/);
});

test('a keyed family declares its properties and the components binding it, and nothing else', () => {
  const table = { component: 'ArenaTable', answers: ['column'], slots: { th: 'w-[var(--arena-column-width,auto)] [text-align:var(--arena-column-align,left)]' } };
  const binding = () => 'style={{ \'--arena-column-width\': `var(--arena-column-${key}-width)` }}';
  const keyed = (family: Family, source = binding) => keyedRun(family, new Map([['ArenaTable', table]]), source);
  assert.deepEqual(keyed(COLUMN), []);
  assert.match(keyed({ ...COLUMN, default: 'arena-column-x' }).join('\n'), /keyed family declares a default/);
  assert.match(keyed({ ...COLUMN, properties: ['--arena-column-width'] }).join('\n'),
    /--arena-column-width is not --arena-column-<key>-<what>/);
  assert.match(keyed(COLUMN, () => '').join('\n'),
    /binds ArenaTable, and neither layer's source under its directories writes --arena-column-\$\{/);
  const text = (family: Family, manifests = new Map<string, any>([['ArenaTable', table]]), source = binding) => keyedRun(family, manifests, source).join('\n');
  assert.match(text({ ...COLUMN, reach: 'context' }), /a keyed family is a box family/);
  assert.match(text({ ...COLUMN, variants: { 'arena-column-x': '[--arena-column-width:1px]' } }), /variants must be \{\}/);
  assert.match(text({ ...COLUMN, axis: '--arena-column' }), /a keyed family declares an axis/);
  assert.match(text({ ...COLUMN, keyed: undefined }), /names the field its key is read from/);
  assert.match(text(COLUMN, new Map<string, any>([['ArenaTable', { ...table, slots: { th: 'w-[var(--arena-column-width,auto)]' } }]])),
    /--arena-column-align is declared by the keyed family column and no manifest answering it reads it/);
  assert.match(text({ ...COLUMN, binds: ['ArenaGhost'] }), /binds ArenaGhost, which is no contracted component/);
  const reactOnly = (layer: string) => (layer === 'react' ? binding() : '');
  assert.match(keyedRun(COLUMN, new Map([['ArenaTable', table]]), reactOnly).join('\n'), /the angular source under its directories does not write --arena-column-\$\{/);
});

test('a transparent slot the manifest does not have, or one without a reason, fails', () => {
  const tooltip = { component: 'ArenaTooltip', transparent: { trigger: 'x', root: '' }, slots: { root: 'inline-flex' } };
  const text = run(undefined, new Map<string, any>([['ArenaButton', button()], ['ArenaTooltip', tooltip]])).join('\n');
  assert.match(text, /ArenaTooltip declares trigger transparent and has no such slot/);
  assert.match(text, /ArenaTooltip declares root transparent with no reason/);
});

test('an empty vocabulary is a failure, not a clean pass', () => {
  assert.match(run(new Map(), new Map(), []).join('\n'), /found 0 families/);
});

test('a well-formed markup family beside a component family is clean', () => {
  assert.deepEqual(both(), []);
});

test('a markup family with a default, an axis, or a custom property it does not restate fails', () => {
  assert.match(both({ ...STACK, default: 'arena-stack' }).join('\n'), /stack: is a markup family and declares a default/);
  assert.match(both({ ...STACK, axis: '--arena-stack' }).join('\n'), /stack: is a markup family and declares an axis/);
  assert.match(both({ ...STACK, variants: { 'arena-stack': '[--arena-stack-gap:1px]' } }).join('\n'),
    /arena-stack writes --arena-stack-gap, and a markup family writes declarations/);
});

test('a manifest answering a markup family fails, and a component family nobody answers fails', () => {
  assert.match(both(undefined, new Map([['ArenaButton', { ...button(), answers: ['fill', 'stack'] }]])).join('\n'),
    /stack: is a markup family and ArenaButton answer/);
  assert.match(both(undefined, new Map()).join('\n'), /fill: no manifest answers it/);
});

test('an unknown target, or a restating family whose file lacks the group, fails', () => {
  assert.match(both({ ...STACK, target: 'page' as any }).join('\n'), /target "page" is neither component nor markup/);
  assert.match(both({ ...STACK, restates: 'zz', variants: { 'arena-stack': 'contracts/design/spacing.json' } }).join('\n'),
    /stack: vocabulary: contracts\/design\/spacing\.json has no zz group to restate/);
});

test('the vocabulary page is held to a fresh emit, and a missing one fails', () => {
  assert.deepEqual(pageDriftProblems('same', 'same'), []);
  assert.match(pageDriftProblems('old', 'new').join('\n'), /frameworks\/VOCABULARY\.md: stale, run bun run generate:vocabulary/);
  assert.match(pageDriftProblems(null, 'new').join('\n'), /frameworks\/VOCABULARY\.md: missing/);
});

test('a class in a compiled sheet that no family and no manifest emits fails, and an exempt one does not', () => {
  const classes = new Map([['arena-fill', 'v/Fill.css'], ['arena-toast__root', 'c/toast.css'], ['arena-light', 't/colors.css'], ['arena-stray', 't/x.css']]);
  const problems = strayClassProblems(classes, new Map([['fill', FILL]]), new Set(['arena-toast__root']), new Map([['arena-light', 'why']]));
  assert.deepEqual(problems.length, 1);
  assert.match(problems[0] ?? '', /t\/x\.css emits \.arena-stray, which no family and no manifest emits/);
});

const SIZE: Family = { family: 'size', reach: 'context', description: 'How big.', default: 'arena-size-md',
  variants: { 'arena-size-sm': '[--arena-size-h:1px]', 'arena-size-md': '[--arena-size-h:2px]', 'arena-size-xl': '[--arena-size-h:9px]' } };
const SIZE_FILE = 'frameworks/tailwind/vocabulary/arena-size/Size.family.json';
const sized = (over: Record<string, unknown> = {}, slots: Record<string, string> = { root: 'h-[var(--arena-size-h,2px)]' }) => ({
  component: 'ArenaButton', answers: [{ family: 'size', options: ['arena-size-sm', 'arena-size-md'], default: 'arena-size-md' }], slots, ...over });
const logo = () => ({ component: 'ArenaAppLogo', answers: ['size'], slots: { root: 'h-[var(--arena-size-h,2px)]' } });
const withSize = (button: Record<string, unknown>, size: Family = SIZE, more: Record<string, any>[] = [logo()]) =>
  run(new Map([['size', size]]), new Map<string, any>([['ArenaButton', button], ...more.map((one) => [one.component, one] as const)]), [SIZE_FILE]).join('\n');

test('a valid object answer over a context family is clean', () => {
  assert.equal(withSize(sized()), '');
});

test('an answers object naming a foreign option, no option, or a default outside its options fails', () => {
  const answer = (options: string[], def: string) => sized({ answers: [{ family: 'size', options, default: def }] });
  assert.match(withSize(answer(['arena-size-sm', 'arena-fill'], 'arena-size-sm')), /answers size with arena-fill, which is not an option of size/);
  assert.match(withSize(answer([], 'arena-size-md')), /answers size with no options/);
  assert.match(withSize(answer(['arena-size-sm'], 'arena-size-md')), /default arena-size-md that is none of its options/);
});

test('a fallback differing from the component default fails, including a color-mix fallback and an inner read', () => {
  const sm = { answers: [{ family: 'size', options: ['arena-size-sm', 'arena-size-md'], default: 'arena-size-sm' }] };
  assert.match(withSize(sized(sm)), /falls back to 2px and the default arena-size-sm writes 1px/);
  assert.equal(withSize(sized(sm, { root: 'h-[var(--arena-size-h,1px)]' })), '');
  const tint: Family = { ...SIZE, variants: { ...SIZE.variants, 'arena-size-md': '[--arena-size-h:color-mix(in_oklab,var(--c)_20%,transparent)]' } };
  const mix = (percent: number) => ({ root: `x-[var(--arena-size-h,color-mix(in_oklab,var(--c)_${percent}%,transparent))]` });
  assert.equal(withSize(sized(undefined, mix(20)), tint, [{ ...logo(), slots: mix(20) }]), '');
  assert.match(withSize(sized(undefined, mix(30)), tint, [{ ...logo(), slots: mix(20) }]), /ArenaButton\.root: --arena-size-h falls back to color-mix\(in oklab,var\(--c\) 30%,transparent\) and the default arena-size-md writes color-mix\(in oklab,var\(--c\) 20%,transparent\)/);
  const inner = { root: 'w-[var(--arena-orient-w,var(--arena-size-h,3px))]' };
  assert.match(withSize(sized(undefined, inner)), /--arena-size-h falls back to 3px and the default arena-size-md writes 2px/);
});

test('a bound key that no family writes, that its family does not answer, or without a reason fails', () => {
  assert.match(withSize(sized({ bound: { '--arena-ghost-h': 'x' } })), /binds --arena-ghost-h, which no family writes/);
  assert.match(withSize(sized({ bound: { '--arena-fill-width': 'x' } })), /binds --arena-fill-width, which no family writes/);
  assert.match(both(undefined, new Map<string, any>([['ArenaButton', { ...button(), bound: { '--arena-fill-width': ' ' } }]])).join('\n'), /binds --arena-fill-width with no reason/);
  const extra = { ...SIZE, variants: { ...SIZE.variants, 'arena-size-md': '[--arena-size-h:2px] [--arena-size-w:3px]' } };
  assert.match(withSize(sized(), extra), /--arena-size-w is written and no manifest answering size reads it/);
  assert.doesNotMatch(withSize(sized({ bound: { '--arena-size-w': 'set inline by the host' } }), extra), /--arena-size-w is written/);
  const other = run(new Map([['fill', FILL], ['size', SIZE]]), new Map<string, any>([['ArenaButton', { ...button(), bound: { '--arena-size-h': 'x' } }], ['ArenaAppLogo', logo()]]), [FILE, SIZE_FILE]).join('\n');
  assert.match(other, /ArenaButton: binds --arena-size-h and does not answer size/);
});

test('an option no manifest answers fails with the reason', () => {
  assert.equal(withSize(sized()), '');
  assert.match(withSize(sized(), SIZE, []), /arena-size-xl is answered by no manifest, and an option nobody answers is a question nobody asked/);
});

test('a family value or a read fallback naming a Tailwind theme key fails, and a palette key does not', () => {
  assert.match(withSize(sized(undefined, { root: 'p-[var(--arena-size-h,var(--spacing-section))]' })), /falls back to --spacing-section, a Tailwind theme key/);
  const spaced = { ...SIZE, variants: { ...SIZE.variants, 'arena-size-md': '[--arena-size-h:calc(var(--spacing)*120)]' } };
  assert.match(withSize(sized(), spaced), /arena-size-md names --spacing, a Tailwind theme key/);
  const radius = { ...SIZE, variants: { ...SIZE.variants, 'arena-size-md': '[--arena-size-h:var(--radius-lg)]' } };
  assert.match(withSize(sized(), radius), /names --radius-lg/);
  const palette = { ...SIZE, variants: { ...SIZE.variants, 'arena-size-md': '[--arena-size-h:var(--color-base-100)]' } };
  assert.doesNotMatch(withSize(sized(), palette), /names --color-base-100/);
  const stray = { ...SIZE, variants: { ...SIZE.variants, 'arena-size-md': '[--arena-size-h:var(--color-nope)]' } };
  assert.match(withSize(sized(), stray), /names --color-nope/);
});

test('a floating key that names no slot, or carries no reason, fails', () => {
  assert.match(withSize(sized({ floating: { panel: 'a panel floats over the page' } })), /ArenaButton declares panel floating and has no such slot/);
  assert.match(withSize(sized({ floating: { root: ' ' } })), /ArenaButton declares root floating with no reason/);
  assert.equal(withSize(sized({ floating: { root: 'it floats' } })), '');
});

test('an @utility arena- name the theme sheet ships fails unless it is an option, a manifest class or exempt', () => {
  const found = new Map([['arena-x', 'a probe theme sheet'], ['arena-fill', 'a probe theme sheet'], ['arena-light', 'a probe theme sheet']]);
  const problems = utilityProblems(found, new Map([['fill', FILL]]), new Set(), new Map([['arena-light', 'why']]));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /a probe theme sheet defines @utility arena-x, which is no family option/);
});

test('the sweep reads the utilities a theme sheet ships, so an unnamed one fails through the gate', () => {
  const root = mkdtempSync(join(tmpdir(), 'arena-sweep-'));
  mkdirSync(join(root, 'frameworks/tailwind/consume'), { recursive: true });
  writeFileSync(join(root, 'frameworks/tailwind/consume/A.css'), '.arena-fill { color: red; }\n');
  writeFileSync(join(root, 'frameworks/tailwind/Utilities.generated.css'), '@utility arena-x {\n  color: red;\n}\n@utility arena-spinner {\n  color: red;\n}\n');
  const problems = sweptProblems(new Map([['fill', FILL]]), new Map(), root).join('\n');
  assert.match(problems, /defines @utility arena-x, which is no family option/);
  assert.doesNotMatch(problems, /@utility arena-spinner/);
});

test('the built tree is clean', () => {
  assert.deepEqual(collect().problems, []);
});
