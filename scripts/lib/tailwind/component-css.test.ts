import test from 'node:test';
import assert from 'node:assert/strict';
import { join, win32 } from 'node:path';
import {
  applyRules, arenaClassesFor, arenaSlotDataFor, classBase, classesFor, classesManifest, classNames, entryStylesheet, isThemeKey,
  slotClass, slotPart, stripIndirection, stripProblems, themeKeyMap, themeMapFor,
} from './component-css.ts';
import { compileEntry, layerInputs, layerManifests } from './tailwind-compile.ts';
import { repoRoot } from '../arena/repo-root.ts';
import { readJson } from '../../utils/read-file.ts';
import { kebab } from '../../utils/case.ts';

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

test('a channel read with a role fallback compiles whole, and the strip and its check leave it alone', () => {
  const probe = new Map([['p.json', { component: 'ArenaProbe', slots: { root: 'h-[var(--arena-probe-h,var(--probe-role))]' } }]]);
  const preset = `${repoRoot}/frameworks/tailwind/Theme.css`;
  const raw = compileEntry(entryStylesheet(preset, probe), repoRoot, layerInputs(repoRoot));
  const theme = themeMapFor(repoRoot);
  assert.deepEqual(stripProblems(raw, theme), []);
  assert.match(stripIndirection(raw, theme), /height: var\(--arena-probe-h,var\(--probe-role\)\);/);
  assert.ok(!isThemeKey('arena-size-h'));
  assert.ok(!isThemeKey('probe-x', new Map([['spacing', 'sp-1']])), 'a key Theme.css does not declare is left alone');
  assert.equal(stripIndirection('gap: var(--spacing, var(--sp-1)); h: var(--arena-a-h, var(--r-1))', new Map([['spacing', 'sp-1']])),
    'gap: var(--sp-1); h: var(--arena-a-h, var(--r-1))');
});

test('the theme map of the preset holds every key, the inline block included', () => {
  const map = themeMapFor(repoRoot);
  assert.equal(map.size, 236);
  assert.equal(map.get('color-surface'), 'fill-surface');
  assert.equal(map.get('color-base-100'), 'color-base-100');
  assert.equal(map.get('spacing-ctl-h'), 'dz-ctl-h');
});

const tag = readJson(join(repoRoot, 'frameworks/tailwind/components/display/arena-tag/ArenaTag.manifest.json'));

test('the default variants apply when nothing is chosen', () => {
  const { root = '', dot = '' } = classesFor(tag);
  assert.ok(root.includes('rounded-marker'), 'the base slot is present');
  assert.ok(root.includes('border-[color:var(--arena-accent-marks-outline-edge)]'), 'tone=neutral is the default, and it adds no class of its own');
  assert.equal(dot, 'size-1.5 rounded-pill bg-current');
});

test('a chosen variant replaces the default', () => {
  const { root = '' } = classesFor(tag, { tone: 'danger' });
  assert.ok(root.includes('border-[color:var(--marks-danger-outline-edge-rest,var(--hue-danger-edge))]'), 'the chosen tone applies');
  assert.ok(!(classesFor(tag).root ?? '').includes('--marks-danger-outline-edge-rest'), 'the default tone does not');
});

test('the base slot always precedes the variant slot', () => {
  const { root = '' } = classesFor(tag, { tone: 'danger' });
  assert.ok(root.indexOf('inline-flex') < root.indexOf('border-[color:var(--marks-danger-outline-edge-rest,var(--hue-danger-edge))]'));
});

test('an unknown variant value is a loud failure, not a silent base-only render', () => {
  assert.throws(() => classesFor(tag, { tone: 'chartreuse' }), /tone="chartreuse"/);
});

test('a slot with no variant contribution is still returned', () => {
  assert.ok('dot' in classesFor(tag, { tone: 'danger' }));
});

test('a compoundVariant applies only when every variant it names matches', () => {
  const withCompound = { ...tag, compoundVariants: [{ tone: 'danger', class: { root: 'ring-2' } }] };
  assert.ok((classesFor(withCompound, { tone: 'danger' }).root ?? '').includes('ring-2'), 'applies when the condition matches');
  assert.ok(!(classesFor(withCompound, { tone: 'warning' }).root ?? '').includes('ring-2'), 'does not apply when it does not');
});

