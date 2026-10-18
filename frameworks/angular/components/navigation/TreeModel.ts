export interface ArenaTreeModelNode { id: string; label: string; parent?: string; icon?: string; disabled?: boolean; expandable?: boolean }
export type ArenaTreeProblem = { kind: 'duplicate' | 'orphan' | 'cycle'; id: string };
export interface ArenaTreeShape {
  roots: readonly string[];
  children: ReadonlyMap<string, readonly string[]>;
  byId: ReadonlyMap<string, ArenaTreeModelNode>;
  parentOf: ReadonlyMap<string, string>;
}
export type ArenaTreeKey = 'ArrowDown' | 'ArrowUp' | 'ArrowRight' | 'ArrowLeft' | 'Home' | 'End';
export type ArenaTreeMove = { focus: string } | { open: string } | { close: string } | null;

export function arenaTreeBlankMessage(field: 'id' | 'label', index: number): string {
  return `ArenaTreeView: the ${field} of the node at index ${index} is blank, and every node needs a non-blank id and label`;
}

export function arenaTreeProblemMessage(problem: ArenaTreeProblem): string {
  if (problem.kind === 'duplicate') {
    return `ArenaTreeView: the id "${problem.id}" belongs to more than one node, so only the first is drawn`;
  }
  if (problem.kind === 'orphan') {
    return `ArenaTreeView: the node "${problem.id}" names a parent that is not in nodes, so it is drawn as a root`;
  }
  return `ArenaTreeView: the node "${problem.id}" is reachable from no root, so it is not drawn`;
}

const blank = (value: unknown): boolean => typeof value !== 'string' || value.trim() === '';

export function arenaTreeShape(nodes: readonly ArenaTreeModelNode[]): { shape: ArenaTreeShape; problems: ArenaTreeProblem[] } {
  nodes.forEach((node, index) => {
    if (blank(node.id)) throw new Error(arenaTreeBlankMessage('id', index));
    if (blank(node.label)) throw new Error(arenaTreeBlankMessage('label', index));
  });
  const problems: ArenaTreeProblem[] = [];
  const kept = new Map<string, ArenaTreeModelNode>();
  for (const node of nodes) {
    if (kept.has(node.id)) problems.push({ kind: 'duplicate', id: node.id });
    else kept.set(node.id, node);
  }
  const roots: string[] = [];
  const children = new Map<string, string[]>();
  const parentOf = new Map<string, string>();
  for (const node of kept.values()) {
    const parent = node.parent;
    if (parent === undefined) {
      roots.push(node.id);
      continue;
    }
    if (!kept.has(parent)) {
      problems.push({ kind: 'orphan', id: node.id });
      roots.push(node.id);
      continue;
    }
    parentOf.set(node.id, parent);
    const list = children.get(parent);
    if (list === undefined) children.set(parent, [node.id]);
    else list.push(node.id);
  }
  const reached = new Set<string>();
  const pending = [...roots];
  for (let id = pending.pop(); id !== undefined; id = pending.pop()) {
    reached.add(id);
    pending.push(...(children.get(id) ?? []));
  }
  const byId = new Map<string, ArenaTreeModelNode>();
  for (const [id, node] of kept) {
    if (reached.has(id)) byId.set(id, node);
    else {
      problems.push({ kind: 'cycle', id });
      parentOf.delete(id);
      children.delete(id);
    }
  }
  return { shape: { roots, children, byId, parentOf }, problems };
}

export function arenaTreeVisible(shape: ArenaTreeShape, expanded: readonly string[]): string[] {
  const open = new Set(expanded);
  const out: string[] = [];
  const pending = [...shape.roots].reverse();
  for (let id = pending.pop(); id !== undefined; id = pending.pop()) {
    out.push(id);
    if (open.has(id)) pending.push(...[...(shape.children.get(id) ?? [])].reverse());
  }
  return out;
}

function siblingsOf(shape: ArenaTreeShape, id: string): readonly string[] {
  const parent = shape.parentOf.get(id);
  return parent === undefined ? shape.roots : shape.children.get(parent) ?? [];
}

export function arenaTreeLevel(shape: ArenaTreeShape, id: string): number {
  let level = 1;
  for (let up = shape.parentOf.get(id); up !== undefined; up = shape.parentOf.get(up)) level += 1;
  return level;
}

