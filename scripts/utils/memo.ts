/* One derivation, computed once per process. A gate resolves the same tree several times over and
 * the suites hold 325 files in ONE bun process, so a copy per caller is a copy that stays resident
 * for the whole run. The key is the caller's to state, and a derivation taking a root MUST key on
 * it: keyed on nothing, a suite passing a fixture directory is handed the repository's answer, and
 * the assertion that follows is about a tree it never wrote. `clear()` is for the other half of
 * that, a suite rewriting one root between two calls, which nothing mechanical can catch. The hit
 * is wrapped rather than read back through `has`, so a derivation whose answer IS undefined is
 * cached like any other. */

export function memoBy<A extends unknown[], T>(key: (...args: A) => string, build: (...args: A) => T) {
  const held = new Map<string, { value: T }>();
  const call = (...args: A): T => {
    const at = key(...args);
    const hit = held.get(at);
    if (hit) return hit.value;
    const value = build(...args);
    held.set(at, { value });
    return value;
  };
  call.clear = () => held.clear();
  return call;
}

export function memo<T>(build: () => T) {
  return memoBy<[], T>(() => '', build);
}
