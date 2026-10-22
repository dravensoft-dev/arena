import {
  ChangeDetectionStrategy, Component, InjectionToken, Signal, computed, inject, input,
} from '@angular/core';
import { ARENA_THEMES, ArenaThemeConfig, ArenaThemeService, arenaThemeClass } from '../../../theme/ArenaThemeService';
import { arenaPaletteScopeStyles } from './ArenaPaletteScope.variants';
import manifest from './ArenaPaletteScope.classes.generated';

/** The palette of the nearest `ArenaPaletteScope` above, as a signal. */
export const ARENA_PALETTE = new InjectionToken<Signal<string>>('ARENA_PALETTE');

/** The palette of the nearest `ArenaPaletteScope` above, else the page theme. A bare palette class is not a scope this sees. */
export function injectArenaPalette(): Signal<string> {
  return inject(ARENA_PALETTE, { optional: true }) ?? inject(ArenaThemeService).theme;
}

function declared(palette: string, config: ArenaThemeConfig): string {
  const names = config.palettes.map((p) => p.name);
  if (!names.includes(palette)) {
    throw new Error(`ArenaPaletteScope: no palette named "${palette}"; the declared palettes are ${names.join(', ')}`);
  }
  return palette;
}

@Component({
  selector: '[arenaPalette]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{
    provide: ARENA_PALETTE,
    useFactory: () => {
      const scope = inject(ArenaPaletteScope);
      const config = inject(ARENA_THEMES);
      return computed(() => declared(scope.palette(), config));
    },
  }],
  host: {
    '[class]': 'hostClass()',
    '[attr.data-arena-part]': 'parts.root',
    'data-arena-boundary': '',
  },
  template: `<ng-content />`,
})
export class ArenaPaletteScope {
  protected readonly parts = manifest.parts;
  private readonly config = inject(ARENA_THEMES);

  /** The name of a palette the theme config declares, such as `light`. A name the theme config does not declare throws, listing the declared ones. The scope draws the class `arena-<palette>` on its element and gives every reader below it this name. */
  readonly palette = input.required<string>({ alias: 'arenaPalette' });

  protected readonly styles = computed(() => arenaPaletteScopeStyles());

  protected readonly hostClass = computed(
    () => `${arenaThemeClass(declared(this.palette(), this.config))} ${this.styles().root()}`,
  );
}
