import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { arenaTv, ARENA_SPACING_SUFFIXES, arenaSpacingConsumingGroups } from '../../../frameworks/tailwind/Tv.ts';
import { parseDecls } from '../../lib/arena/css-decls.ts';
import { deriveNamespaces } from '../../lib/tailwind/theme-namespaces.ts';

const merge = (classString: string) => arenaTv({ slots: { root: classString } })().root();
const classes = (s: string) => s.split(/\s+/);

test('every registered Arena font-size key survives alongside a text color', () => {
  for (const size of ['text-display', 'text-h1', 'text-h2', 'text-h3', 'text-h4',
    'text-ctl', 'text-ctl-md', 'text-ctl-sm', 'text-ctl-xs', 'text-ctl-2xs']) {
    for (const color of ['text-primary', 'text-error', 'text-base-content/70']) {
      const merged = classes(merge(`${size} ${color}`));
      assert.ok(merged.includes(size), `${size} + ${color} -> "${merged.join(' ')}" (size was eaten)`);
      assert.ok(merged.includes(color), `${size} + ${color} -> "${merged.join(' ')}" (color was eaten)`);
    }
  }
});

test('Tailwind default font-size names still survive alongside a text color (unregistered, and correct as-is)', () => {
  for (const size of ['text-sm', 'text-md', 'text-lg', 'text-xs']) {
    const merged = classes(merge(`${size} text-primary`));
    assert.ok(merged.includes(size));
    assert.ok(merged.includes('text-primary'));
  }
});

test('two Arena font-size classes still correctly conflict with each other (the registration did not turn off dedup)', () => {
  assert.equal(merge('text-h1 text-h2'), 'text-h2');
  assert.equal(merge('text-ctl text-ctl-md'), 'text-ctl-md');
  assert.equal(merge('text-ctl-md text-ctl'), 'text-ctl');
});

test('shadow-1..3 still dedupe against each other (pre-existing registration, regression guard)', () => {
  assert.equal(merge('shadow-1 shadow-2'), 'shadow-2');
});

test("ArenaButton.manifest.json through arenaTv(): text-ctl* and the variant's text color both survive", async () => {
  const { default: manifest } = await import('../../../frameworks/tailwind/components/forms/arena-button/ArenaButton.manifest.json', { with: { type: 'json' } });
  const arenaButtonStyles = (arenaTv as any)(manifest);
  const expectSize: Record<string, string> = { sm: 'text-ctl-md', md: 'text-ctl', lg: 'text-ctl' };
  const expectColor: Record<string, string> = { primary: 'text-primary-content', danger: 'text-error' };
  for (const variant of ['primary', 'danger']) {
    for (const size of ['sm', 'md', 'lg']) {
      const root = classes(arenaButtonStyles({ variant, size }).root());
      const height = expectSize[size] ?? '';
      const colour = expectColor[variant] ?? '';
      assert.ok(root.includes(height), `${variant}/${size}: ${height} missing from "${root.join(' ')}"`);
      assert.ok(root.includes(colour), `${variant}/${size}: ${colour} missing from "${root.join(' ')}"`);
    }
  }
});

test('rounded-pill dedupes against Tailwind\'s own radius scale, in both directions', () => {
  assert.equal(merge('rounded-pill rounded-lg'), 'rounded-lg');
  assert.equal(merge('rounded-lg rounded-pill'), 'rounded-pill');
});

test('rounded-pill still coexists with a color class (registering it did not reopen the cross-group failure)', () => {
  const root = classes(merge('rounded-pill bg-primary border-primary'));
  assert.ok(root.includes('rounded-pill'));
  assert.ok(root.includes('bg-primary'));
  assert.ok(root.includes('border-primary'));
});

test('every registered Arena z-index name dedupes against a sibling, in both directions', () => {
  const names = ['dropdown', 'tooltip', 'modal', 'modal-nested', 'palette', 'onboarding', 'toast'];
  for (let i = 0; i < names.length - 1; i++) {
    const a = `z-${names[i]}`, b = `z-${names[i + 1]}`;
    assert.equal(merge(`${a} ${b}`), b, `${a} ${b} should collapse to ${b}`);
    assert.equal(merge(`${b} ${a}`), a, `${b} ${a} should collapse to ${a}`);
  }
});

test("Tailwind's own numeric z-index scale still dedupes after extending the z group (regression guard)", () => {
  assert.equal(merge('z-10 z-20'), 'z-20');
  assert.equal(merge('z-20 z-10'), 'z-10');
});

test('an Arena z-index name and a numeric Tailwind z-index value now correctly conflict too (same group, same meaning)', () => {
  assert.equal(merge('z-dropdown z-10'), 'z-10');
  assert.equal(merge('z-10 z-dropdown'), 'z-dropdown');
});

test('every registered Arena tracking name dedupes against a sibling, in both directions', () => {
  const names = ['tight', 'normal', 'mono-nav', 'uppercase-status', 'badge', 'column-header', 'field-label', 'label', 'wide'];
  for (let i = 0; i < names.length - 1; i++) {
    const a = `tracking-${names[i]}`, b = `tracking-${names[i + 1]}`;
    assert.equal(merge(`${a} ${b}`), b, `${a} ${b} should collapse to ${b}`);
    assert.equal(merge(`${b} ${a}`), a, `${b} ${a} should collapse to ${a}`);
  }
});

const themeCssPath = new URL('../../../frameworks/tailwind/Theme.css', import.meta.url);
const [themeDecls] = [...parseDecls(readFileSync(themeCssPath, 'utf8')).values()];

