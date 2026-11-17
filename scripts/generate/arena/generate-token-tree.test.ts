/* The tree's two properties are that every role lands in exactly one leaf and that a leaf is placed
 * by a person and only filled by the script. These hold both over the real role file and over temp
 * trees, so a page with no markers is refused and a page that is current comes back unchanged. */

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { readJson } from '../../utils/read-file.ts';
import { ARENA_EXT } from '../../lib/core/dtcg-shapes.ts';
import {
  TREE, TREE_DIR, TREE_OPEN, TREE_CLOSE, roleLeaf, markupLeaf, regionBodies, renderTree, writeTree, firstSentence,
} from './generate-token-tree.ts';

const made: string[] = [];
after(() => { for (const dir of made) rmSync(dir, { recursive: true, force: true }); });

const put = (base: string, rel: string, text: string) => {
  mkdirSync(dirname(join(base, rel)), { recursive: true });
  writeFileSync(join(base, rel), text);
};

const role = (audience: string, task: string, extra: Record<string, unknown> = {}, description = 'A role. It asks something.') => ({
  $type: 'dimension', $description: description, $extensions: { [ARENA_EXT]: { audience, task, userScale: 'fixed', ...extra } },
});

const fixture = () => {
  const base = mkdtempSync(join(tmpdir(), 'token-tree-'));
  made.push(base);
  put(base, 'contracts/design/roles.json', JSON.stringify({
    'r-surface': role('markup', 'edges', {}, 'The corner of a surface. It is a role.'),
    'size-sm-control-h': role('component', 'component-size', { default: '{sp-8}' }),
  }));
  put(base, 'contracts/design/layering.json', JSON.stringify({
    z: { $type: 'number', $description: 'Layering.', nav: { $value: 800, $description: 'Fixed page navigation. It sits low.' }, toast: { $value: 1300, $description: 'Above all.' } },
  }));
  for (const [index, children] of Object.entries(TREE)) {
    const dir = dirname(index);
    const own = index === 'index.md' ? 'Tokens' : `${dir} index`;
    put(base, `${TREE_DIR}/${index}`, `# ${own}\n\nRead this when you pick a token for ${dir}. More text.\n\n${TREE_OPEN}\n\nold\n\n${TREE_CLOSE}\n`);
    for (const child of children) {
      const rel = child.endsWith('index.md') ? child : `${dir === '.' ? '' : `${dir}/`}${child}.md`;
      if (child.endsWith('index.md')) continue;
      put(base, `${TREE_DIR}/${rel}`, `# ${child} leaf\n\nIntro. Read this when you want ${child}. Tail.\n\n${TREE_OPEN}\n\nold\n\n${TREE_CLOSE}\n`);
    }
  }
  return base;
};

test('every role lands in exactly one role leaf', () => {
  const roles = readJson(join(repoRoot, 'contracts/design/roles.json')) as Record<string, { $extensions: Record<string, { audience: string; task: string }> }>;
  const counts: Record<string, number> = {};
  for (const [name, token] of Object.entries(roles)) {
    const leaf = roleLeaf(name, token.$extensions[ARENA_EXT]!);
    counts[leaf] = (counts[leaf] ?? 0) + 1;
  }
  assert.deepEqual(counts, {
    'plugin/surfaces-and-text.md': 16, 'plugin/edges.md': 20, 'plugin/space-and-layout.md': 18, 'plugin/type.md': 20,
    'plugin/depth-and-motion.md': 11, 'plugin/states.md': 2,
    'components/air.md': 33, 'components/type.md': 4, 'components/size-controls.md': 44, 'components/size-content.md': 42,
    'components/emphasis-and-accent.md': 27, 'components/status-hues.md': 22,
  });
});

test('a role no leaf rule takes throws', () => {
  assert.throws(() => roleLeaf('mystery-role', { audience: 'component', task: 'states' }), /mystery-role/);
  assert.throws(() => markupLeaf('component-size'), /markup\/component-size\.md/);
  assert.equal(markupLeaf('layers'), 'markup/layers.md');
  assert.throws(() => roleLeaf('mystery-role', { audience: 'markup', task: 'meaning-and-identity' }), /mystery-role/);
});

test('an index row is the child headline and its Read this sentence', () => {
  const base = fixture();
  const bodies = regionBodies(base);
  assert.equal(bodies.get('index.md')!.split('\n')[0], '- [markup index](./markup/index.md): Read this when you pick a token for markup.');
  assert.ok(bodies.get('markup/index.md')!.includes('- [edges leaf](./edges.md): Read this when you want edges.'));
});

test('a role row carries name, type, user scale and default, and a markup row its first sentence', () => {
  const base = fixture();
  const bodies = regionBodies(base);
  assert.ok(bodies.get('components/size-controls.md')!.includes('| `--size-sm-control-h` | dimension | fixed | `{sp-8}` |'));
  assert.ok(bodies.get('markup/edges.md')!.includes('| `--r-surface` | The corner of a surface |'));
  assert.ok(bodies.get('markup/layers.md')!.includes('| `--z-nav` | Fixed page navigation |'));
  assert.ok(bodies.get('markup/layers.md')!.indexOf('--z-nav') < bodies.get('markup/layers.md')!.indexOf('--z-toast'));
});

test('a file without its marker pair throws', () => {
  const base = fixture();
  put(base, `${TREE_DIR}/markup/edges.md`, '# edges leaf\n\nRead this when edges.\n');
  assert.throws(() => renderTree(base), /markup\/edges\.md/);
});

test('a written tree is a fixed point', () => {
  const base = fixture();
  writeTree(base);
  const first = renderTree(base);
  for (const [path, text] of first) assert.equal(readFileSync(join(base, TREE_DIR, path), 'utf8'), text, path);
  writeTree(base);
  assert.deepEqual([...renderTree(base)], [...first]);
  assert.ok(!readFileSync(join(base, TREE_DIR, 'markup/edges.md'), 'utf8').includes('\nold\n'));
});

test('a leaf no row lands in gets an emptied region', () => {
  const base = fixture();
  const path = `${TREE_DIR}/markup/meaning-and-identity.md`;
  assert.ok(readFileSync(join(base, path), 'utf8').includes('\nold\n'));
  writeTree(base);
  const after = readFileSync(join(base, path), 'utf8');
  assert.ok(after.includes(`${TREE_OPEN}\n${TREE_CLOSE}`) && !after.includes('old'));
  assert.equal(renderTree(base).get('markup/meaning-and-identity.md'), after);
});

test('a child with no Read this sentence throws naming the child', () => {
  const base = fixture();
  put(base, `${TREE_DIR}/markup/edges.md`, `# edges leaf\n\nNothing to say.\n\n${TREE_OPEN}\n\n${TREE_CLOSE}\n`);
  assert.throws(() => regionBodies(base), /markup\/edges\.md has no sentence that starts "Read this"/);
});

test('a description is cut at its first sentence, whatever starts the second, and never inside e.g. or i.e.', () => {
  assert.equal(firstSentence('Which face a heading takes. font names the family. This names WHICH text.'), 'Which face a heading takes');
  assert.equal(firstSentence('The leading of prose. `lh-root` already calls the steps roles.'), 'The leading of prose');
  assert.equal(firstSentence('A weight, e.g. Foo or bar, i.e. Baz. Then more.'), 'A weight, e.g. Foo or bar, i.e. Baz');
  assert.equal(firstSentence('One sentence with 0.5 in it'), 'One sentence with 0.5 in it');
});
