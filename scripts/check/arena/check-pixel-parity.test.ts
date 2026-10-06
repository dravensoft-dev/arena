/* The gate needs a browser and both layers built, so what is covered here is everything it
 * decides BEFORE the shutter and everything it says after: which pairs it walks out of the tree,
 * how it tells a page that painted nothing from a page that disagrees, and what a failure names.
 * The comparison itself belongs to png.test.ts, which can build the images it needs. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  THEMES, VIEWPORT, STILL, PAINTED, SETTLE_TRIES, WATCH, FROZEN, pagePath, sinksIn,
  pairProblems, sizeProblem, paintProblem, dumpDir,
  ALLOWED, staleAllowanceProblems, within, parseParityArgs, rasterProblem, maskedProblem, allowancesFor,
  rectsExpression, rectsOf, matchedLine, SelectorProblem,
} from './check-pixel-parity.ts';
import { PageThrew } from '../../lib/arena/cdp.ts';
import { PAGE_FILE } from '../../lib/arena/kitchen-sink-page.ts';

const SILENT = { readyState: 'complete', elements: 900, errors: [], scripts: [] };

test('both themes are compared, because a colour that only diverges in light passes in dark alone', () => {
  assert.deepEqual(THEMES, ['dark', 'light']);
});

test('one viewport for both pages, at one device scale, or the pair is not a comparison', () => {
  assert.equal(VIEWPORT.deviceScaleFactor, 1);
  assert.ok(VIEWPORT.width > 0 && VIEWPORT.height > 0);
});

test('motion and focus are both removed before the shutter, and each for its own reason', () => {
  assert.match(STILL, /animation: none !important/,
    'reduced motion slows a spinner rather than stopping it, so emulation alone leaves it turning');
  assert.match(STILL, /transition: none !important/);
  assert.match(STILL, /focus-visible/,
    'focus is one global that every open overlay claims, so the ring follows the mount order');
  assert.match(STILL, /\.blur\(\)/);
});

test('measurement is stopped before the shutter, because the shutter is what moves it', () => {
  assert.match(WATCH, /window\.ResizeObserver = class/,
    'an observer can only be reached later if the constructor that made it was wrapped first, and '
    + 'components construct theirs on mount, so the wrap has to be a new-document script');
  assert.match(FROZEN, /\.disconnect\(\)/,
    'reaching past the viewport resizes the page, and the resize hands width 0 to every live '
    + 'observer: a measured component redraws collapsed into tiles the compositor has not taken yet');
});

test('the freeze runs after the page has settled, or it pins the width nothing had measured yet', () => {
  const source = readFileSync(new URL('./check-pixel-parity.ts', import.meta.url), 'utf8');
  const body = source.slice(source.indexOf('async function capture('));
  assert.ok(body.indexOf('ev(FROZEN)') > body.indexOf('stableHeightExpression'),
    'frozen before the last measurement lands, every chart on the page draws at its assumed width');
  assert.ok(body.indexOf('ev(FROZEN)') < body.indexOf('Page.captureScreenshot'),
    'frozen after the first capture, that capture is the one this gate exists to stop reporting');
});

test('a page is walked from the tree, and the pair points at the same file in every layer', () => {
  assert.equal(pagePath('react', 'default'), `frameworks/react/kitchen-sink/default/${PAGE_FILE}`);
  assert.equal(pagePath('angular', 'default'), `frameworks/angular/kitchen-sink/default/${PAGE_FILE}`);
});

test('the sinks on disk are the sinks walked, so an arrangement that lands is compared', () => {
  const react = sinksIn('react');
  assert.deepEqual(react, sinksIn('angular'),
    'a page one layer draws and the other does not is the pair that cannot be compared');
  assert.ok(react.length > 0, 'a sweep over no page reports no difference exactly as a clean one does');
});

test('a sink missing from one layer is named rather than quietly skipped', () => {
  const problems = pairProblems(new Map([['react', ['default', 'witness']], ['angular', ['default']]]));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /witness: angular draws no page/);
});

test('two pages of different sizes are reported as that, rather than as a box inside them', () => {
  assert.equal(sizeProblem('default:dark', { width: 1440, height: 700 }, { width: 1440, height: 700 }), null);
  const problem = sizeProblem('default:dark', { width: 1440, height: 700 }, { width: 1440, height: 812 });
  assert.match(problem ?? '', /1440x700/);
  assert.match(problem ?? '', /1440x812/);
});

test('a page that never painted says so, and says nothing about whether the layers agree', () => {
  const problem = paintProblem('default:dark', 'angular', {
    painted: { ready: false, waitedMs: PAINTED.ms }, settled: false, tries: 0,
    silence: { ...SILENT, readyState: 'loading', elements: 2 },
  });
  assert.match(problem ?? '', /never signalled that it had painted/);
  assert.match(problem ?? '', /says nothing about whether the two layers agree/);
});

test('a page that painted and never stopped moving is a different failure from one that never painted', () => {
  const problem = paintProblem('default:dark', 'react', {
    painted: { ready: true, waitedMs: 40 }, settled: false, tries: SETTLE_TRIES, silence: SILENT,
  });
  assert.match(problem ?? '', /never stopped changing/);
});

test('a page that raised an error is not compared, since what it painted is not what it was asked to', () => {
  const problem = paintProblem('default:dark', 'react', {
    painted: { ready: true, waitedMs: 40 }, settled: true, tries: 1,
    silence: { ...SILENT, errors: ['failed to load Sink.entry.generated.js'] },
  });
  assert.match(problem ?? '', /raised 1 error/);
  assert.match(problem ?? '', /Sink.entry.generated.js/);
});

test('a page that painted, settled and said nothing is compared', () => {
  assert.equal(paintProblem('default:dark', 'react', {
    painted: { ready: true, waitedMs: 40 }, settled: true, tries: 1, silence: SILENT,
  }), null);
});

test('captures are written only where a reader asks for them, so the gate writes nothing by default', () => {
  assert.equal(dumpDir({}), undefined);
  assert.equal(dumpDir({ ARENA_PIXEL_DUMP: '/tmp/parity' }), '/tmp/parity');
});

test('an allowance is bounded on both axes, so a wider move is not absorbed by a narrow one', () => {
  const allowance = { pixels: 400, delta: 64, why: 'measured' };
  assert.equal(within(allowance, 150, 35), true);
  assert.equal(within(allowance, 401, 35), false, 'past the count');
  assert.equal(within(allowance, 150, 65), false, 'past the channel delta');
  assert.equal(within(undefined, 1, 1), false, 'a sink with no allowance takes none');
});

test('an allowance nothing spends is stale, and one for a pair nobody compared is worse', () => {
  const declared = new Map([['witness', { pixels: 400, delta: 64, why: 'measured' }]]);
  assert.deepEqual(staleAllowanceProblems(new Map([['witness', 149]]), declared), []);
  assert.match(staleAllowanceProblems(new Map([['witness', 0]]), declared)[0] ?? '',
    /not an exemption/);
  assert.match(staleAllowanceProblems(new Map(), declared)[0] ?? '', /not here/);
});

test('no sink carries an allowance at all, and the emptiness is the claim', () => {
  assert.deepEqual([...ALLOWED.keys()], [],
    'every arrangement compared is one a consumer installs, and the two layers agree on it to the '
    + 'pixel; an entry landing here is a divergence somebody measured and could not close, never a '
    + 'threshold that made a run go quiet');
  for (const [sink, allowance] of ALLOWED) {
    assert.ok(allowance.why.length > 80, `${sink}: an allowance carries the measurement behind it`);
  }
});

const raster = (width: number, height: number, fill: number) =>
  ({ width, height, channels: 4, data: Buffer.alloc(width * height * 4, fill) });

test('--baseline takes a ref, and with no ref after it the run refuses rather than guessing', () => {
  assert.deepEqual(parseParityArgs([]), { baseline: null, allow: [] });
  assert.deepEqual(parseParityArgs(['--baseline', 'HEAD~1']), { baseline: 'HEAD~1', allow: [] });
  assert.throws(() => parseParityArgs(['--baseline']), /takes a git ref/);
  assert.throws(() => parseParityArgs(['--baseline', '--x']), /takes a git ref/);
});

test('a page identical to its baseline is no problem, and one differing names the box and the two trees', () => {
  assert.equal(rasterProblem('react/default:dark', raster(4, 4, 10), raster(4, 4, 10)).problem, null);
  const moved = raster(4, 4, 10);
  moved.data[0] = 200;
  const { problem, pixels } = rasterProblem('react/default:dark', raster(4, 4, 10), moved);
  assert.equal(pixels, 1);
  assert.match(problem ?? '', /react\/default:dark: 1 pixel\(s\) differ from the baseline/);
});

test('a page whose size moved against its baseline says so before any box', () => {
  assert.match(rasterProblem('angular/complete:light', raster(4, 4, 0), raster(4, 5, 0)).problem ?? '',
    /baseline is 4x4 and the tree is 4x5/);
});

test('the sinks of a baseline are read from that tree and not from this one', () => {
  assert.deepEqual(sinksIn('react', '/nowhere'), []);
});

const solid = (width: number, height: number, rgba: number[]) => ({
  width, height, channels: 4, data: Buffer.from(Array.from({ length: width * height }, () => rgba).flat()),
});
const paint = (r: { width: number; height: number; channels: number; data: Buffer }, x: number, y: number) => {
  const data = Buffer.from(r.data);
  data[(y * r.width + x) * r.channels] = 255;
  return { ...r, data };
};

test('an allowance is a sink and a selector, repeatable, and only with a baseline', () => {
  assert.deepEqual(parseParityArgs(['--baseline', 'HEAD', '--allow', 'complete=[data-arena-part*="-chart"]']).allow,
    [{ sink: 'complete', selector: '[data-arena-part*="-chart"]' }]);
  assert.throws(() => parseParityArgs(['--allow', 'complete=x']), /--allow needs --baseline/);
  assert.throws(() => parseParityArgs(['--baseline', 'HEAD', '--allow', 'complete']), /--allow takes <sink>=<selector>/);
});

test('a difference inside an allowed rect is spent, one outside fails, and a size change always fails', () => {
  const base = solid(10, 10, [0, 0, 0, 255]);
  const inside = paint(base, 2, 2);
  assert.deepEqual(maskedProblem('p', base, inside, [{ left: 0, top: 0, right: 5, bottom: 5 }]), { problem: null, inside: 1, outside: 0 });
  const outside = paint(base, 8, 8);
  assert.match(maskedProblem('p', base, outside, [{ left: 0, top: 0, right: 5, bottom: 5 }]).problem ?? '', /1 pixel\(s\) differ outside the allowed parts/);
  assert.match(maskedProblem('p', base, solid(10, 11, [0, 0, 0, 255]), []).problem ?? '', /not the size it was/);
});

test('an allowance applies to its own sink and to every sink when it names *, and to no other', () => {
  const allow = [{ sink: '*', selector: 'a' }, { sink: 'complete', selector: 'b' }];
  assert.deepEqual(allowancesFor(allow, 'complete').map(({ index }) => index), [0, 1]);
  assert.deepEqual(allowancesFor(allow, 'default').map(({ index }) => index), [0]);
  assert.deepEqual(allowancesFor([{ sink: 'nope', selector: 'c' }], 'default'), []);
});

test('the rects of an allowance are read through the page, one list per selector, and counted', async () => {
  const asked: string[] = [];
  const rects = await rectsOf(async (expression) => {
    asked.push(expression);
    return [{ left: 0, top: 0, right: 1, bottom: 1 }, { left: 1, top: 1, right: 2, bottom: 2 }];
  }, ['[data-arena-part*="-chart"]', 'b']);
  assert.equal(rects.length, 2);
  assert.equal(rects[0]?.length, 2);
  assert.equal(asked[0], rectsExpression('[data-arena-part*="-chart"]'));
  assert.match(asked[0] ?? '', /document\.querySelectorAll\("\[data-arena-part\*=\\"-chart\\"\]"\)/);
});

test('an invalid selector fails with the selector named, and any other throw passes through', async () => {
  const throws = (error: Error) => async () => { throw error; };
  await assert.rejects(rectsOf(throws(new PageThrew('SyntaxError: not a valid selector')), ['a[']),
    (error: Error) => error instanceof SelectorProblem && /allowance selector "a\[" is not a valid selector/.test(error.message));
  await assert.rejects(rectsOf(throws(new Error('socket closed')), ['a']), /socket closed/);
});

test('each allowance says what it matched beside whether it was spent', () => {
  assert.equal(matchedLine(0, 12, true), 'unspent, matched 12 element(s)');
  assert.equal(matchedLine(40, 3, true), '40 pixel(s) spent, matched 3 element(s)');
  assert.equal(matchedLine(0, 0, false), 'no such sink, matched 0 element(s)');
});
