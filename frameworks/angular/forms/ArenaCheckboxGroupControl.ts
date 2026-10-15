import { Directive, forwardRef, inject } from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { ArenaControlBinding } from '../ControlBinding';

@Directive({
  selector: 'arena-checkbox-group[formControl], arena-checkbox-group[formControlName], arena-checkbox-group[ngModel]',
  standalone: true,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ArenaCheckboxGroupControl), multi: true }],
  host: { '(focusout)': 'touched()' },
})
export class ArenaCheckboxGroupControl implements ControlValueAccessor {
  private readonly binding = inject(ArenaControlBinding);
  protected touched: () => void = () => {};

  constructor() {
    this.binding.bound.set(true);
  }

  writeValue(value: unknown): void {
    this.binding.value.set(Array.isArray(value) ? value.map((one) => String(one)) : []);
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.binding.onChange = (value) => fn(Array.isArray(value) ? [...value] : []);
  }

  registerOnTouched(fn: () => void): void {
    this.touched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.binding.disabled.set(disabled);
  }
}
