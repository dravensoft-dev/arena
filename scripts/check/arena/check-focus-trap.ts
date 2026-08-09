/* The boundary wrap of a trap is Arena's own .focus() call and happy-dom honours it. The
 * INTERIOR is native sequential focus navigation, which happy-dom does not have: a suite
 * asserting it there passes identically against a perfect trap and against none. This gate
 * drives real Chromium over CDP and presses a real Tab, and it is the only one that does.
 * TRAPS names a page per layer binding dialog-modal, each layer answering the contract
 * separately, and every page opens its panel from its own fixture, so no button is found by
 * its text. The wait is for that panel to hold focus and not a fixed sleep, a sleep being a
 * guess about machine speed that reports a slow runner as a component that rendered nothing.
 * FOCUSABLE repeats :not([tabindex="-1"]) on every clause because a selector list is OR'd,
 * and writing it loose once made this gate call a correct combobox a broken trap. */

import { withTimeout } from '../../utils/with-timeout.ts';
import { isMainModule } from '../../utils/main-module.ts';
import { startStaticServer } from '../../lib/arena/static-server.ts';
import { browserOrExit, launchChromium } from '../../lib/arena/chromium.ts';
import { connect } from '../../lib/arena/cdp.ts';
import type { Cdp } from '../../lib/arena/cdp.ts';
import { cannotRun } from '../../lib/arena/arena-scripts-vars.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';

export const node = {
  name: 'check:focus-trap',
  reads: [
    'frameworks/react/components/**', 'frameworks/angular/components/**',
    'frameworks/tailwind/consume/**', 'frameworks/react/vendor/**',
    'frameworks/react/playground/**', 'frameworks/angular/build/demo/**',
  ],
  writes: [],
  feeds: [],
};


export const NAVIGATE_TIMEOUT_MS = 30_000;
export const READY_TIMEOUT_MS = 20_000;
const READY_POLL_MS = 50;
const STEP_MS = 60;

const REACHABLE = ':not([tabindex="-1"])';
export const FOCUSABLE = [
  `a[href]${REACHABLE}`,
  `button:not([disabled])${REACHABLE}`,
  `input:not([disabled])${REACHABLE}`,
  `select:not([disabled])${REACHABLE}`,
  `textarea:not([disabled])${REACHABLE}`,
  `[tabindex]${REACHABLE}`,
].join(', ');

export const PANEL = '[role="dialog"], [role="alertdialog"]';

export const COLLECT_ERRORS = `window.__arenaTrapErrors = [];
addEventListener('error', (e) => window.__arenaTrapErrors.push(
  String((e.target && e.target.src) ? 'failed to load ' + e.target.src : e.message)), true);
addEventListener('unhandledrejection', (e) => window.__arenaTrapErrors.push('unhandled rejection: ' + String(e.reason)));`;

export const TRAPS = [
  { name: 'ArenaConfirmDialog:react', page: 'frameworks/react/components/feedback/arena-confirm-dialog/ArenaConfirmDialog.demo.generated.html' },
  { name: 'ArenaOnboarding:react', page: 'frameworks/react/components/feedback/arena-onboarding/ArenaOnboarding.demo.generated.html' },
  { name: 'ArenaCommandPalette:react', page: 'frameworks/react/components/navigation/arena-command-palette/ArenaCommandPalette.demo.generated.html' },
  { name: 'ArenaConfirmDialog:angular', page: 'frameworks/angular/components/feedback/arena-confirm-dialog/ArenaConfirmDialog.demo.generated.html' },
  { name: 'ArenaDialog:angular', page: 'frameworks/angular/components/feedback/arena-dialog/ArenaDialog.demo.generated.html' },
  { name: 'ArenaCommandPalette:angular', page: 'frameworks/angular/components/navigation/arena-command-palette/ArenaCommandPalette.demo.generated.html' },
];

export type Silence = {
  readyState: string;
  elements: number;
  errors: string[];
  scripts: string[];
};

export type TrapWalk = {
  panel: boolean;
  silence?: Silence;
  focusables?: number;
  startsInside?: boolean;
  visited?: number;
  forward?: { press: number; inside: boolean }[];
  backward?: { press: number; inside: boolean }[];
  [other: string]: any;
};

export function silenceOf(silence?: Silence) {
  if (!silence) return '';
  const scripts = silence.scripts.length === 0 ? 'none' : silence.scripts.join(', ');
  const errors = silence.errors.length === 0 ? 'none' : silence.errors.join(' | ');
  return `. The document was ${silence.readyState} holding ${silence.elements} element(s); `
    + `script(s) fetched: ${scripts}; page error(s): ${errors}. A page that fetched its entry and `
    + 'raised nothing rendered a component that draws no panel; one whose entry came back empty '
    + 'or 404 never ran, and the bundle beside the page is what to look at';
}

