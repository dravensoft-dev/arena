import { createTV } from 'tailwind-variants';
import { getDefaultConfig } from 'tailwind-merge';

export const ARENA_SPACING_SUFFIXES = ['ctl-h', 'ctl-h-sm', 'ctl-h-lg', 'row-py', 'row-px', 'stack', 'gutter', 'sidebar', 'bar'];

type ThemeGetterLike = ((theme: Record<string, unknown>) => unknown) & { isThemeGetter?: boolean };

function readsSpacingTheme(validator: unknown): boolean {
  if (typeof validator !== 'function' || !(validator as ThemeGetterLike).isThemeGetter) return false;
  const probe = Symbol('spacing-probe');
  return (validator as ThemeGetterLike)({ spacing: probe }) === probe;
}

export function arenaSpacingConsumingGroups(): Record<string, Set<string>> {
  const found: Record<string, Set<string>> = {};
  const classGroups = getDefaultConfig().classGroups as Record<string, readonly unknown[]>;
  for (const [groupId, entries] of Object.entries(classGroups)) {
    for (const entry of entries) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
      for (const [classPart, validators] of Object.entries(entry as Record<string, unknown>)) {
        if (Array.isArray(validators) && validators.some(readsSpacingTheme)) {
          (found[groupId] ??= new Set()).add(classPart);
        }
      }
    }
  }
  return found;
}

type ClassGroupEntries = Record<string, string[]>;

function mergeClassGroup(existingEntries: ClassGroupEntries[] | undefined, generatedEntries: ClassGroupEntries[]): ClassGroupEntries[] {
  const merged: ClassGroupEntries = {};
  for (const entry of [...(existingEntries ?? []), ...generatedEntries]) {
    for (const [classPart, suffixes] of Object.entries(entry)) {
      merged[classPart] = [...new Set([...(merged[classPart] ?? []), ...suffixes])];
    }
  }
  return [merged];
}

const handWritten: Record<string, ClassGroupEntries[]> = {
  shadow: [{ shadow: ['1', '2', '3', 'surface-rest', 'surface-floating', 'surface-deep', 'control-rest', 'control-raised'] }],
  'font-size': [{ text: ['mega', 'hero', 'display', 'h1', 'h2', 'h3', 'h4', 'ctl-lg', 'ctl', 'ctl-md', 'ctl-sm', 'ctl-xs', 'ctl-2xs', 'logo-sm', 'logo-md', 'logo-lg', 'logo-xl'] }],
  rounded: [{ rounded: ['pill', 'surface', 'surface-floating', 'control', 'control-sm', 'field', 'marker'] }],
  z: [{ z: ['nav', 'sheet', 'dropdown', 'tooltip', 'modal', 'modal-nested', 'palette', 'onboarding', 'toast'] }],
  tracking: [{ tracking: ['label', 'field-label', 'column-header', 'badge', 'uppercase-status', 'mono-nav', 'heading'] }],
  leading: [{ leading: ['body', 'ctl', 'loose', 'prose'] }],
  blur: [{ blur: ['scrim'] }],
  size: [{ size: ['icon-sm', 'icon-md', 'icon-lg', 'icon-xl', 'avatar-xs', 'avatar-sm', 'avatar-md', 'avatar-lg', 'logo-mark-sm', 'logo-mark-md', 'logo-mark-lg', 'logo-mark-xl'] }],
  ease: [{ ease: ['emphatic'] }],
  'max-w': [{ 'max-w': ['page'] }],
  'font-weight': [{ font: ['regular', 'heading'] }],
};

const classGroups: Record<string, ClassGroupEntries[]> = { ...handWritten };
for (const [groupId, classParts] of Object.entries(arenaSpacingConsumingGroups())) {
  const generated = [Object.fromEntries([...classParts].map((part) => [part, ARENA_SPACING_SUFFIXES]))];
  classGroups[groupId] = mergeClassGroup(handWritten[groupId], generated);
}

export const arenaTv = createTV({
  twMerge: true,
  twMergeConfig: { classGroups },
});
