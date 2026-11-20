import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { COLORS } from '../../check/core/check-text-contrast.ts';
import { repoRoot } from '../arena/repo-root.ts';

export function scratchContrastTree(over: Record<string, string> = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'contrast-'));
  mkdirSync(join(dir, 'contracts/design'), { recursive: true });
  mkdirSync(join(dir, 'p'));
  writeFileSync(join(dir, 'contracts/design/roles.json'), '{}');
  writeFileSync(join(dir, COLORS), readFileSync(join(repoRoot, COLORS)));
  const answers: Record<string, string> = {
    'fill-page': '{color.base-100}', 'fill-surface': '{color.base-100}', 'fill-field': '{color.base-100}',
    'fill-track': '{color.base-100}', 'edge-focus': '{color.strong}', 'edge-selected': '{color.strong}',
    'edge-invalid': '{color.strong}', 'ink-invalid': '{color.strong}', 'ink-selected': '{color.strong}',
    'fill-selected': '{color.base-100}', ...over,
  };
  writeFileSync(join(dir, 'p/plugin.tokens.json'), JSON.stringify(
    Object.fromEntries(Object.entries(answers).map(([role, value]) => [role, { $value: value }])),
  ));
  return dir;
}