test('a compoundVariant matches the defaulted variant value, not only a chosen one', () => {

  const withCompound = { ...tag, compoundVariants: [{ tone: 'neutral', class: { root: 'ring-2' } }] };
  assert.ok((classesFor(withCompound).root ?? '').includes('ring-2'), 'the default value satisfies the condition');
});

test('a compoundVariant is appended after the single-variant slots', () => {
  const withCompound = { ...tag, compoundVariants: [{ tone: 'danger', class: { root: 'ring-2' } }] };
  const { root = '' } = classesFor(withCompound, { tone: 'danger' });
  const DANGER = 'border-[color:var(--marks-danger-outline-edge-rest,var(--hue-danger-edge))]';
  const at = root.indexOf(DANGER);
  assert.ok(at >= 0, 'the danger edge is present');
  assert.ok(at < root.indexOf('ring-2'), 'the compound class follows the variant class');
});

test('the harness spells a class the way the generator does, for every manifest that ships', () => {
  const manifests = [...layerManifests(repoRoot).values()];
  assert.ok(manifests.length > 0, 'no manifest was read, so this asserts nothing');
  for (const manifest of manifests) {
    const base = classBase(manifest.component);
    assert.equal(base, kebab(manifest.component), `${manifest.component}: the harness and layers.ts disagree on kebab`);
    assert.ok(base.startsWith('arena-'), `${manifest.component}: a class base no longer carries the arena prefix the DOM depends on`);
    for (const [slot, classes] of Object.entries(arenaClassesFor(manifest))) {
      for (const one of classes.split(/\s+/).filter(Boolean)) {
        assert.ok(one.startsWith(`${base}__`),
          `${manifest.component}: the specimen would render "${one}" on slot "${slot}", which no sheet `
          + `defines, because the generator writes "${slotClass(manifest.component, slot)}"`);
      }
    }
  }
});

test('the root slot is the bare component and every other is qualified', () => {
  assert.equal(slotPart('ArenaCard', 'root'), 'card');
  assert.equal(slotPart('ArenaCard', 'body'), 'card.body');
  assert.equal(slotPart('ArenaSideNavItem', 'triggerLabel'), 'side-nav-item.trigger-label');
});

test('classesManifest carries a part for every slot', () => {
  const out = classesManifest({ component: 'ArenaCard', slots: { root: 'a', body: 'b' } });
  assert.deepEqual(out.parts, { root: 'card', body: 'card.body' });
});

test('every manifest that ships names a part for every slot it names', () => {
  const manifests = [...layerManifests(repoRoot).values()];
  assert.ok(manifests.length > 0, 'no manifest was read, so this asserts nothing');
  for (const manifest of manifests) {
    const built = classesManifest(manifest);
    assert.deepEqual(Object.keys(built.parts ?? {}), Object.keys(built.slots),
      `${manifest.component}: a slot with no part is a slot a style plugin cannot reach`);
  }
});

test('a slot named in a card carries the part its family reaches, beside its group attributes', () => {
  const data = arenaSlotDataFor({ component: 'ArenaCard', slots: { root: 'a', body: 'b' } } as never);
  assert.equal(data.root?.['data-arena-part'], 'card');
  assert.equal(data.body?.['data-arena-part'], 'card.body');
  const shipped = arenaSlotDataFor(tag, { tone: 'danger' });
  assert.equal(shipped.root?.['data-arena-part'], 'tag');
  assert.equal(shipped.root?.['data-arena-tone'], 'danger');
  assert.equal(shipped.dot?.['data-arena-part'], 'tag.dot');
});

test('classesManifest carries values and attributes for every manifest and never copies internal or hues', () => {
  const all = [...layerManifests().values()];
  assert.ok(all.length > 0, 'no manifest was read, so this asserts nothing');
  for (const manifest of all) {
    const out = classesManifest(manifest) as unknown as Record<string, unknown>;
    const groups = Object.keys(manifest.variants ?? {}).sort();
    assert.deepEqual(Object.keys(out.values as object).sort(), groups, `${manifest.component}: values`);
    assert.deepEqual(Object.keys(out.attributes as object).sort(), groups, `${manifest.component}: attributes`);
    assert.equal('internal' in out, false, `${manifest.component}: internal copied`);
    assert.equal('hues' in out, false, `${manifest.component}: hues copied`);
  }
});
