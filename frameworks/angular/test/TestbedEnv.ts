/* Angular derives a component id from the definition, so two alike components hash to one id and warn
 * NG0912; that warning and any `[arena]` warning no test captured are recorded, and the afterEach of the
 * file that called useTestEnvironment() fails the case that caused it, with its site. A beforeEach forgets
 * the process-wide dedup of `arenaWarnOnce` and `warnUnresolved`; breakpoints are each suite's. Angular's
 * own teardown hook never runs under bun test, so each such file resets after every case, and
 * HeldRootRenderer holds its roots by reference: Angular finds them by `[id^=root]`, and a host that
 * binds `[attr.id]` to null (ArenaFileInput) stripped it, leaving a host whose label-derived ids another
 * case then found. One sprite is served at TEST_ICONS_HREF; glyphIds and symbol read ph-<weight>-<name>. */
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import '@angular/compiler';
import { afterEach, beforeEach } from 'node:test';
import { TestBed, TestComponentRenderer } from '@angular/core/testing';
import { NgModule } from '@angular/core';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideArenaIcons } from '../ArenaIcons';
import { forgetArenaWarnings } from '../WarnOnce';
import { forgetArenaBreakpoints } from '../ContainerSize';

export function ensureDom(): void {
  if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register();
}

const COLLISION = 'NG0912';
const ARENA = '[arena]';
const collisions: string[] = [];
const unasserted: string[] = [];
let listening = false;

function definingSite(): string {
  return (new Error().stack ?? '').split('\n').find((line) => /\.test\.[jt]s/.test(line))?.trim() ?? 'at an unknown site';
}

function listen(): void {
  if (listening) return;
  listening = true;
  const warn = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    const [first] = args;
    if (typeof first === 'string' && first.startsWith(COLLISION)) {
      collisions.push(`${first.split('. To fix')[0]}, defined ${definingSite()}`);
      return;
    }
    if (typeof first === 'string' && first.startsWith(ARENA)) {
      unasserted.push(`${first}, printed ${definingSite()}`);
      return;
    }
    warn(...args);
  };
}

export function takeComponentIdCollisions(): string[] {
  return collisions.splice(0);
}

export function takeUnassertedWarnings(): string[] {
  return unasserted.splice(0);
}

function guard(): void {
  listen();
  beforeEach(() => {
    forgetArenaWarnings();
    forgetArenaBreakpoints();
  });
  afterEach(() => TestBed.resetTestingModule());
  afterEach(() => {
    const found = [
      ...takeComponentIdCollisions().map((one) => `component id collision: ${one}`),
      ...takeUnassertedWarnings().map((one) => `a warning no test captured: ${one}`),
    ];
    if (found.length) throw new Error(found.join('\n'));
  });
}

export const TEST_ICONS_HREF = '/test/icons.svg';

export function glyphIds(root: ParentNode): string[] {
  return Array.from(root.querySelectorAll('svg > use')).map((use) => (use.getAttribute('href') ?? '').split('#')[1] ?? '');
}

export function symbol(weight: string, name: string): string {
  return ['ph', weight, name].join('-');
}

const roots: Element[] = [];

class HeldRootRenderer extends TestComponentRenderer {
  override insertRootElement(rootElId: string, tagName = 'div'): void {
    this.removeAllRootElements();
    const root = document.createElement(tagName);
    root.setAttribute('id', rootElId);
    document.body.appendChild(root);
    roots.push(root);
  }

  override removeAllRootElements(): void {
    for (const root of roots.splice(0)) root.remove();
  }
}

@NgModule({
  exports: [BrowserTestingModule],
  providers: [provideArenaIcons(TEST_ICONS_HREF), { provide: TestComponentRenderer, useClass: HeldRootRenderer }],
})
class ArenaTestingModule {}

let claimed = false;

export function useTestEnvironment(): void {
  ensureDom();
  guard();
  if (claimed) return;
  claimed = true;
  TestBed.initTestEnvironment(ArenaTestingModule, platformBrowserTesting());
}
