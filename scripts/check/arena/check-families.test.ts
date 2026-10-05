/* The family gate over a tree it is handed, so each mutation is one edit to a valid fixture:
 * an option writing a foreign channel, a channel nobody reads, an answers naming no family, a
 * manifest reading a channel it does not answer, a fallback that is not the family's default,
 * a transparent slot the manifest does not have, and an empty vocabulary. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { familyProblems, pageDriftProblems, collect } from './check-families.ts';
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

test('the built tree is clean', () => {
  assert.deepEqual(collect().problems, []);
});
