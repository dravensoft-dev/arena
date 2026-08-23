/* The server over the wire it is spawned on. Every other suite here reads the pieces; this one
 * starts the process an editor starts, speaks the protocol at it and reads the answers back,
 * because a catalogue that is correct in memory and a server an editor can use are two claims. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { hostBinary } from '../../lib/arena/host-binary.ts';
import { AGENT_DIR } from '../../generate/core/arena-mcp/payload.ts';
import { ROUTER_URI, SCHEME } from '../../generate/core/arena-mcp/catalogue.ts';

export const SERVER = 'scripts/generate/core/arena-mcp/arena-mcp.ts';
export const PAYLOAD = join('frameworks', 'react', 'dist', AGENT_DIR);
export const PROTOCOL = '2025-06-18';
export const DEADLINE = 30_000;

type Message = { id?: number; result?: Record<string, any>; error?: Record<string, any> };

export function session() {
  const child = spawn(hostBinary('bun', 'to run the server the way a development loop does'),
    [SERVER, '--payload', PAYLOAD], { cwd: repoRoot, stdio: ['pipe', 'pipe', 'pipe'] });
  const pending = new Map<number, (msg: Message) => void>();
  let buffered = '';
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += String(chunk); });
  child.stdout.on('data', (chunk) => {
    buffered += String(chunk);
    for (let at = buffered.indexOf('\n'); at !== -1; at = buffered.indexOf('\n')) {
      const line = buffered.slice(0, at);
      buffered = buffered.slice(at + 1);
      if (line.trim() === '') continue;
      const message = JSON.parse(line) as Message;
      if (message.id !== undefined) pending.get(message.id)?.(message);
    }
  });
  let id = 0;
  const call = (method: string, params: unknown) => new Promise<Message>((resolve, reject) => {
    const one = ++id;
    const timer = setTimeout(() => reject(new Error(`${method} answered nothing in ${DEADLINE}ms; stderr: ${stderr}`)), DEADLINE);
    pending.set(one, (message) => { clearTimeout(timer); resolve(message); });
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: one, method, params })}\n`);
  });
  const notify = (method: string) =>
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params: {} })}\n`);
  return { call, notify, stop: () => child.kill(), stderr: () => stderr };
}

const missing = existsSync(join(repoRoot, PAYLOAD))
  ? false
  : `${PAYLOAD} is not assembled, so there is nothing to serve`;

test('an editor can initialize, list and read, which is the whole of what it does', { skip: missing }, async () => {
  const mcp = session();
  try {
    const init = await mcp.call('initialize', {
      protocolVersion: PROTOCOL, capabilities: {}, clientInfo: { name: 'suite', version: '0' },
    });
    assert.equal(init.result?.serverInfo?.name, 'arena');
    assert.ok(init.result?.capabilities?.resources, 'resources are offered');
    assert.ok(init.result?.capabilities?.tools, 'tools are offered');
    mcp.notify('notifications/initialized');

    const tools = await mcp.call('tools/list', {});
    assert.deepEqual((tools.result?.tools ?? []).map((one: { name: string }) => one.name).sort(),
      ['arena_find', 'arena_list', 'arena_read', 'arena_start']);

    const resources = await mcp.call('resources/list', {});
    assert.ok((resources.result?.resources ?? []).length > 40,
      'a handful of resources is not the library');

    const router = await mcp.call('resources/read', { uri: ROUTER_URI });
    assert.match(router.result?.contents?.[0]?.text ?? '', /Arena/);

    const found = await mcp.call('tools/call', { name: 'arena_find', arguments: { query: 'confirm dialog' } });
    assert.match(found.result?.content?.[0]?.text ?? '', new RegExp(`${SCHEME}://component/Arena`));

    const absent = await mcp.call('tools/call', { name: 'arena_read', arguments: { uri: `${SCHEME}://component/Nope` } });
    assert.equal(absent.result?.isError, true, 'a document that is not there is an error rather than silence');
  } finally {
    mcp.stop();
  }
});
