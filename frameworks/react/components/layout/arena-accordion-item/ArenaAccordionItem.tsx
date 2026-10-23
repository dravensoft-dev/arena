import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from '../arena-accordion/ArenaAccordion.classes.generated.ts';
import type { ArenaHeadingLevel } from '../../../Api.generated';
import { arenaClassName } from '../../../VocabularyClass.ts';
import { ARENA_CONTEXT_VOCABULARY, type ArenaAccordionItemClass } from '../../../Vocabulary.generated.ts';
import { ArenaIcon } from '../../display/arena-icon/ArenaIcon.tsx';

export interface ArenaAccordionItemInjected {
  open: boolean;
  locked: boolean;
  headingLevel: Exclude<ArenaHeadingLevel, 'none'>;
  triggerId: string;
  panelId: string;
  onToggle: (value: string) => void;
}

export interface ArenaAccordionItemProps {
  className?: ArenaAccordionItemClass;

  /** The item's identity, and what the accordion's `value`, `values` and their events carry. Required, and guarded at runtime after trimming: two blank values cannot be told apart, and the two items would open together. */
  value: string;

  /** What the header reads, and the accessible name of the panel. Required, and guarded at runtime after trimming: a header with no words names nothing for the panel to borrow. */
  label: string;

  /** The panel's content. The content mounts whether the panel is open or not, so put no costly work in it. */
  children?: React.ReactNode;
}

const arenaAccordionStyles = arenaStyles(manifest);

export function ArenaAccordionItem({
  className, value, label, children,
  open = false, locked = false, headingLevel = 'h3', triggerId, panelId, onToggle,
}: ArenaAccordionItemProps & Partial<ArenaAccordionItemInjected>) {
  if (!value?.trim()) throw new Error('ArenaAccordionItem: `value` is required, and two blank values would open together');
  if (!label?.trim()) throw new Error('ArenaAccordionItem: `label` is required, and it names the panel');
  const Heading = headingLevel;
  const styles = arenaAccordionStyles({ open });
  return (
    <div className={arenaClassName('ArenaAccordionItem', styles.item(), className, ARENA_CONTEXT_VOCABULARY)} data-arena-part={manifest.parts.item} {...styles.$data.item()}>
      <Heading className={styles.heading()} data-arena-part={manifest.parts.heading} {...styles.$data.heading()}>
        <button type="button" id={triggerId} aria-expanded={open} aria-controls={panelId}
          aria-disabled={locked ? 'true' : undefined} onClick={() => onToggle?.(value)}
          className={styles.trigger()} data-arena-part={manifest.parts.trigger} {...styles.$data.trigger()}>
          <span className={styles.triggerLabel()} data-arena-part={manifest.parts.triggerLabel} {...styles.$data.triggerLabel()}>{label}</span>
          <span className={styles.caret()} data-arena-part={manifest.parts.caret} {...styles.$data.caret()} aria-hidden="true"><ArenaIcon icon={open ? 'ph-bold ph-caret-down' : 'ph-bold ph-caret-right'} /></span>
        </button>
      </Heading>
      <div role="group" id={panelId} aria-labelledby={triggerId} hidden={!open}
        className={styles.panel()} data-arena-part={manifest.parts.panel} {...styles.$data.panel()} data-arena-boundary="">
        {children}
      </div>
    </div>
  );
}
