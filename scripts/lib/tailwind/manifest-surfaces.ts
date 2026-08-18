/* Which manifest draws which component's surface, and which components draw their own.
 * It is a fact about the Tailwind layer rather than about any one check, and it lives here
 * because two gates read it: check-manifest-states asks whose affordances a manifest may
 * carry, and check-appearance asks which manifest a component has to render. Either gate
 * owning it would make the other import in a cycle. A manifest mirrors a SURFACE, so a
 * compound family draws several contracted components from one, and a component that
 * composes another types that one's slot out by hand. HAND_DRAWN is the complement: a
 * component with no surface a class string can describe, which writes its own appearance. */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readJson } from '../../utils/read-file.ts';
import { memoBy } from '../../utils/memo.ts';
import { kebab } from '../../utils/case.ts';
import type { ComponentTree } from '../arena/layers.ts';
import { repoRoot } from '../arena/repo-root.ts';

export const MANIFEST_COVERS = new Map([
  ['ArenaTable', {
    covers: ['ArenaTable', 'ArenaTableRow', 'ArenaTableCell'],
    reason: 'One manifest draws the whole grid: the header and the empty state are ArenaTable\'s, the '
      + 'interactive row is ArenaTableRow\'s and the cells are ArenaTableCell\'s.',
  }],
  ['ArenaTabs', {
    covers: ['ArenaTabs', 'ArenaTab'],
    reason: 'The tablist and its tab buttons are ArenaTabs\'; the panel is ArenaTab\'s. The roving stop that '
      + 'carries the focus ring sits on a tab, which is the member ArenaTab contracts.',
  }],
  ['ArenaBottomNav', {
    covers: ['ArenaBottomNav', 'ArenaBottomNavItem'],
    reason: 'One manifest draws the whole bar -- the fixed row is ArenaBottomNav\'s and the equal '
      + 'column, its glyph, its label and its badge are ArenaBottomNavItem\'s. The item carries no '
      + 'manifest of its own because it has no surface of its own: it IS a column of the bar.',
  }],
  ['ArenaSideNav', {
    covers: ['ArenaSideNav', 'ArenaSideNavItem', 'ArenaSideNavSection', 'ArenaSideNavCollapsible'],
    reason: 'The family nests to any depth and one manifest holds every level of it -- the rail, a '
      + 'destination row, a labelled group and a disclosure.',
  }],
  ['ArenaCalendar', {
    covers: ['ArenaCalendar', 'ArenaCalendarEvent'],
    reason: 'The grid and its chips are one surface: a chip is positioned as a share of the grid, '
      + 'so its slots cannot live in a manifest of their own.',
  }],
  ['ArenaBoard', {
    covers: ['ArenaBoard', 'ArenaBoardColumn'],
    reason: 'One manifest draws the whole board: the frame is the column widths and the gap between '
      + 'them, and a column is a surface measured against that frame, so a recipe of its own could '
      + 'disagree with the grid it is a cell of.',
  }],
  ['ArenaPeopleList', {
    covers: ['ArenaPeopleList', 'ArenaPersonRow'],
    reason: 'One manifest draws the whole list: the list is the rows\' rhythm and the row is a line '
      + 'set against it, so the size the list hands down reaches the face, the name and the figure '
      + 'through one recipe rather than through two that could disagree about a step.',
  }],
  ['ArenaRadio', {
    covers: ['ArenaRadio', 'ArenaRadioGroup'],
    reason: 'One manifest draws the whole group -- the fieldset and the legend naming it are '
      + 'ArenaRadioGroup\'s and every control in it is ArenaRadio\'s. The group carries no manifest of its '
      + 'own because it has no surface of its own: it IS the frame around a set of radios.',
  }],
  ['ArenaConfirmDialog', {
    covers: ['ArenaConfirmDialog', 'ArenaButton'],
    reason: 'The dialog draws the confirm action itself, because that action carries Arena\'s one '
      + 'filled danger surface and an ArenaButton forwards no style. The cancel action is still an Arena '
      + 'ArenaButton, and a manifest has no composition, so it types that button out as its own slot and '
      + 'needs ArenaButton\'s affordance.',
  }],
  ['ArenaErrorState', {
    covers: ['ArenaErrorState', 'ArenaButton'],
    reason: 'The retry action is an ArenaButton, typed out as a slot for the same reason '
      + 'ArenaConfirmDialog\'s is.',
  }],
]);

