import { Injectable, type Signal, signal } from '@angular/core';

type ArenaAccordionLevel = 'h1' | 'h2' | 'h3' | 'h4';

@Injectable()
export class ArenaAccordionState {
  open: Signal<readonly string[]> = signal([]);
  keepsOneOpen: Signal<boolean> = signal(false);
  level: Signal<ArenaAccordionLevel> = signal('h3');
  toggle: (value: string) => void = () => {};
}
