/* An anchored panel is placed by script in one layer and by the CDK overlay in the other, and happy-
 * dom has no layout and no top layer, so no suite sees where a panel lands. This drives real Chromium
 * over each declared demo page: it pins the playground stage to the viewport edge the panel prefers to
 * open toward, clips it with overflow: hidden and gives it a transform, opens the panel, and reads
 * three facts. The panel is painted at its centre, so no ancestor clipped it; it lies inside the
 * viewport; and it opened on the far side of its trigger, so it flipped. A case naming an edge seeds
 * its align and puts the panel's aligned edge on the named anchor's; a pin puts the trigger against an
 * edge so the panel must flip, and a width leaves neither alignment room. A case naming rows measures
 * the smallest against each density floor check:target-size declares, the panel open. A wait is for a
 * condition with a declared deadline, never a span. */

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
import { SCOPES, type Scope } from './check-target-size.ts';

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

export type Aligned = { anchor: string; align: 'start' | 'end' };

export type Anchored = { name: string; page: string; trigger: string; panel: string; open: 'click' | 'focus'; prefer: Edge; rows?: string; edge?: Aligned; seed?: string; pin?: Aligned['align']; width?: number };

export type EdgeReading = { wanted: number; actual: number };

export type RowReading = { scope: string; floor: number; count: number; smallest: number };

const REACT = 'frameworks/react/components';
const ANGULAR = 'frameworks/angular/components';

const SPLIT = '[data-arena-part="split-button"]';

const MENU = '[aria-haspopup="menu"]';

const FITS_NEITHER = 208;

function flipped(layer: 'react' | 'angular', root: string): Anchored[] {
  const split = `${root}/forms/arena-split-button/ArenaSplitButton.demo.generated.html`;
  const menu = `${root}/navigation/arena-menu/ArenaMenu.demo.generated.html`;
  const shared = { trigger: MENU, panel: '[role="menu"]', open: 'click', prefer: 'below' } as const;
  return [
    { ...shared, name: `ArenaSplitButton:${layer}:end-at-start`, page: split, pin: 'start', edge: { anchor: SPLIT, align: 'start' } },
    { ...shared, name: `ArenaSplitButton:${layer}:start-at-end`, page: split, pin: 'end', edge: { anchor: SPLIT, align: 'end' }, seed: 'align=start' },
    { ...shared, name: `ArenaMenu:${layer}:end-at-start`, page: menu, pin: 'start', edge: { anchor: MENU, align: 'start' }, seed: 'align=end' },
    { ...shared, name: `ArenaMenu:${layer}:start-at-end`, page: menu, pin: 'end', edge: { anchor: MENU, align: 'end' }, seed: 'align=start' },
    { ...shared, name: `ArenaMenu:${layer}:fits-neither`, page: menu, pin: 'end', width: FITS_NEITHER, edge: { anchor: MENU, align: 'end' }, seed: 'align=start' },
  ];
}

