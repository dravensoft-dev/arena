export const ARENA_WEIGHTS = ['ph-thin', 'ph-light', 'ph-bold', 'ph-duotone', 'ph-fill'];

export function arenaActiveWeight(icon: string): string {
  const parts = icon.split(/\s+/).filter(Boolean);
  if (parts.includes('ph-fill')) return icon;
  const replaced = parts.map((part) => (ARENA_WEIGHTS.includes(part) ? 'ph-fill' : part));
  return replaced.includes('ph-fill') ? replaced.join(' ') : ['ph-fill', ...replaced].join(' ');
}

export function arenaBadgeCount(badge: unknown): string | null {
  if (typeof badge !== 'number' || !(badge > 0)) return null;
  return badge > 99 ? '99+' : String(Math.floor(badge));
}
