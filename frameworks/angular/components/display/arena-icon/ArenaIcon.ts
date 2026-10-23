import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { arenaIconStyles } from './ArenaIcon.variants';
import manifest from './ArenaIcon.classes.generated';
import { ARENA_ICONS } from '../../../ArenaIcons';
import { ArenaSlotAttributes } from '../../../SlotData';
import { arenaWarnOnce } from '../../../WarnOnce';

const WEIGHTS: Readonly<Record<string, string>> = {
  'ph-thin': 'thin',
  'ph-light': 'light',
  ph: 'regular',
  'ph-bold': 'bold',
  'ph-duotone': 'duotone',
  'ph-fill': 'fill',
};

@Component({
  selector: 'arena-icon',
  standalone: true,
  imports: [ArenaSlotAttributes],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    @if (symbol(); as target) {
      <svg [class]="styles().root()" [arenaSlotData]="styles().$data.root()" [attr.data-arena-part]="parts.root" aria-hidden="true" focusable="false"><use [attr.href]="target"></use></svg>
    }
  `,
})
export class ArenaIcon {
  protected readonly parts = manifest.parts;
  private readonly sprite = inject(ARENA_ICONS);

  /** Phosphor class names, a weight and a glyph such as ph-bold ph-plus. The weight defaults to regular. */
  readonly icon = input.required<string>();

  protected readonly symbol = computed(() => {
    const tokens = this.icon().split(/\s+/).filter((token) => token !== '');
    let weight = 'regular';
    let glyph: string | null = null;
    for (const token of tokens) {
      const named = WEIGHTS[token];
      if (named !== undefined) weight = named;
      else if (token.startsWith('ph-') && token.length > 3) glyph = token.slice(3);
    }
    if (glyph === null) {
      arenaWarnOnce(`ArenaIcon has no glyph: "${this.icon()}" names no ph-<name> class.`);
      return null;
    }
    if (this.sprite === null) {
      arenaWarnOnce('ArenaIcon has no sprite: hand the URL of the icons-<hash>.svg arena build writes to ArenaIconsProvider (React) or provideArenaIcons (Angular).');
      return null;
    }
    return `${this.sprite}#ph-${weight}-${glyph}`;
  });

  protected readonly styles = computed(() => arenaIconStyles());
}
