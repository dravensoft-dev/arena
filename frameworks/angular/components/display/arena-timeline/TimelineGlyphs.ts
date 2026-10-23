export type ArenaTimelineTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export function arenaTimelineGlyph(tone: ArenaTimelineTone, icon?: string): string | undefined {
  if (icon?.trim()) return icon.trim();
  if (tone === 'success') return 'ph-fill ph-check-circle';
  if (tone === 'warning') return 'ph-fill ph-warning';
  if (tone === 'danger') return 'ph-fill ph-warning-octagon';
  if (tone === 'info') return 'ph-fill ph-info';
  return undefined;
}

export function arenaTimelineTone(tone: string | undefined): ArenaTimelineTone {
  return tone === 'success' || tone === 'warning' || tone === 'danger' || tone === 'info' ? tone : 'neutral';
}

export type ArenaMilestoneState = 'complete' | 'current' | 'upcoming';

export function arenaTimelineState(position: number, index: number | undefined, count: number): ArenaMilestoneState {
  const at = index === undefined ? count : !Number.isFinite(index) || index < 0 ? 0 : Math.min(Math.floor(index), count);
  if (position < at) return 'complete';
  return position === at ? 'current' : 'upcoming';
}
