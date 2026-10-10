/* The algebra over a set of declared nodes, and nothing about where they came from or what a spec
 * reaches: resolution is handed in, so this module holds no table and imports no script. Edges are
 * declared downstream, as `feeds`, and everything reading the other direction goes through
 * needsOf(). Ties in the order are broken by the position a node was collected at, so the sequence
 * a run prints is stable rather than whatever the queue happened to hold. */

export type GraphNode = {
  name: string;
  reads: string[];
  writes: string[];
  feeds: string[];
  releaseOnly?: string;
  runsBeforeSuites?: string;
};

export type Resolve = (specs: string[]) => string[];

export function byName(nodes: GraphNode[]) {
  return new Map(nodes.map((node) => [node.name, node]));
}

export function needsOf(nodes: GraphNode[]) {
  const needs = new Map<string, string[]>(nodes.map((node) => [node.name, []]));
  for (const node of nodes) {
    for (const fed of node.feeds) needs.get(fed)?.push(node.name);
  }
  return needs;
}

export function unknownFeeds(nodes: GraphNode[]) {
  const known = byName(nodes);
  return nodes.flatMap((node) => node.feeds
    .filter((fed) => !known.has(fed))
    .map((fed) => `${node.name} lists ${fed} in feeds, and no node is called that`));
}

export function selfFeeds(nodes: GraphNode[]) {
  return nodes.filter((node) => node.feeds.includes(node.name))
    .map((node) => `${node.name} lists itself in feeds`);
}

export function cyclePath(nodes: GraphNode[]) {
  const known = byName(nodes);
  const state = new Map<string, number>();
  const stack: string[] = [];

  const walk = (name: string): string[] | null => {
    if (state.get(name) === 1) return [...stack.slice(stack.indexOf(name)), name];
    if (state.get(name) === 2) return null;
    state.set(name, 1);
    stack.push(name);
    for (const fed of known.get(name)?.feeds ?? []) {
      if (!known.has(fed)) continue;
      const found = walk(fed);
      if (found) return found;
    }
    stack.pop();
    state.set(name, 2);
    return null;
  };

  for (const node of nodes) {
    const found = walk(node.name);
    if (found) return found;
  }
  return null;
}

export function topoOrder(nodes: GraphNode[]) {
  if (cyclePath(nodes)) throw new Error('graph: a cycle has no order, so topoOrder refuses to invent one');
  const known = byName(nodes);
  const rank = new Map(nodes.map((node, i) => [node.name, i]));
  const needs = needsOf(nodes);
  const waiting = new Map(nodes.map((node) => [node.name, (needs.get(node.name) ?? []).length]));

  const ready = nodes.filter((node) => waiting.get(node.name) === 0).map((node) => node.name);
  const order: GraphNode[] = [];
  while (ready.length > 0) {
    ready.sort((a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0));
    const name = ready.shift() as string;
    const node = known.get(name);
    if (!node) continue;
    order.push(node);
    for (const fed of node.feeds) {
      if (!known.has(fed)) continue;
      const left = (waiting.get(fed) ?? 0) - 1;
      waiting.set(fed, left);
      if (left === 0) ready.push(fed);
    }
  }
  return order;
}

export function transitiveFeeds(nodes: GraphNode[], from: string) {
  const known = byName(nodes);
  const reached = new Set<string>();
  const walk = (name: string) => {
    for (const fed of known.get(name)?.feeds ?? []) {
      if (reached.has(fed) || !known.has(fed)) continue;
      reached.add(fed);
      walk(fed);
    }
  };
  walk(from);
  return reached;
}

export function upstreamOf(nodes: GraphNode[], from: string) {
  const needs = needsOf(nodes);
  const reached = new Set<string>();
  const walk = (name: string) => {
    for (const need of needs.get(name) ?? []) {
      if (reached.has(need)) continue;
      reached.add(need);
      walk(need);
    }
  };
  walk(from);
  return reached;
}

export function duplicateWriters(nodes: GraphNode[], resolve: Resolve) {
  const writers = new Map<string, string[]>();
  for (const node of nodes) {
    for (const path of resolve(node.writes)) {
      writers.set(path, [...(writers.get(path) ?? []), node.name]);
    }
  }
  return [...writers]
    .filter(([, names]) => names.length > 1)
    .map(([path, names]) =>
      `${path} is written by ${names.join(' and by ')}; an artifact with two writers has no upstream`);
}

export function subscriptionProblems(nodes: GraphNode[], resolve: Resolve) {
  const reads = new Map(nodes.map((node) => [node.name, new Set(resolve(node.reads))]));
  const problems = [];

  for (const writer of nodes) {
    const written = resolve(writer.writes);
    const carried = new Set<string>();

    for (const reader of nodes) {
      if (reader.name === writer.name) continue;
      const shared = written.find((path) => reads.get(reader.name)?.has(path));
      if (shared === undefined) continue;
      carried.add(reader.name);
      if (writer.feeds.includes(reader.name)) continue;
      problems.push(
        `${writer.name} writes ${shared}, which ${reader.name} reads, and ${writer.name} does not `
        + `list ${reader.name} in feeds -- an unsubscribed reader is a gate that runs against an `
        + 'artifact from the last build',
      );
    }

    for (const fed of writer.feeds) {
      if (carried.has(fed) || !reads.has(fed)) continue;
      problems.push(
        `${writer.name} lists ${fed} in feeds, and nothing ${fed} reads is written by `
        + `${writer.name} -- an edge nothing carries is an edge nobody maintains`,
      );
    }
  }
  return problems;
}
