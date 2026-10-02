import { arenaWarnOnce } from './WarnOnce.ts';
import { ARENA_VOCABULARY, ARENA_VOCABULARY_PAGE } from './Vocabulary.generated.ts';

export function arenaClassName(
  component: string, base: string | undefined, own: string | undefined,
  allowed: readonly string[] = ARENA_VOCABULARY[component] ?? [],
): string | undefined {
  const kept: string[] = [];
  for (const token of (own ?? '').split(/\s+/)) {
    if (!token) continue;
    if (allowed.includes(token)) { kept.push(token); continue; }
    arenaWarnOnce(`${component} dropped the class "${token}". A component takes a class of Arena's vocabulary `
      + `and nothing else, and ${component} answers ${allowed.length ? allowed.join(', ') : 'none'}. `
      + `Every family and the components answering it: ${ARENA_VOCABULARY_PAGE}`);
  }
  const joined = [base, ...kept].filter(Boolean).join(' ');
  return joined || undefined;
}
