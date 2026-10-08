export type ArenaSlotClasses = Record<string, string>;
export type ArenaSlotParts = Record<string, string>;
export type ArenaChoice = string | boolean | undefined;

export type ArenaSlotData = Readonly<Record<string, string>>;
export type ArenaHueGroup = Readonly<Record<string, string | null | readonly string[]>>;

export interface ArenaClassManifest {
  readonly component: string;
  readonly slots: ArenaSlotClasses;
  readonly parts?: ArenaSlotParts;
  readonly defaultVariants?: Record<string, ArenaChoice>;
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
    const resolved = (group: string): ArenaChoice =>
      (chosen[group] ?? manifest.defaultVariants?.[group]);

    const data = new Map<string, Record<string, string>>();
    for (const slot of slotNames) data.set(slot, {});

    for (const [group, known] of Object.entries(manifest.values ?? {})) {
      const value = resolved(group);
      if (value === undefined) continue;
      if (!known.includes(String(value))) {
        throw new Error(`${manifest.component}: ${group}="${String(value)}" is not in the manifest, `
          + `known values: ${known.join(', ')}`);
      }
      if (value === false || value === 'false') continue;
      const rendered = value === true || value === 'true' ? '' : String(value);
      for (const slot of manifest.attributes?.[group] ?? []) {
        const into = data.get(slot);
        if (into) into[`data-arena-${kebabCase(group)}`] = rendered;
      }
    }

    const out: Record<string, unknown> = {};
    const outData: Record<string, () => ArenaSlotData> = {};
    for (const slot of slotNames) {
      const joined = manifest.slots[slot] ?? '';
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
