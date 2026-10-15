import { ArenaCheckboxControl } from './ArenaCheckboxControl';
import { ArenaCheckboxGroupControl } from './ArenaCheckboxGroupControl';
import { ArenaComboboxControl } from './ArenaComboboxControl';
import { ArenaInputControl } from './ArenaInputControl';
import { ArenaRadioGroupControl } from './ArenaRadioGroupControl';
import { ArenaSelectControl } from './ArenaSelectControl';
import { ArenaSwitchControl } from './ArenaSwitchControl';
import { ArenaTextareaControl } from './ArenaTextareaControl';

export {
  ArenaCheckboxControl, ArenaCheckboxGroupControl, ArenaComboboxControl, ArenaInputControl, ArenaRadioGroupControl,
  ArenaSelectControl, ArenaSwitchControl, ArenaTextareaControl,
};

export const ARENA_FORM_CONTROLS = [
  ArenaInputControl, ArenaTextareaControl, ArenaSelectControl,
  ArenaCheckboxControl, ArenaRadioGroupControl, ArenaSwitchControl, ArenaCheckboxGroupControl,
  ArenaComboboxControl,
] as const;
