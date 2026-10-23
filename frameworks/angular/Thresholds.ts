export function arenaRegionIndex(value: number, edges: readonly number[]): number {
  let region = 0;
  for (const edge of edges) if (edge <= value) region += 1;
  return region;
}
