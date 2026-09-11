import { Injectable, signal, type WritableSignal } from '@angular/core';
import { arenaWarnOnce } from './WarnOnce';

@Injectable()
export class ArenaControlBinding {
  readonly bound: WritableSignal<boolean> = signal(false);
  readonly value: WritableSignal<unknown> = signal(undefined);
  readonly disabled: WritableSignal<boolean> = signal(false);
  onChange: (value: unknown) => void = () => {};
}

export function arenaWarnDoubleBinding(component: string, member: string): void {
  arenaWarnOnce(`${component}: \`${member}\` is bound while a form directive binds the same control, `
    + `so \`${member}\` is ignored and the form's value is drawn. Bind one of the two.`);
}
