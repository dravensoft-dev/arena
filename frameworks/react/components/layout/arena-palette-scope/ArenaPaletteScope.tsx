import React, { createContext, useContext } from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaPaletteScope.classes.generated.ts';
import type { ArenaPaletteScopeClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';
import { arenaThemeClass, useArenaTheme } from '../../../Theme.ts';
import { state, useArenaThemeReady, useRegisteredArenaPalette } from '../../../ThemeState.ts';
import { arenaWarnOnce } from '../../../WarnOnce.ts';

export interface ArenaPaletteScopeProps {
  className?: ArenaPaletteScopeClass;

  /** The name of a palette the theme config declares or one registered at runtime, such as `light`. A name that is neither renders pending: no palette class and no properties, so the children inherit the page's palette, and a one-time console warning names it. The scope paints the palette as soon as that name is registered. The scope draws the class `arena-<palette>` on its element, or for a registered palette its polarity hook and its properties, and gives every reader below it this name. */
  palette: string;

  /** What is drawn in the palette. The slot is optional and unguarded, because a scope holding nothing yet is still a valid island. */
  children?: React.ReactNode;
}

const ArenaPaletteContext = createContext<string | null>(null);

const arenaPaletteScopeStyles = arenaStyles(manifest);

/** The palette of the nearest `ArenaPaletteScope` above, else the page theme. A bare palette class is not a scope this sees. */
export function useArenaPalette(): string {
  const scoped = useContext(ArenaPaletteContext);
  const [page] = useArenaTheme();
  return scoped ?? page;
}

export function ArenaPaletteScope({ className, palette, children }: ArenaPaletteScopeProps) {
  const ready = useArenaThemeReady();
  const runtime = useRegisteredArenaPalette(palette);
  const declared = state.config.palettes.some((p) => p.name === palette);
  const pending = ready && !state.registered.has(palette) && !declared;
  if (pending) arenaWarnOnce(`ArenaPaletteScope: no palette named "${palette}" is declared or registered, so the scope draws no palette until one of that name is registered`);
  const styles = arenaPaletteScopeStyles();
  return (
    <ArenaPaletteContext.Provider value={palette}>
      <div className={arenaClassName('ArenaPaletteScope', `${runtime ? `arena-polarity-${runtime.polarity}` : pending ? '' : arenaThemeClass(palette)} ${styles.root()}`, className, manifest.vocabulary)}
        style={runtime?.properties as React.CSSProperties | undefined} data-arena-part={manifest.parts.root} {...styles.$data.root()} data-arena-boundary="">
        {children}
      </div>
    </ArenaPaletteContext.Provider>
  );
}
