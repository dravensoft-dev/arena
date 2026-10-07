/* The panel reads --arena-dialog-width through its class, so the property is the only way a width
 * arrives, and a value the browser would drop is reported once. happy-dom does not inherit custom
 * properties, so each case declares the property with a rule on the panel part itself. */
import { useTestEnvironment } from '../../../test/TestbedEnv';
useTestEnvironment();

import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { forgetArenaWarnings } from '../../../WarnOnce';
import { ArenaDialog } from './ArenaDialog';
import manifest from './ArenaDialog.classes.generated';
import { TAILWIND_COMPONENTS, REPO } from '../../../test/Compliance';

const source = JSON.parse(readFileSync(join(TAILWIND_COMPONENTS, 'feedback/arena-dialog/ArenaDialog.manifest.json'), 'utf8')) as { slots: { panel: string } };
const family = JSON.parse(readFileSync(join(REPO, 'frameworks/tailwind/vocabulary/arena-dialog-width/DialogWidth.family.json'), 'utf8')) as { axis: string; default: string; variants: Record<string, string> };

afterEach(() => { forgetArenaWarnings(); });

function warnings(value?: string): string[] {
  const said: string[] = [];
  const saved = globalThis.console.warn;
  globalThis.console.warn = (...parts: unknown[]) => { said.push(parts.map(String).join(' ')); };
  const sheet = document.head.appendChild(document.createElement('style'));
  if (value !== undefined) sheet.textContent = `[data-arena-part="${manifest.parts.panel}"] { --arena-dialog-width: ${value}; }`;
  try {
    const fixture = TestBed.createComponent(ArenaDialog);
    try {
      fixture.componentRef.setInput('open', true);
      fixture.componentRef.setInput('title', 'Delete project');
      fixture.detectChanges();
    } finally {
      fixture.destroy();
    }
  } finally {
    sheet.remove();
    globalThis.console.warn = saved;
  }
  return said;
}

test('a property that is not a width warns once, and a length or a derivation does not', () => {
  for (const [value, warns] of [['md', true], ['40rem', false], ['calc(var(--sp-1) * 160)', false]] as const) {
    forgetArenaWarnings();
    const said = warnings(value);
    assert.equal(said.length, warns ? 1 : 0, value);
    if (warns) assert.match(said[0] ?? '', /arena-dialog: --arena-dialog-width is "md"/);
  }
});

test('an unset property says nothing, because the default is the manifest\'s', () => {
  assert.deepEqual(warnings(undefined), []);
});

test('the panel slot reads the family channel, then its axis, then the default option\'s value', () => {
  const [, channel, value] = /^\[(--[\w-]+):(.+)\]$/.exec(family.variants[family.default]) ?? [];
  assert.ok(channel && value);
  assert.ok(source.slots['panel'].split(' ').includes(`w-[var(${channel},var(${family.axis},${value}))]`));
});
