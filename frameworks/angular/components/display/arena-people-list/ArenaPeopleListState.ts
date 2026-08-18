import { Injectable, type Signal, signal } from '@angular/core';
import type { ArenaControlSize } from '../../../Api.generated';

@Injectable()
export class ArenaPeopleListState {
  size: Signal<ArenaControlSize> = signal<ArenaControlSize>('md');
}
