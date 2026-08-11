/* What a page said while it was loading, collected before anything on the page runs. It is here
 * rather than in the gate that first needed it because both browser gates have to tell the same
 * two failures apart: a page that rendered nothing because the component draws nothing, and one
 * that rendered nothing because its bundle came back 404 and never ran. Without the resource
 * list those read identically, and the second sends a reader to look at a component that is
 * fine. It is registered through Page.addScriptToEvaluateOnNewDocument, so the listener is
 * installed ahead of the document's own scripts, and it listens in the capture phase because a
 * failed script or image fires an error event that does not bubble. */

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

export function silenceOf(silence?: Silence) {
  if (!silence) return '';
  const scripts = silence.scripts.length === 0 ? 'none' : silence.scripts.join(', ');
  const errors = silence.errors.length === 0 ? 'none' : silence.errors.join(' | ');
  return `. The document was ${silence.readyState} holding ${silence.elements} element(s); `
    + `script(s) fetched: ${scripts}; page error(s): ${errors}. A page that fetched its entry and `
    + 'raised nothing rendered what it was asked to; one whose entry came back empty or 404 never '
    + 'ran, and the bundle beside the page is what to look at';
}
