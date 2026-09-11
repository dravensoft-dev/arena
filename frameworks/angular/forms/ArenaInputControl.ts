import { Directive, forwardRef, inject } from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { ArenaControlBinding } from '../ControlBinding';
import { ArenaInput } from '../components/forms/arena-input/ArenaInput';

@Directive({
  selector: 'arena-input[formControl], arena-input[formControlName], arena-input[ngModel]',
  standalone: true,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ArenaInputControl), multi: true }],
  host: { '(focusout)': 'touched()' },
})
export class ArenaInputControl implements ControlValueAccessor {
  private readonly binding = inject(ArenaControlBinding);
  private readonly input = inject(ArenaInput);
  protected touched: () => void = () => {};

  constructor() {
    this.binding.bound.set(true);
  }

  writeValue(value: unknown): void {
    this.binding.value.set(value === null || value === undefined ? '' : String(value));
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.binding.onChange = (value) => {
      const text = String(value ?? '');
      fn(this.input.type() === 'number' ? (text === '' ? null : Number(text)) : text);
    };
  }

  registerOnTouched(fn: () => void): void {
    this.touched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.binding.disabled.set(disabled);
  }
}
