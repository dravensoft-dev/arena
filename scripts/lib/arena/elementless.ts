/* Components that render no element of their own, so no vocabulary class has a root to land on:
 * check:api refuses a className on them and build-tailwind emits no class type for them. */

export const OWN_ELEMENTLESS: ReadonlyMap<string, string> = new Map<string, string>([
  ['ArenaTabs', 'it renders a fragment: the tab list and its panels are siblings, so no element is the '
    + 'component\'s own root for a class to land on'],
]);
