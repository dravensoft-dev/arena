import { Injectable, type Signal, signal } from '@angular/core';

@Injectable()
export class ArenaRadioGroupState {
  groupName: Signal<string> = signal('');
  selected: Signal<string | undefined> = signal(undefined);
  disabled: Signal<boolean> = signal(false);
  choose: (value: string) => void = () => {};
}
