import React, { useEffect, useState } from 'react';
import type { ArenaSideNavInjected } from '../arena-side-nav/SideNavInject.tsx';
import { arenaIndentFor, arenaInjectInto } from '../arena-side-nav/SideNavInject.tsx';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from '../arena-side-nav/ArenaSideNav.classes.generated.ts';
import { ArenaSideNavItem } from '../arena-side-nav-item/ArenaSideNavItem.tsx';

export interface ArenaSideNavCollapsibleProps {

  /** Identifies the group. The disclosure pattern needs two DOM ids that resolve -- the trigger's aria-controls must name the region, and the region's aria-labelledby must name the trigger -- and Arena derives both from this member, as `${id}-trigger` and `${id}-region`. Neither wiring is conditional: every collapsible has a trigger and a region, so there is no shape in which the id goes unused, and that is why it is required rather than optional. A group is a thing a consumer names anyway. Falsy-guarded as well as required: a blank id yields the pair `-trigger`/`-region`, which every other blank-id collapsible on the page would share, and duplicate ids make aria-controls resolve to the wrong element rather than to none. A consumer can address either element from outside as a consequence -- an aria-describedby, a deep link, a test hook -- but that is a benefit of the derivation, not the reason for it. */
  id: string;

  /** What the trigger reads, and the accessible name of both the trigger and the region it controls. Required and falsy-guarded. */
  label: string;

  /** A Phosphor class name drawn before the label. The caret that reports expanded-ness is Arena's own and is not this member. */
  icon?: string;

  /** Whether the group starts open. It is a seed, not a control: after the first render the state is the component's, and the group also opens itself when it comes to hold the active destination. */
  defaultExpanded?: boolean;

  /** What the group holds -- items, sections, further collapsibles. Each sits one nesting level deeper. */
  children?: React.ReactNode;

  /** The trigger was pressed, carrying the state it moved to. It fires on a press ONLY: the automatic expansion that follows the active destination is Arena's decision rather than the user's, and reporting it here would be a lie a consumer persists. */
  onToggle?: (expanded: boolean) => void;
}


const arenaSideNavStyles = arenaStyles(manifest);

export function arenaSubtreeHasItem(children: React.ReactNode, id: string | undefined): boolean {
  if (!id) return false;
  for (const child of React.Children.toArray(children)) {
    if (!React.isValidElement(child)) continue;
    const props = child.props as { id?: string; children?: React.ReactNode };
    if (child.type === ArenaSideNavItem && props.id === id) return true;
    if (arenaSubtreeHasItem(props.children, id)) return true;
  }
  return false;
}

export function ArenaSideNavCollapsible({
  id, label, icon, defaultExpanded = false, children, onToggle,
  depth = 0, activeId, indentStep = 3, onActivate,
}: ArenaSideNavCollapsibleProps & Partial<ArenaSideNavInjected>) {

  if (!id) throw new Error('ArenaSideNavCollapsible: `id` is required');
  if (!label) throw new Error('ArenaSideNavCollapsible: `label` is required');

  const holdsActive = arenaSubtreeHasItem(children, activeId);

  const [expanded, setExpanded] = useState(defaultExpanded || holdsActive);
  useEffect(() => { if (holdsActive) setExpanded(true); }, [holdsActive]);

  const regionId = `${id}-region`;
  const triggerId = `${id}-trigger`;

  const press = () => {
    const next = !expanded;
    setExpanded(next);
    if (onToggle) onToggle(next);
  };

  const styles = arenaSideNavStyles();
  const glyph = icon ? <i className={`${icon} ${styles.icon()}`} data-arena-part={manifest.parts.icon} aria-hidden="true" /> : null;

  return (
    <div className={styles.section()} data-arena-part={manifest.parts.section}>
      {

}
      <button id={triggerId} type="button" aria-expanded={expanded} aria-controls={regionId}
        onClick={press}
        className={styles.trigger()} data-arena-part={manifest.parts.trigger}
        style={{ paddingInlineStart: arenaIndentFor(indentStep, depth) }}>
        {glyph}
        <span className={styles.triggerLabel()} data-arena-part={manifest.parts.triggerLabel}>{label}</span>
        <i className={`${expanded ? 'ph-bold ph-caret-down' : 'ph-bold ph-caret-right'} ${styles.caret()}`} data-arena-part={manifest.parts.caret}
          aria-hidden="true" />
      </button>
      {
}
      <div id={regionId} role="group" aria-labelledby={triggerId} hidden={!expanded}
        className={styles.region()} data-arena-part={manifest.parts.region}>
        {arenaInjectInto(children, { depth: depth + 1, activeId, indentStep, onActivate })}
      </div>
    </div>
  );
}
