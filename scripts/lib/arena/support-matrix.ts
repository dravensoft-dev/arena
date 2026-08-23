/* What a consumer may choose, and how much evidence each answer has. This imports nothing, for
 * the reason package-exclusions.ts imports nothing: the publish guard and the gate both ask it
 * questions in jobs that have not installed anything. The peer ranges live here rather than in
 * the two assemblers because a range written twice is a range that disagrees with itself, and
 * the prose a consumer reads is emitted from this file rather than typed beside it. EVIDENCE is
 * the load-bearing column: a row saying a tool is allowed by the manifest and never exercised is
 * a complete answer, and promoting one without exercising it is the failure this table exists to
 * prevent. Arena builds against React 18 and Angular 22, so those two rows are the only framework
 * versions any suite here has ever run. */

export const EVIDENCE = {
  gate: 'held by a gate',
  suite: "exercised by Arena's own suites",
  verified: 'verified by hand once',
  allowed: 'allowed by the manifest, not exercised',
  refused: 'does not work',
} as const;

export type Evidence = keyof typeof EVIDENCE;

export type Row = { answer: string; evidence: Evidence; note: string };

export type Axis = { axis: string; question: string; neutral: boolean; rows: Row[] };

export const NODE_ENGINE = '>=22';

export const PEERS = {
  react: {
    react: '^18 || ^19',
    'react-dom': '^18 || ^19',
    '@phosphor-icons/web': '^2.1.2',
  },
  angular: {
    '@angular/core': '>=20',
    '@angular/common': '>=20',
    '@angular/platform-browser': '>=20',
    '@angular/cdk': '>=20',
    '@angular/router': '>=20',
    '@phosphor-icons/web': '^2.1.2',
  },
} satisfies Record<string, Record<string, string>>;

export const OPTIONAL_PEERS = {
  react: {},
  angular: { '@angular/router': { optional: true } },
} satisfies Record<string, Record<string, { optional: boolean }>>;

export const BUILT_AGAINST = {
  react: '18',
  angular: '22',
} satisfies Record<string, string>;

