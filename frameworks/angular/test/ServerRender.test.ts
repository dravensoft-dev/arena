/* A server render of the popup components, run through @angular/platform-server.
 * The render swaps the DOM adapter for domino's, which replaces Event and its siblings on
 * globalThis. Every later suite in this process would then dispatch into the wrong DOM, so the
 * suite snapshots the globals before the render and restores them, and the adapter, afterwards. */
import { useTestEnvironment, TEST_ICONS_HREF } from './TestbedEnv';
import { provideArenaIcons } from '../ArenaIcons';
useTestEnvironment();

import test from 'node:test';
import assert from 'node:assert/strict';
import { Component, ɵsetDocument } from '@angular/core';
import { bootstrapApplication, ɵBrowserDomAdapter } from '@angular/platform-browser';
import { provideServerRendering, renderApplication } from '@angular/platform-server';
import type { ArenaMenuItem } from '../Api.generated';
import { ArenaButton } from '../components/forms/arena-button/ArenaButton';
import { ArenaIconButton } from '../components/forms/arena-icon-button/ArenaIconButton';
import { ArenaMenu } from '../components/navigation/arena-menu/ArenaMenu';
import { ArenaPopover } from '../components/feedback/arena-popover/ArenaPopover';
import { ArenaIcon } from '../components/display/arena-icon/ArenaIcon';
import { forgetArenaWarnings } from '../WarnOnce';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PAGE = '<!doctype html><html><head></head><body><server-render-host></server-render-host></body></html>';

@Component({
  selector: 'server-render-host',
  standalone: true,
  imports: [ArenaButton, ArenaIconButton, ArenaMenu, ArenaPopover],
  template: `
    <arena-popover label="Filters"><arena-button trigger>Filters</arena-button><p>Body</p></arena-popover>
    <arena-menu [items]="items"><arena-button trigger>More</arena-button></arena-menu>
    <arena-popover label="Sort"><arena-icon-button trigger icon="ph-sort-ascending" label="Sort" /><p>Body</p></arena-popover>
    <arena-menu [items]="items"><arena-icon-button trigger icon="ph-dots-three-vertical" label="Actions" /></arena-menu>
  `,
})
class ServerRenderHost {
  readonly items: ArenaMenuItem[] = [{ label: 'Promote' }];
}

@Component({
  selector: 'server-render-host',
  standalone: true,
  imports: [ArenaIcon],
  template: `<arena-icon icon="ph-bold ph-plus" /><arena-icon icon="ph ph-bell" />`,
})
class IconRenderHost {}

async function renderOnServer(root: typeof ServerRenderHost | typeof IconRenderHost = ServerRenderHost): Promise<{ html: string; logged: string[] }> {
  const saved = new Map(Object.getOwnPropertyNames(globalThis)
    .map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const));
  const log = console.log;
  const logged: string[] = [];
  console.log = (...args: unknown[]) => { logged.push(args.map(String).join(' ')); };
  try {
    const html = await renderApplication(
      (context) => bootstrapApplication(root, { providers: root === IconRenderHost ? [provideServerRendering()] : [provideServerRendering(), provideArenaIcons(TEST_ICONS_HREF)] }, context),
      { document: PAGE, url: '/' },
    );
    return { html, logged };
  } finally {
    console.log = log;
    const global = globalThis as Record<string, unknown>;
    for (const key of Object.getOwnPropertyNames(globalThis)) if (!saved.has(key)) delete global[key];
    for (const [key, descriptor] of saved) {
      if (descriptor?.configurable) Object.defineProperty(globalThis, key, descriptor);
    }
    ɵBrowserDomAdapter.makeCurrent();
    ɵsetDocument(document);
  }
}

const buttons = (html: string) => [...html.matchAll(/<button\b[^>]*>/g)].map((match) => match[0]);

test('a server render writes the popup state onto the inner button of each trigger, with no dangling aria-controls', async () => {
  const { html, logged } = await renderOnServer();
  const [popover, menu, iconPopover, iconMenu] = buttons(html);
  for (const [tag, kind] of [[popover, 'dialog'], [menu, 'menu'], [iconPopover, 'dialog'], [iconMenu, 'menu']] as const) {
    assert.match(tag ?? '', new RegExp(`aria-haspopup="${kind}"`));
    assert.match(tag ?? '', /aria-expanded="false"/);
    assert.doesNotMatch(tag ?? '', /aria-controls/);
  }
  assert.deepEqual(logged, ['Angular is running in development mode.']);
});

test('the server render hands the document back to happy-dom', async () => {
  await renderOnServer();
  assert.ok(new Event('probe') instanceof window.Event);
  const target = document.createElement('div');
  assert.doesNotThrow(() => target.dispatchEvent(new Event('probe')));
});

test('the server render holds no use and reads no document', async () => {
  forgetArenaWarnings();
  const warned: string[] = [];
  const warn = console.warn;
  console.warn = (...args: unknown[]) => { warned.push(args.map(String).join(' ')); };
  try {
    const { html } = await renderOnServer(IconRenderHost);
    assert.doesNotMatch(html, /<svg|<use/);
    assert.equal(warned.length, 1);
    assert.match(warned[0] ?? '', /ArenaIcon has no sprite/);
  } finally {
    console.warn = warn;
  }
  const layer = join(import.meta.dirname, '..');
  for (const file of ['ArenaIcons.ts', 'components/display/arena-icon/ArenaIcon.ts']) {
    assert.doesNotMatch(readFileSync(join(layer, file), 'utf8'), /\b(document|window|fetch)\b/, `${file} reads the browser`);
  }
});
