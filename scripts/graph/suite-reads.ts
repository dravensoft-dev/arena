/* What a suite may read. A step outside bun run build writes an artefact that a clone and a
 * development tree do not hold, so a suite joining the repository root to one of those paths,
 * running a gate's collect over the repository root, or skipping on a file the disk may lack,
 * passes where the step ran and fails where it did not. This reads every tracked suite as text,
 * through the literal and comment lexer, so a mention in a comment or a string is never a read.
 * An imported segment that cannot be settled is a problem; a segment the suite computes stands
 * for any one segment, so a root spelled after it is still a read. A suite that builds its own
 * root in a temp directory is the sanctioned shape. */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { pathToFileURL } from 'node:url';
import { insideLiteral, literalRanges } from '../lib/arena/comments.ts';
import { relPosix } from '../utils/posix-path.ts';
import { resolveSpecs } from './pathspecs.ts';
import type { GraphNode } from './graph.ts';
import { trackedPaths } from './handoff.ts';

export type SuiteReadExceptions = Map<string, string>;

export const SUITE_READ_EXCEPTIONS: SuiteReadExceptions = new Map();

export const MIN_WHY = 40;

const GLOB_CHARS = /[*?[{]/;
const NAME = '[A-Za-z_$][\\w$]*';
const PROBE_FILES = ['index.js', 'package.json', 'probe/index.js', 'probe/probe.css'];

export function assemblyRoots(nodes: GraphNode[]) {
  const roots = new Set<string>();
  for (const node of nodes) {
    if (node.releaseOnly === undefined) continue;
    for (const spec of node.writes) {
      if (spec.startsWith('!')) continue;
      const at = spec.search(GLOB_CHARS);
      const cut = (at === -1 ? spec : spec.slice(0, at)).replace(/\/+$/, '');
      if (cut !== '') roots.add(cut);
    }
  }
  return [...roots].sort();
}

export function gateFilesOf(nodes: GraphNode[], declaredIn: Map<string, string>, roots: string[]) {
  const probes = roots.flatMap((root) => PROBE_FILES.map((file) => `${root}/${file}`));
  const files = new Set<string>();
  for (const node of nodes) {
    if (node.releaseOnly !== undefined) continue;
    if (resolveSpecs(node.reads, probes).length === 0) continue;
    const file = declaredIn.get(node.name);
    if (file !== undefined) files.add(file);
  }
  return files;
}

export function suiteFilesOf(tracked: string[]) {
  return tracked.filter((path) => /\.test\.tsx?$/.test(path) && !path.startsWith('frameworks/angular/build/'));
}

type Import = { imported: string; local: string; spec: string };

const REF = `${NAME}(?:\\.${NAME})?`;

export function importsOf(source: string, literals: [number, number][]) {
  const found: Import[] = [];
  for (const match of source.matchAll(/\bimport\s+(?:type\s+)?\{([^}]*)\}\s*from\s*(['"])([^'"\n]+)\2/g)) {
    if (insideLiteral(literals, match.index ?? 0)) continue;
    for (const entry of (match[1] ?? '').split(',')) {
      const parts = entry.trim().replace(/^type\s+/, '').split(/\s+as\s+/);
      const imported = parts[0]?.trim() ?? '';
      if (imported === '') continue;
      found.push({ imported, local: (parts[1] ?? imported).trim(), spec: match[3] ?? '' });
    }
  }
  return found;
}

export function namespacesOf(source: string, literals: [number, number][]) {
  const found = new Map<string, string>();
  for (const match of source.matchAll(new RegExp(`\\bimport\\s+\\*\\s+as\\s+(${NAME})\\s+from\\s*(['"])([^'"\\n]+)\\2`, 'g'))) {
    if (!insideLiteral(literals, match.index ?? 0)) found.set(match[1] ?? '', match[3] ?? '');
  }
  return found;
}

export function rootAliases(source: string, literals: [number, number][], names: Set<string>) {
  const pattern = new RegExp(`^[ \\t]*(?:export\\s+)?(?:const|let|var)\\s+(${NAME})\\s*(?::[^=\\n]+)?=\\s*(${NAME})\\s*;?[ \\t]*$`, 'gm');
  const matches = [...source.matchAll(pattern)].filter((one) => !insideLiteral(literals, one.index ?? 0));
  for (let grown = true; grown;) {
    grown = false;
    for (const one of matches) {
      if (names.has(one[2] ?? '') && !names.has(one[1] ?? '')) { names.add(one[1] ?? ''); grown = true; }
    }
  }
  return names;
}

function scanArguments(source: string, literals: [number, number][], open: number) {
  const args: string[] = [];
  let depth = 0;
  let from = open + 1;
  for (let i = open + 1; i < source.length; i += 1) {
    if (insideLiteral(literals, i)) continue;
    const ch = source[i] ?? '';
    if ('([{'.includes(ch)) depth += 1;
    else if (')]}'.includes(ch)) {
      if (depth > 0) { depth -= 1; continue; }
      args.push(source.slice(from, i).trim());
      break;
    } else if (ch === ',' && depth === 0) {
      args.push(source.slice(from, i).trim());
      from = i + 1;
    }
  }
  return args.length === 1 && args[0] === '' ? [] : args.filter((one, at) => one !== '' || at < args.length - 1);
}

function expressionAfter(source: string, literals: [number, number][], from: number, stops: string) {
  let depth = 0;
  for (let i = from; i < source.length; i += 1) {
    if (insideLiteral(literals, i)) continue;
    const ch = source[i] ?? '';
    if ('([{'.includes(ch)) depth += 1;
    else if (')]}'.includes(ch)) {
      if (depth === 0) return source.slice(from, i);
      depth -= 1;
    } else if (depth === 0 && stops.includes(ch)) return source.slice(from, i);
  }
  return source.slice(from);
}

function moduleFile(base: string, rel: string, spec: string) {
  const target = join(base, dirname(rel), spec);
  const candidates = [target, `${target}.ts`, `${target}.tsx`, join(target, 'index.ts')];
  return candidates.find((one) => existsSync(one) && /\.[cm]?[jt]sx?$/.test(one));
}

function posixOf(base: string, file: string) {
  return relPosix(base, file);
}

export function literalConstants(source: string, literals: [number, number][]) {
  const values = new Map<string, string>();
  const pattern = new RegExp(`^(?:export\\s+)?const\\s+(${NAME})\\s*(?::[^=\\n]+)?=\\s*(['"])([^'"\\n]*)\\2\\s*;?[ \\t]*$`, 'gm');
  for (const match of source.matchAll(pattern)) {
    if (insideLiteral(literals, match.index ?? 0)) continue;
    values.set(match[1] ?? '', match[3] ?? '');
  }
  return values;
}

export function existsConstants(source: string, literals: [number, number][]) {
  const names = new Set<string>();
  const pattern = new RegExp(`^[ \\t]*(?:export\\s+)?(?:const|let|var)\\s+(${NAME})\\s*(?::[^=\\n]+)?=`, 'gm');
  for (const match of source.matchAll(pattern)) {
    const at = match.index ?? 0;
    if (insideLiteral(literals, at)) continue;
    const body = expressionAfter(source, literals, at + match[0].length, ';');
    if (/\bexistsSync\s*\(/.test(body)) names.add(match[1] ?? '');
  }
  return names;
}

type Value = string | string[];

const ANY = '*';

function spellsRoot(parts: string[], roots: string[]) {
  const spelled = posix.normalize(parts.join('/')).replace(/^\.\//, '').split('/');
  return roots.find((root) => {
    const wanted = root.split('/');
    return spelled.length >= wanted.length
      && wanted.every((one, at) => spelled[at] === one || (spelled[at] === ANY && at < wanted.length - 1));
  });
}

export async function suiteReadProblems(
  base: string, roots: string[], exceptions: SuiteReadExceptions = SUITE_READ_EXCEPTIONS,
  reads: { files?: string[]; gates?: Set<string> } = {},
) {
  const files = reads.files ?? suiteFilesOf(trackedPaths(base));
  const gates = reads.gates ?? new Set<string>();
  const problems: string[] = [];
  const modules = new Map<string, Promise<Record<string, unknown> | string>>();
  const matched = new Set<string>();
  let readCount = 0;

  const load = (file: string) => {
    const known = modules.get(file);
    if (known !== undefined) return known;
    const loading = (async () => {
      try { return await import(pathToFileURL(file).href) as Record<string, unknown>; }
      catch (error) { return error instanceof Error ? error.message.split('\n')[0] ?? 'fails to load' : 'fails to load'; }
    })();
    modules.set(file, loading);
    return loading;
  };

  const valueOf = async (
    rel: string, name: string, imports: Import[], local: Map<string, string>, spaces: Map<string, string>,
  ): Promise<{ value: Value } | { unsettled: string } | null> => {
    const dot = name.indexOf('.');
    const space = dot === -1 ? undefined : spaces.get(name.slice(0, dot));
    if (dot !== -1 && space === undefined) return null;
    const bound = space !== undefined
      ? { imported: name.slice(dot + 1), local: name, spec: space }
      : imports.find((one) => one.local === name);
    if (bound === undefined) {
      const text = local.get(name);
      return text === undefined ? null : { value: text };
    }
    if (!bound.spec.startsWith('.')) return null;
    const file = moduleFile(base, rel, bound.spec);
    if (file === undefined) return { unsettled: `${bound.spec} resolves to no module` };
    if (/\.test\.tsx?$/.test(file)) return { unsettled: `${bound.spec} is a suite, and a suite is not a module to settle a path from` };
    const loaded = await load(file);
    if (typeof loaded === 'string') return { unsettled: `${bound.spec} does not load: ${loaded}` };
    const exported = loaded[bound.imported];
    if (typeof exported === 'string') return { value: exported };
    if (Array.isArray(exported) && exported.every((one) => typeof one === 'string')) return { value: exported as string[] };
    return { unsettled: `${bound.imported} from ${bound.spec} is not a string or a list of strings` };
  };

  for (const rel of files) {
    const path = join(base, rel);
    if (!existsSync(path)) continue;
    readCount += 1;
    const source = readFileSync(path, 'utf8');
    const literals = literalRanges(source);
    const imports = importsOf(source, literals);
    const local = literalConstants(source, literals);
    const spaces = namespacesOf(source, literals);
    const rootNames = rootAliases(source, literals, new Set(
      imports.filter((one) => one.imported === 'repoRoot' && /(^|\/)repo-root(\.ts)?$/.test(one.spec)).map((one) => one.local),
    ));
    const found: string[] = [];

    const segmentOf = async (arg: string): Promise<{ parts: string[] } | { unsettled: string } | null> => {
      const quoted = /^(['"])([^'"\\]*)\1$/.exec(arg) ?? /^`([^`$\\]*)`$/.exec(arg);
      if (quoted) return { parts: (quoted[2] ?? quoted[1] ?? '').split('/') };
      const split = new RegExp(`^\\.\\.\\.\\s*(${REF})\\.split\\(\\s*(['"])/\\2\\s*\\)$`).exec(arg);
      const spread = new RegExp(`^\\.\\.\\.\\s*(${REF})$`).exec(arg);
      const bare = new RegExp(`^${REF}$`).exec(arg);
      const name = split?.[1] ?? spread?.[1] ?? bare?.[0];
      if (name !== undefined) {
        const settled = await valueOf(rel, name, imports, local, spaces);
        if (settled === null || 'unsettled' in settled) return settled;
        if (split) return typeof settled.value === 'string' ? { parts: settled.value.split('/') } : { unsettled: `${name} is a list and is split as a string` };
        return { parts: Array.isArray(settled.value) ? settled.value : settled.value.split('/') };
      }
      const template = /^`([^`]*)`$/.exec(arg);
      if (template && (template[1] ?? '').includes('${')) {
        let text = template[1] ?? '';
        for (const hole of [...text.matchAll(new RegExp(`\\$\\{\\s*(${REF})\\s*\\}`, 'g'))]) {
          const settled = await valueOf(rel, hole[1] ?? '', imports, local, spaces);
          if (settled === null) return null;
          if ('unsettled' in settled) return settled;
          if (typeof settled.value !== 'string') return { unsettled: `${hole[1]} is a list inside a template` };
          text = text.replace(hole[0], settled.value);
        }
        return text.includes('${') ? null : { parts: text.split('/') };
      }
      return null;
    };

    if (rootNames.size > 0) {
      for (const call of source.matchAll(/(?<![\w$.])(?:(?:posix|path)\.)?(?:join|resolve)\s*\(/g)) {
        const at = call.index ?? 0;
        if (insideLiteral(literals, at)) continue;
        const args = scanArguments(source, literals, at + call[0].length - 1);
        if (!rootNames.has(args[0] ?? '')) continue;
        const spelled: string[] = [];
        for (const arg of args.slice(1)) {
          const segment = await segmentOf(arg);
          if (segment === null) { spelled.push(ANY); continue; }
          if ('unsettled' in segment) {
            found.push(`${rel} joins the repository root to ${arg}, which cannot be settled (${segment.unsettled}); `
              + 'a path this rule cannot read is one it cannot clear');
            break;
          }
          spelled.push(...segment.parts.filter((part) => part !== ''));
          const root = spellsRoot(spelled, roots);
          if (root !== undefined) {
            found.push(`${rel} joins the repository root to ${root}, which only an assembly step writes: ${call[0]}${args.join(', ')})`);
            break;
          }
        }
      }
    }

    const collects = imports.filter((one) => {
      if (one.imported !== 'collect' || !one.spec.startsWith('.')) return false;
      const file = moduleFile(base, rel, one.spec);
      return file !== undefined && gates.has(posixOf(base, file));
    });
    for (const bound of collects) {
      const gateNames = new Set(imports.filter((one) => one.spec === bound.spec).map((one) => one.local));
      for (const call of source.matchAll(new RegExp(`(?<![\\w$.])${bound.local}\\s*\\(`, 'g'))) {
        const at = call.index ?? 0;
        if (insideLiteral(literals, at)) continue;
        const args = scanArguments(source, literals, at + call[0].length - 1);
        const bare = args.length === 0 || (args.length === 1 && (args[0] === '' || rootNames.has(args[0] ?? '')));
        const handed = args.slice(1).some((one) => gateNames.has(one)
          || [...rootNames].some((name) => new RegExp(`(?<![\\w$.])${name.replace(/\$/g, '\\$')}(?![\\w$])`).test(one)));
        if (!bare && !handed) continue;
        found.push(`${rel} runs ${bound.local}(${args.join(', ')}) from ${bound.spec} over the repository root, `
          + 'a gate that reads a path only an assembly step writes; pass it a root the suite makes');
      }
    }

    const exists = existsConstants(source, literals);
    for (const skip of source.matchAll(/(?<![\w$.])skip\s*:|[{,]\s*skip\s*(?=[,}])/g)) {
      const at = skip.index ?? 0;
      if (insideLiteral(literals, at)) continue;
      const expression = skip[0].endsWith(':') ? expressionAfter(source, literals, at + skip[0].length, ',') : 'skip';
      if (/^\s*(?:async\s+)?(?:function\b|\([^)]*\)\s*=>|[\w$]+\s*=>)/.test(expression)) continue;
      const names = [...expression.matchAll(new RegExp(NAME, 'g'))].map((one) => one[0]);
      if (/\bexistsSync\s*\(/.test(expression) || names.some((one) => exists.has(one))) {
        found.push(`${rel} skips on ${expression.trim().replace(/\s+/g, ' ')}, which asks the disk; a suite that `
          + 'passes by skipping where a file is absent proves nothing where it is');
      }
    }

    for (const call of source.matchAll(/\.skip\s*\(/g)) {
      const at = call.index ?? 0;
      if (insideLiteral(literals, at)) continue;
      const before = source.slice(Math.max(0, at - 300), at);
      const guard = /\bif\s*\(([^\n]*)\)\s*\{?\s*(?:return\s+)?[\w$.]+$/.exec(before);
      if (guard !== null && /\bexistsSync\s*\(/.test(guard[1] ?? '')) {
        found.push(`${rel} skips under if (${(guard[1] ?? '').trim()}), which asks the disk; a suite that `
          + 'passes by skipping where a file is absent proves nothing where it is');
      }
    }

    if (found.length > 0) matched.add(rel);
    if (found.length > 0 && !exceptions.has(rel)) problems.push(...found);
  }

  for (const [path, why] of exceptions) {
    if (why.length < MIN_WHY) {
      problems.push(`${path} is excepted from the suite-read rule and the record does not say why; an exception without its reason is worthless`);
    }
    if (!matched.has(path)) {
      problems.push(`SUITE_READ_EXCEPTIONS names ${path}, which no longer has a match; an exception cannot outlive what it was written for`);
    }
  }
  return { problems, read: readCount };
}

export async function suiteReadRule(base: string, nodes: GraphNode[], declaredIn: Map<string, string>) {
  const roots = assemblyRoots(nodes);
  if (roots.length === 0) {
    return ['no node is releaseOnly with a writes, so the suite-read rule has no assembly output to keep suites from, and compared nothing'];
  }
  const { problems } = await suiteReadProblems(base, roots, SUITE_READ_EXCEPTIONS, { gates: gateFilesOf(nodes, declaredIn, roots) });
  return problems;
}
