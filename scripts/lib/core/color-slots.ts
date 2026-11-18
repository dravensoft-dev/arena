/* Reads the colour slot contract from disk, so the gate and the tasks that emit from it agree on one parse. */

import { join } from 'node:path';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot } from '../arena/repo-root.ts';
import type { SlotCatalogue } from '../../generate/core/arena-cli/slots.ts';

export const COLOR_SLOTS = 'contracts/design/color-slots.json';

export function readColorSlots(root = repoRoot): SlotCatalogue {
  return readJson(join(root, COLOR_SLOTS)) as SlotCatalogue;
}
