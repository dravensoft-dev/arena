import test from 'node:test';
import assert from 'node:assert/strict';
import { win32 } from 'node:path';
import {
  applyRules, classesManifest, classNames, compoundClass, entryStylesheet, isThemeKey,
  slotClass, stripIndirection, stripProblems, themeKeyMap, variantClass,
} from './component-css.ts';

const manifest = {
  component: 'ArenaSideNavItem',
  slots: { root: 'flex gap-2', innerLabel: 'truncate' },
  variants: {
    tone: { neutral: { root: 'bg-base-300' }, danger: { root: 'bg-error/12' } },
    disabled: { true: { root: 'opacity-45' }, false: {} },
  },
  defaultVariants: { tone: 'neutral', disabled: false },
};

test('a class name is kebab-cased on both halves, so a camelCase slot cannot leak into CSS', () => {
  assert.equal(slotClass('ArenaSideNavItem', 'innerLabel'), 'arena-side-nav-item__inner-label');
  assert.equal(variantClass('ArenaSideNavItem', 'root', 'tone', 'neutral'), 'arena-side-nav-item__root--tone-neutral');
  assert.equal(compoundClass('ArenaPageHead', 'root', 0), 'arena-page-head__root--cv1');
});

test('an empty variant branch emits no rule, because a class with no declaration is dead weight', () => {
  const selectors = classNames(manifest);
  assert.ok(selectors.includes('arena-side-nav-item__root--disabled-true'));
  assert.ok(!selectors.includes('arena-side-nav-item__root--disabled-false'));
});

test('bases come before variants, which is what makes source order decide between them', () => {
  const rules = applyRules(manifest).map((r) => r.selector);
  const lastBase = rules.findLastIndex((s) => !s.includes('--'));
  const firstVariant = rules.findIndex((s) => s.includes('--'));
  assert.ok(lastBase < firstVariant, `bases and variants interleave: ${rules.join(' ')}`);
});

test('the classes manifest keeps every slot, so a slot whose base is empty still answers', () => {
  const named = classesManifest({ ...manifest, slots: { ...manifest.slots, bare: '' } });
  assert.equal(named.slots.bare, 'arena-side-nav-item__bare');
  assert.deepEqual(named.variants?.disabled?.false, {}, 'an empty branch stays a branch and names no class');
  assert.equal(named.variants?.tone?.danger?.root, 'arena-side-nav-item__root--tone-danger');
});

test('the entry wraps every rule in @layer utilities, which is where every Arena rule already lives', () => {
  const entry = entryStylesheet('/x/Theme.css', new Map([['a.json', manifest]]));
  assert.match(entry, /^@reference '\/x\/Theme\.css';/);
  assert.match(entry, /@layer utilities \{/);
  assert.match(entry, /\.arena-side-nav-item__root \{ @apply flex gap-2; \}/);
});

test('the reference is posix even from a Windows root, since a backslash in a CSS string is an escape', () => {
  const entry = entryStylesheet('D:\\a\\arena\\arena\\frameworks\\tailwind\\Theme.css', new Map([['a.json', manifest]]), win32);
  assert.match(entry, /^@reference 'D:\/a\/arena\/arena\/frameworks\/tailwind\/Theme\.css';/);
  assert.doesNotMatch(entry.split('\n')[0] ?? '', /\\/,
    'the runner root that found this is literally D:\\a, where \\a is the CSS escape for a line feed');
});

test('the theme map reads only single-var declarations, so a literal is never mistaken for an alias', () => {
  const map = themeKeyMap('@theme { --spacing: var(--sp-1); --radius-pill: var(--r-pill); --breakpoint-sm: 480px; --color-*: initial; }');
  assert.equal(map.get('spacing'), 'sp-1');
  assert.equal(map.get('radius-pill'), 'r-pill');
  assert.ok(!map.has('breakpoint-sm'), 'a literal is not an indirection and must not be stripped through');
  assert.ok(!map.has('color-*'), 'a namespace reset is not a key');
});

test('the strip collapses a theme indirection to the Arena token and leaves everything else alone', () => {
  assert.equal(stripIndirection('gap: calc(var(--spacing, var(--sp-1)) * 1.5)'), 'gap: calc(var(--sp-1) * 1.5)');
  assert.equal(stripIndirection('color: var(--color-error, var(--color-error))'), 'color: var(--color-error)');
  assert.equal(stripIndirection('box-shadow: var(--tw-ring-color, currentcolor)'), 'box-shadow: var(--tw-ring-color, currentcolor)',
    'a fallback that is not a var() is not an indirection');
});

test('a --tw-* pair is never stripped, or shadow-<color> would be nailed to one colour', () => {
  assert.ok(!isThemeKey('tw-shadow-color'));
  assert.ok(isThemeKey('spacing'));
  assert.equal(
    stripIndirection('--tw-shadow: var(--tw-shadow-color, var(--crimson))'),
    '--tw-shadow: var(--tw-shadow-color, var(--crimson))',
    'Tailwind sets --tw-shadow-color from a separate utility and reads it with the resolved colour '
    + 'as the fallback, so collapsing it would make the utility inert',
  );
  assert.deepEqual(stripProblems('var(--tw-shadow-color, var(--crimson))', new Map()), [],
    'and it is not reported as an unexplained pair either');
});

test('an indirection the preset does not explain is a problem rather than a silent pass-through', () => {
  const map = themeKeyMap('@theme { --spacing: var(--sp-1); }');
  assert.deepEqual(stripProblems('gap: var(--spacing, var(--sp-1))', map), []);
  const problems = stripProblems('gap: var(--spacing, var(--sp-9))', map);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /is not a pair Theme\.css declares/);
});
