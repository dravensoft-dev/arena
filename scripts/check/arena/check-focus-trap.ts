/* The boundary wrap of a trap is Arena's own .focus() and happy-dom honours it; the INTERIOR is
 * native sequential focus navigation, which happy-dom lacks, so this drives real Chromium over CDP
 * and presses a real Tab. TRAPS names a page per layer binding modal-focus, each opening its panel
 * from its own fixture. HANDOFFS names a page per layer whose hidden native control hands focus to
 * the trigger it lies under when the browser refuses it, and the box the browser anchors its
 * message on, which a DOM without layout cannot show. No wait here is a span: a keypress barrier
 * is armed BEFORE the key, since CDP acks one only once handled, and where a panel holds ONE stop
 * the subject is containment. FOCUSABLE repeats :not([tabindex="-1"]) per clause because a list
 * is OR'd: loose once, it failed a combobox. */

import { withTimeout } from '../../utils/with-timeout.ts';
import { deadline, type Deadline } from '../../lib/arena/deadline.ts';
import { POLL_MS } from '../../lib/arena/wait-for.ts';
import { isMainModule } from '../../utils/main-module.ts';
import { startStaticServer } from '../../lib/arena/static-server.ts';
import { browserOrExit, launchChromium } from '../../lib/arena/chromium.ts';
import { connect, evaluate, PageThrew } from '../../lib/arena/cdp.ts';
import type { Cdp } from '../../lib/arena/cdp.ts';
import { cannotRun } from '../../lib/arena/arena-scripts-vars.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { threwProblem } from '../../lib/arena/page-errors.ts';
import { loadInFreshTab, networkChangedProblem, type Lost } from '../../lib/arena/page-load.ts';

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


export const NAVIGATE: Deadline = deadline('focus-trap:navigate', 30_000,
  'a demo page fetches its own bundle, so the first navigation of a sweep pays for a cold HTTP '
  + 'cache and for whatever the static server is still writing');

export const PANEL_HELD: Deadline = deadline('focus-trap:panel-held', 20_000,
  'the panel opens from the page fixture after the framework has mounted, so this covers a '
  + 'bundle parse, a hydration and an opening transition on a runner with no GPU');

export const FOCUS_MOVED: Deadline = deadline('focus-trap:focus-moved', 2_000,
  'the span a synthetic Tab has to land before the wait is a hang rather than a keypress, which '
  + 'is generous because a focus handler may run a transition and a scroll before it settles');

export function heldExpression(bound: Deadline) {
  return `new Promise((resolve) => {
    const until = Date.now() + ${bound.ms};
    const started = Date.now();
    const held = () => {
      const panel = document.querySelector(${JSON.stringify(PANEL)});
      return Boolean(panel && panel.contains(document.activeElement));
    };
    const tick = () => {
      if (held()) resolve({ held: true, waitedMs: Date.now() - started });
      else if (Date.now() >= until) resolve({ held: false, waitedMs: Date.now() - started });
      else setTimeout(tick, ${POLL_MS});
    };
    tick();
  })`;
}

export const BEFORE = 'window.__arenaTrapBefore';

export function armExpression() {
  return `(() => { ${BEFORE} = document.activeElement; return true; })()`;
}

export function movedExpression(bound: Deadline) {
  return `new Promise((resolve) => {
    const before = ${BEFORE};
    const until = Date.now() + ${bound.ms};
    const tick = () => {
      if (document.activeElement !== before || Date.now() >= until) resolve(true);
      else setTimeout(tick, ${POLL_MS});
    };
    tick();
  })`;
}

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

export const SILENCE = `{
      readyState: document.readyState,
      elements: document.body ? document.body.getElementsByTagName('*').length : 0,
      errors: (window.__arenaTrapErrors || []).slice(0, 5),
      scripts: performance.getEntriesByType('resource')
        .filter((r) => r.name.endsWith('.js'))
        .map((r) => new URL(r.name).pathname.split('/').pop()
          + ' ' + (r.responseStatus === undefined ? '?' : r.responseStatus)
          + ' ' + r.decodedBodySize + 'B')
        .slice(0, 8),
    }`;

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

