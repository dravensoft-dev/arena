import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { TitleStrategy } from '@angular/router';
import { ARENA_METADATA } from './ArenaMetadataService';
import type { ArenaMetadataConfig } from './ArenaMetadataService';
import { ArenaTitleStrategy } from './ArenaTitleStrategy';

export function provideArenaMetadata(config: ArenaMetadataConfig = {}): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: ARENA_METADATA, useValue: config },
    { provide: TitleStrategy, useClass: ArenaTitleStrategy },
  ]);
}
