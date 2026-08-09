import { computed, Injectable, Signal, signal } from '@angular/core';

@Injectable()
export class ArenaSideNavState {
  depth: Signal<number> = signal(0);
  activeId: Signal<string | undefined> = signal(undefined);
  indentStep: Signal<number> = signal(3);
  activate: (id: string) => void = () => {};

  private readonly ids = signal<readonly string[]>([]);
  private readonly groups = signal<readonly ArenaSideNavState[]>([]);

  readonly holdsActive: Signal<boolean> = computed(() => {
    const active = this.activeId();
    if (active === undefined) return false;
    return this.ids().includes(active) || this.groups().some((group) => group.holdsActive());
  });

  claim(id: string): void {
    this.ids.update((ids) => [...ids, id]);
  }

  release(id: string): void {
    this.ids.update((ids) => {
      const at = ids.indexOf(id);
      return at === -1 ? ids : [...ids.slice(0, at), ...ids.slice(at + 1)];
    });
  }

  adopt(group: ArenaSideNavState): void {
    this.groups.update((groups) => [...groups, group]);
  }

  orphan(group: ArenaSideNavState): void {
    this.groups.update((groups) => groups.filter((held) => held !== group));
  }
}

export function arenaIndentFor(indentStep: number, depth: number): string {
  const steps = indentStep * depth;
  return steps === 0
    ? 'calc(var(--sp-1) * 3)'
    : `calc(var(--sp-1) * 3 + var(--sp-1) * ${steps})`;
}
