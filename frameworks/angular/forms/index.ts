import { ArenaCheckboxControl } from './ArenaCheckboxControl';
import { ArenaCheckboxGroupControl } from './ArenaCheckboxGroupControl';
import { ArenaComboboxControl } from './ArenaComboboxControl';
import { ArenaFileInputControl } from './ArenaFileInputControl';
import { ArenaInputControl } from './ArenaInputControl';
import { ArenaMultiSelectControl } from './ArenaMultiSelectControl';
import { ArenaRadioGroupControl } from './ArenaRadioGroupControl';
import { ArenaSelectControl } from './ArenaSelectControl';
import { ArenaSwitchControl } from './ArenaSwitchControl';
import { ArenaTextareaControl } from './ArenaTextareaControl';

export {
  ArenaCheckboxControl, ArenaCheckboxGroupControl, ArenaComboboxControl, ArenaFileInputControl, ArenaInputControl,
  ArenaMultiSelectControl, ArenaRadioGroupControl, ArenaSelectControl, ArenaSwitchControl, ArenaTextareaControl,
};

export const ARENA_FORM_CONTROLS = [
  ArenaInputControl, ArenaTextareaControl, ArenaSelectControl,
  ArenaCheckboxControl, ArenaRadioGroupControl, ArenaSwitchControl, ArenaCheckboxGroupControl,
  ArenaComboboxControl, ArenaMultiSelectControl, ArenaFileInputControl,
] as const;
