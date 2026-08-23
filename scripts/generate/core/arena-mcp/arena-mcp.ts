#!/usr/bin/env node
/* Arena over MCP, and it is transport rather than a second copy of anything. The corpus it
 * serves is the one the framework package a project installed already carries, so this server
 * cannot disagree with the components beside it and cannot go stale on a schedule of its own.
 * Everything is offered twice, as a resource and through a tool, because a client that reads
 * resources and a client that only calls tools are both real and the corpus is useless to the
 * second one otherwise. The router is the entry point here as it is everywhere else: read it,
 * then one component at a time. */

import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { resolvePayload, manifestIn, type Manifest } from './payload.ts';
import { catalogue, search, textOf, ROUTER_URI, SCHEME, type Entry } from './catalogue.ts';

export const NAME = 'arena';

export const USAGE = [
  'usage: arena-mcp [--payload <dir>]',
  '',
  '  --payload   the agent/ directory of an installed Arena package, or a directory holding one.',
  '              Defaults to the Arena package installed above the working directory: this server',
  '              carries no copy of the language and serves the one your project depends on',
].join('\n');

export function parseArgs(argv: string[]) {
  let payload: string | null = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === undefined) continue;
    if (arg === '--help' || arg === '-h') return { help: true as const };
    if (arg === '--payload') {
      const next = argv[++i];
      if (!next) return { error: '--payload needs a directory' };
      payload = next;
      continue;
    }
    if (arg.startsWith('--payload=')) { payload = arg.slice('--payload='.length); continue; }
    return { error: `unknown argument: ${arg}` };
  }
  return { payload };
}

export function listing(entries: Entry[]) {
  return entries.map((one) => `${one.uri}\n  ${one.title}`).join('\n');
}

export function opening(manifest: Manifest, entries: Entry[]) {
  const components = entries.filter((one) => one.uri.startsWith(`${SCHEME}://component/`)).length;
  return `Arena ${manifest.version}, the ${manifest.layer} layer, from ${manifest.package}. `
    + `${components} component document(s). Read ${ROUTER_URI} before the first screen: it carries `
    + 'the rules of the language and routes every other question. Then one component at a time.';
}

export function build(payload: string, manifest: Manifest) {
  const { entries, byUri } = catalogue(payload, manifest);
  const server = new McpServer({ name: NAME, version: manifest.version });

  for (const entry of entries) {
    server.registerResource(entry.uri, entry.uri,
      { title: entry.title, description: entry.title, mimeType: entry.mime },
      async (uri) => {
        const text = textOf(payload, entry);
        if (text === null) throw new Error(`${entry.rel} is named by the payload and is not there`);
        return { contents: [{ uri: uri.href, text }] };
      });
  }

  server.registerTool('arena_start', {
    description: 'Where to begin with Arena: what is installed, and the one document to read '
      + 'before writing a screen. Call this first.',
    inputSchema: z.object({}),
  }, async () => ({ content: [{ type: 'text' as const, text: opening(manifest, entries) }] }));

  server.registerTool('arena_list', {
    description: 'Every Arena document this project carries, as addressable URIs: the router, the '
      + 'references, the component indexes and one per component.',
    inputSchema: z.object({}),
  }, async () => ({ content: [{ type: 'text' as const, text: listing(entries) }] }));

  server.registerTool('arena_find', {
    description: 'Find the Arena documents that answer a question, by words in their name and '
      + 'their opening. Returns URIs to read with arena_read.',
    inputSchema: z.object({ query: z.string().describe('what you are looking for, in words') }),
  }, async ({ query }) => {
    const found = search(payload, entries, query);
    const text = found.length === 0
      ? `nothing in this payload matches ${JSON.stringify(query)}. arena_list names every document, `
        + `and ${ROUTER_URI} answers what to read when a component does not exist`
      : found.map(({ entry, hits }) => `${entry.uri}  (${hits} match(es))\n  ${entry.title}`).join('\n');
    return { content: [{ type: 'text' as const, text }] };
  });

  server.registerTool('arena_read', {
    description: 'Read one Arena document by its URI. Every resource this server offers is also '
      + 'readable here, for a client that calls tools and does not read resources.',
    inputSchema: z.object({ uri: z.string().describe(`an ${SCHEME}:// URI from arena_list`) }),
  }, async ({ uri }) => {
    const entry = byUri.get(uri);
    if (entry === undefined) {
      return {
        isError: true,
        content: [{ type: 'text' as const,
          text: `${uri} is not a document this payload carries. arena_list names every one` }],
      };
    }
    const text = textOf(payload, entry);
    return text === null
      ? { isError: true, content: [{ type: 'text' as const, text: `${entry.rel} is not there` }] }
      : { content: [{ type: 'text' as const, text }] };
  });

  return { server, entries };
}

export async function main(argv: string[], cwd = process.cwd()) {
  const parsed = parseArgs(argv);
  if ('help' in parsed) { console.log(USAGE); return 0; }
  if (parsed.error) { console.error(`arena-mcp: ${parsed.error}\n\n${USAGE}`); return 2; }

  const resolved = resolvePayload(parsed.payload ?? null, cwd);
  if (resolved.error !== undefined) { console.error(`arena-mcp: ${resolved.error}`); return 2; }

  const payload = resolved.payload;
  const manifest = manifestIn(payload);
  if (manifest === null) { console.error(`arena-mcp: ${payload} carries no manifest`); return 2; }

  const { server } = build(payload, manifest);
  await server.connect(new StdioServerTransport());
  return 0;
}

export function isProgram(entry: string | undefined, self: string) {
  if (entry === undefined) return false;
  if (entry === self) return true;
  try {
    return realpathSync(entry) === realpathSync(self);
  } catch {
    return false;
  }
}

if (isProgram(process.argv[1], fileURLToPath(import.meta.url))) {
  main(process.argv.slice(2)).then((code) => { if (code !== 0) process.exit(code); });
}
