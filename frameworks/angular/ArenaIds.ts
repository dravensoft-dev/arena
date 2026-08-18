import { APP_ID, Injectable, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ArenaIdGenerator {
  private readonly app = inject(APP_ID);

  private seed = 0;

  next(prefix: string): string {
    this.seed += 1;
    return this.app === 'ng' ? `${prefix}-${this.seed}` : `${prefix}-${this.app}-${this.seed}`;
  }
}
