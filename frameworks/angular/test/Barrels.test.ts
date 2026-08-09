/* `tsconfig.check.json` declares `files: ["./index.ts"]`, so `check:angular` typechecks the
 * transitive closure of the barrels and nothing else -- a primitive missing from one is not
 * compiled under strictTemplates, and an adopter importing from the layer root cannot reach
 * it. Five display primitives were missing for exactly that long, and the gap also hid a real
 * name collision between two `GridCursor` shapes. PRIVATE and ROOT_PRIVATE are the record of
 * what a barrel deliberately does NOT export, and both carry the bidirectional staleness rule:
 * a named module that has since become exported fails here. A demo entry is out of scope on the
 * same footing as a suite: it is a page's own bootstrap, it is generated, and it ships nowhere.
 * A `.classes.generated.ts` does ship, but a `.variants.ts` imports it, so the barrel already
 * typechecks it, and exporting it would read as a promise that a class name is API. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ANGULAR_COMPONENTS } from './Compliance';

const LAYER = join(ANGULAR_COMPONENTS, '..');

const PRIVATE = new Map([
  ['display/arena-calendar/CalendarInternals.ts',
   'date and geometry arithmetic the family consumes and no consumer calls: `arena-calendar` '
   + 'reads event times through it and `arena-calendar-event` reads its two fit thresholds. A '
   + 'consumer drives the view through `anchorDate` and `view`, never by computing a week '
   + 'boundary. It is typechecked through the components that import it.'],
  ['navigation/arena-pagination/PaginationWindow.ts',
   'the same shape one category over, and the standing precedent for it: `arenaPageWindow` decides '
   + 'which page numbers elide, which is `arena-pagination`\'s own arithmetic and not a member '
   + 'of its API.'],
]);

const ROOT_PRIVATE = new Map([
  ['Tokens.generated.ts',
   'generated bare numbers a component reads to compute a position. `Api.generated.ts` is '
   + 'exported because a consumer needs those types to type their own data; nobody types data '
   + 'with `calendarHourH`. Exporting it would also publish the one thing the token layer warns '
   + 'about -- a value bound at import time, which cannot re-theme and cannot re-densify.'],
  ['ProjectedInputs.ts',
   'the wiring between a component and its own projected child, and a rule about the order '
   + 'Angular refreshes embedded views in. An adopter renders `arena-calendar` and puts events '
   + 'inside it; they never stand between the two. Exporting it would publish an answer to a '
   + 'question only a component in this layer is in a position to ask, and it is typechecked '
   + 'through the projected child that imports it.'],
  ['ArenaStyles.generated.ts',
   'the factory that composes a component\'s own class names, emitted per layer so nothing '
   + 'imports across one. It replaced the two runtime dependencies, and a consumer has no more '
   + 'reason to call it than they had to call `arenaTv`: they render a component, not a recipe.'],
]);

const EXPORT = /from '\.\/([A-Za-z0-9.-]+)'/g;

function exportsOf(indexPath: string): Set<string> {
  const source = readFileSync(indexPath, 'utf8');
  return new Set([...source.matchAll(EXPORT)].map((m) => m[1]));
}

const dirsIn = (path: string): string[] => readdirSync(path, { withFileTypes: true })
  .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();

function ownModulesOf(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => entry.name)
    .filter((name) => name !== 'index.ts' && !name.includes('.test.')
      && !name.endsWith('.card.entry.ts') && !name.endsWith('.demo.entry.generated.ts')
      && !name.endsWith('.classes.generated.ts'))
    .sort();
}

test('the layer barrel reaches every category, and every category barrel reaches every component', () => {
  assert.ok(exportsOf(join(LAYER, 'index.ts')).has('components'),
    'the layer barrel must export ./components, or no primitive is typechecked at all');

  const categories = dirsIn(ANGULAR_COMPONENTS);
  assert.ok(categories.length > 0, 'no categories found -- the guard would silently check nothing');
  assert.deepEqual([...exportsOf(join(ANGULAR_COMPONENTS, 'index.ts'))].sort(), categories,
    'components/index.ts must export exactly the category directories');

  let components = 0;
  for (const category of categories) {
    const dir = join(ANGULAR_COMPONENTS, category);
    const expected = dirsIn(dir);
    components += expected.length;
    assert.deepEqual([...exportsOf(join(dir, 'index.ts'))].sort(), expected,
      `components/${category}/index.ts must export exactly its component directories -- a primitive `
      + 'missing from it is not typechecked and an adopter cannot import it from the layer root');
  }
  assert.ok(components > 0, 'no component directories found -- the guard would silently check nothing');
});

test('a component barrel exports every module beside it, or PRIVATE says why not', () => {
  const unexported = new Set<string>();

  for (const category of dirsIn(ANGULAR_COMPONENTS)) {
    for (const name of dirsIn(join(ANGULAR_COMPONENTS, category))) {
      const dir = join(ANGULAR_COMPONENTS, category, name);
      const exported = exportsOf(join(dir, 'index.ts'));
      for (const module of ownModulesOf(dir)) {
        const key = `${category}/${name}/${module}`;
        if (exported.has(module.slice(0, -3))) continue;
        unexported.add(key);
        assert.ok(PRIVATE.has(key),
          `${key} sits beside a component and its own index.ts does not export it. Export it, or `
          + 'name it in PRIVATE with the reason it is not part of the layer\'s surface.');
      }
    }
  }

  for (const key of PRIVATE.keys()) {
    assert.ok(unexported.has(key),
      `PRIVATE names "${key}", which is exported now or no longer exists -- stale entry`);
  }
});

test('the layer root exports every module beside it, or ROOT_PRIVATE says why not', () => {
  const exported = exportsOf(join(LAYER, 'index.ts'));
  const unexported = new Set<string>();

  for (const module of ownModulesOf(LAYER)) {
    if (exported.has(module.slice(0, -3))) continue;
    unexported.add(module);
    assert.ok(ROOT_PRIVATE.has(module),
      `${module} sits at the layer root and index.ts does not export it. Export it, or name it `
      + 'in ROOT_PRIVATE with the reason.');
  }

  for (const key of ROOT_PRIVATE.keys()) {
    assert.ok(unexported.has(key),
      `ROOT_PRIVATE names "${key}", which is exported now or no longer exists -- stale entry`);
  }
});
