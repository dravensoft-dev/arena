import React, { useId } from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from '../arena-radio/ArenaRadio.classes.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';
import { ARENA_CONTEXT_VOCABULARY, type ArenaRadioGroupClass } from '../../../Vocabulary.generated.ts';

export interface ArenaRadioGroupProps {
  className?: ArenaRadioGroupClass;


  /** Names the group: what is being chosen, not that it is a choice. Required, and guarded at runtime: a radiogroup with no accessible name is announced unlabelled, and each option's own label says what that option is, never what the set is for. "Deployment target", not "Options". Distinct from `name`, which is the radios' shared form name and never reaches a screen reader. */
  ariaLabel: string;

  /** The Radios. An option never holds a selected state of its own -- the group owns it, and how the two are wired is each layer's business rather than this contract's. */
  children?: React.ReactNode;

  /** The selected option's value. */
  value?: string;

  /** Shared name for the underlying radios; generated when omitted or blank. */
  name?: string;

  /** A different option was chosen; carries its value. */
  onChange?: (value: string) => void;

  /** Whether the whole group is unavailable. Every radio it holds is disabled whatever its own disabled says, and the group reflects aria-disabled. */
  disabled?: boolean;
}


const arenaRadioStyles = arenaStyles(manifest);

export function ArenaRadioGroup({ className, value, onChange, name, ariaLabel, children, disabled = false }: ArenaRadioGroupProps) {
  if (!ariaLabel?.trim()) throw new Error('ArenaRadioGroup: `ariaLabel` is required');
  const generated = `rg-${useId().replace(/:/g, '')}`;
  const gname = name || generated;
  const items = React.Children.map(children, (child) =>
    React.isValidElement(child)
      ? React.cloneElement(child, { name: gname, checked: child.props.value === value, onSelect: onChange, disabled: disabled || Boolean(child.props.disabled) })
      : child);
  return (
    <div role="radiogroup" aria-label={ariaLabel} aria-disabled={disabled ? 'true' : undefined} className={arenaClassName('ArenaRadioGroup', arenaRadioStyles().group(), className, ARENA_CONTEXT_VOCABULARY)} data-arena-part={manifest.parts.group} {...arenaRadioStyles().$data.group()} data-arena-boundary="">
      {items}
    </div>
  );
}
