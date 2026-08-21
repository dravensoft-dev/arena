/* Draws a raster of a page of the site, in the browser the pixel gates already drive. A
 * hand-exported PNG would be the one artifact in the tree nobody could regenerate, and it would
 * drift from the palette the day a token moved; one rendered here is the same tokens the site is
 * drawn from, so it cannot show a colour Arena no longer ships. It is the only step of the site
 * build that needs a browser, and it fails loudly rather than emitting a blank image, because a
 * picture nobody looked at is exactly the artifact that ships broken. The size is the caller's:
 * a link preview and a page's own hero are read at different distances. */

import { pathToFileURL } from 'node:url';
import { browserOrExit, launchChromium } from './chromium.ts';
import { connect, evaluate } from './cdp.ts';
import { withTimeout } from '../../utils/with-timeout.ts';
import { deadline } from './deadline.ts';

export const NAVIGATE = deadline('page-image:navigate', 30_000,
  'a cold browser has to start, read the token stylesheets the page imports and load three font '
  + 'binaries from disk before anything is drawn, and a first run does all of it at once');

export const FONTS = deadline('page-image:fonts', 10_000,
  'document.fonts.ready resolves once the faces the page actually uses are decoded, and a card '
  + 'captured before that is the one that ships in a fallback family nobody chose');

export async function renderPageImage(pagePath: string, width: number, height: number) {
  const exe = browserOrExit('build:site');
  const chrome = await launchChromium(exe);
  const cdp = await connect(chrome.wsUrl);
  try {
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });

    await cdp.send('Emulation.setDeviceMetricsOverride',
      { width, height, deviceScaleFactor: 1, mobile: false }, sessionId);
    await cdp.send('Page.enable', {}, sessionId);

    const settled = new Promise<void>((resolve) => {
      cdp.on((message) => {
        if (message.method === 'Page.loadEventFired'
          && (message as { sessionId?: string }).sessionId === sessionId) resolve();
      });
    });

    const url = pathToFileURL(pagePath).href;
    await withTimeout(cdp.send('Page.navigate', { url }, sessionId), NAVIGATE.ms,
      `${url}: navigate timed out after ${NAVIGATE.ms}ms, which is that size because ${NAVIGATE.why}`);
    await withTimeout(settled, NAVIGATE.ms,
      `${url}: the load event never fired within ${NAVIGATE.ms}ms, which is that size because ${NAVIGATE.why}`);

    await withTimeout(evaluate(cdp, 'document.fonts.ready.then(() => true)', sessionId), FONTS.ms,
      `${url}: the fonts never became ready within ${FONTS.ms}ms, which is that size because ${FONTS.why}`);

    const shot = await cdp.send('Page.captureScreenshot',
      { format: 'png', clip: { x: 0, y: 0, width, height, scale: 1 } }, sessionId);
    const png = Buffer.from(shot.data, 'base64');
    if (png.length === 0) {
      throw new Error('page-image: the browser returned an empty capture, so the picture would ship blank');
    }
    return png;
  } finally {
    await chrome.kill();
  }
}
