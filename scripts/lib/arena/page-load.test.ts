/* A fake CDP connection stands in for the browser, so the suite spends no time and needs none.
 * Each navigation plays one outcome: the page readies, never readies after the host's network
 * changed under it, or never readies for a reason of its own. Counting navigations is what
 * tells a retry from a pass, because a retried load and a first load look the same afterwards. */

import test from 'node:test';
import assert from 'node:assert/strict';
import type { CdpMessage } from './cdp.ts';
import { NETWORK_CHANGED, loadInFreshTab, loadInPlace, networkChangedProblem, recordLost, withRecorder } from './page-load.ts';

type Outcome = 'ready' | 'changed' | 'stuck';

function fakeBrowser(outcomes: Outcome[]) {
  const handlers: ((message: CdpMessage) => void)[] = [];
  const calls: string[] = [];
  let tabs = 0;
  let navigations = 0;
  let playing: Outcome = 'ready';
  const emit = (method: string, sessionId: string, params: unknown) => {
    for (const handler of handlers) handler({ method, sessionId, params } as CdpMessage);
  };
  return {
    emit,
    handlers: () => handlers.length,
    calls,
    get navigations() { return navigations; },
    get tabs() { return tabs; },
    cdp: {
      on(handler: (message: CdpMessage) => void) {
        handlers.push(handler);
        return () => { handlers.splice(handlers.indexOf(handler), 1); };
      },
      async send(method: string, params?: unknown, sessionId?: string) {
        calls.push(method);
        if (method === 'Target.createTarget') { tabs += 1; return { targetId: `t${tabs}` }; }
        if (method === 'Target.attachToTarget') return { sessionId: `s${tabs}` };
        if (method === 'Page.navigate') {
          playing = outcomes[navigations] ?? 'stuck';
          navigations += 1;
          const url = (params as { url: string }).url;
          if (playing === 'changed') {
            for (const id of ['a', 'b']) {
              emit('Network.requestWillBeSent', sessionId!, { requestId: id, request: { url: `${url}/${id}.js` } });
              emit('Network.loadingFailed', sessionId!, { requestId: id, errorText: NETWORK_CHANGED });
            }
          }
          if (playing === 'stuck') {
            emit('Network.requestWillBeSent', sessionId!, { requestId: 'x', request: { url: `${url}/x.js` } });
            emit('Network.loadingFailed', sessionId!, { requestId: 'x', errorText: 'net::ERR_ABORTED' });
          }
        }
        return {};
      },
    },
    painted: () => playing === 'ready',
  };
}

async function load(outcomes: Outcome[], notes: string[] = []) {
  const browser = fakeBrowser(outcomes);
  const loaded = await loadInFreshTab(
    browser.cdp,
    async (sessionId) => {
      await browser.cdp.send('Page.navigate', { url: 'http://127.0.0.1/p' }, sessionId);
      return { ready: browser.painted() };
    },
    (result) => !result.ready,
    (line) => notes.push(line),
  );
  return { browser, loaded };
}

test('a page that lost requests to a network change and never readied is loaded once more and paints', async () => {
  const notes: string[] = [];
  const { browser, loaded } = await load(['changed', 'ready'], notes);

  assert.equal(notes.length, 1);
  assert.match(notes[0] ?? '', /loads once more/);
  assert.equal(loaded.result.ready, true);
  assert.deepEqual(loaded.changed, []);
  assert.equal(browser.navigations, 2);
  assert.equal(browser.tabs, 2, 'the second load is a fresh tab and not the first one navigated on');
  assert.equal(browser.calls.filter((one) => one === 'Target.closeTarget').length, 2);
});

