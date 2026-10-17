import React, { useRef } from 'react';

import type { ArenaButtonType, ArenaMenuItem, ArenaMenuAlign } from '../../../Api.generated';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaSplitButton.classes.generated.ts';
import type { ArenaSplitButtonClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';
import { ArenaMenu } from '../../navigation/arena-menu/ArenaMenu.tsx';
import { ArenaMenuAnchor } from '../../navigation/arena-menu/MenuAnchor.ts';

export interface ArenaSplitButtonProps {
  className?: ArenaSplitButtonClass;

  /** The primary half's label, such as "Deploy". Required, and guarded at runtime: a primary half with no label names no action. */
  children: React.ReactNode;

  /** Phosphor class name drawn before the label. Replaced by the spinner while loading. */
  icon?: string;

  /** Whether the primary action destroys or removes something. Both halves draw the danger outline whatever emphasis the split is given: danger is never filled. */
  destructive?: boolean;

  /** Replaces the leading icon with a spinner and blocks the primary half. The caret stays usable, so another action can start while this one runs. */
  loading?: boolean;

  /** Blocks both halves and dims the control. */
  disabled?: boolean;

  /** The primary half's native button behaviour. Defaults to 'button' so a split inside a form does not submit it by accident. */
  type?: ArenaButtonType;

  /** Names the group of both halves, such as "Deployment". Required, and guarded at runtime after trimming: a group with no name announces only that a group began. */
  label: string;

  /** Names the caret half, such as "More deploy options". Required, and guarded at runtime after trimming: a caret is a glyph, so this name is all a screen reader hears. */
  menuLabel: string;

  /** The menu's entries, in order: activatable rows, dividers and group headers. */
  items: readonly ArenaMenuItem[];

  /** Which edge of the whole split the panel lines up with: start is the primary half's outer edge, end the caret's outer edge. */
  align?: ArenaMenuAlign;

  /** The primary half was activated, by pointer or by keyboard. Never reported while loading or disabled. */
  onClick?: () => void;

  /** A menu entry was activated; carries the whole item. A disabled entry reports nothing, and a divider or a header cannot be activated at all. */
  onSelect?: (item: ArenaMenuItem) => void;
}

const arenaSplitButtonStyles = arenaStyles(manifest);

export function ArenaSplitButton({
  className, children, icon, destructive = false, loading = false, disabled = false, type = 'button',
  label, menuLabel, items, align = 'end', onClick, onSelect,
}: ArenaSplitButtonProps) {
  if (!label?.trim()) throw new Error('ArenaSplitButton: `label` is required, and names the group of both halves');
  if (!menuLabel?.trim()) throw new Error('ArenaSplitButton: `menuLabel` is required, and names the caret half');
  if (items == null) throw new Error('ArenaSplitButton: `items` is required');
  if (React.Children.toArray(children).length === 0) {
    throw new Error('ArenaSplitButton: `children` is required, because a primary half with no label names no action');
  }
  const rootRef = useRef<HTMLDivElement | null>(null);
  const styles = arenaSplitButtonStyles({ destructive });
  const blocked = disabled || loading;

  return (
    <div role="group" aria-label={label} ref={rootRef}
      className={arenaClassName('ArenaSplitButton', styles.root(), className)} data-arena-part={manifest.parts.root} {...styles.$data.root()}>
      <button type={type} disabled={blocked} onClick={() => { if (!blocked) onClick?.(); }}
        className={styles.primary()} data-arena-part={manifest.parts.primary} {...styles.$data.primary()} data-arena-boundary="">
        {loading
          ? <span className={styles.spinner()} data-arena-part={manifest.parts.spinner} {...styles.$data.spinner()} aria-hidden="true" />
          : icon && <i className={icon} aria-hidden="true" />}
        {children}
      </button>
      <ArenaMenuAnchor.Provider value={rootRef}>
        <ArenaMenu className="arena-fit" align={align} items={items} onSelect={onSelect}
          trigger={(
            <button type="button" aria-label={menuLabel} disabled={disabled}
              className={styles.caret()} data-arena-part={manifest.parts.caret} {...styles.$data.caret()}>
              <i className="ph-bold ph-caret-down" aria-hidden="true" />
            </button>
          )} />
      </ArenaMenuAnchor.Provider>
    </div>
  );
}
