import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs, listing, opening, build, isProgram, USAGE, NAME } from './arena-mcp.ts';
import { manifestIn, AGENT_DIR } from './payload.ts';
import { catalogue, SCHEME, ROUTER_URI } from './catalogue.ts';
import { repoRoot } from '../../../lib/arena/repo-root.ts';

const PAYLOAD = join(repoRoot, 'frameworks', 'react', 'dist', AGENT_DIR);

test('the arguments are a payload, help, or an error naming what was not understood', () => {
  assert.deepEqual(parseArgs([]), { payload: null });
  assert.deepEqual(parseArgs(['--payload', '/x']), { payload: '/x' });
  assert.deepEqual(parseArgs(['--payload=/x']), { payload: '/x' });
  assert.deepEqual(parseArgs(['-h']), { help: true });
  assert.match(parseArgs(['--payload']).error ?? '', /needs a directory/);
  assert.match(parseArgs(['--nope']).error ?? '', /unknown argument: --nope/);
});

test('the usage names the default, since a server carrying no corpus has to say where it reads one', () => {
  assert.match(USAGE, /--payload/);
  assert.match(USAGE, /carries no copy of the language/);
});

test('a symlinked bin is still this program, which is how an editor spawns it', () => {
  assert.equal(isProgram(undefined, '/a/b.mjs'), false);
  assert.equal(isProgram('/a/b.mjs', '/a/b.mjs'), true);
  assert.equal(isProgram('/nowhere/at/all.mjs', '/a/b.mjs'), false);
});

test('the opening names what is installed and sends a reader to the router first', () => {
  const manifest = { name: 'arena', description: 'd', homepage: 'h', version: '1.0.0',
    package: '@dravensoft/arena-react', layer: 'react', router: 'skills/design/ROUTER.md' };
  const text = opening(manifest, [
    { uri: `${SCHEME}://component/A`, rel: 'a', title: 'A', mime: 'text/markdown' },
    { uri: ROUTER_URI, rel: 'r', title: 'R', mime: 'text/markdown' },
  ]);
  assert.match(text, /1 component document/);
  assert.match(text, /@dravensoft\/arena-react/);
  assert.match(text, new RegExp(ROUTER_URI));
});

test('the listing names every document with what it answers', () => {
  const text = listing([{ uri: 'arena://x', rel: 'x', title: 'what x answers', mime: 'text/markdown' }]);
  assert.equal(text, 'arena://x\n  what x answers');
});

test('the server registers a resource per document and the four tools, over the real payload', {
  skip: existsSync(PAYLOAD) ? false : 'frameworks/react/dist/agent is not assembled',
}, () => {
  const manifest = manifestIn(PAYLOAD);
  assert.ok(manifest, 'the assembled payload carries a manifest');
  const { server, entries } = build(PAYLOAD, manifest);
  assert.equal(server.server.getClientCapabilities(), undefined, 'nothing is connected yet');
  const components = entries.filter((one) => one.uri.startsWith(`${SCHEME}://component/`));
  assert.ok(components.length > 40, `${components.length} component(s) is not the whole library`);
  assert.ok(entries.some((one) => one.uri === ROUTER_URI), 'the router is offered');
  assert.equal(NAME, 'arena');
});

test('the catalogue built from the assembled payload reaches every kind of document', {
  skip: existsSync(PAYLOAD) ? false : 'frameworks/react/dist/agent is not assembled',
}, () => {
  const manifest = manifestIn(PAYLOAD);
  assert.ok(manifest);
  const { entries } = catalogue(PAYLOAD, manifest);
  const kinds = new Set(entries.map((one) => one.uri.split('/')[2] ?? one.uri));
  for (const kind of ['component', 'reference', 'category']) {
    assert.ok(kinds.has(kind), `no ${kind} document is offered`);
  }
});
