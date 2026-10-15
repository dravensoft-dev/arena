import { Directive, forwardRef, inject } from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { ArenaControlBinding } from '../ControlBinding';

@Directive({
  selector: 'arena-combobox[formControl], arena-combobox[formControlName], arena-combobox[ngModel]',
  standalone: true,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ArenaComboboxControl), multi: true }],
  host: { '(focusout)': 'touched()' },
})
export class ArenaComboboxControl implements ControlValueAccessor {
  private readonly binding = inject(ArenaControlBinding);
  protected touched: () => void = () => {};

  constructor() {
    this.binding.bound.set(true);
  }

  writeValue(value: unknown): void {
    this.binding.value.set(value === null || value === undefined ? '' : String(value));
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.binding.onChange = (value) => fn(String(value ?? ''));
  }

  registerOnTouched(fn: () => void): void {
    this.touched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.binding.disabled.set(disabled);
  }
}
