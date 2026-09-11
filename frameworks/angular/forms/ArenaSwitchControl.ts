import { Directive, forwardRef, inject } from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { ArenaControlBinding } from '../ControlBinding';

@Directive({
  selector: 'arena-switch[formControl], arena-switch[formControlName], arena-switch[ngModel]',
  standalone: true,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ArenaSwitchControl), multi: true }],
  host: { '(focusout)': 'touched()' },
})
export class ArenaSwitchControl implements ControlValueAccessor {
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
