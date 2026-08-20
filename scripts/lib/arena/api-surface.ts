/* Reads a layer's declared API surface out of source text, by regex. A shape it
 * cannot read THROWS rather than going silently missing from the member list.
 * Three blind spots are dormant against today's corpus and deliberately unfixed: splitTopLevel
 * and braceBody count brackets without string awareness, and classify's index-signature
 * carve-out tests only a literal's FIRST member. A quote-aware scanner is a larger change. */

import { captured } from '../../utils/captures.ts';

export class UnrecognisedShape extends Error {
  constructor(message: string) { super(message); this.name = 'UnrecognisedShape'; }
}

const PRIMITIVES = new Set(['string', 'number', 'boolean']);

export function bindingName(name: string, form: string, layer: string) {
  if (layer !== 'react') return name;
  if (form === 'slot') return name === 'content' ? 'children' : name;
  if (form === 'event') return `on${name.slice(0, 1).toUpperCase()}${name.slice(1)}`;
  return name;
}

const isConsumerData = (ts: string) => ts.trim().replace(/\s+/g, ' ') === 'Record<string, unknown>';

export const PLATFORM_TYPES = [
  'React.CSSProperties', 'CSSProperties',
  'React.Key', 'React.MouseEvent', 'React.HTMLInputTypeAttribute',
  'DOMRect', 'MouseEvent', 'Event', 'HTMLElement', 'unknown', 'any', 'object',
];

function wrapsWhole(ts: string) {
  let depth = 0;
  for (let i = 0; i < ts.length; i += 1) {
    if (ts[i] === '(') depth += 1;
    else if (ts[i] === ')') {
      depth -= 1;
      if (depth === 0) return i === ts.length - 1;
    }
  }
  return false;
}

