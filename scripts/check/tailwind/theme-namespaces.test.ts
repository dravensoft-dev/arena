import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseDecls } from '../../lib/arena/css-decls.ts';
import { CSS_TARGETS } from '../../generate/arena/generate-tokens.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { join } from 'node:path';
import {
  attributedNames, deriveNamespaces, namespacedPropertyCandidates,
} from '../../lib/tailwind/theme-namespaces.ts';

const themeCssPath = new URL('../../../frameworks/tailwind/Theme.css', import.meta.url);
const [themeDecls] = [...parseDecls(readFileSync(themeCssPath, 'utf8')).values()];
const namespaces = deriveNamespaces(themeDecls);

const UNATTRIBUTED = new Map([
  ['default-font-family', 'wires a Tailwind default directly (Theme.css: "derives from --font-sans, which we cleared"); not an Arena scale with a sibling to self-dedupe against'],
  ['default-transition-duration', 'wires a Tailwind default directly; not an Arena scale with a sibling to self-dedupe against'],
  ['default-transition-timing-function', 'wires a Tailwind default directly; not an Arena scale with a sibling to self-dedupe against'],
]);

test('every namespaced-looking property in Theme.css is attributed to a namespace or listed in UNATTRIBUTED with a reason', () => {
  const candidates = namespacedPropertyCandidates(themeDecls);
  assert.ok(candidates.length > 0, 'Theme.css yielded no namespaced properties at all, so this suite proves nothing');
  const attributed = attributedNames(namespaces);

  const errs = [];
  for (const name of candidates) {
    const isAttributed = attributed.has(name);
    const isListed = UNATTRIBUTED.has(name);
    if (isAttributed && isListed) errs.push(`--${name} is both attributed to a namespace AND in UNATTRIBUTED, drop the entry`);
    else if (!isAttributed && !isListed) errs.push(`--${name} is not attributed to any namespace and not in UNATTRIBUTED with a reason, add one or the other`);
  }

  const candidateSet = new Set(candidates);
  for (const name of UNATTRIBUTED.keys())
    if (!candidateSet.has(name)) errs.push(`UNATTRIBUTED lists --${name} but no such property exists in Theme.css, drop the entry`);

  assert.deepEqual(errs, [], errs.join('\n'));
});

test('every UNATTRIBUTED entry carries a reason, because an entry with none cannot be judged stale', () => {
  for (const [name, reason] of UNATTRIBUTED) {
    assert.equal(typeof reason, 'string', `--${name} has no reason`);
    assert.ok(reason.length > 10, `--${name}'s reason says nothing: "${reason}"`);
  }
});

test('a fake key on a namespace Theme.css never resets is still found, which is spacing\'s own shape', () => {
  const fakeThemeCss = `
    @theme {
      --color-*: initial;
      --color-primary: red;
      --color-secondary: blue;
      --spacing: var(--sp-1);
      --spacing-1: var(--sp-1);
      --spacing-ctl-h: var(--dz-ctl-h);
      --spacing-fake-test-key: var(--sp-1);
    }
  `;
  const [fakeDecls] = [...parseDecls(fakeThemeCss).values()];
  const fakeNamespaces = deriveNamespaces(fakeDecls);
  assert.ok(fakeNamespaces.has('spacing'),
    'spacing has no --spacing-*: initial reset in this fixture either, matching Theme.css\'s real shape, so it must still be found');
  assert.ok(fakeNamespaces.get('spacing').includes('fake-test-key'),
    'a fake key on the open spacing namespace was not picked up');
});

test('a fake key in an unreset, non-native namespace is caught by the completeness check rather than being silently invisible', () => {
  const fakeThemeCss = `
    @theme {
      --color-*: initial;
      --color-primary: red;
      --widget-shape-round: 999px;
    }
  `;
  const [fakeDecls] = [...parseDecls(fakeThemeCss).values()];
  const fakeNamespaces = deriveNamespaces(fakeDecls);
  assert.ok(!fakeNamespaces.has('widget-shape'),
    'widget-shape is neither reset nor native, so deriveNamespaces should still miss it; that is the gap the completeness check exists to catch');

  const candidates = namespacedPropertyCandidates(fakeDecls);
  const attributed = attributedNames(fakeNamespaces);
  const unattributed = candidates.filter((name) => !attributed.has(name) && !UNATTRIBUTED.has(name));
  assert.deepEqual(unattributed, ['widget-shape-round'],
    'the completeness check must name widget-shape-round as unattributed and unlisted; if this is empty the fake key slipped through invisibly');
});

test('every token the tracking namespace reaches emits a length, because a bare number is not a letter-spacing', () => {
  const generated = CSS_TARGETS.map((target) => readFileSync(join(repoRoot, target), 'utf8'));
  const values = new Map<string, string>();
  for (const css of generated)
    for (const decls of parseDecls(css).values())
      for (const [name, value] of decls) values.set(name, value);

  const reached = [...themeDecls]
    .filter(([key]) => key.startsWith('tracking-'))
    .map(([, value]) => /^var\(\s*--([\w-]+)\s*\)$/.exec(value.trim())?.[1])
    .filter((name): name is string => Boolean(name));
  assert.ok(reached.length > 1, 'no tracking key resolved to a token, so this test proves nothing');

  for (const name of reached) {
    const value = values.get(name);
    assert.ok(value !== undefined, `--${name} is reached by the tracking namespace and declared nowhere`);
    assert.match(value, /em$/,
      `--${name} emits "${value}". ls is authored unitless so JS can read it, and a token reached by `
      + 'letter-spacing needs cssUnit em; without it the declaration is invalid and silently resolves '
      + 'to normal, which looks exactly like a design that chose no tracking');
  }
});
