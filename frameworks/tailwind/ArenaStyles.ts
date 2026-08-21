export type ArenaSlotClasses = Record<string, string>;
export type ArenaSlotParts = Record<string, string>;
export type ArenaVariantGroups = Record<string, Record<string, Partial<ArenaSlotClasses>>>;
export type ArenaChoice = string | boolean | undefined;

export interface ArenaCompoundVariant {
  readonly class: Partial<ArenaSlotClasses>;
  readonly [condition: string]: ArenaChoice | Partial<ArenaSlotClasses>;
}

export interface ArenaClassManifest {
  readonly component: string;
  readonly slots: ArenaSlotClasses;
  readonly parts?: ArenaSlotParts;
  readonly variants?: ArenaVariantGroups;
  readonly defaultVariants?: Record<string, ArenaChoice>;
  readonly compoundVariants?: readonly ArenaCompoundVariant[];
}

export type ArenaSelection = Record<string, ArenaChoice>;
export type ArenaSlots<M extends ArenaClassManifest> = { readonly [K in keyof M['slots']]: () => string };

export function arenaStyles<M extends ArenaClassManifest>(manifest: M) {
  const slotNames = Object.keys(manifest.slots);
  const kept = new Map<string, ArenaSlots<M>>();

  const asked = (chosen: ArenaSelection) => {
    let key = '';
    for (const group of Object.keys(chosen).sort()) {
      const value = chosen[group];
      if (value !== undefined) key += `${group} ${String(value)} `;
    }
    return key;
  };

  const compose = (chosen: ArenaSelection): ArenaSlots<M> => {
    const applied = new Map<string, string[]>();
    for (const slot of slotNames) {
      const base = manifest.slots[slot];
      applied.set(slot, base ? [base] : []);
    }

    const append = (classes: Partial<ArenaSlotClasses> | undefined) => {
      for (const [slot, name] of Object.entries(classes ?? {})) {
        const into = applied.get(slot);
        if (name && into) into.push(name);
      }
    };

    const resolved = (group: string): ArenaChoice =>
      (chosen[group] ?? manifest.defaultVariants?.[group]);

    for (const [group, values] of Object.entries(manifest.variants ?? {})) {
      const value = resolved(group);
      if (value === undefined) continue;
      const branch = values[String(value)];
      if (!branch) {
        throw new Error(`${manifest.component}: ${group}="${String(value)}" is not in the manifest, `
          + `known values: ${Object.keys(values).join(', ')}`);
      }
      append(branch);
    }

    for (const compound of manifest.compoundVariants ?? []) {
      const { class: classes, ...conditions } = compound;
      const holds = Object.entries(conditions)
        .every(([group, value]) => resolved(group) === value);
      if (holds) append(classes);
    }

    const out: Record<string, () => string> = {};
    for (const slot of slotNames) {
      const joined = (applied.get(slot) ?? []).join(' ');
      out[slot] = () => joined;
    }
    return out as ArenaSlots<M>;
  };

  return (chosen: ArenaSelection = {}): ArenaSlots<M> => {
    const key = asked(chosen);
    const already = kept.get(key);
    if (already) return already;
    const composed = compose(chosen);
    kept.set(key, composed);
    return composed;
  };
}
