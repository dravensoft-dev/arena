/* A recipe called with nothing resolves each group to its manifest's defaultVariants, so the
 * only way this can fail is a default that is not a declared value or does not compose. The loop
 * checks that every recipe's defaults are declared values that compose on every slot, the same as
 * passing them spelled out. It pins no default by name. One loop over every Arena*.variants.ts. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ANGULAR_COMPONENTS } from '../test/Compliance';

type Styles = (chosen?: Record<string, unknown>) => { $data: Record<string, () => unknown> };

function recipes(): string[] {
  const found: string[] = [];
  for (const group of readdirSync(ANGULAR_COMPONENTS, { withFileTypes: true })) {
    if (!group.isDirectory()) continue;
    for (const folder of readdirSync(join(ANGULAR_COMPONENTS, group.name), { withFileTypes: true })) {
      if (!folder.isDirectory()) continue;
      for (const file of readdirSync(join(ANGULAR_COMPONENTS, group.name, folder.name))) {
        if (/^Arena[A-Za-z0-9]*\.variants\.ts$/.test(file)) found.push(join(ANGULAR_COMPONENTS, group.name, folder.name, file));
      }
    }
  }
  return found.sort();
}

test('every recipe\'s defaults are declared values that compose on every slot, as when passed spelled out', async () => {
  const files = recipes();
  assert.ok(files.length > 0, 'no Arena*.variants.ts found');
  for (const file of files) {
    const name = file.replace(/^.*\/(Arena[A-Za-z0-9]*)\.variants\.ts$/, '$1');
    const recipe = await import(pathToFileURL(file).href) as Record<string, unknown>;
    const imported = /import manifest from '([^']+)'/.exec(readFileSync(file, 'utf8'))?.[1];
    assert.ok(imported, `${name}: imports no manifest`);
    const manifest = (await import(pathToFileURL(`${resolve(dirname(file), imported)}.ts`).href) as {
      default: { defaultVariants?: Record<string, unknown> };
    }).default;
    const styles = recipe[`${name[0]!.toLowerCase()}${name.slice(1)}Styles`] as Styles;
    assert.equal(typeof styles, 'function', `${name}: exports no ${name}Styles recipe`);
    const slots = Object.keys(styles().$data);
    assert.ok(slots.length > 0, `${name}: no slots`);
    for (const slot of slots) {
      assert.deepEqual(styles().$data[slot]!(), styles(manifest.defaultVariants ?? {}).$data[slot]!(), `${name}.${slot}: defaults compose as spelled out`);
    }
  }
});
