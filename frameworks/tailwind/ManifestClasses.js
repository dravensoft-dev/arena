export function kebab(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

export const classBase = (manifest) => kebab(manifest);

export const slotClass = (manifest, slot) => `${classBase(manifest)}__${kebab(slot)}`;

export const variantClass = (manifest, slot, group, value) =>
  `${slotClass(manifest, slot)}--${kebab(group)}-${kebab(String(value))}`;

export const compoundClass = (manifest, slot, index) => `${slotClass(manifest, slot)}--cv${index + 1}`;

export function slotPart(manifest, slot) {
  const base = classBase(manifest).replace(/^arena-/, '');
  return slot === 'root' ? base : `${base}.${kebab(slot)}`;
}

export const dataAttribute = (group) => `data-arena-${kebab(group)}`;

export function groupSlots(manifest) {
  const slotNames = Object.keys(manifest.slots ?? {});
  const touched = {};
  const touch = (group, slot) => { (touched[group] ??= new Set()).add(slot); };
  for (const [group, values] of Object.entries(manifest.variants ?? {})) {
    touched[group] ??= new Set();
    for (const slots of Object.values(values))
      for (const [slot, classes] of Object.entries(slots ?? {}))
        if (String(classes ?? '').trim()) touch(group, slot);
  }
  for (const compound of manifest.compoundVariants ?? []) {
    const { class: applied, ...conditions } = compound;
    for (const group of Object.keys(conditions))
      if (touched[group]) for (const slot of Object.keys(applied ?? {})) touch(group, slot);
  }
  for (const [group, hue] of Object.entries(manifest.hues ?? {}))
    if (touched[group]) for (const slot of hue.on ?? []) touch(group, slot);
  return Object.fromEntries(Object.entries(touched).map(([group, set]) => [
    group, slotNames.filter((slot) => set.has(slot)),
  ]));
}

export function classesManifest(manifest) {
  const named = (map, name) => Object.fromEntries(
    Object.keys(map ?? {}).filter((slot) => String(map[slot] ?? '').trim()).map((slot) => [slot, name(slot)]),
  );
  const everySlot = Object.fromEntries(
    Object.keys(manifest.slots ?? {}).map((slot) => [slot, slotClass(manifest.component, slot)]),
  );

  const partOf = manifest.partOf ?? {};
  const everyPart = Object.fromEntries(
    Object.keys(manifest.slots ?? {})
      .map((slot) => [slot, slotPart(manifest.component, partOf[slot] ?? slot)]),
  );

  const out = { component: manifest.component, slots: everySlot, parts: everyPart };

  if (manifest.variants) {
    out.variants = Object.fromEntries(Object.entries(manifest.variants).map(([group, values]) => [
      group,
      Object.fromEntries(Object.entries(values).map(([value, slots]) => [
        value,
        named(slots, (slot) => variantClass(manifest.component, slot, group, value)),
      ])),
    ]));
  }
  if (manifest.defaultVariants) out.defaultVariants = manifest.defaultVariants;
  if (manifest.compoundVariants) {
    out.compoundVariants = manifest.compoundVariants.map(({ class: applied, ...conditions }, index) => ({
      ...conditions,
      class: named(applied, (slot) => compoundClass(manifest.component, slot, index)),
    }));
  }
  out.values = Object.fromEntries(
    Object.entries(manifest.variants ?? {}).map(([group, values]) => [group, Object.keys(values)]),
  );
  out.attributes = groupSlots(manifest);
  return out;
}

export function slotData(manifest, chosen = {}) {
  const out = Object.fromEntries(Object.keys(manifest.slots ?? {}).map((slot) => [slot, {}]));
  for (const [group, known] of Object.entries(manifest.values ?? {})) {
    const value = chosen[group] ?? manifest.defaultVariants?.[group];
    if (value === undefined) continue;
    if (!known.includes(String(value))) {
      throw new Error(`${manifest.component}: ${group}="${value}" is not in the manifest, known values: ${known.join(', ')}`);
    }
    if (value === false || value === 'false') continue;
    const rendered = value === true || value === 'true' ? '' : String(value);
    for (const slot of manifest.attributes?.[group] ?? []) out[slot][dataAttribute(group)] = rendered;
  }
  return out;
}

export function classesFor(manifest, chosen = {}) {
  const out = {};
  for (const [slot, base] of Object.entries(manifest.slots ?? {})) out[slot] = base;

  const append = (applied) => {
    for (const [slot, classes] of Object.entries(applied ?? {})) {
      out[slot] = out[slot] ? `${out[slot]} ${classes}` : classes;
    }
  };

  const resolved = (name) => chosen[name] ?? manifest.defaultVariants?.[name];

  for (const [name, values] of Object.entries(manifest.variants ?? {})) {
    const value = resolved(name);
    if (value === undefined) continue;
    const applied = values[value];
    if (!applied) {
      throw new Error(`${manifest.component}: ${name}="${value}" is not in the manifest — known values: ${Object.keys(values).join(', ')}`);
    }
    append(applied);
  }

  for (const compound of manifest.compoundVariants ?? []) {
    const { class: applied, ...conditions } = compound;
    if (Object.entries(conditions).every(([name, value]) => String(resolved(name)) === String(value))) append(applied);
  }

  return out;
}

export function arenaClassesFor(manifest, chosen = {}) {
  return classesFor(classesManifest(manifest), chosen);
}

export function arenaSlotDataFor(manifest, chosen = {}) {
  return slotData(classesManifest(manifest), chosen);
}
