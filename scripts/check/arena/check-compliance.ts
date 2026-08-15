/* The coverage record for the behaviour render suites. COVERED is keyed
 * <component>:<layer>, and the layer is decided structurally from the SUITE_DIRS
 * tree a suite was found under, never from its text. No pattern is excluded: `grid`
 * components were, on a memory measurement that no longer holds. */

import { readFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import {
  reactComponents, reactBindingPath, angularPrimitives, angularBindingPath, loadBinding, bindingCases,
} from '../../lib/arena/behaviour-contracts.ts';
import type { BehaviourBinding } from '../../lib/arena/behaviour-contracts.ts';
import { kebab } from '../../utils/case.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';

export const node = {
  name: 'check:compliance',
  reads: [
    'contracts/behaviour', 'frameworks/react/components/**', 'frameworks/angular/components/**',
    'frameworks/react/test/**', 'frameworks/angular/test/**',
  ],
  writes: [],
  feeds: [],
};


export const SUITE_DIRS = [
  { layer: 'react', dir: join(repoRoot, 'frameworks', 'react', 'components') },
  { layer: 'react', dir: join(repoRoot, 'frameworks', 'react', 'test') },
  { layer: 'angular', dir: join(repoRoot, 'frameworks', 'angular', 'components') },
  { layer: 'angular', dir: join(repoRoot, 'frameworks', 'angular', 'test') },
];

export const COVERED = {
  'ArenaDialog:react': 'DialogModal.dom.test.tsx',
  'ArenaConfirmDialog:react': 'DialogModal.dom.test.tsx',
  'ArenaOnboarding:react': 'ArenaOnboarding.dom.test.tsx',
  'ArenaMenu:react': 'ArenaMenu.dom.test.tsx',
  'ArenaBulkActionBar:react': 'ArenaBulkActionBar.toolbar.dom.test.tsx',
  'ArenaCommandPalette:react': 'ArenaCommandPalette.combobox.dom.test.tsx',
  'ArenaSkeleton:react': 'PlacementAndBranches.dom.test.tsx',
  'ArenaSideNavCollapsible:react': 'ArenaSideNav.disclosure.dom.test.tsx',
  'ArenaTabs:react': 'ArenaTabs.dom.test.tsx',
  'ArenaTooltip:react': 'ArenaTooltip.keyboard.dom.test.tsx',
  'ArenaAlert:react': 'AlertTones.dom.test.tsx',
  'ArenaToast:react': 'AlertTones.dom.test.tsx',
  'ArenaProgressBar:react': 'ArenaProgressBar.dom.test.tsx',
  'ArenaSpinner:react': 'ArenaSpinner.dom.test.tsx',
  'ArenaTag:react': 'TagAndChipCases.dom.test.tsx',
  'ArenaCalendarEvent:react': 'TagAndChipCases.dom.test.tsx',
  'ArenaActivityFeed:react': 'ArenaActivityFeed.cases.dom.test.tsx',
  'ArenaBarChart:react': 'ChartFigures.dom.test.tsx',
  'ArenaHorizontalBarChart:react': 'ChartFigures.dom.test.tsx',
  'ArenaPyramidChart:react': 'ChartFigures.dom.test.tsx',
  'ArenaRadarChart:react': 'ChartFigures.dom.test.tsx',
  'ArenaScatterChart:react': 'ChartFigures.dom.test.tsx',
  'ArenaDoughnutChart:react': 'ChartFigures.dom.test.tsx',
  'ArenaLineChart:react': 'ChartFigures.dom.test.tsx',
  'ArenaButton:react': 'FormControlPatterns.dom.test.tsx',
  'ArenaIconButton:react': 'FormControlPatterns.dom.test.tsx',
  'ArenaCheckbox:react': 'FormControlPatterns.dom.test.tsx',
  'ArenaSelect:react': 'FormControlPatterns.dom.test.tsx',
  'ArenaSwitch:react': 'FormControlPatterns.dom.test.tsx',
  'ArenaSegmentedControl:react': 'ArenaSegmentedControl.radiogroup.dom.test.tsx',
  'ArenaSideNav:react': 'NavigationLandmarks.dom.test.tsx',
  'ArenaErrorState:react': 'AlertTones.dom.test.tsx',
  'ArenaCalendar:react': 'ArenaCalendar.gridKeyboard.dom.test.tsx',
  'ArenaTable:react': 'ArenaTable.cases.dom.test.tsx',
  'ArenaTableRow:react': 'ArenaTableRow.cases.dom.test.tsx',
  'ArenaInput:react': 'TextboxStates.dom.test.tsx',
  'ArenaTextarea:react': 'TextboxStates.dom.test.tsx',
  'ArenaRadioGroup:react': 'RadioGroupPattern.dom.test.tsx',
  'ArenaRadio:react': 'RadioGroupPattern.dom.test.tsx',
  'ArenaBreadcrumbs:react': 'NavigationLandmarks.dom.test.tsx',
  'ArenaAppLogo:react': 'InertComponents.dom.test.tsx',
  'ArenaAvatar:react': 'InertComponents.dom.test.tsx',
  'ArenaBadge:react': 'InertComponents.dom.test.tsx',
  'ArenaCard:react': 'ArenaCard.cases.dom.test.tsx',
  'ArenaStatCard:react': 'InertComponents.dom.test.tsx',
  'ArenaUnauthCard:react': 'InertComponents.dom.test.tsx',
  'ArenaChartCard:react': 'InertComponents.dom.test.tsx',
  'ArenaEmptyState:react': 'InertComponents.dom.test.tsx',
  'ArenaToastHost:react': 'InertComponents.dom.test.tsx',
  'ArenaSheet:react': 'ArenaSheet.disclosure.dom.test.tsx',
  'ArenaGrid:react': 'InertComponents.dom.test.tsx',
  'ArenaSection:react': 'InertComponents.dom.test.tsx',
  'ArenaScrollerItem:react': 'InertComponents.dom.test.tsx',
  'ArenaFigure:react': 'InertComponents.dom.test.tsx',
  'ArenaHero:react': 'InertComponents.dom.test.tsx',
  'ArenaScroller:react': 'ArenaScroller.cases.dom.test.tsx',
  'ArenaBottomNav:react': 'ArenaBottomNav.cases.dom.test.tsx',
  'ArenaBottomNavItem:react': 'ArenaBottomNav.cases.dom.test.tsx',
  'ArenaPageHead:react': 'InertComponents.dom.test.tsx',
  'ArenaSideNavSection:react': 'InertComponents.dom.test.tsx',
  'ArenaSideNavItem:react': 'ArenaSideNavItem.cases.dom.test.tsx',
  'ArenaTab:react': 'ArenaTabs.dom.test.tsx',
  'ArenaTableCell:react': 'ArenaTable.cases.dom.test.tsx',
  'ArenaPagination:react': 'NavigationLandmarks.dom.test.tsx',
  'ArenaAlert:angular': 'ArenaAlert.roleTones.test.ts',
  'ArenaBadge:angular': 'ArenaBadge.compliance.test.ts',
  'ArenaCard:angular': 'ArenaCard.compliance.test.ts',
  'ArenaTable:angular': 'ArenaTable.cases.test.ts',
  'ArenaTableRow:angular': 'ArenaTableRow.cases.test.ts',
  'ArenaCalendar:angular': 'ArenaCalendar.grid.test.ts',
  'ArenaCalendarEvent:angular': 'ArenaCalendarEvent.cases.test.ts',
  'ArenaTableCell:angular': 'ArenaTable.cases.test.ts',
  'ArenaBarChart:angular': 'ChartDataTable.test.ts',
  'ArenaHorizontalBarChart:angular': 'ChartDataTable.test.ts',
  'ArenaPyramidChart:angular': 'ChartDataTable.test.ts',
  'ArenaRadarChart:angular': 'ChartDataTable.test.ts',
  'ArenaScatterChart:angular': 'ChartDataTable.test.ts',
  'ArenaActivityFeed:angular': 'ArenaActivityFeed.cases.test.ts',
  'ArenaDoughnutChart:angular': 'ChartDataTable.test.ts',
  'ArenaLineChart:angular': 'ChartDataTable.test.ts',
  'ArenaSkeleton:angular': 'AngularPatternCoverage.test.ts',
  'ArenaErrorState:angular': 'AngularPatternCoverage.test.ts',
  'ArenaOnboarding:angular': 'AngularPatternCoverage.test.ts',
  'ArenaBreadcrumbs:angular': 'ArenaBreadcrumbs.compliance.test.ts',
  'ArenaBulkActionBar:angular': 'ArenaBulkActionBar.toolbar.test.ts',
  'ArenaCommandPalette:angular': 'ArenaCommandPalette.combobox.test.ts',
  'ArenaButton:angular': 'ArenaButton.compliance.test.ts',
  'ArenaConfirmDialog:angular': 'ArenaConfirmDialog.compliance.test.ts',
  'ArenaDialog:angular': 'ArenaDialog.compliance.test.ts',
  'ArenaSelect:angular': 'ArenaSelect.compliance.test.ts',
  'ArenaToast:angular': 'ArenaToast.compliance.test.ts',
  'ArenaToastHost:angular': 'ArenaToastHost.compliance.test.ts',
  'ArenaSheet:angular': 'ArenaSheet.compliance.test.ts',
  'ArenaGrid:angular': 'ArenaGrid.compliance.test.ts',
  'ArenaSection:angular': 'ArenaSection.compliance.test.ts',
  'ArenaScrollerItem:angular': 'ArenaScrollerItem.compliance.test.ts',
  'ArenaFigure:angular': 'ArenaFigure.compliance.test.ts',
  'ArenaHero:angular': 'ArenaHero.compliance.test.ts',
  'ArenaScroller:angular': 'ArenaScroller.compliance.test.ts',
  'ArenaBottomNav:angular': 'ArenaBottomNav.compliance.test.ts',
  'ArenaBottomNavItem:angular': 'ArenaBottomNavItem.cases.test.ts',
  'ArenaMenu:angular': 'ArenaMenu.compliance.test.ts',
  'ArenaTag:angular': 'ArenaTag.cases.test.ts',
  'ArenaTooltip:angular': 'ArenaTooltip.compliance.test.ts',
  'ArenaIconButton:angular': 'ArenaIconButton.compliance.test.ts',
  'ArenaCheckbox:angular': 'ArenaCheckbox.compliance.test.ts',
  'ArenaSwitch:angular': 'ArenaSwitch.compliance.test.ts',
  'ArenaInput:angular': 'ArenaInput.compliance.test.ts',
  'ArenaTextarea:angular': 'ArenaTextarea.compliance.test.ts',
  'ArenaRadioGroup:angular': 'ArenaRadioGroup.compliance.test.ts',
  'ArenaRadio:angular': 'ArenaRadioGroup.compliance.test.ts',
  'ArenaSegmentedControl:angular': 'ArenaSegmentedControl.compliance.test.ts',
  'ArenaTabs:angular': 'ArenaTabs.compliance.test.ts',
  'ArenaTab:angular': 'ArenaTabs.compliance.test.ts',
  'ArenaPagination:angular': 'ArenaPagination.compliance.test.ts',
  'ArenaProgressBar:angular': 'ArenaProgressBar.compliance.test.ts',
  'ArenaSpinner:angular': 'ArenaSpinner.compliance.test.ts',
  'ArenaAppLogo:angular': 'InertComponents.test.ts',
  'ArenaAvatar:angular': 'InertComponents.test.ts',
  'ArenaStatCard:angular': 'InertComponents.test.ts',
  'ArenaUnauthCard:angular': 'InertComponents.test.ts',
  'ArenaChartCard:angular': 'InertComponents.test.ts',
  'ArenaEmptyState:angular': 'InertComponents.test.ts',
  'ArenaPageHead:angular': 'InertComponents.test.ts',
  'ArenaSideNavSection:angular': 'InertComponents.test.ts',
  'ArenaSideNavItem:angular': 'ArenaSideNavItem.cases.test.ts',
  'ArenaSideNav:angular': 'ArenaSideNav.compliance.test.ts',
  'ArenaSideNavCollapsible:angular': 'SideNavNesting.test.ts',
};

export function suiteMentions(source: string, tail: string) {
  const escaped = tail.split('/').map((s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(escaped.join(`(?:/|['"]\\s*,\\s*['"])`)).test(source);
}

export function validateCoverage(
  { bindings, covered, suites }:
    {
      bindings: BindingInventory[];
      covered: Record<string, string>;
      suites: Record<string, { source: string; layer: string }>;
    },
) {
  const problems = [];

  const byKey = new Map();
  for (const b of bindings) {
    if (!b.tail) {
      throw new Error(
        `validateCoverage: binding "${b.name}:${b.layer}" carries no tail. A missing tail ` +
        `cannot discriminate by layer -- falling back to a bare "${b.name}.behaviour.json" ` +
        `is the exact pre-fix defect this file exists to prevent. Attach a tail rather than ` +
        `relying on a default.`,
      );
    }
    byKey.set(`${b.name}:${b.layer}`, b.tail);
  }

  for (const [key, suiteFile] of Object.entries(covered) as [string, string][]) {
    const sep = key.lastIndexOf(':');
    if (sep === -1) {
      problems.push(
        `COVERED key "${key}" has no ":layer" suffix. Every key must be shaped "<component>:<layer>".`,
      );
      continue;
    }
    const name = key.slice(0, sep);
    const layer = key.slice(sep + 1);

    if (!byKey.has(key)) {
      problems.push(
        `COVERED names "${key}", for which there is no binding named "${name}" in the ${layer} layer. Delete the entry.`,
      );
      continue;
    }
    if (!(suiteFile in suites)) {
      problems.push(`COVERED maps "${key}" to "${suiteFile}", which does not exist. Fix the path or delete the entry.`);
      continue;
    }
    const suite = suites[suiteFile];
    if (!suite) continue;
    if (suite.layer !== layer) {
      problems.push(
        `COVERED maps "${key}" to "${suiteFile}", which is a suite of the ${suite.layer} layer. ` +
        `A claim for the ${layer} layer needs a ${layer} suite: the two layers can spell byte-identical ` +
        `binding paths, so naming the right file is not evidence of the right layer.`,
      );
      continue;
    }
    const tail = byKey.get(key);
    if (!suiteMentions(suite.source, tail)) {
      problems.push(
        `COVERED maps "${key}" to "${suiteFile}", but that suite never names ${tail}. The coverage claim is stale.`,
      );
    }
  }
  return problems;
}

export type BindingInventory = {
  name: string; layer: string; tail?: string; patterns: (string | undefined)[];
};

export function inventoryFrom(bindings: Record<string, BehaviourBinding & { tail?: string }>) {
  const out: BindingInventory[] = [];
  const declared = Object.entries(bindings) as [string, BehaviourBinding & { tail?: string }][];
  for (const [key, binding] of declared) {
    const sep = key.lastIndexOf(':');
    const name = sep === -1 ? key : key.slice(0, sep);
    const layer = sep === -1 ? '' : key.slice(sep + 1);
    if (!binding.tail) {
      throw new Error(
        `inventoryFrom: binding "${key}" carries no tail. A missing tail cannot ` +
        `discriminate by layer -- falling back to a bare "${name}.behaviour.json" is the ` +
        `exact pre-fix defect this file exists to prevent. Attach a tail rather than ` +
        `relying on a default.`,
      );
    }
    out.push({
      name,
      layer,
      tail: binding.tail,
      patterns: bindingCases(binding).map((c) => c.pattern),
    });
  }
  return out;
}

function collectBindings() {

  const byKey: Record<string, BehaviourBinding & { tail: string }> = {};

  for (const name of reactComponents(repoRoot)) {
    const found = reactBindingPath(repoRoot, kebab(name));
    if (!found) continue;
    const binding = loadBinding(found.path);
    byKey[`${name}:react`] = { ...binding, tail: found.tail };
  }

  for (const dir of angularPrimitives(repoRoot)) {
    const found = angularBindingPath(repoRoot, dir);
    if (!found) continue;
    const binding = loadBinding(found.path);
    byKey[`${binding.component}:angular`] = { ...binding, tail: found.tail };
  }

  return inventoryFrom(byKey);
}

export function walkSuites(dir: string) {
  if (!existsSync(dir)) return [];
  return walkFiles(dir).filter((path) => /\.test\.(jsx|tsx|ts|mjs)$/.test(basename(path)));
}

export function collectSuites(dirs = SUITE_DIRS) {
  const out: Record<string, { source: string; layer: string }> = {};
  const seen = new Map();
  for (const { layer, dir } of dirs) {
    if (!existsSync(dir)) continue;
    for (const f of walkSuites(dir)) {
      const name = basename(f);
      if (seen.has(name))
        throw new Error(
          `check:compliance — two suites share the basename ${name}:\n  ${seen.get(name)}\n  ${f}\n` +
          `Suites are keyed by basename, so one would silently shadow the other.`);
      seen.set(name, f);
      out[name] = { source: readFileSync(f, 'utf8'), layer };
    }
  }
  return out;
}

function main() {
  const bindings = collectBindings();
  const suites = collectSuites();
  const problems = validateCoverage({ bindings, covered: COVERED, suites });

  if (problems.length) {
    console.error('check:compliance — the coverage record no longer matches the tree:\n');
    for (const p of problems) console.error(`  - ${p}`);
    console.error('');
    process.exit(1);
  }
  const total = bindings.length;
  const n = Object.keys(COVERED).length;
  console.log(`check:compliance OK — ${n} of ${total} bindings verified by a render suite; every coverage claim is current.`);
  console.log('  (A green run says the declarations are honest, never that the components are accessible.)');
}

if (isMainModule(import.meta.url)) main();