export function walkProblems(name: string, walk: TrapWalk) {
  const problems: string[] = [];
  if (!walk.panel) {
    return [`${name}: no ${PANEL} rendered inside ${READY_TIMEOUT_MS}ms, so nothing was walked${silenceOf(walk.silence)}`];
  }
  if (walk.focusables === 0) {
    return [`${name}: the panel holds no Tab stop at all, so a keyboard user who reaches it cannot act`];
  }
  if (!walk.startsInside) problems.push(`${name}: focus did not start inside the panel, so the trap never claimed it`);

  const escaped = (walk.forward ?? []).filter((s) => !s.inside);
  if (escaped.length) {
    problems.push(`${name}: focus left the panel on Tab ${escaped.map((s) => s.press).join(', ')} -- the interior is not trapped`);
  }
  if ((walk.visited ?? 0) < (walk.focusables ?? 0)) {
    problems.push(
      `${name}: ${walk.focusables} focusable element(s) in the panel and Tab reached ${walk.visited} -- `
      + 'a trap that clamps on one control is not the same as one a user can move through',
    );
  }
  if (walk.focusables === 1) return problems;
  if (!walk.wrapsForward) problems.push(`${name}: Tab from the last focusable did not return to the first`);
  if (!walk.wrapsBackward) problems.push(`${name}: Shift+Tab from the first focusable did not reach the last`);
  return problems;
}

async function walkTrap(cdp: Cdp, url: string) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  try {
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 760, deviceScaleFactor: 1, mobile: false }, sessionId);
    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: COLLECT_ERRORS }, sessionId);
    await withTimeout(cdp.send('Page.navigate', { url }, sessionId), NAVIGATE_TIMEOUT_MS, `${url}: navigate timed out`);

    const ev = (expression: string) => cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
    const tab = async (shift: boolean) => {
      const modifiers = shift ? 8 : 0;
      for (const type of ['rawKeyDown', 'keyUp']) {
        await cdp.send('Input.dispatchKeyEvent', { type, windowsVirtualKeyCode: 9, key: 'Tab', code: 'Tab', modifiers }, sessionId);
      }
      await ev(`new Promise((r) => setTimeout(r, ${STEP_MS}))`);
    };

    await ev(`new Promise((resolve) => {
      const deadline = Date.now() + ${READY_TIMEOUT_MS};
      const held = () => {
        const panel = document.querySelector(${JSON.stringify(PANEL)});
        return Boolean(panel && panel.contains(document.activeElement));
      };
      const tick = () => {
        if (held() || Date.now() >= deadline) resolve(true);
        else setTimeout(tick, ${READY_POLL_MS});
      };
      tick();
    })`);

    const seen = (await ev(`(() => {
      const panel = document.querySelector(${JSON.stringify(PANEL)});
      if (!panel) return { panel: false, focusables: 0, startsInside: false, silence: {
        readyState: document.readyState,
        elements: document.body ? document.body.getElementsByTagName('*').length : 0,
        errors: (window.__arenaTrapErrors || []).slice(0, 5),
        scripts: performance.getEntriesByType('resource')
          .filter((r) => r.name.endsWith('.js'))
          .map((r) => new URL(r.name).pathname.split('/').pop()
            + ' ' + (r.responseStatus === undefined ? '?' : r.responseStatus)
            + ' ' + r.decodedBodySize + 'B')
          .slice(0, 8),
      } };
      const list = [...panel.querySelectorAll(${JSON.stringify(FOCUSABLE)})];
      list.forEach((el, i) => { el.dataset.arenaTrapIndex = String(i); });
      return { panel: true, focusables: list.length, startsInside: panel.contains(document.activeElement) };
    })()`)).result.value;
    if (!seen.panel || seen.focusables === 0) return { ...seen, forward: [], visited: 0, wrapsForward: false, wrapsBackward: false };

    const reached = new Set();
    const forward = [];
    for (let press = 1; press <= seen.focusables + 1; press += 1) {
      await tab(false);
      const step = (await ev(`(() => {
        const panel = document.querySelector(${JSON.stringify(PANEL)});
        const active = document.activeElement;
        return { inside: panel.contains(active), index: active?.dataset?.arenaTrapIndex ?? null };
      })()`)).result.value;
      forward.push({ press, inside: step.inside });
      if (step.index !== null) reached.add(step.index);
    }
    const afterLoop = (await ev(`document.activeElement?.dataset?.arenaTrapIndex ?? null`)).result.value;

    await ev(`(() => {
      const panel = document.querySelector(${JSON.stringify(PANEL)});
      panel.querySelector('[data-arena-trap-index="0"]').focus();
      return true;
    })()`);
    await tab(true);
    const back = (await ev(`document.activeElement?.dataset?.arenaTrapIndex ?? null`)).result.value;

    return {
      ...seen,
      forward,
      visited: reached.size,
      wrapsForward: afterLoop === '0' || reached.size === seen.focusables,
      wrapsBackward: back === String(seen.focusables - 1),
    };
  } finally {
    try { await cdp.send('Target.closeTarget', { targetId }); } catch { void 0; }
  }
}

const skip: (reason: string) => never = (reason) => cannotRun('check-focus-trap', reason);

async function main() {
  if (TRAPS.length === 0) skip('TRAPS is empty -- a walk with nothing to walk proves nothing');
  const exe = browserOrExit('check-focus-trap');

  const server = await startStaticServer(root);
  const chrome = await launchChromium(exe);
  const cdp = await connect(chrome.wsUrl);
  const problems = [];
  try {
    for (const trap of TRAPS) {
      const walk = await walkTrap(cdp, `http://127.0.0.1:${server.port}/${trap.page}`);
      problems.push(...walkProblems(trap.name, walk));
    }
  } finally {
    await chrome.kill?.();
    server.close?.();
  }

  if (problems.length) {
    console.error(`check-focus-trap: ${problems.length} problem(s)\n`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`check-focus-trap: ${TRAPS.length} trap(s) walked with real Tab presses — focus stayed inside, reached every control and wrapped both ways`);
}

if (isMainModule(import.meta.url)) await main();
