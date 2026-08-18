import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from '../arena-radio/ArenaRadio.classes.generated.ts';

export interface ArenaRadioGroupProps {

  /** Names the group: what is being chosen, not that it is a choice. Required, and guarded at runtime: a radiogroup with no accessible name is announced unlabelled, and each option's own label says what that option is, never what the set is for. "Deployment target", not "Options". Distinct from `name`, which is the radios' shared form name and never reaches a screen reader. */
  ariaLabel: string;

  /** The Radios. An option never holds a selected state of its own -- the group owns it, and how the two are wired is each layer's business rather than this contract's. */
  children?: React.ReactNode;

  /** The selected option's value. */
  value?: string;

  /** Shared name for the underlying radios; generated when omitted. */
  name?: string;

  /** A different option was chosen; carries its value. */
  onChange?: (value: string) => void;
}


const arenaRadioStyles = arenaStyles(manifest);

export function ArenaRadioGroup({ value, onChange, name, ariaLabel, children }: ArenaRadioGroupProps) {
  if (!ariaLabel?.trim()) throw new Error('ArenaRadioGroup: `ariaLabel` is required');
  const gname = name || 'rg-' + Math.random().toString(36).slice(2, 7);
  const items = React.Children.map(children, (child) =>
    React.isValidElement(child)
      ? React.cloneElement(child, { name: gname, checked: child.props.value === value, onSelect: onChange })
      : child);
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={arenaRadioStyles().group()} data-arena-part={manifest.parts.group}>
      {items}
    </div>
  );
}
