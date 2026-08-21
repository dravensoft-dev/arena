/* The half of the dispatcher a gate touches, and the rule that keeps it the only half.
 * Runtime.evaluate answers an expression that threw with an EMPTY value and the throw in
 * exceptionDetails, so a caller reading .result.value alone reads {} and carries on: that is
 * how a TypeError inside the ready poll was reported as a page that never painted in 40000ms
 * by a gate that had run for six seconds. evaluate() is where that answer is read, the last
 * test is what keeps a second reader from being written, and both are here rather than beside
 * a gate because all three browser gates ask the same question. The last test reads the method
 * QUOTED and skips suites: naming it in prose is not a second reader, and the dispatcher's own
 * suite names it as a stand-in for any command while sending nothing to a browser. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { walkFiles } from '../../utils/walk-files.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { repoRoot as root } from './repo-root.ts';
import { createDispatcher, evaluate, PageThrew, type CdpSend } from './cdp.ts';

const answers = (answer: unknown): CdpSend => ({ send: async () => answer });

const METHOD = ['Runtime', 'evaluate'].join('.');

test('a value comes back unwrapped, and the envelope stays in here', async () => {
  const asked: unknown[] = [];
  const send: CdpSend = { send: async (...args) => { asked.push(args); return { result: { value: { ready: true, waitedMs: 7 } } }; } };

  assert.deepEqual(await evaluate(send, '1 + 1', 'session-1'), { ready: true, waitedMs: 7 });
  assert.deepEqual(asked, [[METHOD, { expression: '1 + 1', awaitPromise: true, returnByValue: true }, 'session-1']]);
});

test('an expression that threw is an error here and a value nowhere', async () => {
  const send = answers({
    result: { type: 'object', value: {} },
    exceptionDetails: {
      text: 'Uncaught (in promise) TypeError',
      exception: { description: 'TypeError: Cannot read properties of null (reading \'hasAttribute\')\n    at <anonymous>:5:31' },
    },
  });

  await assert.rejects(
    () => evaluate(send, 'document.documentElement.hasAttribute(\'x\')'),
    (thrown: Error) => {
      assert.ok(thrown instanceof PageThrew, `${thrown.constructor.name} rather than PageThrew`);
      assert.match(thrown.message, /Cannot read properties of null/);
      return true;
    },
  );
});

test('a throw with no description still names something a reader can act on', async () => {
  const send = answers({ result: { value: {} }, exceptionDetails: { text: 'Uncaught SyntaxError' } });
  await assert.rejects(() => evaluate(send, 'const const'), (thrown: Error) => {
    assert.match(thrown.message, /Uncaught SyntaxError/);
    return true;
  });
});

test('a value of undefined is a value, since an expression may answer nothing', async () => {
  assert.equal(await evaluate(answers({ result: {} }), 'void 0'), undefined);
});

test('the dispatcher rejects a command the browser answered with an error', async () => {
  const dispatcher = createDispatcher();
  const { frame, result } = dispatcher.next(METHOD, {});
  dispatcher.settle({ id: frame.id, error: { code: -32000, message: 'Inspected target navigated or closed' } });
  await assert.rejects(() => result as Promise<unknown>, /Inspected target navigated or closed/);
});

test('evaluate() is the only reader of that answer in the tree', () => {
  const owner = relPosix(root, join(root, 'scripts/lib/arena/cdp.ts'));
  const quoted = [`'${METHOD}'`, `"${METHOD}"`, `\`${METHOD}\``];

  const named = walkFiles(join(root, 'scripts'))
    .filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'))
    .map((file) => relPosix(root, file))
    .filter((rel) => rel !== owner)
    .filter((rel) => quoted.some((form) => readFileSync(join(root, rel), 'utf8').includes(form)));

  assert.deepEqual(named, [],
    `${named.join(', ')} sends ${METHOD} directly, and a caller that unwraps the answer itself is `
    + 'one that reads an empty value where the page threw. Go through evaluate().');
});
