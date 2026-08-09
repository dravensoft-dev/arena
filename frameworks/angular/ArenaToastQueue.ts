import { DestroyRef, Injectable, Signal, computed, inject, signal } from '@angular/core';
import { ARENA_TOAST_DISMISS } from './components/feedback/arena-toast/ArenaToast';
import { arenaToastDelay, type ArenaToastNotice } from './ToastClock';

export type { ArenaToastNotice };

export interface ArenaToastEntry extends ArenaToastNotice {
  id: number;
}

@Injectable({ providedIn: 'root' })
export class ArenaToastQueue {
  private readonly held = signal<readonly ArenaToastEntry[]>([]);
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  private next = 0;

  readonly toasts: Signal<readonly ArenaToastEntry[]> = computed(() => this.held());

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clear());
  }

  raise(notice: ArenaToastNotice): number {
    this.next += 1;
    const id = this.next;
    this.held.update((held) => [...held, { ...notice, id }]);
    const delay = arenaToastDelay(notice, ARENA_TOAST_DISMISS);
    if (delay !== null) this.timers.set(id, setTimeout(() => this.dismiss(id), delay));
    return id;
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.held.update((held) => held.filter((one) => one.id !== id));
  }

  clear(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    this.held.set([]);
  }
}
