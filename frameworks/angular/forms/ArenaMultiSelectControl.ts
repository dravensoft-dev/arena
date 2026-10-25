import { Directive, ElementRef, forwardRef, inject } from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { ArenaControlBinding } from '../ControlBinding';

@Directive({
  selector: 'arena-multi-select[formControl], arena-multi-select[formControlName], arena-multi-select[ngModel]',
  standalone: true,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ArenaMultiSelectControl), multi: true }],
  host: { '(focusout)': 'leave($event)' },
})
export class ArenaMultiSelectControl implements ControlValueAccessor {
  private readonly binding = inject(ArenaControlBinding);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected touched: () => void = () => {};

  constructor() {
    this.binding.bound.set(true);
  }

  protected leave(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (next instanceof Node && this.host.nativeElement.contains(next)) return;
    this.touched();
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