export const HANDOFFS = [
  { name: 'ArenaFileInput:react', page: 'frameworks/react/components/forms/arena-file-input/ArenaFileInput.demo.generated.html', query: '?required=1' },
  { name: 'ArenaFileInput:angular', page: 'frameworks/angular/components/forms/arena-file-input/ArenaFileInput.demo.generated.html', query: '?required=1' },
];

export const HANDOFF_INPUT = '[data-arena-part="file-input.input"]';
export const HANDOFF_TRIGGER = '[data-arena-part="file-input.trigger"]';

export const HANDOFF_SEEN: Deadline = deadline('focus-trap:handoff-seen', 20_000,
  'the field mounts from the page fixture after the framework has, so this covers a bundle parse and '
  + 'a hydration on a runner with no GPU, the same work a panel waits for');

export const ALIGN_PX = 1;

export type Box = { left: number; top: number; width: number; height: number };

export type Handoff = {
  seen: boolean;
  expired?: boolean;
  waitedMs?: number;
  threw?: string;
  silence?: Silence;
  changed?: Lost[];
  input?: Box;
  trigger?: Box;
  pointerEvents?: string;
  opacity?: string;
  hit?: boolean;
  valid?: boolean;
  landed?: boolean;
};

export function handoffExpression(seen: Deadline, moved: Deadline) {
  return `new Promise((resolve) => {
    const started = Date.now();
    const until = started + ${seen.ms};
    const box = (el) => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; };
    const measure = (input, trigger) => {
      const style = getComputedStyle(input);
      const t = trigger.getBoundingClientRect();
      const at = document.elementFromPoint(t.left + t.width / 2, t.top + t.height / 2);
      const valid = input.checkValidity();
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      input.reportValidity();
      const settle = Date.now() + ${moved.ms};
      const done = () => resolve({ seen: true, waitedMs: Date.now() - started, input: box(input), trigger: box(trigger),
        pointerEvents: style.pointerEvents, opacity: style.opacity, hit: Boolean(at && trigger.contains(at)), valid,
        landed: document.activeElement === trigger });
      const wait = () => (document.activeElement === trigger || Date.now() >= settle ? done() : setTimeout(wait, ${POLL_MS}));
      wait();
    };
    const tick = () => {
      const input = document.querySelector(${JSON.stringify(HANDOFF_INPUT)});
      const trigger = document.querySelector(${JSON.stringify(HANDOFF_TRIGGER)});
      if (input && trigger) measure(input, trigger);
      else if (Date.now() >= until) resolve({ seen: false, expired: true, waitedMs: Date.now() - started });
      else setTimeout(tick, ${POLL_MS});
    };
    tick();
  })`;
}

export function handoffProblems(name: string, walk: Handoff) {
  if (walk.threw !== undefined) return [threwProblem(`${name}: the page`, walk.threw, walk.silence)];
  if (walk.expired && (walk.changed?.length ?? 0) > 0) return [networkChangedProblem(`${name}: the page`, walk.changed ?? [])];
  if (!walk.seen || !walk.input || !walk.trigger) {
    return [`${name}: ${HANDOFF_SEEN.name} saw no hidden input beside a trigger within ${HANDOFF_SEEN.ms}ms, `
      + `which is that size because ${HANDOFF_SEEN.why}. Nothing was refused and nothing was measured`
      + silenceOf(walk.silence)];
  }
  const problems: string[] = [];
  const input = walk.input;
  const trigger = walk.trigger;
  const off = (['left', 'top', 'width', 'height'] as const).filter((edge) => Math.abs(input[edge] - trigger[edge]) > ALIGN_PX);
  if (off.length > 0) {
    problems.push(`${name}: the hidden input does not lie over the trigger (${off.join(', ')} differ by more than `
      + `${ALIGN_PX}px), so the browser anchors a refused field's message away from the control it names`);
  }
  if (walk.pointerEvents !== 'none') {
    problems.push(`${name}: the hidden input takes pointer events (${walk.pointerEvents}), so a press over the trigger reaches the input instead`);
  }
  if (walk.opacity !== '0') problems.push(`${name}: the hidden input is painted (opacity ${walk.opacity}), so the browser's own control shows over the trigger`);
  if (!walk.hit) problems.push(`${name}: the point at the trigger's centre is not the trigger, so a press there opens nothing the label names`);
  if (walk.valid) problems.push(`${name}: an empty field marked required checked valid, so required never reached the hidden input`);
  if (!walk.landed) {
    problems.push(`${name}: after the browser refused the empty field, focus was not on the trigger, so a keyboard `
      + 'user is left on an element nobody can see');
  }
  return problems;
}

