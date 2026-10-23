/* What a page said while it was loading, collected before anything on the page runs. It is here
 * rather than in the gate that first needed it because every browser gate has to tell the same two
 * failures apart: a page that rendered nothing because the component draws nothing, and one that
 * rendered nothing because its bundle came back 404 and never ran. Without the resource list those
 * read identically, and the second sends a reader to a component that is fine. It is registered
 * through Page.addScriptToEvaluateOnNewDocument, ahead of the document's own scripts, and listens
 * in the capture phase because a failed script or image fires an error that does not bubble. The
 * findings below are those two failures written down: an unpainted page carries the wait actually
 * SPENT and not only the bound that ended it, and a page that THREW is a sentence of its own,
 * since nothing about it was slow and a reader sent to look at a render is reading the wrong file. */

import type { Deadline } from './deadline.ts';

export const COLLECT = `window.__arenaPageErrors = [];
addEventListener('error', (e) => window.__arenaPageErrors.push(
  String((e.target && e.target.src) ? 'failed to load ' + e.target.src : e.message)), true);
addEventListener('unhandledrejection', (e) => window.__arenaPageErrors.push('unhandled rejection: ' + String(e.reason)));`;

export type Silence = {
  readyState: string;
  elements: number;
  errors: string[];
  scripts: string[];
};

export const REPORT = `(() => ({
  readyState: document.readyState,
  elements: document.body ? document.body.getElementsByTagName('*').length : 0,
  errors: (window.__arenaPageErrors || []).slice(0, 5),
  scripts: performance.getEntriesByType('resource')
    .filter((r) => r.name.endsWith('.js'))
    .map((r) => new URL(r.name).pathname.split('/').pop()
      + ' ' + (r.responseStatus === undefined ? '?' : r.responseStatus)
      + ' ' + r.decodedBodySize + 'B')
    .slice(0, 8),
}))()`;

export type Painted = { ready: boolean; waitedMs: number };

export function paintedProblem(what: string, bound: Deadline, painted: Painted,
  consequence: string, silence?: Silence) {
  if (painted.ready) return null;
  return `${what} never signalled that it had painted, within ${bound.ms}ms, which is that size `
    + `because ${bound.why}. The wait ended after ${painted.waitedMs}ms, ${consequence}`
    + `${silenceOf(silence)}`;
}

export function threwProblem(what: string, threw: string, silence?: Silence) {
  return `${what} threw while the gate was reading it: ${threw}. Nothing here timed out, so the `
    + `expression or the page it ran in is what to look at${silenceOf(silence)}`;
}

export function silenceOf(silence?: Silence) {
  if (!silence) return '';
  const scripts = silence.scripts.length === 0 ? 'none' : silence.scripts.join(', ');
  const errors = silence.errors.length === 0 ? 'none' : silence.errors.join(' | ');
  return `. The document was ${silence.readyState} holding ${silence.elements} element(s); `
    + `script(s) fetched: ${scripts}; page error(s): ${errors}. A page that fetched its entry and `
    + 'raised nothing rendered what it was asked to; one whose entry came back empty or 404 never '
    + 'ran, and the bundle beside the page is what to look at';
}


export const COLLECT_WARNINGS = `window.__arenaWarnings = [];
(() => {
  const warn = console.warn;
  console.warn = function (...args) {
    window.__arenaWarnings.push(args.map((one) => String(one)).join(' '));
    return warn.apply(this, args);
  };
})();`;

export const WARNINGS = '(window.__arenaWarnings || []).slice()';

export function warningsProblem(name: string, lists: { react: string[]; angular: string[] }) {
  const sorted = (list: string[]) => [...list].sort();
  const a = sorted(lists.react);
  const b = sorted(lists.angular);
  if (a.length === b.length && a.every((one, index) => one === b[index])) return null;
  const only = (from: string[], other: string[]) => {
    const rest = [...other];
    return from.filter((one) => {
      const at = rest.indexOf(one);
      if (at === -1) return true;
      rest.splice(at, 1);
      return false;
    });
  };
  const show = (list: string[]) => (list.length === 0 ? ' none' : list.map((one) => `\n      ${one}`).join(''));
  return `${name}: the two layers print different console warnings, so one of them runs a path the `
    + `other skips. React printed:${show(lists.react)}\n    Angular printed:${show(lists.angular)}\n    `
    + `Only in React:${show(only(a, b))}\n    Only in Angular:${show(only(b, a))}`;
}