export function arenaTreeSetSize(shape: ArenaTreeShape, id: string): number {
  return siblingsOf(shape, id).length;
}

export function arenaTreePosInSet(shape: ArenaTreeShape, id: string): number {
  return siblingsOf(shape, id).indexOf(id) + 1;
}

export function arenaTreeParent(shape: ArenaTreeShape, id: string): string | undefined {
  return shape.parentOf.get(id);
}

export function arenaTreeIsBranch(shape: ArenaTreeShape, id: string): boolean {
  return (shape.children.get(id)?.length ?? 0) > 0 || shape.byId.get(id)?.expandable === true;
}

export function arenaTreeStep(shape: ArenaTreeShape, visible: readonly string[], expanded: readonly string[], at: string, key: ArenaTreeKey): ArenaTreeMove {
  const toward = (id: string | undefined): ArenaTreeMove => (id === undefined ? null : { focus: id });
  if (key === 'Home') return toward(visible[0]);
  if (key === 'End') return toward(visible[visible.length - 1]);
  const index = visible.indexOf(at);
  if (index < 0) return null;
  if (key === 'ArrowDown') return toward(visible[index + 1]);
  if (key === 'ArrowUp') return toward(visible[index - 1]);
  const open = expanded.includes(at);
  if (key === 'ArrowRight') {
    if (!arenaTreeIsBranch(shape, at)) return null;
    return open ? toward(shape.children.get(at)?.[0]) : { open: at };
  }
  if (open && arenaTreeIsBranch(shape, at)) return { close: at };
  return toward(shape.parentOf.get(at));
}

export function arenaTreeToggled(expanded: readonly string[], id: string, open: boolean): string[] {
  if (!open) return expanded.filter((kept) => kept !== id);
  return expanded.includes(id) ? [...expanded] : [...expanded, id];
}

export function arenaTreeStop(shape: ArenaTreeShape, visible: readonly string[], focused: string | undefined, selected: readonly string[]): string | undefined {
  const shown = new Set(visible);
  if (focused !== undefined) {
    for (let id: string | undefined = focused; id !== undefined; id = shape.parentOf.get(id)) {
      if (shown.has(id)) return id;
    }
  }
  const chosen = new Set(selected);
  return visible.find((id) => chosen.has(id)) ?? visible[0];
}

export interface ArenaTreeCarryKept {
  extents: Map<number, number>;
  starts: number[];
  lead: number;
  rows: number;
  dirty: boolean;
  aim: { row: number; near: boolean } | null;
}

export interface ArenaTreeCarryMath {
  estimate(measured: Iterable<number>, fallback: number | undefined): number;
  starts(total: number, extents: ReadonlyMap<number, number>, estimate: number): number[];
  range(scrollTop: number, viewport: number, starts: readonly number[], overscan: number, initial: number): { offset: number; count: number };
}

export function arenaTreeCarry(kept: ArenaTreeCarryKept, scrollTop: number, before: readonly string[], after: readonly string[],
  math: ArenaTreeCarryMath): number | null {
  const at = new Map(after.map((id, index): [string, number] => [id, index]));
  const extents = new Map<number, number>();
  for (const [index, size] of kept.extents) {
    const moved = at.get(before[index] ?? '');
    if (moved !== undefined) extents.set(moved, size);
  }
  const top = scrollTop - kept.lead;
  const known = before.length > 0 && kept.starts.length === before.length + 1;
  let row = known ? math.range(top, 0, kept.starts, 0, 0).offset : -1;
  let delta = row >= 0 ? top - (kept.starts[row] ?? 0) : 0;
  while (row >= 0 && !at.has(before[row] ?? '')) { row -= 1; delta = 0; }
  const aimed = kept.aim ? at.get(before[kept.aim.row] ?? '') : undefined;
  kept.aim = kept.aim && aimed !== undefined ? { row: aimed, near: kept.aim.near } : null;
  kept.extents = extents;
  if (extents.size === 0) {
    kept.starts = [0];
    kept.dirty = true;
    return null;
  }
  kept.starts = math.starts(after.length, extents, math.estimate(extents.values(), undefined));
  kept.rows = after.length;
  kept.dirty = false;
  return row >= 0 ? (kept.starts[at.get(before[row] ?? '') ?? 0] ?? 0) + kept.lead + delta : null;
}
