/* Angular derives a component id from the component definition and never from the class name, so two
 * components with the same selector, template and metadata hash to one id and Angular warns NG0912.
 * The guard keeps that warning out of the output and records it instead. A printed warning hides in
 * the noise, and a thrown one at load fails a whole file as an unhandled error between tests, so its
 * cases never run. Recording it lets the afterEach of the file that called useTestEnvironment() fail
 * the one test that defined the colliding component, with the site that defined it.
 * An `[arena]` warning no test captured is recorded the same way and fails the test that provoked it.
 * A warning a test means to provoke is captured by that test and asserted. The deduplication of
 * `arenaWarnOnce` and `warnUnresolved` is process-wide, so a beforeEach forgets both and no site hides
 * behind the file that reached it first. Breakpoints are set by each suite, never here. */
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import '@angular/compiler';
import { afterEach, beforeEach } from 'node:test';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
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
  afterEach(() => {
    const found = [
      ...takeComponentIdCollisions().map((one) => `component id collision: ${one}`),
      ...takeUnassertedWarnings().map((one) => `a warning no test captured: ${one}`),
    ];
    if (found.length) throw new Error(found.join('\n'));
  });
}

let claimed = false;

export function useTestEnvironment(): void {
  ensureDom();
  guard();
  if (claimed) return;
  claimed = true;
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
}