export const HAND_DRAWN = new Map([
  ['ArenaScatterChart', 'draws geometry rather than a surface: each mark is placed from two of the data\'s own ranges against a measured plot box, so a class string cannot describe a shape whose coordinates ARE the data.'],
  ['ArenaRadarChart', 'draws geometry rather than a surface: the polygon vertices are polar projections of the data\'s own reach, so a class string cannot describe a shape whose coordinates ARE the data.'],
  ['ArenaPyramidChart', 'draws geometry rather than a surface, like every chart that plots data: the two mirrored runs of bars are positioned from the data\'s own reach against a measured inner width, so a class string cannot describe a shape whose coordinates ARE the data.'],
  ['ArenaHorizontalBarChart', 'draws geometry rather than a surface, for the same reason ArenaBarChart does: the bar rectangles are positioned from the data\'s own range against a measured inner width, so a class string cannot describe a shape whose coordinates ARE the data. It carries no manifest and writes its own appearance.'],
  ['ArenaBarChart', 'draws geometry rather than a surface: bar rectangles positioned from the data\'s '
    + 'own range against a measured inner height. A class string cannot describe a shape whose '
    + 'coordinates ARE the data, so it carries no manifest, writes its own appearance, and is '
    + 'what the react half of check-manifest-states reads.'],
  ['ArenaDoughnutChart', 'the same, for arc paths swept from each slice\'s share of the total, and for '
    + 'a legend laid out against the ring it annotates.'],
  ['ArenaLineChart', 'the same, for a polyline whose points are the series projected onto the measured '
    + 'plot area.'],
]);

const COMPONENTS_JSON = join(repoRoot, 'frameworks/Components.json');
const MANIFEST_DIR = join(repoRoot, 'frameworks/tailwind/components');

export const categories = memoBy((root: string = repoRoot) => root, (root: string = repoRoot): ComponentTree => {
  const path = root === repoRoot ? COMPONENTS_JSON : join(root, 'frameworks/Components.json');
  return readJson(path);
});

export function categoryOf(name: string, root = repoRoot) {
  for (const [category, names] of Object.entries(categories(root)))
    if (names.includes(name)) return category;
  return null;
}

export function everyComponent(root = repoRoot) {
  return Object.values(categories(root)).flat().sort();
}

export function inScope(root = repoRoot) {
  return everyComponent(root).filter((name) => !HAND_DRAWN.has(name));
}

export function hasOwnManifest(name: string, root = repoRoot) {
  const category = categoryOf(name, root);
  if (!category) return false;
  const dir = root === repoRoot ? MANIFEST_DIR : join(root, 'frameworks/tailwind/components');
  return existsSync(join(dir, category, kebab(name), `${name}.manifest.json`));
}

export function coveringManifest(name: string) {
  for (const [manifest, { covers }] of MANIFEST_COVERS)
    if (manifest !== name && covers.includes(name)) return manifest;
  return null;
}

export function manifestFor(name: string, root = repoRoot) {
  if (hasOwnManifest(name, root)) return name;
  return coveringManifest(name);
}

export function coveredContracts(name: string) {
  return MANIFEST_COVERS.get(name)?.covers ?? [name];
}

export function surfaceProblems(root = repoRoot) {
  const known = new Set(everyComponent(root));
  const problems = [];
  for (const [manifest, entry] of MANIFEST_COVERS) {
    if (!known.has(manifest)) problems.push(`MANIFEST_COVERS names ${manifest}, and no component is called that`);
    if (!entry.reason?.trim()) problems.push(`MANIFEST_COVERS names ${manifest} with no reason, and a reason is the whole entry`);
    for (const covered of entry.covers)
      if (!known.has(covered)) problems.push(`MANIFEST_COVERS says ${manifest} covers ${covered}, and no component is called that`);
  }
  for (const [name, reason] of HAND_DRAWN) {
    if (!known.has(name)) problems.push(`HAND_DRAWN names ${name}, and no component is called that`);
    else if (hasOwnManifest(name, root)) {
      problems.push(`HAND_DRAWN names ${name}, and a manifest for it is now on disk -- delete the entry, `
        + 'because a component with a surface to render is not one that draws by hand');
    }
    if (!reason?.trim()) problems.push(`HAND_DRAWN names ${name} with no reason, and a reason is the whole entry`);
  }
  if (HAND_DRAWN.size === 0) {
    problems.push('HAND_DRAWN is empty, and the gates that read it lose their subject rather than '
      + 'passing over nothing; delete those halves before emptying this map');
  }
  return problems;
}
