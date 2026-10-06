/* The shape a `*.manifest.json` holds on disk, so the scripts that read one agree about it.
 * Every reader reaches its classes through `Object.entries()` over a `JSON.parse` that hands
 * back `unknown`, so one spelling `manifest.variants` was claiming something about the file it
 * never stated. The Tailwind layer had already declared this document as `ArenaClassManifest`,
 * for the sheet `classesManifest()` emits rather than the authored source, and the two differ
 * in what only an author writes: no `slots` at all, and the vocabulary's `answers` and
 * `transparent`, which never reach a class module. So it is derived rather than written twice, and the facts that live there hold here -- notably that a
 * variant value is a string in `variants` and a boolean in `defaultVariants` and in a compound
 * selector.
 * Readers wanting only class strings take the partial. */

import type {
  ArenaClassManifest, ArenaCompoundVariant, ArenaSlotClasses,
} from '../../../frameworks/tailwind/ArenaStyles.ts';

export type SlotClasses = ArenaSlotClasses;

export type CompoundVariant = ArenaCompoundVariant;

export type ComponentManifest = Omit<ArenaClassManifest, 'slots'> & {
  readonly slots?: SlotClasses;
  readonly partOf?: Readonly<Record<string, string>>;
  readonly answers?: readonly string[];
  readonly transparent?: Readonly<Record<string, string>>;
};

export type ManifestClassSource = Partial<ComponentManifest>;

export type Manifests = Map<string, ComponentManifest>;
