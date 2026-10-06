export type ArenaSlotClasses = Record<string, string>;
export type ArenaSlotParts = Record<string, string>;
export type ArenaVariantGroups = Record<string, Record<string, Partial<ArenaSlotClasses>>>;
export type ArenaChoice = string | boolean | undefined;

export interface ArenaCompoundVariant {
  readonly class: Partial<ArenaSlotClasses>;
  readonly [condition: string]: ArenaChoice | Partial<ArenaSlotClasses>;
}

export type ArenaSlotData = Readonly<Record<string, string>>;
export type ArenaHueGroup = Readonly<Record<string, string | null | readonly string[]>>;

export interface ArenaClassManifest {
  readonly component: string;
  readonly slots: ArenaSlotClasses;
  readonly parts?: ArenaSlotParts;
  readonly variants?: ArenaVariantGroups;
  readonly defaultVariants?: Record<string, ArenaChoice>;
  readonly compoundVariants?: readonly ArenaCompoundVariant[];
  readonly values?: Readonly<Record<string, readonly string[]>>;
  readonly attributes?: Readonly<Record<string, readonly string[]>>;
}

export type ArenaSelection = Record<string, ArenaChoice>;
export type ArenaSlots<M extends ArenaClassManifest> =
  { readonly [K in keyof M['slots']]: () => string }
  & { readonly $data: { readonly [K in keyof M['slots']]: () => ArenaSlotData } };

const kebabCase = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

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

    const data = new Map<string, Record<string, string>>();
    for (const slot of slotNames) data.set(slot, {});

    const groups = new Set([...Object.keys(manifest.variants ?? {}), ...Object.keys(manifest.values ?? {})]);
    for (const group of groups) {
      const value = resolved(group);
      if (value === undefined) continue;
      const known = manifest.values?.[group] ?? Object.keys(manifest.variants?.[group] ?? {});
      if (!known.includes(String(value))) {
        throw new Error(`${manifest.component}: ${group}="${String(value)}" is not in the manifest, `
          + `known values: ${known.join(', ')}`);
      }
      append(manifest.variants?.[group]?.[String(value)]);
      if (value === false || value === 'false') continue;
      const rendered = value === true || value === 'true' ? '' : String(value);
      for (const slot of manifest.attributes?.[group] ?? []) {
        const into = data.get(slot);
        if (into) into[`data-arena-${kebabCase(group)}`] = rendered;
      }
    }

    for (const compound of manifest.compoundVariants ?? []) {
      const { class: classes, ...conditions } = compound;
      const holds = Object.entries(conditions)
        .every(([group, value]) => String(resolved(group)) === String(value));
      if (holds) append(classes);
    }

    const out: Record<string, unknown> = {};
    const outData: Record<string, () => ArenaSlotData> = {};
    for (const slot of slotNames) {
      const joined = (applied.get(slot) ?? []).join(' ');
      const attrs = Object.freeze({ ...data.get(slot) });
      out[slot] = () => joined;
      outData[slot] = () => attrs;
    }
    out['$data'] = outData;
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