export type Silence = {
  readyState: string;
  elements: number;
  errors: string[];
  scripts: string[];
};

export type TrapWalk = {
  panel: boolean;
  threw?: string;
  silence?: Silence;
  changed?: Lost[];
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
  if (walk.threw !== undefined) {
    return [threwProblem(`${name}: the page`, walk.threw, walk.silence)];
  }
  if (walk.expired && (walk.changed?.length ?? 0) > 0) {
    return [networkChangedProblem(`${name}: the page`, walk.changed ?? [])];
  }
  if (walk.expired) {
    return [`${name}: ${PANEL_HELD.name} was not seen within ${PANEL_HELD.ms}ms, which is that `
      + `size because ${PANEL_HELD.why}. The wait expired after ${walk.waitedMs}ms, so this says `
      + 'the panel was not seen in time and says nothing about whether the component draws one'
      + silenceOf(walk.silence)];
  }
  if (!walk.panel) {
    return [`${name}: the wait ended with no ${PANEL} in the document, so the component rendered `
      + `no panel and nothing was walked${silenceOf(walk.silence)}`];
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

async function walkTrap(cdp: Cdp, url: string): Promise<TrapWalk> {
  try {
    return await walkOnce(cdp, url);
  } catch (error) {
    if (!(error instanceof PageThrew)) throw error;
    return { panel: false, threw: error.message };
  }
}

async function walkOnce(cdp: Cdp, url: string): Promise<TrapWalk> {
  const { result, changed } = await loadInFreshTab(cdp,
    (sessionId) => walkIn(cdp, sessionId, url),
    (walk) => walk.expired === true);
  return { ...result, changed };
}

export async function openPage(cdp: Cdp, sessionId: string, url: string): Promise<void> {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 760, deviceScaleFactor: 1, mobile: false }, sessionId);
  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: COLLECT_ERRORS }, sessionId);
  await withTimeout(cdp.send('Page.navigate', { url }, sessionId), NAVIGATE.ms,
    `${url}: navigate timed out after ${NAVIGATE.ms}ms, which is that size because ${NAVIGATE.why}`);
}

async function walkIn(cdp: Cdp, sessionId: string, url: string): Promise<TrapWalk> {
  await openPage(cdp, sessionId, url);

  const ev = (expression: string) => evaluate(cdp, expression, sessionId);
  const tab = async (shift: boolean, canMove: boolean) => {
    const modifiers = shift ? 8 : 0;
    await ev(armExpression());
    for (const type of ['rawKeyDown', 'keyUp']) {
      await cdp.send('Input.dispatchKeyEvent', { type, windowsVirtualKeyCode: 9, key: 'Tab', code: 'Tab', modifiers }, sessionId);
    }
    await ev(canMove ? movedExpression(FOCUS_MOVED) : heldExpression(FOCUS_MOVED));
  };

  const ready = await ev(heldExpression(PANEL_HELD));

  const seen = await ev(`(() => {
    const panel = document.querySelector(${JSON.stringify(PANEL)});
    if (!panel) return { panel: false, focusables: 0, startsInside: false, silence: ${SILENCE} };
    const list = [...panel.querySelectorAll(${JSON.stringify(FOCUSABLE)})];
    list.forEach((el, i) => { el.dataset.arenaTrapIndex = String(i); });
    return { panel: true, focusables: list.length, startsInside: panel.contains(document.activeElement) };
  })()`);
  const waited = { expired: !ready.held, waitedMs: ready.waitedMs };
  if (!seen.panel || seen.focusables === 0) {
    return { ...seen, ...waited, forward: [], visited: 0, wrapsForward: false, wrapsBackward: false };
  }

  const canMove = seen.focusables > 1;
  const reached = new Set();
  const forward = [];
  for (let press = 1; press <= seen.focusables + 1; press += 1) {
    await tab(false, canMove);
    const step = await ev(`(() => {
      const panel = document.querySelector(${JSON.stringify(PANEL)});
      const active = document.activeElement;
      return { inside: panel.contains(active), index: active?.dataset?.arenaTrapIndex ?? null };
    })()`);
    forward.push({ press, inside: step.inside });
    if (step.index !== null) reached.add(step.index);
  }
  const afterLoop = await ev(`document.activeElement?.dataset?.arenaTrapIndex ?? null`);

  await ev(`(() => {
    const panel = document.querySelector(${JSON.stringify(PANEL)});
    panel.querySelector('[data-arena-trap-index="0"]').focus();
    return true;
  })()`);
  await tab(true, canMove);
  const back = await ev(`document.activeElement?.dataset?.arenaTrapIndex ?? null`);

  return {
    ...seen,
    ...waited,
    forward,
    visited: reached.size,
    wrapsForward: afterLoop === '0' || reached.size === seen.focusables,
    wrapsBackward: back === String(seen.focusables - 1),
  };
}

