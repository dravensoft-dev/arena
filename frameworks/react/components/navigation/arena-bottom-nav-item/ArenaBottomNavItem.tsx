import React from 'react';
import { isArenaPrimaryActivation } from '../../../AnchorActivation.ts';
import { arenaActiveWeight, arenaBadgeCount } from '../NavRow.ts';
import type { ArenaBottomNavInjected } from '../arena-bottom-nav/BottomNavInject.tsx';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from '../arena-bottom-nav/ArenaBottomNav.classes.generated.ts';

export interface ArenaBottomNavItemProps {

  /** Identifies the destination. ArenaBottomNav.active names one of these, and the item whose id matches is the one marked aria-current="page". Required, and guarded with a falsy check rather than an absence check: a blank id can never match and is an omission wearing a value. */
  id: string;

  /** What the item reads under its glyph, and the whole of its accessible name unless a badge adds a count to it. Required and falsy-guarded for the same reason. It is drawn rather than hidden: a bar of glyphs alone asks every reader to have learnt the icons, and the label is what makes the destination sayable. */
  label: string;

  /** A Phosphor class name drawn above the label. Arena draws the element, the consumer names the glyph. **The ACTIVE destination is drawn in the filled weight, and there is no member for it**: the item whose id matches ArenaBottomNav.active swaps whatever weight the string carries for `ph-fill`, so a consumer passes one string per destination rather than two and a conditional. It is Arena's convention, so Arena applies it, and passing `ph-fill` yourself changes nothing because the swap is idempotent. Required here where a sidebar leaves it optional: a bar of five equal columns has no room for a label long enough to stand alone, and one column without a glyph breaks the row's rhythm. */
  icon: string;

  /** A count drawn over the glyph's trailing corner: pending orders, unread notices. Zero draws nothing, because a badge reading 0 is a mark that says there is nothing to mark; above 99 it reads "99+", so a four-digit count cannot widen the column. A number rather than a string, because both rules are arithmetic and a caller who has already formatted the value has taken them away. It is NOT hidden from assistive technology, so the destination announces "Orders 12". */
  badge?: number;

  /** Present => the item renders an <a>; absent => a <button>. A control that navigates must be a link: openable in a new tab, address copyable, announced as a link. An item that only changes local state is a button. A primary click with no modifier is cancelled and reported through ArenaBottomNav's `nav`, so a router owns it; a modified or middle click is the browser's and reports nothing. */
  href?: string;

  /** Whether the destination is drawn but cannot be reached. It reflects through `aria-disabled` rather than the native attribute, and rather than by not rendering the item at all: a destination a user can see and hear announced as unavailable is what tells them it exists. The anchor keeps its `href` so the case split stays what it is; what changes is that activation is refused and the state is announced. */
  disabled?: boolean;
}

const arenaBottomNavStyles = arenaStyles(manifest);

export function ArenaBottomNavItem({
  id, label, icon, badge, href, disabled = false,
  activeId, onActivate,
}: ArenaBottomNavItemProps & Partial<ArenaBottomNavInjected>) {

  if (!id) throw new Error('ArenaBottomNavItem: `id` is required');
  if (!label) throw new Error('ArenaBottomNavItem: `label` is required');
  if (!icon) throw new Error('ArenaBottomNavItem: `icon` is required');
  const on = id === activeId;
  const tally = arenaBadgeCount(badge);
  const styles = arenaBottomNavStyles({ active: on });

  const shared = {
    'aria-current': on ? 'page' as const : undefined,
    'aria-disabled': disabled ? 'true' as const : undefined,
    onClick: (e: React.MouseEvent) => {
      if (disabled) { e.preventDefault(); return; }
      if (href !== undefined) {
        if (!isArenaPrimaryActivation(e)) return;
        e.preventDefault();
      }
      if (onActivate) onActivate(id);
    },
    className: styles.item(),
    'data-arena-part': manifest.parts.item,
  };

  const body = (
    <React.Fragment>
      <span className={styles.glyph()} data-arena-part={manifest.parts.glyph}>
        <i className={on ? arenaActiveWeight(icon) : icon} aria-hidden="true" />
        {tally !== null && <span className={styles.badge()} data-arena-part={manifest.parts.badge}>{tally}</span>}
      </span>
      <span className={styles.label()} data-arena-part={manifest.parts.label}>{label}</span>
    </React.Fragment>
  );

  return href
    ? <a href={href} {...shared}>{body}</a>
    : <button type="button" {...shared}>{body}</button>;
}