export const ANCHORED: Anchored[] = [
  { name: 'ArenaPopover:react', page: `${REACT}/feedback/arena-popover/ArenaPopover.demo.generated.html`, trigger: '[aria-haspopup="dialog"]', panel: '[role="dialog"]', open: 'click', prefer: 'below' },
  { name: 'ArenaPopover:angular', page: `${ANGULAR}/feedback/arena-popover/ArenaPopover.demo.generated.html`, trigger: '[aria-haspopup="dialog"]', panel: '[role="dialog"]', open: 'click', prefer: 'below' },
  { name: 'ArenaMenu:react', page: `${REACT}/navigation/arena-menu/ArenaMenu.demo.generated.html`, trigger: '[aria-haspopup="menu"]', panel: '[role="menu"]', open: 'click', prefer: 'below' },
  { name: 'ArenaMenu:angular', page: `${ANGULAR}/navigation/arena-menu/ArenaMenu.demo.generated.html`, trigger: '[aria-haspopup="menu"]', panel: '[role="menu"]', open: 'click', prefer: 'below' },
  { name: 'ArenaTooltip:react', page: `${REACT}/feedback/arena-tooltip/ArenaTooltip.demo.generated.html`, trigger: '.pg-stage button', panel: '[role="tooltip"]', open: 'focus', prefer: 'above' },
  { name: 'ArenaTooltip:angular', page: `${ANGULAR}/feedback/arena-tooltip/ArenaTooltip.demo.generated.html`, trigger: '.pg-stage button', panel: '[role="tooltip"]', open: 'focus', prefer: 'above' },
  { name: 'ArenaCombobox:react', page: `${REACT}/forms/arena-combobox/ArenaCombobox.demo.generated.html`, trigger: '[role="combobox"]', panel: '[role="listbox"]', open: 'click', prefer: 'below', rows: '[role="option"]' },
  { name: 'ArenaCombobox:angular', page: `${ANGULAR}/forms/arena-combobox/ArenaCombobox.demo.generated.html`, trigger: '[role="combobox"]', panel: '[role="listbox"]', open: 'click', prefer: 'below', rows: '[role="option"]' },
  { name: 'ArenaMultiSelect:react', page: `${REACT}/forms/arena-multi-select/ArenaMultiSelect.demo.generated.html`, trigger: '[role="combobox"]', panel: '[role="listbox"]', open: 'click', prefer: 'below', rows: '[role="option"]' },
  { name: 'ArenaMultiSelect:angular', page: `${ANGULAR}/forms/arena-multi-select/ArenaMultiSelect.demo.generated.html`, trigger: '[role="combobox"]', panel: '[role="listbox"]', open: 'click', prefer: 'below', rows: '[role="option"]' },
  { name: 'ArenaSplitButton:react', page: `${REACT}/forms/arena-split-button/ArenaSplitButton.demo.generated.html`, trigger: '[aria-haspopup="menu"]', panel: '[role="menu"]', open: 'click', prefer: 'below', edge: { anchor: '[data-arena-part="split-button"]', align: 'start' }, seed: 'align=start' },
  { name: 'ArenaSplitButton:angular', page: `${ANGULAR}/forms/arena-split-button/ArenaSplitButton.demo.generated.html`, trigger: '[aria-haspopup="menu"]', panel: '[role="menu"]', open: 'click', prefer: 'below', edge: { anchor: '[data-arena-part="split-button"]', align: 'start' }, seed: 'align=start' },
  ...flipped('react', REACT),
  ...flipped('angular', ANGULAR),
];

export type Reading = {
  threw?: string;
  changed?: Lost[];
  mounted: boolean;
  opened: boolean;
  painted?: boolean;
  inside?: boolean;
  side?: Edge | 'overlapping';
  rows?: RowReading[];
  edge?: EdgeReading;
};

export function caseUrl(origin: string, kase: Anchored) {
  return `${origin}/${kase.page}${kase.seed === undefined ? '' : `?${kase.seed}`}`;
}

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
  const pin = kase.pin === undefined ? '' : `Object.assign(stage.style, { display: 'flex', justifyContent: '${kase.pin === 'start' ? 'flex-start' : 'flex-end'}' });`;
  return `(() => {
    const trigger = document.querySelector(${JSON.stringify(kase.trigger)});
    const stage = trigger && trigger.closest('.pg-stage');
    if (!stage) return false;
    const tall = Math.ceil(trigger.getBoundingClientRect().height) + 2;
    Object.assign(stage.style, { position: 'fixed', left: '16px', right: '16px', ${edge}: '8px',
      height: tall + 'px', minHeight: '0', padding: '0', overflow: 'hidden', transform: 'translateZ(0)' });
    ${pin}
    return true;
  })()`;
}

export function openExpression(kase: Anchored) {
  const act = kase.open === 'click' ? 'trigger.click()' : 'trigger.focus()';
  return `(() => { const trigger = document.querySelector(${JSON.stringify(kase.trigger)}); ${act}; return true; })()`;
}

export function smallestRow(heights: number[]) {
  return heights.length ? Math.min(...heights) : 0;
}