const PREFIX: Record<string, string> = {
  font: 'font',
  text: 'text',
  'font-weight': 'font',
  leading: 'leading',
  tracking: 'tracking',
  size: 'size',
  radius: 'rounded',
  shadow: 'shadow',
  ease: 'ease',
  blur: 'blur',
  'z-index': 'z',
  container: 'max-w',
};

const SKIP = new Set(['color', 'spacing']);

const namespaces = deriveNamespaces(themeDecls);

test('every Arena namespace in Theme.css is either mapped to a prefix or explicitly skipped', () => {
  for (const ns of namespaces.keys()) {
    assert.ok(PREFIX[ns] || SKIP.has(ns),
      `Theme.css defines --${ns}-* but this test has no PREFIX entry and no SKIP reason for it — add one`);
  }
});

test('every Arena-defined namespace with 2+ keys dedupes its own keys pairwise, derived from Theme.css', () => {
  let exercised = 0;
  for (const [ns, keys] of namespaces) {
    if (SKIP.has(ns) || keys.length < 2) continue;
    const prefix = PREFIX[ns];
    exercised++;
    for (let i = 0; i < keys.length - 1; i++) {
      const a = `${prefix}-${keys[i]}`, b = `${prefix}-${keys[i + 1]}`;
      assert.equal(merge(`${a} ${b}`), b, `${a} ${b} should collapse to ${b} (namespace --${ns}-*)`);
      assert.equal(merge(`${b} ${a}`), a, `${b} ${a} should collapse to ${a} (namespace --${ns}-*)`);
    }
  }

  assert.ok(exercised >= 10, `expected to exercise most Theme.css namespaces, only exercised ${exercised}`);
});

test('the single-Arena-key namespaces are exactly the ones with hand-written stock-pairing cases below', () => {
  const singleKey = [...namespaces].filter(([ns, keys]) => !SKIP.has(ns) && keys.length === 1).map(([ns]) => ns).sort();
  assert.deepEqual(singleKey, ['blur']);
});

test('blur-scrim (the only Arena blur key) dedupes against a stock Tailwind blur size, in both directions', () => {
  assert.equal(merge('blur-scrim blur-sm'), 'blur-sm');
  assert.equal(merge('blur-sm blur-scrim'), 'blur-scrim');
});

test('max-w-page (Arena\'s --container-page) dedupes against a stock Tailwind max-w size, in both directions', () => {
  assert.equal(merge('max-w-page max-w-lg'), 'max-w-lg');
  assert.equal(merge('max-w-lg max-w-page'), 'max-w-page');
});

test('the enumerated dedupe test still coexists with a color class (no cross-group regression from the new registrations)', () => {
  const root = classes(merge('rounded-pill leading-body tracking-field-label bg-primary'));
  assert.ok(root.includes('rounded-pill'));
  assert.ok(root.includes('leading-body'));
  assert.ok(root.includes('tracking-field-label'));
  assert.ok(root.includes('bg-primary'));
});

test('tracking-field-label still coexists with a text color class (registration did not reopen the cross-group failure)', () => {
  const root = classes(merge('tracking-field-label text-primary'));
  assert.ok(root.includes('tracking-field-label'));
  assert.ok(root.includes('text-primary'));
});

test('Arena spacing suffixes dedupe against each other under every tailwind-merge group that reads the spacing scale', () => {
  const groups = arenaSpacingConsumingGroups();
  let exercised = 0;
  for (const [groupId, classParts] of Object.entries(groups)) {
    for (const classPart of classParts) {
      exercised++;
      const a = `${classPart}-${ARENA_SPACING_SUFFIXES[0]}`, b = `${classPart}-${ARENA_SPACING_SUFFIXES[1]}`;
      assert.equal(merge(`${a} ${b}`), b, `${a} ${b} should collapse to ${b} (group ${groupId})`);
      assert.equal(merge(`${b} ${a}`), a, `${b} ${a} should collapse to ${a} (group ${groupId})`);
    }
  }

  assert.ok(exercised >= 40, `expected arenaSpacingConsumingGroups() to find most of tailwind-merge's spacing-reading groups, only exercised ${exercised}`);
});

test('the exact cases the coordinator\'s review found broken now behave correctly, h-ctl-h/w-ctl-h stays two classes', () => {
  assert.equal(merge('h-ctl-h-sm h-ctl-h-lg'), 'h-ctl-h-lg');
  assert.equal(merge('py-row-py py-4'), 'py-4');
  assert.equal(merge('gap-stack gap-2'), 'gap-2');
  assert.equal(merge('p-4 p-6'), 'p-6');
  const root = classes(merge('h-ctl-h w-ctl-h'));
  assert.ok(root.includes('h-ctl-h'), `h-ctl-h w-ctl-h -> "${root.join(' ')}" (height was wrongly eaten)`);
  assert.ok(root.includes('w-ctl-h'), `h-ctl-h w-ctl-h -> "${root.join(' ')}" (width was wrongly eaten)`);
});

test('ArenaButton.manifest.json\'s three ctl-h heights now dedupe against each other through arenaTv()', async () => {
  const { default: manifest } = await import('../../../frameworks/tailwind/components/forms/arena-button/ArenaButton.manifest.json', { with: { type: 'json' } });
  const arenaButtonStyles = (arenaTv as any)(manifest);
  const heights: Record<string, string> = { sm: 'h-ctl-h-sm', md: 'h-ctl-h', lg: 'h-ctl-h-lg' };
  for (const size of ['sm', 'md', 'lg']) {
    const root = classes(arenaButtonStyles({ variant: 'primary', size }).root());
    const heightClasses = root.filter((c) => c.startsWith('h-ctl-h'));
    assert.deepEqual(heightClasses, [heights[size]], `size ${size}: expected exactly one height class, got "${heightClasses.join(', ')}"`);
  }
});

