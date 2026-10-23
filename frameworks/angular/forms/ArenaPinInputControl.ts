import { Directive, ElementRef, forwardRef, inject } from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { ArenaControlBinding } from '../ControlBinding';

@Directive({
  selector: 'arena-pin-input[formControl], arena-pin-input[formControlName], arena-pin-input[ngModel]',
  standalone: true,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ArenaPinInputControl), multi: true }],
  host: { '(focusout)': 'left($event)' },
})
export class ArenaPinInputControl implements ControlValueAccessor {
  private readonly binding = inject(ArenaControlBinding);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected touched: () => void = () => {};

  constructor() {
    this.binding.bound.set(true);
  }

  protected left(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (next instanceof Node && this.host.nativeElement.contains(next)) return;
    this.touched();
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
