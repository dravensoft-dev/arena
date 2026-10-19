import React, { useEffect, useId, useRef } from 'react';
import { arenaWarnOnce } from '../../../WarnOnce.ts';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaPopover.classes.generated.ts';
import { sp1 } from '../../../Tokens.generated.js';
import { ARENA_PANEL_POPOVER, arenaFirstFocusable, useArenaAnchoredPanel } from '../../../UseAnchoredPanel.ts';
import type { ArenaMenuAlign } from '../../../Api.generated';
import type { ArenaPopoverClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';

export type { ArenaMenuAlign };

export interface ArenaPopoverProps {
  className?: ArenaPopoverClass;


  /** The control that opens the panel. The consumer draws it -- a secondary ArenaButton, an ArenaIconButton -- so it is a slot, and it carries its own accessible name. The slot holds one element that takes focus. */
  trigger: React.ReactNode;

  /** What the panel holds: a short form, a pair of fields, a paragraph. The content fills the panel and never replaces it: the surface, its padding and its edge are Arena's. */
  children: React.ReactNode;

  /** Names the panel for assistive technology: what it holds, not that it is a panel. Required, and guarded at runtime: a dialog with no accessible name is announced unlabelled, and the trigger's own name says what opens it, never what the panel is for. "Filters", not "Popover". */
  label: string;

  /** Whether the panel is shown. The consumer owns it: the component asks to change it through openChange and never changes it by itself, so content inside the panel can close it, an Apply button included. */
  open?: boolean;

  /** Which edge of the trigger the panel lines up with. */
  align?: ArenaMenuAlign;

  /** The panel asks to be shown or hidden, carrying the state it asks for. The trigger was pressed, Escape was pressed while it was the topmost panel, a press landed outside it, or Tab left it. The panel moves only when open does. */
  onOpenChange?: (open: boolean) => void;
}


const TRIGGER_SELECTOR =
  'button:not([tabindex="-1"]), a[href]:not([tabindex="-1"]), [role="button"]:not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])';

const arenaPopoverStyles = arenaStyles(manifest);

export function ArenaPopover({ className, trigger, children, label, open = false, align = 'start', onOpenChange }: ArenaPopoverProps) {
  if (!label?.trim()) throw new Error('ArenaPopover: `label` is required, and names the panel for assistive technology');
  if (React.Children.toArray(children).length === 0) {
    throw new Error('ArenaPopover: `children` is required, and is what the panel holds');
  }
  if (!React.isValidElement(trigger) || trigger.type === React.Fragment) {
    throw new Error(
      'ArenaPopover: `trigger` must be a single element that forwards props to its focusable control. '
      + 'A fragment or a bare string takes aria-expanded and aria-controls nowhere.',
    );
  }
  const panelId = `popover-${useId().replace(/:/g, '')}`;
  const ref = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerEl = (): HTMLElement | null => {
    const first = ref.current?.firstElementChild;
    if (!(first instanceof HTMLElement)) return null;
    if (first.matches(TRIGGER_SELECTOR)) return first;
    return first.querySelector<HTMLElement>(TRIGGER_SELECTOR) ?? first;
  };

  const present = useArenaAnchoredPanel({
    open, align, anchor: ref, panel: panelRef, trigger: triggerEl, offset: sp1 * 1.5,
    focusOnOpen: arenaFirstFocusable, restoreFocus: true, tabOut: true,
    onDismiss: () => onOpenChange?.(false),
  });

  useEffect(() => {
    const el = triggerEl();
    if (!el) return;
    if (!el.matches(TRIGGER_SELECTOR)) {
      arenaWarnOnce(
        `ArenaPopover's trigger renders a <${el.tagName.toLowerCase()}>, which takes no focus and `
        + 'answers no key. The panel opens on a pointer and on nothing else, and a reader on a '
        + 'keyboard cannot reach it. Pass a control: an ArenaButton or an ArenaIconButton, or your '
        + 'own element carrying a button role and a tabindex.',
      );
    }
    const first = ref.current?.firstElementChild;
    if (first && first !== el) {
      for (const name of ['aria-haspopup', 'aria-expanded', 'aria-controls']) first.removeAttribute(name);
    }
    el.setAttribute('aria-haspopup', 'dialog');
    el.setAttribute('aria-expanded', String(present));
    if (present) el.setAttribute('aria-controls', panelId);
    else el.removeAttribute('aria-controls');
    const toggle = () => onOpenChange?.(!open);
    el.addEventListener('click', toggle);
    return () => el.removeEventListener('click', toggle);
  });

  const decoratedTrigger = React.cloneElement(trigger, {
    'aria-haspopup': 'dialog',
    'aria-expanded': present,
    'aria-controls': present ? panelId : undefined,
  });

  const styles = arenaPopoverStyles();
  return (
    <div ref={ref} className={arenaClassName('ArenaPopover', styles.root(), className)} data-arena-part={manifest.parts.root} {...styles.$data.root()}>
      {decoratedTrigger}
      {present && (
        <div ref={panelRef} id={panelId} role="dialog" aria-label={label} tabIndex={-1}
          className={styles.panel()} data-arena-part={manifest.parts.panel} {...styles.$data.panel()}
          data-arena-surface="floating" data-arena-boundary="" {...ARENA_PANEL_POPOVER}>
          {children}
        </div>
      )}
    </div>
  );
}
