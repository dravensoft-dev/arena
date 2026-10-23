import { Injectable, type Signal, signal } from '@angular/core';

@Injectable()
export class ArenaCheckboxGroupState {
  groupName: Signal<string> = signal('');
  values: Signal<readonly string[]> = signal([]);
  disabled: Signal<boolean> = signal(false);
  toggle: (value: string, checked: boolean) => void = () => {};
}