export function classify(raw: string): { form: string; [detail: string]: any } {
  const ts = raw.trim();
  if (!ts) throw new UnrecognisedShape('empty type annotation');

  if (ts.startsWith('readonly ')) return classify(ts.slice('readonly '.length));

  const arms = splitTopLevel(ts, '|').map((s) => s.trim()).filter(Boolean);
  if (arms.length > 1) {
    const real = arms.filter((a) => a !== 'null' && a !== 'undefined');
    if (real.length > 0 && real.length !== arms.length) return classify(real.join(' | '));
  }

  if (ts.startsWith('(') && ts.endsWith(')') && wrapsWhole(ts)) return classify(ts.slice(1, -1));

  if (ts === 'React.ReactNode' || ts === 'ReactNode') return { form: 'slot' };
  if (PRIMITIVES.has(ts)) return { form: 'primitive', type: ts };

  if (isConsumerData(ts)) return { form: 'consumerData' };
  if (ts.endsWith('[]') && isConsumerData(ts.slice(0, -2))) {
    return { form: 'array', of: 'consumerData' };
  }

  if (PLATFORM_TYPES.includes(ts) || ts.startsWith('Record<') || /^React\./.test(ts)) {
    return { form: 'platform', type: ts };
  }

  if (ts.startsWith('{') && ts.endsWith('}') && !/^\{\s*\[/.test(ts)) {
    return { form: 'platform', type: ts };
  }

  const arrow = /^\(([\s\S]*)\)\s*=>\s*([\s\S]+)$/.exec(ts);
  if (arrow) {

    const returns = captured(arrow, 2).trim();
    if (returns !== 'void') {

      const nonNull = returns.split('|').map((s: string) => s.trim())
        .filter((s: string) => s !== 'null' && s !== 'undefined');
      const retType = nonNull.length === 1 ? classify(nonNull[0] ?? '') : { form: 'union' };
      if (retType.form === 'platform') return retType;
      if (retType.form === 'slot') {
        throw new UnrecognisedShape(
          `a function returning a node is a per-item renderer, and a per-item renderer is not a member: `
          + `the convention that removed ArenaActivityFeed.renderItem removes it too (contracts/api/AGENTS.md). `
          + `It IS a parameterised slot and R3 permits it -- Angular is what does not, because per-item `
          + `projection needs ngTemplateOutlet, which no binding-table row covers and no reader function reads: ${ts}`,
        );
      }
      if (retType.form !== 'primitive' && retType.form !== 'named' && retType.form !== 'enum') {
        throw new UnrecognisedShape(`a functionInput return must be a primitive, enum or named type: ${ts}`);
      }
      const params: Record<string, string> = {};
      for (const part of splitTopLevel(captured(arrow), ',').map((s) => s.trim()).filter(Boolean)) {
        const colon = part.indexOf(':');
        if (colon === -1) throw new UnrecognisedShape(`functionInput parameter has no type: ${ts}`);
        const pType = classify(part.slice(colon + 1));
        if (pType.form === 'platform') return pType;
        if (pType.form === 'slot') {
          throw new UnrecognisedShape(`a functionInput parameter may not be a node: ${ts}`);
        }

        params[part.slice(0, colon).trim()] = pType.type
          ?? (pType.form === 'consumerData' ? 'consumerData' : part.slice(colon + 1).trim());
      }
      return { form: 'functionInput', params, returns: retType.type ?? (nonNull[0] ?? '').trim() };
    }
    const params = captured(arrow).trim();
    if (!params) return { form: 'event', payload: null };

    if (splitTopLevel(params, ',').length > 1) {
      throw new UnrecognisedShape(`an event takes one payload, and this declares more than one parameter: ${ts}`);
    }
    const colon = params.indexOf(':');
    if (colon === -1) throw new UnrecognisedShape(`event parameter has no type annotation: ${ts}`);
    const inner = classify(params.slice(colon + 1));
    if (inner.form === 'platform') return { form: 'event', payload: inner.type, platformPayload: true };

    if (inner.form === 'consumerData') return { form: 'event', payload: 'consumerData' };
    if (inner.form !== 'named' && inner.form !== 'primitive') {
      throw new UnrecognisedShape(`unreadable event payload: ${ts}`);
    }
    return { form: 'event', payload: inner.type };
  }

  const array =/^([\s\S]+)\[\]$/.exec(ts) ?? /^Array<([\s\S]+)>$/.exec(ts);
  if (array) {
    const inner = classify(captured(array).trim());

    if (inner.form === 'union') return inner;

    if (inner.form === 'consumerData') return { form: 'array', of: 'consumerData' };
    if (inner.form !== 'primitive' && inner.form !== 'named') {
      throw new UnrecognisedShape(`unreadable array element type: ${ts}`);
    }
    return { form: 'array', of: inner.type };
  }

  if (ts.includes('|')) {
    const parts = ts.split('|').map((p) => p.trim());
    if (parts.every((p) => /^'[^']*'$/.test(p))) {
      return { form: 'enum', values: parts.map((p) => p.slice(1, -1)) };
    }
    return { form: 'union', parts };
  }

  if (/^[A-Z][A-Za-z0-9]*$/.test(ts)) return { form: 'named', type: ts };
  throw new UnrecognisedShape(`unreadable type annotation: ${ts}`);
}

export function braceBody(source: string, openIndex: number, open = '{', close = '}') {
  let depth = 0;
  for (let i = openIndex; i < source.length; i += 1) {
    if (source[i] === open) depth += 1;
    else if (source[i] === close) {
      depth -= 1;
      if (depth === 0) return source.slice(openIndex + 1, i);
    }
  }
  throw new UnrecognisedShape(`unbalanced ${open}${close}`);
}

function stripComments(text: string) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

function splitTopLevel(text: string, sep: string, { brackets = '(){}[]<>', closeBrace = false } = {}) {
  const parts = [];
  const stack = [];
  let current = '';
  let prev = '';
  for (const ch of text) {
    const at = brackets.indexOf(ch);
    if (at !== -1 && at % 2 === 0) {
      stack.push(ch === '{' && prev === '$' ? 'template' : 'plain');
    } else if (at !== -1 && at % 2 === 1) {
      const kind = stack.pop();
      if (closeBrace && ch === '}' && stack.length === 0 && kind !== 'template') {
        current += ch;
        parts.push(current);
        current = '';
        prev = ch;
        continue;
      }
    }
    if (ch === sep && stack.length === 0) {
      parts.push(current);
      current = '';
      prev = ch;
      continue;
    }
    current += ch;
    prev = ch;
  }
  parts.push(current);
  return parts;
}

export function normaliseDoc(text: string) {
  return text
    .split('\n')
    .map((line) => line.replace(/^\s*\*/, ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function memberDocs(body: string) {
  const docs = new Map();
  const re = /\/\*\*([\s\S]*?)\*\/\s*(?:readonly\s+|protected\s+|public\s+)*([A-Za-z_$][\w$]*)/g;
  for (const match of body.matchAll(re)) docs.set(captured(match, 2), normaliseDoc(captured(match)));
  return docs;
}

export function reactSurface(source: string, interfaceName: string) {
  const decl = new RegExp(`export\\s+interface\\s+${interfaceName}\\b([^{]*)\\{`).exec(source);
  if (!decl) throw new UnrecognisedShape(`no "export interface ${interfaceName}" in this source`);
  const heritage = /extends\s+([^{]+)/.exec(captured(decl));
  const body = braceBody(source, decl.index + decl[0].length - 1);
  return {
    heritage: heritage ? splitTopLevel(captured(heritage), ',').map((h) => h.trim()).filter(Boolean) : [],
    members: interfaceMembers(body),
    docs: memberDocs(body),
  };
}

export function reactImplementation(source: string, componentName: string) {
  const decl = new RegExp(`(?:export\\s+)?function\\s+${componentName}\\s*\\(`).exec(source);
  if (!decl) throw new UnrecognisedShape(`no "function ${componentName}(" in this source -- neither a bare export nor a forwardRef wrapper`);
  const afterParen = source.slice(decl.index + decl[0].length);
  const open = afterParen.search(/\S/);
  if (afterParen[open] !== '{') {
    return { destructures: false, defaults: new Map(), rest: null };
  }
  const body = braceBody(source, decl.index + decl[0].length + open);
  const defaults = new Map();
  let rest = null;
  for (const raw of splitTopLevel(body, ',')) {
    const entry = raw.trim();
    if (!entry) continue;
    if (entry.startsWith('...')) { rest = entry.slice(3).trim(); continue; }
    const named = /^([A-Za-z_$][\w$]*)\s*=\s*([\s\S]+)$/.exec(entry);
    if (named) { defaults.set(captured(named), captured(named, 2).trim()); continue; }
    if (/^[A-Za-z_$][\w$]*$/.test(entry)) { defaults.set(entry, null); continue; }
    throw new UnrecognisedShape(`unreadable destructuring entry in ${componentName}: ${entry}`);
  }
  return { destructures: true, defaults, rest };
}

export function literalValue(raw: string | null) {
  if (raw === null || raw === undefined) return undefined;
  const t = raw.trim();
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  const quoted = /^'([^']*)'$/.exec(t) ?? /^"([^"]*)"$/.exec(t);
  if (quoted) return quoted[1];
  return undefined;
}

export function defaultProblems(
  where: string, member: string, contractDefault: unknown, rawImplementationDefault: string | null,
) {
  const declared = contractDefault !== undefined;
  const implemented = literalValue(rawImplementationDefault);
  if (implemented === undefined) return [];

  if (declared && implemented !== contractDefault) {
    return [`${where}.${member}: the contract declares default ${JSON.stringify(contractDefault)}, the implementation uses ${JSON.stringify(implemented)}.`];
  }
  if (!declared) {
    return [`${where}.${member}: the implementation defaults to ${JSON.stringify(implemented)} and the contract declares no default. A default a consumer can observe and the contract does not name is undocumented API.`];
  }
  return [];
}

function interfaceMembers(body: string) {
  const members: SurfaceMember[] = [];

  for (const raw of splitTopLevel(stripComments(body), ';', { brackets: '(){}[]' })) {
    const text = raw.trim();
    if (!text) continue;
    const m = /^([A-Za-z_$][\w$]*)(\?)?\s*:\s*([\s\S]+)$/.exec(text);
    if (!m) throw new UnrecognisedShape(`unreadable interface member: ${text}`);
    members.push({ name: captured(m), required: !m[2], ...classify(captured(m, 3)) });
  }
  return members;
}

export const IMPERATIVE_HANDLES = new Map([
  ['ArenaInput.focus', 'None of the nine contract forms is imperative, and returning focus to a field '
    + 'after the transaction it belongs to is settled is a gesture no declarative member expresses: '
    + 'autoFocus fires once at mount, and the caller needs it again on every completion. It is a '
    + 'method on the class rather than a member, in both layers, and each layer README says so.'],
  ['ArenaInput.select', 'The same handle, for the case that follows it: focusing a field holding a value '
    + 'the caller expects to be replaced is one keystroke short of useful without it.'],
]);

export function classMembers(source: string, className: string) {
  const decl = new RegExp(`export\\s+class\\s+${className}\\b[^{]*\\{`).exec(source);
  if (!decl) throw new UnrecognisedShape(`no "export class ${className}" in this source`);
  const body = braceBody(source, decl.index + decl[0].length - 1);
  const declared: [string, string][] = [];

  for (const raw of splitTopLevel(stripComments(body), ';', { brackets: '(){}[]', closeBrace: true })) {
    const text = raw.trim();

    if (!text || /^[{}\s]*$/.test(text)) continue;

    if (/^constructor\s*\(/.test(text)) {

      const params = braceBody(text, text.indexOf('('), '(', ')');

      const hasParameterProperty = splitTopLevel(params, ',', { brackets: '(){}[]' })
        .some((p) => /^\s*(public|private|protected|readonly)\b/.test(p));
      if (hasParameterProperty) {
        throw new UnrecognisedShape(
          `constructor uses the parameter-property idiom, which declares a public member the reader does not read: ${text}`,
        );
      }
      continue;
    }
    if (/^(protected|private)\b/.test(text)) continue;
    const method = /^([A-Za-z_$][\w$]*)\s*\(/.exec(text);
    if (method && IMPERATIVE_HANDLES.has(`${className}.${method[1]}`)) continue;
    const m = /^readonly\s+([A-Za-z_$][\w$]*)\s*=\s*([\s\S]+)$/.exec(text);
    if (!m) throw new UnrecognisedShape(`unreadable class member: ${text}`);
    declared.push([captured(m), captured(m, 2)]);
  }
  return { body, declared };
}

export function angularSurface(source: string, className: string) {
  const { body, declared } = classMembers(source, className);
  const members = declared.map(([name, initialiser]) => classMember(name, initialiser));
  return { members: [...members, ...templateSlots(componentTemplate(source))], docs: memberDocs(body) };
}

export function angularImplementation(source: string, className: string) {
  const defaults = new Map<string, string>();
  for (const [name, initialiser] of classMembers(source, className).declared) {
    const initial = inputInitialValue(initialiser);
    if (initial !== null) defaults.set(name, initial);
  }
  return { defaults };
}

export type SurfaceMember = {
  name: string;
  parts?: string[];
  values?: string[];
  form?: string;
  type?: string | null;
  required?: boolean;
  payload?: string | null;
  platformPayload?: boolean;
  of?: string;
  itemForm?: string;
  params?: Record<string, string>;
  returns?: string;
  default?: unknown;
};

function classMember(name: string, initialiser: string): SurfaceMember {
  const init = initialiser.trim();
  const generic = MEMBER_GENERIC.exec(init);
  if (generic) {
    const [, kind, required, type] = generic;
    if (kind === 'output') {
      const inner: { form?: string; type?: string; payload?: null } =
        (type ?? '').trim() === 'void' ? { payload: null } : classify(type ?? '');
      if (inner.form === 'platform') return { name, form: 'event', required: false, payload: inner.type, platformPayload: true };

      if (inner.form === 'consumerData') return { name, form: 'event', required: false, payload: 'consumerData' };
      return { name, form: 'event', required: false, payload: inner.type ?? null };
    }

    const generics = splitTopLevel(type ?? '', ',');
    if (generics.length > 2) {
      throw new UnrecognisedShape(`input${required ? '.required' : ''}<${type}>(...) declares ${generics.length} generics -- Angular's input()/input.required() accept at most two (T, TransformT): ${init}`);
    }
    return { name, required: Boolean(required), ...classify(generics[0] ?? '') };
  }
  if (INPUT_BARE.test(init)) {
    return { name, required: false, ...classify(literalType(inputInitialValue(init) ?? '', name)) };
  }
  throw new UnrecognisedShape(`unreadable member initialiser for "${name}": ${init}`);
}

export const MEMBER_GENERIC = /^(input|output|model)(\.required)?\s*<([\s\S]*)>\s*\(([\s\S]*)\)$/;

export const INPUT_BARE = /^input\s*\(([\s\S]*)\)$/;

export function inputInitialValue(initialiser: string) {
  const init = initialiser.trim();
  const generic = MEMBER_GENERIC.exec(init);
  if (generic) {
    if (generic[1] !== 'input' || generic[2]) return null;
    return firstArgument(captured(generic, 4));
  }
  const bare = INPUT_BARE.exec(init);
  return bare ? firstArgument(captured(bare)) : null;
}

function firstArgument(args: string) {
  const first = (splitTopLevel(args, ',')[0] ?? '').trim();
  return first === '' ? null : first;
}

function literalType(arg: string, name: string) {
  if (/^'[^']*'$/.test(arg) || /^"[^"]*"$/.test(arg)) return 'string';
  if (/^-?\d+(\.\d+)?$/.test(arg)) return 'number';
  if (arg === 'true' || arg === 'false') return 'boolean';
  throw new UnrecognisedShape(`input("${arg}") on "${name}" declares no type — give it a generic`);
}

function componentTemplate(source: string) {
  const decorator = /@Component\s*\(/.exec(source);
  if (!decorator) return '';
  let args;
  try {
    args = braceBody(source, source.indexOf('(', decorator.index), '(', ')');
  } catch {
    return '';
  }
  const template = /template\s*:\s*`([\s\S]*?)`/.exec(args);
  return template ? captured(template) : '';
}

export function templateSlots(source: string) {
  const out: SurfaceMember[] = [];
  for (const m of source.matchAll(/<ng-content\b([^>]*)>/g)) {
    const attrs = captured(m);
    const select = /select\s*=\s*"([^"]*)"/.exec(attrs);
    if (!select) { out.push({ name: 'content', form: 'slot', required: false }); continue; }
    const attribute = /^\[([\w-]+)\]$/.exec(captured(select).trim());
    if (!attribute) {
      throw new UnrecognisedShape(`ng-content select="${select[1]}" is not an attribute selector — see the binding table in contracts/api/AGENTS.md`);
    }
    out.push({ name: captured(attribute), form: 'slot', required: false });
  }
  return out;
}
