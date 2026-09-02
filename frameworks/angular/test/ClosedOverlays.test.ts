/* Four components draw nothing while `open` is false, and a component cannot remove its own host:
 * the element the placing template created stays, and every host binding on it keeps running. The
 * class stays, because it is what hides the host and is the whole reason the `open` variant carries
 * a `false` case; the hook goes, because it is the public name a style plugin selects and a name
 * for a slot nothing draws is a name for nothing. The set is declared and asserted exhaustive
 * against the sources, so a fifth component of this shape fails here rather than shipping
 * unmeasured. The claim comes from the contract each of the four binds, two of which say in so
 * many words that a closed one renders nothing. */

import { useTestEnvironment } from './TestbedEnv';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { ANGULAR_COMPONENTS } from './Compliance';
import { ArenaSheet } from '../components/feedback/arena-sheet/ArenaSheet';
import { ArenaDialog } from '../components/feedback/arena-dialog/ArenaDialog';
import { ArenaConfirmDialog } from '../components/feedback/arena-confirm-dialog/ArenaConfirmDialog';
import { ArenaCommandPalette } from '../components/navigation/arena-command-palette/ArenaCommandPalette';

export const GUARDED = [
  { file: 'feedback/arena-sheet/ArenaSheet.ts', type: ArenaSheet, inputs: { title: 'Your basket' } },
  { file: 'feedback/arena-dialog/ArenaDialog.ts', type: ArenaDialog, inputs: { title: 'Promote build' } },
  { file: 'feedback/arena-confirm-dialog/ArenaConfirmDialog.ts', type: ArenaConfirmDialog, inputs: { title: 'Delete project' } },
  { file: 'navigation/arena-command-palette/ArenaCommandPalette.ts', type: ArenaCommandPalette, inputs: { commands: [] } },
] as const;

export const OPEN_GUARD = '@if (open())';

function sourcesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourcesUnder(path);
    return entry.name.endsWith('.ts') && !/\.(test|generated|variants)\./.test(entry.name) ? [path] : [];
  });
}

export function guardedSources(base = ANGULAR_COMPONENTS) {
  return sourcesUnder(base)
    .filter((path) => {
      const source = readFileSync(path, 'utf8');
      return source.includes(OPEN_GUARD) && source.includes('data-arena-part');
    })
    .map((path) => relative(base, path).split(sep).join('/'))
    .sort();
}

for (const { file, type, inputs } of GUARDED) {
  test(`${file}: closed, the host names no part, because no part is drawn`, () => {
    const fixture = TestBed.createComponent(type as never);
    try {
      fixture.componentRef.setInput('open', false);
      for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
      fixture.detectChanges();

      const host = fixture.nativeElement as Element;
      assert.equal(host.getAttribute('data-arena-part'), null,
        'a closed overlay carries its part hook, so a style plugin has a name to select and paints '
        + 'an element that draws nothing, and the contract this component binds says a closed one '
        + 'renders nothing at all');
      assert.equal(host.children.length, 0,
        'a closed overlay renders a child, which is the same claim one notation further in');
    } finally {
      fixture.destroy();
    }
  });
}

test('every component whose template is guarded on open is measured above', () => {
  assert.deepEqual(guardedSources(), GUARDED.map(({ file }) => file).sort(),
    `a component guarding its template with ${OPEN_GUARD} and binding a part on its host publishes `
    + 'that part while it draws nothing. One outside the list above ships that divergence with no '
    + 'suite over it, and an entry whose file has moved is a claim about a file that is not there');
});
