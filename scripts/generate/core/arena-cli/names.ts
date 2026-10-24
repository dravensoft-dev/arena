/* The nearest declared name to one a plugin wrote, for the two audit rules that report a name
 * nothing declares: a property read through var(), and a part named by data-arena-part. */

function distance(one: string, two: string) {
  let row = Array.from({ length: two.length + 1 }, (_, i) => i);
  for (let i = 1; i <= one.length; i += 1) {
    const next = [i];
    for (let j = 1; j <= two.length; j += 1) {
      next[j] = Math.min((row[j] ?? 0) + 1, (next[j - 1] ?? 0) + 1,
        (row[j - 1] ?? 0) + (one[i - 1] === two[j - 1] ? 0 : 1));
    }
    row = next;
  }
  return row[two.length] ?? 0;
}

export function nearestName(name: string, known: Iterable<string>): string | null {
  const limit = Math.max(2, Math.floor(name.length / 5));
  let best: string | null = null;
  let bestAt = Infinity;
  for (const one of [...known].sort()) {
    const at = distance(name, one);
    if (at <= limit && at < bestAt) {
      best = one;
      bestAt = at;
    }
  }
  return best;
}

export function unknownPart(part: string, parts: Record<string, Record<string, string[]>>) {
  const hooks = new Map<string, Set<string>>();
  for (const declared of Object.values(parts)) {
    for (const [name, found] of Object.entries(declared)) {
      const into = hooks.get(name) ?? new Set<string>();
      for (const hook of found) into.add(hook);
      hooks.set(name, into);
    }
  }
  const prefix = [...hooks.keys()].filter((name) => part.startsWith(`${name}-`))
    .sort((one, two) => two.length - one.length || (one < two ? -1 : 1))[0];
  const near = prefix ?? nearestName(part, hooks.keys());
  if (!prefix || !near) return { near, hook: null };
  const hook = `data-arena-${part.slice(near.length + 1)}`;
  return { near, hook: hooks.get(near)?.has(hook) ? hook : null };
}

export function knownParts(parts: Record<string, Record<string, string[]>>) {
  return new Set(Object.values(parts).flatMap((declared) => Object.keys(declared)));
}
