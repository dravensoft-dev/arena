/* The directories inside this checkout that are not this repository, named once so every walk
 * skips the same ones. Each walk still adds what it skips for its own reason, an emitted tree or
 * a vendored one, since those are decisions about a subject; these three are not. Spelling the
 * set per walk is how the walks came to disagree, and a git worktree under .claude/ was then read
 * as a second copy of the tree by the ones that missed it. Nothing here imports anything, so a
 * module that must stay dependency-free can still compose it. */

export const FOREIGN_TREES = new Map<string, string>([
  ['node_modules', 'installed dependencies: somebody else\'s tree, placed here by an install'],
  ['.git', 'the object store, which holds every version of this tree and none of them as files'],
  ['.claude', 'machine-local harness state, and where a git worktree lands: a second whole copy '
    + 'of this tree that a walk would read as its own'],
]);

export function isForeignTree(name: string) {
  return FOREIGN_TREES.has(name);
}

export function withForeignTrees(...names: string[]) {
  return new Set([...FOREIGN_TREES.keys(), ...names]);
}
