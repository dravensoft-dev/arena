import {
  ChangeDetectionStrategy, Component, InjectionToken, Signal, computed, inject, input,
} from '@angular/core';
import { ArenaThemeService, arenaPolarityClass, arenaThemeClass } from '../../../theme/ArenaThemeService';
import { arenaPaletteScopeStyles } from './ArenaPaletteScope.variants';
import manifest from './ArenaPaletteScope.classes.generated';

/** The palette of the nearest `ArenaPaletteScope` above, as a signal. */
export const ARENA_PALETTE = new InjectionToken<Signal<string>>('ARENA_PALETTE');

/** The palette of the nearest `ArenaPaletteScope` above, else the page theme. A bare palette class is not a scope this sees. */
export function injectArenaPalette(): Signal<string> {
  return inject(ARENA_PALETTE, { optional: true }) ?? inject(ArenaThemeService).theme;
}

function declared(palette: string, theme: ArenaThemeService): string {
  const names = theme.palettes.map((p) => p.name);
  if (!names.includes(palette) && !theme.runtimePalette(palette)) {
    const runtime = theme.runtimePalettes().map((p) => p.name);
    const registered = runtime.length ? `; the registered palettes are ${runtime.join(', ')}` : '';
    throw new Error(`ArenaPaletteScope: no palette named "${palette}"; the declared palettes are ${names.join(', ')}${registered}`);
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
      const theme = inject(ArenaThemeService);
      return computed(() => declared(scope.palette(), theme));
    },
  }],
  host: {
    '[class]': 'hostClass()',
    '[style]': 'hostStyle()',
    '[attr.data-arena-part]': 'parts.root',
    'data-arena-boundary': '',
  },
  template: `<ng-content />`,
})
export class ArenaPaletteScope {
  protected readonly parts = manifest.parts;
  private readonly theme = inject(ArenaThemeService);

  /** The name of a palette the theme config declares or one registered at runtime, such as `light`. A name that is neither throws, listing the declared and the registered ones. The scope draws the class `arena-<palette>` on its element, or for a registered palette its polarity hook and its properties, and gives every reader below it this name. */
  readonly palette = input.required<string>({ alias: 'arenaPalette' });

  protected readonly styles = computed(() => arenaPaletteScopeStyles());

  private readonly runtime = computed(() => this.theme.runtimePalette(declared(this.palette(), this.theme)));

  protected readonly hostClass = computed(() => {
    const runtime = this.runtime();
    const own = runtime ? arenaPolarityClass(runtime.polarity) : arenaThemeClass(this.palette());
    return `${own} ${this.styles().root()}`;
  });

  protected readonly hostStyle = computed(() => this.runtime()?.properties ?? null);
}
