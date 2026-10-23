import {
  ChangeDetectionStrategy, Component, InjectionToken, Injector, Signal, computed, inject, input, untracked,
} from '@angular/core';
import {
  ARENA_THEMES, ArenaRuntimePalette, ArenaThemeConfig, ArenaThemeService, arenaPolarityClass, arenaThemeClass,
} from '../../../theme/ArenaThemeService';
import { arenaPaletteScopeStyles } from './ArenaPaletteScope.variants';
import { arenaWarnOnce } from '../../../WarnOnce';
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

const declares = (palette: string, config: ArenaThemeConfig): boolean => config.palettes.some((p) => p.name === palette);

function runtimeOf(palette: string, config: ArenaThemeConfig, theme: Theme): ArenaRuntimePalette | null {
  if (declares(palette, config)) return null;
  const runtime = theme().runtimePalette(palette);
  if (!runtime) arenaWarnOnce(`ArenaPaletteScope: no palette named "${palette}" is declared or registered, so the scope draws no palette until one of that name is registered`);
  return runtime;
}

@Component({
  selector: '[arenaPalette]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{
    provide: ARENA_PALETTE,
    useFactory: () => {
      const scope = inject(ArenaPaletteScope);
      return computed(() => scope.palette());
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

  /** The name of a palette the theme config declares or one registered at runtime, such as `light`. A name that is neither renders pending: no palette class and no properties, so the children inherit the page's palette, and a one-time console warning names it. The scope paints the palette as soon as that name is registered. The scope draws the class `arena-<palette>` on its element, or for a registered palette its polarity hook and its properties, and gives every reader below it this name. */
  readonly palette = input.required<string>({ alias: 'arenaPalette' });

  protected readonly styles = computed(() => arenaPaletteScopeStyles());

  private readonly runtime = computed(() => runtimeOf(this.palette(), this.config, this.theme));

  protected readonly hostClass = computed(() => {
    const runtime = this.runtime();
    const name = this.palette();
    const own = runtime ? arenaPolarityClass(runtime.polarity) : declares(name, this.config) ? arenaThemeClass(name) : '';
    return `${own} ${this.styles().root()}`.trim();
  });

  protected readonly hostStyle = computed(() => this.runtime()?.properties ?? null);
}
