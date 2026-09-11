import { Directive, forwardRef, inject } from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { ArenaControlBinding } from '../ControlBinding';

@Directive({
  selector: 'arena-checkbox[formControl], arena-checkbox[formControlName], arena-checkbox[ngModel]',
  standalone: true,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ArenaCheckboxControl), multi: true }],
  host: { '(focusout)': 'touched()' },
})
export class ArenaCheckboxControl implements ControlValueAccessor {
  private readonly binding = inject(ArenaControlBinding);
  protected touched: () => void = () => {};

  constructor() {
    this.binding.bound.set(true);
  }

  writeValue(value: unknown): void {
    this.binding.value.set(Boolean(value));
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.binding.onChange = (value) => fn(Boolean(value));
  }

  registerOnTouched(fn: () => void): void {
    this.touched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.binding.disabled.set(disabled);
  }
}
