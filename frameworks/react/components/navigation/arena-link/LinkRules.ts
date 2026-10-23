import { arenaWarnOnce } from '../../../WarnOnce.ts';

export const ARENA_LINK_SAME_CONTEXT = ['_self', '_parent', '_top'];

export function arenaLinkTarget(external: boolean, target: string | undefined): string | undefined {
  if (external) return '_blank';
  const named = target?.trim();
  if (!named) return undefined;
  if (named.toLowerCase() === '_blank') {
    arenaWarnOnce('ArenaLink: target "_blank" is ignored. A new tab is `external`, which also writes noopener and the spoken hint, so set that instead.');
    return undefined;
  }
  return named;
}

export function arenaLinkOpensAnother(external: boolean, target: string | undefined): boolean {
  const written = arenaLinkTarget(external, target);
  return written !== undefined && !ARENA_LINK_SAME_CONTEXT.includes(written.toLowerCase());
}

export function arenaLinkRel(rel: readonly string[] | undefined, external: boolean, target: string | undefined): string | undefined {
  const tokens: string[] = [];
  for (const entry of rel ?? []) {
    for (const token of entry.trim().toLowerCase().split(/\s+/)) {
      if (token === 'opener') {
        arenaWarnOnce('ArenaLink: the rel token "opener" is dropped. A link Arena draws never hands the page it opens this one.');
        continue;
      }
      if (token && !tokens.includes(token)) tokens.push(token);
    }
  }
  if (arenaLinkOpensAnother(external, target) && !tokens.includes('noopener')) tokens.push('noopener');
  if (external && !tokens.includes('noreferrer')) tokens.push('noreferrer');
  return tokens.length > 0 ? tokens.join(' ') : undefined;
}

export function arenaLinkRoutes(external: boolean, download: boolean, target: string | undefined): boolean {
  if (external || download) return false;
  const written = arenaLinkTarget(false, target);
  return written === undefined || written.toLowerCase() === '_self';
}
