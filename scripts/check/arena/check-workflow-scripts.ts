/* A script a job runs must be runnable in the job that runs it. A job with no `bun install` still
 * runs scripts, and Bun answers a bare specifier there by fetching it at whatever major the
 * registry serves rather than the one bun.lock pins. That is how the publish guard broke: it
 * reached typescript through the assembler, resolved 7.x against a tree pinned to 6.x, and threw
 * inside `< <(...)`, which set -e does not see -- so it read no paths, git reads no path as every
 * path, and two packages were republished from a diff of the whole tree. Either half satisfies it:
 * install first, or import nothing outside node: and this tree. It reads a JOB rather than a
 * workflow, since installing in one says nothing about another, follows `bun run` through
 * package.json so a name cannot hide a path, and takes specifiers off the parse: a regular
 * expression whose source is an import statement fools every scan short of one. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import {
  ScriptTarget, SyntaxKind, createSourceFile, forEachChild, isCallExpression, isExportDeclaration,
  isImportDeclaration, isStringLiteral, type Node,
} from 'typescript';
import { scriptClosure } from '../../graph/script-closure.ts';
import { jobBlocks } from './check-portability.ts';
import { isPathSpecifier } from '../../utils/module-graph.ts';

export const node = {
  name: 'check:workflow-scripts',
  reads: ['scripts/**', '.github/workflows/**', 'package.json'],
  writes: [],
  feeds: [],
};

export const WORKFLOWS = '.github/workflows';

export const INSTALL = /\bbun install\b/;

export const DIRECT = /\bbun\s+(?:run\s+)?(scripts\/[^\s'"`;|)]+\.(?:ts|mjs))/g;

export const NAMED = /\bbun\s+run\s+([A-Za-z0-9:_-]+)/g;

export function bareSpecifiers(source: string, name = 'entry.ts') {
  const file = createSourceFile(name, source, ScriptTarget.Latest, true);
  const found = new Set<string>();

  const take = (node: Node | undefined) => {
    if (node && isStringLiteral(node) && !isPathSpecifier(node.text) && !node.text.startsWith('node:')) {
      found.add(node.text);
    }
  };

  const walk = (node: Node) => {
    if (isImportDeclaration(node) || isExportDeclaration(node)) take(node.moduleSpecifier);
    if (isCallExpression(node) && node.expression.kind === SyntaxKind.ImportKeyword) {
      take(node.arguments[0]);
    }
    forEachChild(node, walk);
  };

  forEachChild(file, walk);
  return [...found].sort();
}

export function packageScripts(base = root): Record<string, string> {
  return JSON.parse(readFileSync(join(base, 'package.json'), 'utf8')).scripts ?? {};
}

export function entryScripts(command: string, scripts: Record<string, string>) {
  const found = new Set<string>();
  const seen = new Set<string>();
  const walk = (text: string) => {
    for (const match of text.matchAll(DIRECT)) found.add(match[1] ?? '');
    for (const match of text.matchAll(NAMED)) {
      const name = match[1] ?? '';
      if (seen.has(name)) continue;
      seen.add(name);
      const body = scripts[name];
      if (body !== undefined) walk(body);
    }
  };
  walk(command);
  return [...found].sort();
}

export function workflowFiles(base = root) {
  return walkFiles(join(base, WORKFLOWS)).filter((p) => p.endsWith('.yml') || p.endsWith('.yaml'));
}

export function jobProblems(workflow: string, text: string, scripts: Record<string, string>, base = root) {
  const problems: string[] = [];
  let checked = 0;

  for (const [job, block] of jobBlocks(text)) {
    if (INSTALL.test(block)) continue;
    for (const entry of entryScripts(block, scripts)) {
      checked += 1;
      const closure = scriptClosure(join(base, entry), base);
      for (const rel of closure) {
        const bare = bareSpecifiers(readFileSync(join(base, rel), 'utf8'), rel);
        for (const specifier of bare) {
          problems.push(`${workflow}: job ${job} runs ${entry} and installs nothing, and `
            + `${rel} imports ${specifier}, which only the registry can answer`);
        }
      }
    }
  }
  return { problems, checked };
}

export function workflowScriptProblems(base = root) {
  const scripts = packageScripts(base);
  const problems: string[] = [];
  let checked = 0;
  let scanned = 0;

  for (const path of workflowFiles(base)) {
    scanned += 1;
    const one = jobProblems(relPosix(base, path), readFileSync(path, 'utf8'), scripts, base);
    problems.push(...one.problems);
    checked += one.checked;
  }
  return { problems, checked, scanned };
}

function main() {
  const { problems, checked, scanned } = workflowScriptProblems();

  if (scanned === 0) {
    console.error(`check-workflow-scripts: scanned 0 workflow(s); ${WORKFLOWS} moved under this gate`);
    process.exit(1);
  }

  if (problems.length > 0) {
    for (const problem of problems) console.error(`check-workflow-scripts: ${problem}`);
    console.error(`\ncheck-workflow-scripts: ${problems.length} problem(s)`);
    process.exit(1);
  }

  console.log(`check-workflow-scripts: ${scanned} workflow(s), and the ${checked} script run(s) in `
    + 'a job that installs nothing import only node: and this tree');
}

if (isMainModule(import.meta.url)) main();