export const AXES: Axis[] = [
  {
    axis: 'package-manager',
    question: 'Which package manager installs this?',
    neutral: true,
    rows: [
      { answer: 'npm', evidence: 'verified',
        note: 'the packages declare their peers rather than assuming a flat tree, so no hoisting flag is needed' },
      { answer: 'pnpm', evidence: 'verified',
        note: 'the strict layout is the one worth naming, because it is the one that would break a package assuming otherwise: installed under it, the command still resolves the icon font through the symlinked store' },
      { answer: 'bun', evidence: 'verified',
        note: 'the same install. Bun is also what Arena is built with, which is a fact about Arena rather than a requirement on you' },
      { answer: 'yarn', evidence: 'allowed',
        note: 'nothing here works against it: the peers are declared, there is no install script to trust, and no flat tree is assumed. Nobody has run it, which is why it says allowed rather than yes' },
    ],
  },
  {
    axis: 'runtime',
    question: 'What runs the command?',
    neutral: true,
    rows: [
      { answer: `Node ${NODE_ENGINE}`, evidence: 'gate',
        note: 'the command is a Node program, and that floor is the oldest line Node still supports rather than a capability the command needs' },
      { answer: 'any runner that reaches a Node program', evidence: 'allowed',
        note: 'npx and bunx both reach the same file. No runner is required: the command imports three node modules and no runtime API of its own' },
    ],
  },
  {
    axis: 'module-format',
    question: 'How is the package loaded?',
    neutral: true,
    rows: [
      { answer: 'an ES module import', evidence: 'gate',
        note: 'the package is a module, and every target its exports name resolves to a file that is there' },
      { answer: 'a CommonJS require', evidence: 'refused',
        note: 'there is no require condition and no second build. A project that cannot load a module cannot load this one, and it fails at the first import rather than somewhere later' },
    ],
  },
  {
    axis: 'stylesheet',
    question: 'How does the stylesheet reach the page?',
    neutral: true,
    rows: [
      { answer: 'an import from a module of yours', evidence: 'verified',
        note: 'the idiom this page shows. It is an instruction to a bundler rather than to TypeScript, which is why a project may need a declaration before it typechecks' },
      { answer: 'an @import from a stylesheet of yours', evidence: 'allowed',
        note: 'what the package hands you is a barrel of relative imports, so whatever resolves those resolves all of it' },
      { answer: 'the global styles list a framework CLI takes', evidence: 'allowed',
        note: 'the same file named as a global style rather than imported from a module, which is how a CLI-driven workspace usually takes one' },
      { answer: 'a link element', evidence: 'allowed',
        note: 'this one needs the package directory served as it stands, because the barrel reaches its parts by relative path' },
    ],
  },
  {
    axis: 'bundler',
    question: 'What assembles it?',
    neutral: true,
    rows: [
      { answer: 'any bundler that resolves exports and imports CSS', evidence: 'allowed',
        note: 'nothing in the package is written for one: no raw-text import, no build-time environment global, and nothing compiled at install time' },
      { answer: 'a framework CLI', evidence: 'allowed',
        note: 'where a layer ships in the package format its framework defines, partially compiled, the consumer build finishes it the way it finishes any library it depends on' },
      { answer: 'no bundler at all', evidence: 'allowed',
        note: 'the stylesheets are compiled already and the components are plain modules, so what a project needs is something that resolves a module specifier' },
    ],
  },
  {
    axis: 'framework',
    question: 'Which layer, and which version of it?',
    neutral: false,
    rows: [
      { answer: `React ${BUILT_AGAINST.react}`, evidence: 'suite',
        note: 'the version Arena builds and renders against on every run, server rendering included' },
      { answer: 'React 19', evidence: 'allowed',
        note: 'inside the range the package declares, and not exercised here. Nothing is known against it' },
      { answer: `Angular ${BUILT_AGAINST.angular}`, evidence: 'suite',
        note: 'the version the layer is compiled and tested against, shipped partially compiled so your own build finishes it' },
      { answer: 'Angular 20 or 21', evidence: 'allowed',
        note: 'at or above the floor the package declares, and not exercised here' },
      { answer: 'neither layer', evidence: 'allowed',
        note: 'the tokens, the stylesheets for markup of your own, the behaviour contracts and the command are framework-neutral. What you do not get is a component, so every element is yours to write and yours to hold to a pattern' },
    ],
  },
];

export const PACKAGE_OF: Record<string, string> = {
  react: '@dravensoft/arena-react',
  angular: '@dravensoft/arena-angular',
};

export function cell(text: string) {
  return text.replace(/\|/g, '\\|');
}

export function renderAxis(axis: Axis) {
  const head = `**${axis.question}**\n\n| You may choose | Evidence | What is true |\n|---|---|---|`;
  const rows = axis.rows.map(({ answer, evidence, note }) =>
    `| ${cell(answer)} | ${EVIDENCE[evidence]} | ${cell(note)} |`);
  return [head, ...rows].join('\n');
}

export function renderAxes(axes: Axis[]) {
  return axes.map(renderAxis).join('\n\n');
}

export function renderPeers(layers = Object.keys(PEERS)) {
  const head = '| Package | Peer | Range | Required |\n|---|---|---|---|';
  const rows = layers.flatMap((layer) => {
    const peers = PEERS[layer as keyof typeof PEERS] ?? {};
    const optional = OPTIONAL_PEERS[layer as keyof typeof OPTIONAL_PEERS] ?? {};
    return Object.entries(peers).map(([name, range]) =>
      `| \`${PACKAGE_OF[layer]}\` | \`${name}\` | \`${cell(range)}\` | `
      + `${Object.hasOwn(optional, name) ? 'until you reach what needs it' : 'always'} |`);
  });
  return [head, ...rows].join('\n');
}
