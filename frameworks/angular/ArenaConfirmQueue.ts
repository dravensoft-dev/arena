import { DestroyRef, Injectable, type Signal, computed, inject, signal } from '@angular/core';
import type { ArenaConfirmRequest } from './Api.generated';

export interface ArenaConfirmEntry extends ArenaConfirmRequest {
  id: number;
}

type Held = { entry: ArenaConfirmEntry; resolve: (answer: boolean) => void };

@Injectable({ providedIn: 'root' })
export class ArenaConfirmQueue {
  private readonly held = signal<readonly Held[]>([]);
  private next = 0;

  readonly current: Signal<ArenaConfirmEntry | null> = computed(() => this.held()[0]?.entry ?? null);

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      for (const one of this.held()) one.resolve(false);
      this.held.set([]);
    });
  }

  ask(request: ArenaConfirmRequest): Promise<boolean> {
    if (!request.title?.trim()) {
      throw new Error('ArenaConfirmQueue.ask: `title` is required, and names what is being confirmed');
    }
    this.next += 1;
    const entry: ArenaConfirmEntry = { ...request, id: this.next };
    return new Promise<boolean>((resolve) => {
      this.held.update((held) => [...held, { entry, resolve }]);
    });
  }

  settle(id: number, answer: boolean): void {
    const [head, ...rest] = this.held();
    if (!head || head.entry.id !== id) return;
    head.resolve(answer);
    this.held.set(rest);
  }
}
