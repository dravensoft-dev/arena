export type ArenaPhrasePart = { text: string } | { slot: string };

export function arenaPhraseParts(template: string): ArenaPhrasePart[] {
  const parts: ArenaPhrasePart[] = [];
  let at = 0;
  for (const match of template.matchAll(/\{(\w+)\}/g)) {
    const index = match.index ?? 0;
    if (index > at) parts.push({ text: template.slice(at, index) });
    parts.push({ slot: match[1] ?? '' });
    at = index + match[0].length;
  }
  if (at < template.length) parts.push({ text: template.slice(at) });
  return parts;
}

export function arenaPhrase(template: string, values: Record<string, string | number>): string {
  return arenaPhraseParts(template)
    .map((part) => ('text' in part ? part.text : String(values[part.slot] ?? `{${part.slot}}`)))
    .join('');
}
