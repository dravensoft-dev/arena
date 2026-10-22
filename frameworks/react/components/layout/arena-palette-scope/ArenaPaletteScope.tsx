import React, { createContext, useContext } from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaPaletteScope.classes.generated.ts';
import type { ArenaPaletteScopeClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';
import { arenaThemeClass, useArenaTheme } from '../../../Theme.ts';
import { state, unknownPalette, useArenaThemeReady, useRegisteredArenaPalette } from '../../../ThemeState.ts';

export interface ArenaPaletteScopeProps {
  className?: ArenaPaletteScopeClass;

  /** The name of a palette the theme config declares or one registered at runtime, such as `light`. A name that is neither throws, listing the declared and the registered ones. The scope draws the class `arena-<palette>` on its element, or for a registered palette its polarity hook and its properties, and gives every reader below it this name. */
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
  if (ready && !state.registered.has(palette) && !state.config.palettes.some((p) => p.name === palette)) {
    throw new Error(`ArenaPaletteScope: ${unknownPalette(palette)}`);
  }
  const styles = arenaPaletteScopeStyles();
  return (
    <ArenaPaletteContext.Provider value={palette}>
      <div className={arenaClassName('ArenaPaletteScope', `${runtime ? `arena-polarity-${runtime.polarity}` : arenaThemeClass(palette)} ${styles.root()}`, className)}
        style={runtime?.properties as React.CSSProperties | undefined} data-arena-part={manifest.parts.root} {...styles.$data.root()} data-arena-boundary="">
        {children}
      </div>
    </ArenaPaletteContext.Provider>
  );
}
