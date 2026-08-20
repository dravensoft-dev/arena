import { Injectable, type Signal, computed, signal } from '@angular/core';
import type { ArenaTableColumn } from '../../../Api.generated';

export interface GridCursor {
  row: number;
  col: number;
}

export interface RowEntry {
  cells: Signal<number>;
  activate: () => void;
}

@Injectable()
export class ArenaTableState {
  columns: Signal<readonly ArenaTableColumn[]> = signal([]);
  narrow: Signal<boolean> = signal(false);
  rows: Signal<readonly object[]> = signal([]);
  extent: Signal<{ total: number; offset: number } | null> = signal(null);

  readonly cursor = signal<GridCursor>({ row: 0, col: 0 });

  readonly lengths = computed(() => [
    this.columns().length,
    ...this.rows().map((row) => this.cellCount(row)),
  ]);

  readonly clamped = computed<GridCursor>(() => {
    const lengths = this.lengths();
    const { row, col } = this.cursor();
    const at = Math.min(Math.max(row, 0), Math.max(lengths.length - 1, 0));
    return { row: at, col: Math.min(Math.max(col, 0), Math.max((lengths[at] ?? 0) - 1, 0)) };
  });

  private readonly entries = signal<ReadonlyMap<object, RowEntry>>(new Map());

  registerRow(row: object, entry: RowEntry): void {
    this.entries.update((current) => new Map(current).set(row, entry));
  }

  releaseRow(row: object): void {
    this.entries.update((current) => {
      const next = new Map(current);
      next.delete(row);
      return next;
    });
  }

  activate(rowIndex: number): void {
    const row = this.rows()[rowIndex - 1];
    if (row) this.entries().get(row)?.activate();
  }

  ariaRowIndexOf(row: object): number | null {
    const sits = this.extent();
    if (sits === null) return null;
    const at = this.rowIndexOf(row);
    return at === -1 ? null : sits.offset + at + 1;
  }

  rowIndexOf(row: object): number {
    const at = this.rows().indexOf(row);
    return at === -1 ? -1 : at + 1;
  }

  isStop(row: number, col: number): boolean {
    const at = this.clamped();
    return at.row === row && at.col === col;
  }

  private cellCount(row: object): number {
    return this.entries().get(row)?.cells() ?? 0;
  }
}
