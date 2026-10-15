import React, { useId } from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from '../arena-checkbox/ArenaCheckbox.classes.generated.ts';
import { ArenaCheckbox, type ArenaCheckboxProps } from '../arena-checkbox/ArenaCheckbox.tsx';
import type { ArenaValueSet } from '../../../Api.generated';
import type { ArenaCheckboxGroupClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';

export interface ArenaCheckboxGroupProps {
  className?: ArenaCheckboxGroupClass;

  /** Names the group: what the choices are about, not that they are choices. Required, and guarded at runtime: a group with no accessible name is announced unlabelled, and each box's own label says what that box is, never what the set is for. "Notify me about", not "Options". Distinct from `name`, which is the boxes' shared form name and never reaches a screen reader. */
  ariaLabel: string;

  /** The Checkboxes, each with a `value`: the set holds that value while the box is ticked. The group owns each box's ticked state, and how the two are wired is not this contract's business. */
  children?: React.ReactNode;

  /** The ticked boxes' values, in the order they were ticked. A value that matches no box is kept rather than dropped. */
  value?: readonly string[];

  /** Shared form name for the underlying checkboxes, so a form submits every ticked value under one key; generated when omitted. */
  name?: string;

  /** Whether the whole group is unavailable. Every box it holds is disabled whatever its own disabled says, and the group reflects aria-disabled. */
  disabled?: boolean;

  /** A box was ticked or unticked; carries the whole set after the change. */
  onChange?: (set: ArenaValueSet) => void;
}

const arenaCheckboxStyles = arenaStyles(manifest);

function toggled(values: readonly string[], value: string, checked: boolean): string[] {
  if (!checked) return values.filter((one) => one !== value);
  return values.includes(value) ? [...values] : [...values, value];
}

export function ArenaCheckboxGroup({ className, ariaLabel, children, value = [], name, disabled = false, onChange }: ArenaCheckboxGroupProps) {
  const generated = `cbg-${useId().replace(/:/g, '')}`;
  if (!ariaLabel?.trim()) throw new Error('ArenaCheckboxGroup: `ariaLabel` is required, and names what the choices are about');
  const groupName = name || generated;
  const items = React.Children.map(children, (child) => {
    if (!React.isValidElement<ArenaCheckboxProps>(child) || child.type !== ArenaCheckbox) return child;
    const own = child.props;
    const itemValue = own.value;
    if (!itemValue?.trim()) throw new Error('ArenaCheckbox: `value` is required inside an ArenaCheckboxGroup');
    return React.cloneElement(child, {
      name: groupName,
      checked: value.includes(itemValue),
      disabled: disabled || Boolean(own.disabled),
      onChange: (checked: boolean) => {
        own.onChange?.(checked);
        onChange?.({ values: toggled(value, itemValue, checked) });
      },
    });
  });
  return (
    <div role="group" aria-label={ariaLabel} aria-disabled={disabled ? 'true' : undefined} className={arenaClassName('ArenaCheckboxGroup', arenaCheckboxStyles().group(), className)} data-arena-part={manifest.parts.group} {...arenaCheckboxStyles().$data.group()} data-arena-boundary="">
      {items}
    </div>
  );
}
