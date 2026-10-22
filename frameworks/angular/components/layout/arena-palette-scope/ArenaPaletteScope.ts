import {
  ChangeDetectionStrategy, Component, InjectionToken, Injector, Signal, computed, inject, input, untracked,
} from '@angular/core';
import {
  ARENA_THEMES, ArenaRuntimePalette, ArenaThemeConfig, ArenaThemeService, arenaPolarityClass, arenaThemeClass,
} from '../../../theme/ArenaThemeService';
import { arenaPaletteScopeStyles } from './ArenaPaletteScope.variants';
import manifest from './ArenaPaletteScope.classes.generated';

/** The palette of the nearest `ArenaPaletteScope` above, as a signal. */
export const ARENA_PALETTE = new InjectionToken<Signal<string>>('ARENA_PALETTE');

/** The palette of the nearest `ArenaPaletteScope` above, else the page theme. A bare palette class is not a scope this sees. */
export function injectArenaPalette(): Signal<string> {
  return inject(ARENA_PALETTE, { optional: true }) ?? inject(ArenaThemeService).theme;
}

/** The theme service paints the page root from the device the moment it exists, so a scope reaches it only for a name the config does not declare, which only a registered runtime palette can be. */
type Theme = () => ArenaThemeService;

const lazily = (injector: Injector): Theme => () => untracked(() => injector.get(ArenaThemeService));

function declared(palette: string, config: ArenaThemeConfig, theme: Theme): string {
  const names = config.palettes.map((p) => p.name);
  if (!names.includes(palette) && !theme().runtimePalette(palette)) {
    const runtime = theme().runtimePalettes().map((p) => p.name);
    const registered = runtime.length ? `; the registered palettes are ${runtime.join(', ')}` : '';
    throw new Error(`ArenaPaletteScope: no palette named "${palette}"; the declared palettes are ${names.join(', ')}${registered}`);
  }
  return palette;
}

function runtimeOf(palette: string, config: ArenaThemeConfig, theme: Theme): ArenaRuntimePalette | null {
  const name = declared(palette, config, theme);
  return config.palettes.some((p) => p.name === name) ? null : theme().runtimePalette(name);
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
      const theme = lazily(inject(Injector));
      return computed(() => declared(scope.palette(), config, theme));
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
  private readonly config = inject(ARENA_THEMES);
  private readonly theme = lazily(inject(Injector));

  /** The name of a palette the theme config declares or one registered at runtime, such as `light`. A name that is neither throws, listing the declared and the registered ones. The scope draws the class `arena-<palette>` on its element, or for a registered palette its polarity hook and its properties, and gives every reader below it this name. */
  readonly palette = input.required<string>({ alias: 'arenaPalette' });

  protected readonly styles = computed(() => arenaPaletteScopeStyles());

  private readonly runtime = computed(() => runtimeOf(this.palette(), this.config, this.theme));

  protected readonly hostClass = computed(() => {
    const runtime = this.runtime();
    const own = runtime ? arenaPolarityClass(runtime.polarity) : arenaThemeClass(this.palette());
    return `${own} ${this.styles().root()}`;
  });

  protected readonly hostStyle = computed(() => this.runtime()?.properties ?? null);
}