export function readExpression(kase: Anchored, scopes: Scope[] = SCOPES) {
  const measured = scopes.map((scope) => ({ scope: scope.name, klass: scope.klass, floor: scope.floor }));
  return `(() => {
    const smallestRow = ${smallestRow.toString()};
    const rowsIn = (one) => {
      const body = document.body;
      for (const other of ['arena-comfortable', 'arena-compact']) body.classList.remove(other);
      if (one.klass) body.classList.add(one.klass);
      const heights = ${JSON.stringify(kase.rows ?? '')}
        ? Array.from(document.querySelectorAll(${JSON.stringify(kase.rows ?? '')})).map((row) => row.getBoundingClientRect().height)
        : [];
      if (one.klass) body.classList.remove(one.klass);
      return { scope: one.scope, floor: one.floor, count: heights.length, smallest: smallestRow(heights) };
    };
    const rows = ${JSON.stringify(kase.rows ?? '')} ? ${JSON.stringify(measured)}.map(rowsIn) : undefined;
    const trigger = document.querySelector(${JSON.stringify(kase.trigger)});
    const panel = document.querySelector(${JSON.stringify(kase.panel)});
    const t = trigger.getBoundingClientRect();
    const p = panel.getBoundingClientRect();
    const hit = document.elementFromPoint(p.left + p.width / 2, p.top + p.height / 2);
    const inside = p.left >= 0 && p.top >= 0 && p.right <= innerWidth && p.bottom <= innerHeight;
    const side = p.top >= t.bottom ? 'below' : p.bottom <= t.top ? 'above' : 'overlapping';
    const aligned = ${JSON.stringify(kase.edge ?? null)};
    const anchor = aligned && document.querySelector(aligned.anchor);
    const a = anchor && anchor.getBoundingClientRect();
    const edge = a ? {
      wanted: Math.max(0, Math.min(aligned.align === 'start' ? a.left : a.right - p.width, innerWidth - p.width)),
      actual: p.left,
    } : undefined;
    return { painted: Boolean(hit && panel.contains(hit)), inside, side, rows, edge };
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
  if (kase.edge !== undefined) {
    const { anchor, align } = kase.edge;
    if (reading.edge === undefined) {
      problems.push(`${kase.name}: no ${anchor} was found to measure the panel's ${align} edge from`);
    } else if (Math.abs(reading.edge.actual - reading.edge.wanted) > 1) {
      problems.push(`${kase.name}: the panel starts at ${Math.round(reading.edge.actual)}px, and its ${align} edge measured `
        + `from ${anchor} puts it at ${Math.round(reading.edge.wanted)}px`);
    }
  }
  for (const row of kase.rows === undefined ? [] : reading.rows ?? []) {
    if (row.count === 0) {
      problems.push(`${kase.name}: the open panel drew no ${kase.rows} in the ${row.scope} scope, so its row floor was measured against nothing`);
    } else if (row.smallest < row.floor) {
      problems.push(`${kase.name}: the smallest ${kase.rows} is ${Math.round(row.smallest * 100) / 100}px tall in the `
        + `${row.scope} scope, and the floor there is ${row.floor}px`);
    }
  }
  if (kase.rows !== undefined && (reading.rows?.length ?? 0) < SCOPES.length) {
    problems.push(`${kase.name}: its rows were measured in fewer density scopes than SCOPES declares (${SCOPES.map((s) => s.name).join(', ')})`);
  }
  return problems;
}

async function readIn(cdp: Cdp, sessionId: string, url: string, kase: Anchored): Promise<Reading> {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: kase.width ?? 1000, height: 760, deviceScaleFactor: 1, mobile: false }, sessionId);
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
      problems.push(...anchoringProblems(kase, await readCase(cdp, caseUrl(`http://127.0.0.1:${server.port}`, kase), kase)));
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
  const measured = ANCHORED.filter((kase) => kase.rows !== undefined).length;
  console.log(`check-anchoring: ${ANCHORED.length} panel(s) opened from a trigger pinned to a clipped, `
    + 'transformed edge, and each painted whole, inside the viewport, on the far side of its trigger; '
    + `${ANCHORED.filter((kase) => kase.edge !== undefined).length} lined up with the edge they name, `
    + `${ANCHORED.filter((kase) => kase.pin !== undefined).length} of them pinned to a horizontal edge so the aligned panel had to flip, `
    + `${ANCHORED.filter((kase) => kase.width !== undefined).length} in a viewport narrower than the panel plus its anchor so it fit neither alignment; `
    + `the rows of ${measured} clear the floor of every density scope`);
}

if (isMainModule(import.meta.url)) await main();
