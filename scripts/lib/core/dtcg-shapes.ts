/* The shape `contracts/design/` holds on disk, so the scripts that walk it agree about it.
 * A node is either a token, which carries `$value`, or a group, which carries children;
 * every walker here tells them apart by exactly that test, over an `Object.entries()` of a
 * `JSON.parse` that hands back `unknown`. That is why a DtcgNode's `$value` is optional and
 * `isToken()` is the test written once. `filePath` and `name` are not DTCG: Style Dictionary
 * stamps them on. `childEntries()` skips the `$`-prefixed keys, which are a node's own
 * metadata rather than its children. `$value` is `any` because `$type` decides its shape
 * and DTCG defines a family of them; the serializers own that knowledge. */

export const ARENA_EXT = 'com.dravensoft.arena';

export type DtcgToken = {
  $value: any;
  $type?: string;
  $description?: string;
  $extensions?: Record<string, any>;
  filePath?: string;
  name?: string;
  path?: string[];
  original?: { $value?: unknown };
};

export type DtcgGroup = {
  $description?: string;
  [child: string]: unknown;
};

export type DtcgNode = Partial<DtcgToken> & DtcgGroup;

export function childEntries(node: DtcgNode): [string, DtcgNode][] {
  return Object.entries(node ?? {})
    .filter(([key, child]) => !key.startsWith('$') && child !== null && typeof child === 'object')
    .map(([key, child]) => [key, child as DtcgNode]);
}

export type StampedToken = DtcgToken & { name: string; filePath: string };

export const isToken = (node: DtcgNode): node is DtcgToken => node.$value !== undefined;

export const isStamped = (token: DtcgToken): token is StampedToken =>
  typeof token.name === 'string' && typeof token.filePath === 'string';
