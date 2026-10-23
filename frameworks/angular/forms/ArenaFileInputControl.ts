import { Directive, forwardRef, inject } from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { ArenaControlBinding } from '../ControlBinding';
import { arenaWarnOnce } from '../WarnOnce';
import { ArenaFileInput } from '../components/forms/arena-file-input/ArenaFileInput';

@Directive({
  selector: 'arena-file-input[formControl], arena-file-input[formControlName], arena-file-input[ngModel]',
  standalone: true,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ArenaFileInputControl), multi: true }],
  host: { '(focusout)': 'touched()' },
})
export class ArenaFileInputControl implements ControlValueAccessor {
  private readonly binding = inject(ArenaControlBinding);
  private readonly input = inject(ArenaFileInput);
  protected touched: () => void = () => {};

  constructor() {
    this.binding.bound.set(true);
  }

  writeValue(value: unknown): void {
    if (value === null || value === undefined || (Array.isArray(value) && value.length === 0)) {
      this.input.clear();
      return;
    }
    arenaWarnOnce('ArenaFileInput: a form wrote a value that holds files, and a file selection cannot be set '
      + 'from outside, so it is ignored. Write null or an empty array to clear the field.');
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.binding.onChange = (value) => fn(value);
  }

  registerOnTouched(fn: () => void): void {
    this.touched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.binding.disabled.set(disabled);
  }
}
