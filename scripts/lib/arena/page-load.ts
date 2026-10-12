/* Loads a page in a fresh tab, or rewrites one in the tab it holds, and loads it once more when
 * the host's network changed under it. A real change of address or link makes Chromium fail every
 * request in flight with net::ERR_NETWORK_CHANGED, loopback included, without a retry, so a page
 * whose script lost its request never signals that it painted and the gate blames the
 * page. The failed loads are read from the Network domain, and only a page that did not ready AND
 * lost a request that way loads a second time. A page that fails for another reason is returned
 * as it came. An attempt that throws, on a timeout, is not retried. */

import type { Cdp } from './cdp.ts';

export const NETWORK_CHANGED = 'net::ERR_NETWORK_CHANGED';

export const LOADS = 2;

export type Lost = { url: string; errorText: string };

export type Note = (line: string) => void;

const say: Note = (line) => console.error(line);

const retried = (changed: Lost[]) => `page-load: the host's network changed under a page (${changed.length} `
  + `request(s) failed with ${NETWORK_CHANGED}), so it loads once more`;

export type Loaded<T> = { result: T; changed: Lost[] };

export function recordLost(cdp: Pick<Cdp, 'on'>, sessionId: string) {
  const urls = new Map<string, string>();
  const lost: Lost[] = [];
  const stop = cdp.on((message) => {
    if (message.sessionId !== sessionId) return;
    const params = message.params as { requestId?: string; errorText?: string; request?: { url?: string } };
    if (message.method === 'Network.requestWillBeSent') {
      urls.set(String(params.requestId), String(params.request?.url));
    } else if (message.method === 'Network.loadingFailed') {
      lost.push({ url: urls.get(String(params.requestId)) ?? 'an unknown URL', errorText: String(params.errorText) });
    }
  });
  return { lost, stop, forget() { lost.length = 0; urls.clear(); } };
}

export async function withRecorder<R>(cdp: Pick<Cdp, 'on'>, sessionId: string,
  body: (recorder: ReturnType<typeof recordLost>) => Promise<R>) {
  const recorder = recordLost(cdp, sessionId);
  try {
    return await body(recorder);
  } finally {
    recorder.stop();
  }
}

export async function loadInFreshTab<T>(
  cdp: Pick<Cdp, 'send' | 'on'>,
  attempt: (sessionId: string) => Promise<T>,
  unready: (result: T) => boolean,
  note: Note = say,
): Promise<Loaded<T>> {
  for (let load = 1; ; load += 1) {
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    let recorder: ReturnType<typeof recordLost> | undefined;
    try {
      const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
      recorder = recordLost(cdp, sessionId);
      const { lost } = recorder;
      await cdp.send('Network.enable', {}, sessionId);
      const result = await attempt(sessionId);
      const changed = unready(result) ? lost.filter((one) => one.errorText === NETWORK_CHANGED) : [];
      if (changed.length === 0 || load === LOADS) return { result, changed };
      note(retried(changed));
    } finally {
      recorder?.stop();
      try { await cdp.send('Target.closeTarget', { targetId }); } catch { void 0; }
    }
  }
}

export async function loadInPlace<T>(
  lost: Lost[],
  attempt: () => Promise<T>,
  unready: (result: T) => boolean,
  note: Note = say,
): Promise<Loaded<T>> {
  for (let load = 1; ; load += 1) {
    const mark = lost.length;
    const result = await attempt();
    const changed = unready(result) ? lost.slice(mark).filter((one) => one.errorText === NETWORK_CHANGED) : [];
    if (changed.length === 0 || load === LOADS) return { result, changed };
    note(retried(changed));
  }
}

export function networkChangedProblem(what: string, changed: Lost[]) {
  const urls = [...new Set(changed.map((one) => one.url))];
  const shown = urls.slice(0, 5).join(', ') + (urls.length > 5 ? `, and ${urls.length - 5} more` : '');
  return `${what} never signalled that it had painted because the host's network changed while the `
    + `page loaded: ${changed.length} request(s) failed with ${NETWORK_CHANGED} (${shown}). The page `
    + 'loaded a second time in a fresh tab and lost requests the same way, so nothing here says '
    + 'anything about the page, and the gate is worth running once the machine\'s network is steady';
}