test('two network changes in a row end in the network-change sentence naming the error and the URLs', async () => {
  const { browser, loaded } = await load(['changed', 'changed', 'ready']);

  assert.equal(loaded.result.ready, false);
  assert.equal(browser.navigations, 2, 'exactly one retry, never a third load');
  const problem = networkChangedProblem('default:dark: the react page', loaded.changed);
  assert.match(problem, /host's network changed while the page loaded/);
  assert.match(problem, new RegExp(NETWORK_CHANGED));
  assert.match(problem, /http:\/\/127\.0\.0\.1\/p\/a\.js/);
  assert.doesNotMatch(problem, /0B/);
});

test('a page that never readies for another reason fails as it did, with no retry', async () => {
  const { browser, loaded } = await load(['stuck', 'ready']);

  assert.equal(loaded.result.ready, false);
  assert.deepEqual(loaded.changed, []);
  assert.equal(browser.navigations, 1);
  assert.equal(browser.tabs, 1);
});

test('a page that readies is not retried even when a request failed on the way', async () => {
  const browser = fakeBrowser(['changed']);
  const loaded = await loadInFreshTab(
    browser.cdp,
    async (sessionId) => {
      await browser.cdp.send('Page.navigate', { url: 'http://127.0.0.1/p' }, sessionId);
      return { ready: true };
    },
    (result) => !result.ready,
  );

  assert.equal(browser.navigations, 1);
  assert.deepEqual(loaded.changed, []);
});

test('a failure in another tab is not this tab\'s', async () => {
  const browser = fakeBrowser(['stuck']);
  const loaded = await loadInFreshTab(
    browser.cdp,
    async (sessionId) => {
      await browser.cdp.send('Page.navigate', { url: 'http://127.0.0.1/p' }, sessionId);
      browser.emit('Network.loadingFailed', 'elsewhere', { requestId: 'x', errorText: NETWORK_CHANGED });
      return { ready: false };
    },
    (result) => !result.ready,
  );

  assert.equal(browser.navigations, 1);
  assert.deepEqual(loaded.changed, []);
});

test('a page rewritten in the tab it holds is rewritten once more on a network change, and only then', async () => {
  const lost = [{ url: 'old', errorText: NETWORK_CHANGED }];
  let writes = 0;
  const twice = await loadInPlace(lost, async () => {
    writes += 1;
    lost.push({ url: `http://127.0.0.1/s${writes}.css`, errorText: NETWORK_CHANGED });
    return { ready: writes > 5 };
  }, (one) => !one.ready, () => undefined);
  assert.equal(writes, 2, 'a failure from before the write is not this write\'s');
  assert.equal(twice.changed.length, 1);

  writes = 0;
  const other = await loadInPlace([], async () => { writes += 1; return { ready: false }; }, (one) => !one.ready);
  assert.equal(writes, 1);
  assert.deepEqual(other.changed, []);
});

test('no handler outlives its page, after a pass, a retry, or a throw in either load', async () => {
  const browser = fakeBrowser(['changed', 'ready', 'ready', 'stuck']);
  const quiet = () => undefined;
  const pass = (sessionId: string) => browser.cdp.send('Page.navigate', { url: 'u' }, sessionId)
    .then(() => ({ ready: browser.painted() }));
  const unready = (result: { ready: boolean }) => !result.ready;

  await loadInFreshTab(browser.cdp, pass, unready, quiet);
  await loadInFreshTab(browser.cdp, pass, unready, quiet);
  await loadInFreshTab(browser.cdp, pass, unready, quiet);
  assert.equal(browser.handlers(), 0, 'three pages and a retry leave no handler behind');

  let loads = 0;
  const thrownFirst = loadInFreshTab(browser.cdp, async () => { throw new Error('navigate timed out'); }, unready, quiet);
  await assert.rejects(thrownFirst, /navigate timed out/);
  assert.equal(browser.handlers(), 0, 'a throwing attempt removes its handler');

  const browser2 = fakeBrowser(['changed']);
  const thrownRetry = loadInFreshTab(browser2.cdp, async (sessionId) => {
    loads += 1;
    if (loads === 2) throw new Error('the load event never fired');
    await browser2.cdp.send('Page.navigate', { url: 'u' }, sessionId);
    return { ready: false };
  }, unready, quiet);
  await assert.rejects(thrownRetry, /load event never fired/);
  assert.equal(loads, 2);
  assert.equal(browser2.handlers(), 0, 'a throw inside the retry removes its handler');
});

test('the recorder forgets what it recorded when asked, and stops listening when stopped', () => {
  const browser = fakeBrowser([]);
  const recorder = recordLost(browser.cdp, 's1');
  browser.emit('Network.requestWillBeSent', 's1', { requestId: 'a', request: { url: 'u/a' } });
  browser.emit('Network.loadingFailed', 's1', { requestId: 'a', errorText: NETWORK_CHANGED });
  assert.equal(recorder.lost.length, 1);

  recorder.forget();
  assert.equal(recorder.lost.length, 0);
  browser.emit('Network.loadingFailed', 's1', { requestId: 'a', errorText: NETWORK_CHANGED });
  assert.equal(recorder.lost[0]?.url, 'an unknown URL', 'the URL map is cleared with the list');

  recorder.stop();
  assert.equal(browser.handlers(), 0);
});

test('a rewrite that lost a request to anything but a network change is not rewritten', async () => {
  const lost: { url: string; errorText: string }[] = [];
  let writes = 0;
  const loaded = await loadInPlace(lost, async () => {
    writes += 1;
    lost.push({ url: 'http://127.0.0.1/s.css', errorText: 'net::ERR_CONNECTION_REFUSED' });
    return { ready: false };
  }, (one) => !one.ready, () => undefined);

  assert.equal(writes, 1);
  assert.deepEqual(loaded.changed, []);
});

test('a recorder held for a body is stopped when the body returns and when it throws, and the throw travels', async () => {
  let stops = 0;
  const cdp = { on() { return () => { stops += 1; }; } };

  const value = await withRecorder(cdp, 's1', async (recorder) => {
    assert.equal(stops, 0, 'the recorder listens while the body runs');
    assert.deepEqual(recorder.lost, []);
    return 7;
  });
  assert.equal(value, 7);
  assert.equal(stops, 1);

  await assert.rejects(withRecorder(cdp, 's1', async () => { throw new Error('measure failed'); }), /measure failed/);
  assert.equal(stops, 2);
});
