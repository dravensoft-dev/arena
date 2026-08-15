import React, { useId } from 'react';
import type { ArenaSideNavInjected } from '../arena-side-nav/SideNavInject.tsx';
import { arenaIndentFor, arenaInjectInto } from '../arena-side-nav/SideNavInject.tsx';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from '../arena-side-nav/ArenaSideNav.classes.generated.ts';

export interface ArenaSideNavSectionProps {

  /** Names the group, both on screen and to assistive technology. Required, and guarded at runtime: a blank label leaves the group with no accessible name, which is the defect the guard exists to prevent arriving through a value that is present, so the guard trims before it decides. */
  label: string;

  /** The items in the group -- SideNavItems, further SideNavSections, SideNavCollapsibles. Each sits one nesting level deeper than the section itself. Required, and guarded at runtime: a section with no children is not a legal shape, and the guard counts the way the render path counts, so a child that is a false conditional counts as absent rather than as one. The ArenaAppLogo.mark shape -- a slot that is both declared required and enforced -- and not the ArenaTooltip.content one, which is declared required and deliberately left unguarded. */
  children: React.ReactNode;
}


const arenaSideNavStyles = arenaStyles(manifest);

export function ArenaSideNavSection({
  label, children,
  depth = 0, activeId, indentStep = 3, onActivate,
}: ArenaSideNavSectionProps & Partial<ArenaSideNavInjected>) {

  if (!label?.trim()) throw new Error('ArenaSideNavSection: `label` is required');

  if (React.Children.toArray(children).length === 0) {
    throw new Error('ArenaSideNavSection: a section with no children is not a legal shape');
  }
  const labelId = useId();
  const styles = arenaSideNavStyles();
  return (
    <div role="group" aria-labelledby={labelId} className={styles.section()} data-arena-part={manifest.parts.section}>
      <div id={labelId} className={styles.sectionLabel()} data-arena-part={manifest.parts.sectionLabel}
        style={{ paddingInlineStart: arenaIndentFor(indentStep, depth) }}>{label}</div>
      {arenaInjectInto(children, { depth: depth + 1, activeId, indentStep, onActivate })}
    </div>
  );
}
