/* The token tree under skills/design/references/tokens/ against the shape it promises. Seven
 * claims: every page the tree names exists and no page sits outside it; nothing is deeper than
 * three segments below references/; a leaf stays under LEAF_MAX characters and an index under
 * INDEX_MAX; a markup page never writes a component role as a custom property, except that
 * markup/states.md may write the CONTROL_READS names; a role's row sits in exactly the leaf
 * roleLeaf names (and a markup role's second row in exactly markupLeaf's) and nowhere else; every child says when to read it; and each generated region is what
 * generate:token-tree would write. */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { ARENA_EXT } from '../../lib/core/dtcg-shapes.ts';
import { when } from '../../lib/arena/llms-index.ts';
import {
  TREE_DIR, TREE, TREE_OPEN, TREE_CLOSE, GENERATED_PATHS, CONTROL_READS, roleLeaf, markupLeaf, regionBodies,
} from '../../generate/arena/generate-token-tree.ts';

export const LEAF_MAX = 8000;
export const INDEX_MAX = 3000;
export const DEPTH_MAX = 3;

const ROLES = 'contracts/design/roles.json';
const REFERENCES = 'skills/design/references';
const COMPONENT_INDEX_LINK = '../components/index.md';

export const node = {
  name: 'check:token-tree',
  reads: [ROLES, 'contracts/design/layering.json', 'frameworks/tailwind/Theme.css', `${TREE_DIR}/**/*.md`],
  writes: [],
  feeds: [],
};

const linkOf = (index: string, child: string) =>
  child.endsWith('index.md') ? child : `${index.slice(0, -'index.md'.length)}${child}.md`;

export function treePaths() {
  const children = Object.entries(TREE).flatMap(([index, kids]) => kids.map((child) => linkOf(index, child)));
  return { keys: Object.keys(TREE), children, all: new Set([...Object.keys(TREE), ...children]) };
}

type Role = { $extensions?: Record<string, { audience?: string; task?: string }> };

function regionOf(text: string) {
  const lines = text.split('\n');
  const from = lines.indexOf(TREE_OPEN);
  const to = from === -1 ? -1 : lines.indexOf(TREE_CLOSE, from);
  return from === -1 || to === -1 ? null : lines.slice(from + 1, to).join('\n').trim();
}

export function treeProblems(base = root): string[] {
  const problems: string[] = [];
  const dir = join(base, TREE_DIR);
  const { children, all } = treePaths();

  for (const path of children)
    if (!existsSync(join(dir, path))) problems.push(`${TREE_DIR}/${path} is a child of the tree and does not exist.`);
  for (const key of Object.keys(TREE))
    if (!existsSync(join(dir, key))) problems.push(`${TREE_DIR}/${key} is an index of the tree and does not exist.`);

  const onDisk = existsSync(dir) ? walkFiles(dir).map((file) => relPosix(dir, file)).filter((p) => p.endsWith('.md')) : [];
  if (onDisk.length === 0) problems.push(`${TREE_DIR} holds no page, so every claim below would pass over nothing.`);
  for (const path of onDisk)
    if (!all.has(path)) problems.push(`${TREE_DIR}/${path} is neither an index nor a child in TREE, so no index reaches it.`);

  for (const file of existsSync(join(base, REFERENCES)) ? walkFiles(join(base, REFERENCES)) : []) {
    const rel = relPosix(join(base, REFERENCES), file);
    if (rel.split('/').length > DEPTH_MAX)
      problems.push(`${REFERENCES}/${rel} sits ${rel.split('/').length} segments below references/, and the tree stops at ${DEPTH_MAX}.`);
  }

  const texts = new Map<string, string>();
  for (const path of onDisk) texts.set(path, readFileSync(join(dir, path), 'utf8'));

  for (const [path, text] of texts) {
    const max = path.endsWith('index.md') ? INDEX_MAX : LEAF_MAX;
    if (text.length > max)
      problems.push(`${TREE_DIR}/${path} holds ${text.length} characters; ${path.endsWith('index.md') ? 'an index' : 'a leaf'} may hold at most ${max}.`);
  }

  const roles = readJson(join(base, ROLES)) as Record<string, Role>;
  const meta = (name: string) => roles[name]!.$extensions?.[ARENA_EXT] as { audience: string; task: string };
  const names = Object.keys(roles);
  if (names.length === 0) problems.push(`${ROLES} declares no role, so no row was checked.`);
  const component = names.filter((name) => meta(name).audience === 'component');

  for (const [path, text] of texts) {
    if (!path.startsWith('markup/')) continue;
    for (const line of text.split('\n')) {
      if (path === 'markup/index.md' && line.includes(COMPONENT_INDEX_LINK)) continue;
      for (const name of component) {
        const allowed = path === 'markup/states.md' && Object.hasOwn(CONTROL_READS, name);
        const written = new RegExp(`--${name}(?![a-z0-9-])`).test(line.replace(new RegExp(`[a-z0-9-]--${name}`, 'g'), ''));
        if (written && !allowed)
          problems.push(`${TREE_DIR}/${path} writes the component role --${name}, which a markup page may not name.`);
      }
    }
  }

  const rowsOf = new Map<string, Set<string>>();
  for (const [path, text] of texts)
    for (const line of text.split('\n')) {
      const name = /^\| `--([a-z0-9-]+)` \|/.exec(line)?.[1];
      if (!name || !roles[name]) continue;
      rowsOf.set(name, new Set([...(rowsOf.get(name) ?? []), path]));
    }
  for (const name of names) {
    const { audience, task } = meta(name);
    const want = [roleLeaf(name, { audience, task })];
    if (audience === 'markup') want.push(markupLeaf(task));
    const have = [...(rowsOf.get(name) ?? [])].sort();
    if (have.join('\n') !== [...want].sort().join('\n'))
      problems.push(`The row of --${name} sits in ${have.length ? have.join(', ') : 'no page'}, and it belongs in exactly ${want.join(' and ')}.`);
  }

  for (const path of children) {
    if (!existsSync(join(dir, path))) continue;
    if (!when(`${TREE_DIR}/${path}`, base)) problems.push(`${TREE_DIR}/${path} has no sentence that starts "Read this", so its index row has nothing to say.`);
  }

  let bodies: Map<string, string> | null = null;
  try {
    bodies = regionBodies(base);
  } catch (err) {
    problems.push((err as Error).message.replace(/^generate-token-tree: /, ''));
  }
  if (bodies) {
    for (const [path, body] of bodies) {
      const text = texts.get(path);
      if (text === undefined) continue;
      const region = regionOf(text);
      if (region === null) problems.push(`${TREE_DIR}/${path} has no ${TREE_OPEN} pair.`);
      else if (region !== body.trim()) problems.push(`${TREE_DIR}/${path} holds a region that is not what generate:token-tree writes. Run bun run generate:token-tree.`);
    }
    for (const path of GENERATED_PATHS)
      if (!bodies.has(path)) problems.push(`${TREE_DIR}/${path} is generated and no body was derived for it.`);
  }
  return [...new Set(problems)];
}

function main() {
  const problems = treeProblems();
  if (problems.length) {
    for (const problem of problems) console.error(`check-token-tree: ${problem}`);
    process.exit(1);
  }
  console.log(`check-token-tree: ${treePaths().all.size} page(s) hold the tree's shape, limits and rows`);
}

if (isMainModule(import.meta.url)) main();
