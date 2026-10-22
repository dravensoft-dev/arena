import React, { createContext, useContext } from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaPaletteScope.classes.generated.ts';
import type { ArenaPaletteScopeClass } from '../../../Vocabulary.generated.ts';
import { arenaClassName } from '../../../VocabularyClass.ts';
import { arenaPalettes, arenaThemeClass, useArenaTheme } from '../../../Theme.ts';

export interface ArenaPaletteScopeProps {
  className?: ArenaPaletteScopeClass;

  /** The name of a palette the theme config declares, such as `light`. A name the theme config does not declare throws, listing the declared ones. The scope draws the class `arena-<palette>` on its element and gives every reader below it this name. */
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
  const declared = arenaPalettes().map((p) => p.name);
  if (!declared.includes(palette)) {
    throw new Error(`ArenaPaletteScope: no palette named "${palette}"; the declared palettes are ${declared.join(', ')}`);
  }
  const styles = arenaPaletteScopeStyles();
  return (
    <ArenaPaletteContext.Provider value={palette}>
      <div className={arenaClassName('ArenaPaletteScope', `${arenaThemeClass(palette)} ${styles.root()}`, className)}
        data-arena-part={manifest.parts.root} {...styles.$data.root()} data-arena-boundary="">
        {children}
      </div>
    </ArenaPaletteContext.Provider>
  );
}
