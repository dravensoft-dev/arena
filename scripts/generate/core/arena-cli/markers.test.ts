/* Covers markers.ts. The cases that matter are the ones a looser reader gets wrong: a marker
 * word inside an attribute VALUE, a marker name that is the prefix of a longer attribute, a
 * template in its own .html file rather than inline, and a marker under a host that does not
 * query that slot. The last four hold a file with more than one component, which is what a
 * consumer writes as soon as two belong together. Two of them fail against a reader that stops
 * at the first declaration, one in each direction: a later marker is missed, and a later
 * templateUrl is judged against the first component's imports. The other two pass either way and
 * are here to fail against the WRONG repair -- merging every import in the file would let one
 * component's import cover its sibling's marker, and nothing else here would notice. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { directiveFor, markerProblems, markerUses } from './markers.ts';

const MARKERS = {
  'arena-dialog': ['footer'],
  'arena-card': ['action'],
  'arena-error-state': ['secondaryAction'],
};

const read = (files: Record<string, string>) => ((path: string) => files[path] ?? '') as never;

test('a marker written without its import is reported, naming the slot, the host and the directive', () => {
  const problems = markerProblems([{
    path: 'app/a.ts',
    source: "@Component({ imports: [ArenaDialog], template: `<arena-dialog><div footer>ok</div></arena-dialog>` })",
  }], MARKERS);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /projects into the `footer` slot of <arena-dialog> and does not import ArenaFooter/);
});

test('the same template with the import is fine', () => {
  assert.deepEqual(markerProblems([{
    path: 'app/a.ts',
    source: "@Component({ imports: [ArenaDialog, ArenaFooter], template: `<arena-dialog><div footer>ok</div></arena-dialog>` })",
  }], MARKERS), []);
});

test('a template in its own file is read through templateUrl, which is how an Angular app is usually written', () => {
  const files = { [join('app', 'shell.html')]: '<arena-card><button action>Retry</button></arena-card>' };
  const problems = markerProblems(
    [{ path: 'app/shell.ts', source: "@Component({ imports: [ArenaCard], templateUrl: './shell.html' })" }],
    MARKERS,
    {},
    read(files),
  );
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /`action` slot of <arena-card>/);
});

test('a marker word inside an attribute VALUE is not a use of it', () => {
  assert.deepEqual(markerProblems([{
    path: 'app/a.ts',
    source: '@Component({ imports: [ArenaCard], template: `<arena-card><arena-tooltip label="Every action for this build">x</arena-tooltip></arena-card>` })',
  }], MARKERS), []);
});

test('a marker name that only begins a longer attribute is not a use of it', () => {
  assert.deepEqual(markerProblems([{
    path: 'app/a.ts',
    source: '@Component({ imports: [ArenaCard], template: `<arena-card><div data-footer-note="x">y</div></arena-card>` })',
  }], MARKERS), []);
});

test('a slot no host queries is nobody\'s business, so plain markup passes', () => {
  assert.deepEqual(markerProblems([{
    path: 'app/a.ts',
    source: '@Component({ imports: [], template: `<div footer>plain markup, no Arena host</div>` })',
  }], MARKERS), []);
  assert.deepEqual(markerProblems([{
    path: 'app/a.ts',
    source: '@Component({ imports: [ArenaCard], template: `<arena-card><div footer>x</div></arena-card>` })',
  }], MARKERS), [], 'arena-card queries no footer, so writing one there is not this rule');
});

test('a package carrying no markers at all reports nothing, which is what the React map is', () => {
  assert.deepEqual(markerProblems([{
    path: 'app/a.ts',
    source: '@Component({ imports: [], template: `<arena-dialog><div footer>x</div></arena-dialog>` })',
  }], {}), []);
});

test('the directive name is derived from the attribute rather than tabled', () => {
  assert.equal(directiveFor('action'), 'ArenaAction');
  assert.equal(directiveFor('secondaryAction'), 'ArenaSecondaryAction');
});

test('a use is attributed to the nearest host that queries that slot', () => {
  const uses = markerUses(
    '<arena-dialog><arena-card><button action>x</button></arena-card></arena-dialog>',
    MARKERS,
  );
  assert.deepEqual(uses, [{ attribute: 'action', host: 'arena-card' }]);
});

test('a marker in the SECOND component of a file is read, not just the first', () => {
  const problems = markerProblems([{
    path: 'app/blocks.ts',
    source: `
      @Component({ selector: 'app-todo', imports: [ArenaCard], template: \`<arena-card>plain</arena-card>\` })
      export class Todo {}

      @Component({ selector: 'app-blocks', imports: [ArenaDialog], template: \`<arena-dialog><div footer>x</div></arena-dialog>\` })
      export class Blocks {}
    `,
  }], MARKERS);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /projects into the `footer` slot of <arena-dialog> and does not import ArenaFooter/);
});

test('a templateUrl answers to its own component\'s imports, not to the first component\'s', () => {
  const files = { [join('app', 'row.html')]: '<arena-card><button action>Retry</button></arena-card>' };
  assert.deepEqual(
    markerProblems(
      [{
        path: 'app/list.ts',
        source: `
          @Component({ selector: 'app-list', imports: [ArenaCard], template: \`<arena-card>plain</arena-card>\` })
          export class List {}

          @Component({ selector: 'app-row', imports: [ArenaCard, ArenaAction], templateUrl: './row.html' })
          export class Row {}
        `,
      }],
      MARKERS,
      {},
      read(files),
    ),
    [],
    'Row imports ArenaAction; reading List\'s imports instead would report a slot that is filled',
  );
});

test('each template answers to the imports of its OWN component, so a sibling\'s import does not cover it', () => {
  const problems = markerProblems([{
    path: 'app/pair.ts',
    source: `
      @Component({ selector: 'app-one', imports: [ArenaDialog], template: \`<arena-dialog><div footer>x</div></arena-dialog>\` })
      export class One {}

      @Component({ selector: 'app-two', imports: [ArenaDialog, ArenaFooter], template: \`<div>nothing projected</div>\` })
      export class Two {}
    `,
  }], MARKERS);
  assert.equal(problems.length, 1, 'One does not import ArenaFooter; Two importing it is Two\'s business');
  assert.match(problems[0] ?? '', /`footer` slot of <arena-dialog>/);
});

test('a component that imports its marker is fine even when a sibling in the file does not', () => {
  assert.deepEqual(markerProblems([{
    path: 'app/pair.ts',
    source: `
      @Component({ selector: 'app-one', imports: [ArenaDialog, ArenaFooter], template: \`<arena-dialog><div footer>x</div></arena-dialog>\` })
      export class One {}

      @Component({ selector: 'app-two', imports: [ArenaCard], template: \`<arena-card>plain</arena-card>\` })
      export class Two {}
    `,
  }], MARKERS), []);
});