async function walkHandoff(cdp: Cdp, url: string): Promise<Handoff> {
  try {
    const { result, changed } = await loadInFreshTab(cdp,
      (sessionId) => handoffIn(cdp, sessionId, url),
      (walk) => walk.expired === true);
    return { ...result, changed };
  } catch (error) {
    if (!(error instanceof PageThrew)) throw error;
    return { seen: false, threw: error.message };
  }
}

async function handoffIn(cdp: Cdp, sessionId: string, url: string): Promise<Handoff> {
  await openPage(cdp, sessionId, url);
  const walk = await evaluate(cdp, handoffExpression(HANDOFF_SEEN, FOCUS_MOVED), sessionId) as Handoff;
  if (walk.seen) return walk;
  return { ...walk, silence: await evaluate(cdp, `(${SILENCE})`, sessionId) as Silence };
}

export function summaryLine(
  traps: number, handoffs: number, slowestTrap: number, slowestHandoff: number,
  panelHeld: Deadline = PANEL_HELD, handoffSeen: Deadline = HANDOFF_SEEN,
): string {
  return `check-focus-trap: ${traps} trap(s) walked with real Tab presses. Focus `
    + 'stayed inside, reached every control and wrapped both ways. '
    + `${handoffs} refused field(s) lay under their trigger and handed it focus. The slowest panel `
    + `was held after ${slowestTrap}ms of the ${panelHeld.ms}ms allowed, and the slowest handoff was seen `
    + `after ${slowestHandoff}ms of the ${handoffSeen.ms}ms allowed`;
}

const skip: (reason: string) => never = (reason) => cannotRun('check-focus-trap', reason);

async function main() {
  if (TRAPS.length === 0) skip('TRAPS is empty -- a walk with nothing to walk proves nothing');
  const exe = browserOrExit('check-focus-trap');

  const server = await startStaticServer(root);
  const chrome = await launchChromium(exe);
  const cdp = await connect(chrome.wsUrl);
  const problems = [];
  let slowestTrap = 0;
  let slowestHandoff = 0;
  try {
    for (const trap of TRAPS) {
      const walk = await walkTrap(cdp, `http://127.0.0.1:${server.port}/${trap.page}`);
      slowestTrap = Math.max(slowestTrap, Number(walk.waitedMs ?? 0));
      problems.push(...walkProblems(trap.name, walk));
    }
    for (const handoff of HANDOFFS) {
      const walk = await walkHandoff(cdp, `http://127.0.0.1:${server.port}/${handoff.page}${handoff.query}`);
      slowestHandoff = Math.max(slowestHandoff, Number(walk.waitedMs ?? 0));
      problems.push(...handoffProblems(handoff.name, walk));
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
  console.log(summaryLine(TRAPS.length, HANDOFFS.length, slowestTrap, slowestHandoff));
}

if (isMainModule(import.meta.url)) await main();
