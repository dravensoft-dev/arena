const folded = (text: string): string => text.toLocaleLowerCase();

export function arenaTypeAheadNext(labels: readonly string[], from: number, prefix: string): number {
  const total = labels.length;
  if (total === 0 || prefix === '') return -1;
  const origin = Number.isInteger(from) && from >= 0 && from < total ? from : -1;
  const start = Array.from(prefix).length === 1 ? origin + 1 : Math.max(origin, 0);
  const wanted = folded(prefix);
  for (let step = 0; step < total; step++) {
    const index = (start + step) % total;
    if (folded((labels[index] ?? '').trimStart()).startsWith(wanted)) return index;
  }
  return -1;
}

export function arenaTypeAheadBuffer(buffer: string, key: string): string {
  const same = buffer !== '' && Array.from(buffer).every((char) => folded(char) === folded(key));
  return same ? key : buffer + key;
}
