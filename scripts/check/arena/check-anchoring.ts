/* An anchored panel is placed by script in one layer and by the CDK overlay in the other, and
 * happy-dom has no layout and no top layer, so no suite sees where a panel lands. This drives real
 * Chromium over each declared demo page: it pins the playground stage to the viewport edge the
 * panel prefers to open toward, clips it with overflow: hidden and gives it a transform, opens the
 * panel from its own trigger, and reads three facts. The panel is painted at its centre, so no
 * ancestor clipped it; it lies inside the viewport; and it opened on the far side of its trigger,
 * so it flipped. A wait is for a condition with a declared deadline, never a span. */

import { withTimeout } from '../../utils/with-timeout.ts';
import { deadline, type Deadline } from '../../lib/arena/deadline.ts';
import { POLL_MS } from '../../lib/arena/wait-for.ts';
import { isMainModule } from '../../utils/main-module.ts';
import { startStaticServer } from '../../lib/arena/static-server.ts';
import { browserOrExit, launchChromium } from '../../lib/arena/chromium.ts';
import { connect, evaluate, PageThrew, type Cdp } from '../../lib/arena/cdp.ts';
import { cannotRun } from '../../lib/arena/arena-scripts-vars.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { threwProblem } from '../../lib/arena/page-errors.ts';
import { loadInFreshTab, networkChangedProblem, type Lost } from '../../lib/arena/page-load.ts';

export const node = {
  name: 'check:anchoring',
  reads: [
    'frameworks/react/components/**', 'frameworks/angular/components/**',
    'frameworks/tailwind/consume/**', 'frameworks/react/vendor/**',
    'frameworks/react/playground/**', 'frameworks/angular/build/demo/**',
  ],
  writes: [],
  feeds: [],
};

export const NAVIGATE: Deadline = deadline('anchoring:navigate', 30_000,
  'a demo page fetches its own bundle, so the first navigation of a sweep pays for a cold HTTP '
  + 'cache and for whatever the static server is still writing');

export const MOUNTED: Deadline = deadline('anchoring:mounted', 20_000,
  'the trigger is drawn once the framework has mounted the page, which covers a bundle parse and '
  + 'a hydration on a runner with no GPU');

export const OPENED: Deadline = deadline('anchoring:opened', 5_000,
  'the panel is shown and placed after the press, in an effect or an after-render hook, and a '
  + 'transition may run before its box settles');

export type Edge = 'below' | 'above';

export type Anchored = { name: string; page: string; trigger: string; panel: string; open: 'click' | 'focus'; prefer: Edge };

const REACT = 'frameworks/react/components';
const ANGULAR = 'frameworks/angular/components';

export const ANCHORED: Anchored[] = [
  { name: 'ArenaPopover:react', page: `${REACT}/feedback/arena-popover/ArenaPopover.demo.generated.html`, trigger: '[aria-haspopup="dialog"]', panel: '[role="dialog"]', open: 'click', prefer: 'below' },
  { name: 'ArenaPopover:angular', page: `${ANGULAR}/feedback/arena-popover/ArenaPopover.demo.generated.html`, trigger: '[aria-haspopup="dialog"]', panel: '[role="dialog"]', open: 'click', prefer: 'below' },
  { name: 'ArenaMenu:react', page: `${REACT}/navigation/arena-menu/ArenaMenu.demo.generated.html`, trigger: '[aria-haspopup="menu"]', panel: '[role="menu"]', open: 'click', prefer: 'below' },
  { name: 'ArenaMenu:angular', page: `${ANGULAR}/navigation/arena-menu/ArenaMenu.demo.generated.html`, trigger: '[aria-haspopup="menu"]', panel: '[role="menu"]', open: 'click', prefer: 'below' },
  { name: 'ArenaTooltip:react', page: `${REACT}/feedback/arena-tooltip/ArenaTooltip.demo.generated.html`, trigger: '.pg-stage button', panel: '[role="tooltip"]', open: 'focus', prefer: 'above' },
  { name: 'ArenaTooltip:angular', page: `${ANGULAR}/feedback/arena-tooltip/ArenaTooltip.demo.generated.html`, trigger: '.pg-stage button', panel: '[role="tooltip"]', open: 'focus', prefer: 'above' },
];

export type Reading = {
  threw?: string;
  changed?: Lost[];
  mounted: boolean;
  opened: boolean;
  painted?: boolean;
  inside?: boolean;
  side?: Edge | 'overlapping';
};

export function waitExpression(selector: string, bound: Deadline) {
  return `new Promise((resolve) => {
    const until = Date.now() + ${bound.ms};
    const tick = () => {
      const found = document.querySelector(${JSON.stringify(selector)});
      const box = found && found.getBoundingClientRect();
      if (box && box.width > 0 && box.height > 0) resolve(true);
      else if (Date.now() >= until) resolve(false);
      else setTimeout(tick, ${POLL_MS});
    };
    tick();
  })`;
}

export function confineExpression(kase: Anchored) {
  const edge = kase.prefer === 'below' ? 'bottom' : 'top';
  return `(() => {
    const trigger = document.querySelector(${JSON.stringify(kase.trigger)});
    const stage = trigger && trigger.closest('.pg-stage');
    if (!stage) return false;
    const tall = Math.ceil(trigger.getBoundingClientRect().height) + 2;
    Object.assign(stage.style, { position: 'fixed', left: '16px', right: '16px', ${edge}: '8px',
      height: tall + 'px', minHeight: '0', padding: '0', overflow: 'hidden', transform: 'translateZ(0)' });
    return true;
  })()`;
}

