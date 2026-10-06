import test from 'node:test';
import assert from 'node:assert/strict';
import { win32 } from 'node:path';
import {
  applyRules, classesManifest, classNames, entryStylesheet, isThemeKey,
  slotClass, stripIndirection, stripProblems, themeKeyMap,
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
});

test('an enum value compiles to the slot class qualified by its attribute inside :where()', () => {
  const selectors = classNames(manifest);
  assert.ok(selectors.includes('arena-side-nav-item__root:where([data-arena-tone="danger"])'));
});

test('a boolean true is an attribute test and a boolean false is its absence, a default of true included', () => {
  const bar = {
    component: 'ArenaAppBar',
    slots: { root: 'flex' },
    variants: { sticky: { true: { root: 'sticky' }, false: { root: 'relative' } } },
    defaultVariants: { sticky: true },
  };
  const selectors = classNames(bar);
  assert.ok(selectors.includes('arena-app-bar__root:where([data-arena-sticky])'));
  assert.ok(selectors.includes('arena-app-bar__root:where(:not([data-arena-sticky]))'));
});

test('a compound compiles to one :where() holding every condition', () => {
  const hero = {
    component: 'ArenaHero',
    slots: { words: 'flex' },
    variants: { layout: { bleed: {}, inset: {} }, align: { start: {}, center: {} } },
    defaultVariants: { layout: 'inset', align: 'start' },
    compoundVariants: [{ layout: 'bleed', align: 'start', class: { words: 'px-0' } }],
  };
  assert.deepEqual(classNames(hero), [
    'arena-hero__words',
    'arena-hero__words:where([data-arena-layout="bleed"][data-arena-align="start"])',
  ]);
  const off = {
    ...hero,
    variants: { disabled: { true: {}, false: {} }, align: { start: {} } },
    compoundVariants: [{ disabled: false, align: 'start', class: { words: 'px-0' } }],
  };
  assert.ok(classNames(off).includes('arena-hero__words:where(:not([data-arena-disabled])[data-arena-align="start"])'));
});

test('an empty variant branch emits no rule, because a rule with no declaration is dead weight', () => {
  const selectors = classNames(manifest);
  assert.ok(selectors.includes('arena-side-nav-item__root:where([data-arena-disabled])'));
  assert.ok(!selectors.some((one) => one.includes(':where(:not([data-arena-disabled]))')));
});

test('bases come before variants, which is what makes source order decide between them', () => {
  const rules = applyRules(manifest).map((r) => r.selector);
  const lastBase = rules.findLastIndex((s) => !s.includes(':where'));
  const firstVariant = rules.findIndex((s) => s.includes(':where'));
  assert.ok(lastBase < firstVariant, `bases and variants interleave: ${rules.join(' ')}`);
});

test('the classes manifest keeps every slot and names no variant class', () => {
  const named = classesManifest({ ...manifest, slots: { ...manifest.slots, bare: '' } });
  assert.equal(named.slots.bare, 'arena-side-nav-item__bare');
  assert.equal('variants' in named, false);
  assert.equal('compoundVariants' in named, false);
  assert.deepEqual(named.values?.tone, ['neutral', 'danger']);
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

test('the strip resolves a theme key whose value is a calc over Arena tokens and refuses a calc the preset does not declare', () => {
  const map = themeKeyMap('@theme { --spacing-row-x: calc(var(--pad-row-x) * var(--dz-row-scale-x)); --spacing: var(--sp-1); }');
  const calc = 'calc(var(--pad-row-x) * var(--dz-row-scale-x))';
  assert.equal(map.get('spacing-row-x'), calc);
  assert.equal(
    stripIndirection(`padding-inline: var(--spacing-row-x, ${calc}); gap: var(--spacing, var(--sp-1));`, map),
    `padding-inline: ${calc}; gap: var(--sp-1);`,
  );
  assert.deepEqual(stripProblems(`padding-inline: var(--spacing-row-x, ${calc})`, map), []);
  assert.equal(stripProblems('padding-inline: var(--spacing-row-x, calc(var(--pad-row-y) * 2))', map).length, 1);
});
