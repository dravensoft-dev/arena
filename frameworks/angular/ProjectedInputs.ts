import { type Signal, effect, signal } from '@angular/core';

export function arenaPublished<T>(read: () => T): Signal<T | null> {
  const published = signal<T | null>(null);
  effect(() => published.set(read()));
  return published.asReadonly();
}