export function openExpression(kase: Anchored) {
  const act = kase.open === 'click' ? 'trigger.click()' : 'trigger.focus()';
  return `(() => { const trigger = document.querySelector(${JSON.stringify(kase.trigger)}); ${act}; return true; })()`;
}

export function readExpression(kase: Anchored) {
  return `(() => {
    const trigger = document.querySelector(${JSON.stringify(kase.trigger)});
    const panel = document.querySelector(${JSON.stringify(kase.panel)});
    const t = trigger.getBoundingClientRect();
    const p = panel.getBoundingClientRect();
    const hit = document.elementFromPoint(p.left + p.width / 2, p.top + p.height / 2);
    const inside = p.left >= 0 && p.top >= 0 && p.right <= innerWidth && p.bottom <= innerHeight;
    const side = p.top >= t.bottom ? 'below' : p.bottom <= t.top ? 'above' : 'overlapping';
    return { painted: Boolean(hit && panel.contains(hit)), inside, side };
  })()`;
}

export function anchoringProblems(kase: Anchored, reading: Reading) {
  if (reading.threw !== undefined) return [threwProblem(`${kase.name}: the page`, reading.threw)];
  if (!reading.mounted && (reading.changed?.length ?? 0) > 0) {
    return [networkChangedProblem(`${kase.name}: the page`, reading.changed ?? [])];
  }
  if (!reading.mounted) {
    return [`${kase.name}: ${MOUNTED.name} saw no ${kase.trigger} within ${MOUNTED.ms}ms, which is that `
      + `size because ${MOUNTED.why}, so nothing was opened`];
  }
  if (!reading.opened) {
    return [`${kase.name}: ${OPENED.name} saw no laid-out ${kase.panel} within ${OPENED.ms}ms after the `
      + `trigger was ${kase.open === 'click' ? 'pressed' : 'focused'}, so the panel never opened with a box`];
  }
  const problems: string[] = [];
  if (!reading.painted) {
    problems.push(`${kase.name}: the panel is not what paints at its own centre, so the clipped, `
      + 'transformed stage around its trigger cut it off or something covers it');
  }
  if (!reading.inside) problems.push(`${kase.name}: the panel leaves the viewport`);
  const away: Edge = kase.prefer === 'below' ? 'above' : 'below';
  if (reading.side !== away) {
    problems.push(`${kase.name}: the trigger sits at the ${kase.prefer === 'below' ? 'bottom' : 'top'} edge and `
      + `the panel opened ${reading.side} it rather than flipping ${away}`);
  }
  return problems;
}

async function readIn(cdp: Cdp, sessionId: string, url: string, kase: Anchored): Promise<Reading> {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 760, deviceScaleFactor: 1, mobile: false }, sessionId);
  await cdp.send('Page.enable', {}, sessionId);
  await withTimeout(cdp.send('Page.navigate', { url }, sessionId), NAVIGATE.ms,
    `${url}: navigate timed out after ${NAVIGATE.ms}ms, which is that size because ${NAVIGATE.why}`);
  const ev = (expression: string) => evaluate(cdp, expression, sessionId);
  const mounted = await ev(waitExpression(kase.trigger, MOUNTED));
  if (!mounted || !(await ev(confineExpression(kase)))) return { mounted: false, opened: false };
  await ev(openExpression(kase));
  const opened = await ev(waitExpression(kase.panel, OPENED));
  if (!opened) return { mounted: true, opened: false };
  return { mounted: true, opened: true, ...(await ev(readExpression(kase))) };
}

async function readCase(cdp: Cdp, url: string, kase: Anchored): Promise<Reading> {
  try {
    const { result, changed } = await loadInFreshTab(cdp, (sessionId) => readIn(cdp, sessionId, url, kase),
      (reading) => !reading.mounted);
    return { ...result, changed };
  } catch (error) {
    if (!(error instanceof PageThrew)) throw error;
    return { mounted: false, opened: false, threw: error.message };
  }
}

const skip: (reason: string) => never = (reason) => cannotRun('check-anchoring', reason);

async function main() {
  if (ANCHORED.length === 0) skip('ANCHORED is empty -- a sweep with nothing to open proves nothing');
  const exe = browserOrExit('check-anchoring');
  const server = await startStaticServer(root);
  const chrome = await launchChromium(exe);
  const cdp = await connect(chrome.wsUrl);
  const problems: string[] = [];
  try {
    for (const kase of ANCHORED) {
      problems.push(...anchoringProblems(kase, await readCase(cdp, `http://127.0.0.1:${server.port}/${kase.page}`, kase)));
    }
  } finally {
    await chrome.kill?.();
    server.close?.();
  }
  if (problems.length) {
    console.error(`check-anchoring: ${problems.length} problem(s)\n`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`check-anchoring: ${ANCHORED.length} panel(s) opened from a trigger pinned to a clipped, `
    + 'transformed edge, and each painted whole, inside the viewport, on the far side of its trigger');
}

if (isMainModule(import.meta.url)) await main();
