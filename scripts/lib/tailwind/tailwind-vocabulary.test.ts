import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compileLayer, escapeClass } from './tailwind-compile.ts';

const VOCABULARY = {
  colour: ['bg-base-100', 'bg-base-200', 'bg-base-300', 'border-base-300', 'border-neutral',
    'text-base-content', 'text-base-content/82', 'text-base-content/62', 'text-base-content/40',
    'bg-base-content/(--level-presence)', 'bg-base-100/30', 'text-neutral', 'bg-primary', 'text-primary',
    'border-primary', 'bg-primary/14',
    'text-primary-content', 'text-secondary', 'text-error', 'border-error', 'bg-error/14',
    'bg-error-fill', 'text-error-content', 'text-success', 'border-success', 'bg-success/16',
    'text-warning', 'border-warning', 'bg-warning/18', 'text-info', 'border-info', 'bg-info/16',
    'bg-scrim', 'backdrop-blur-scrim'],
  spacing: ['p-0.5', 'p-3', 'px-4.5', 'py-3.5', 'gap-1.5', 'gap-2.5', 'mt-4.5', 'size-6', 'size-8',
    'size-10', 'size-14', 'h-ctl-h', 'h-ctl-h-sm', 'h-ctl-h-lg', 'min-w-ctl-h', 'w-ctl-h',
    'py-row-py', 'px-row-px', 'gap-stack', 'p-gutter', 'max-w-page',
    'w-px', 'w-80', 'w-115', 'w-140', 'max-h-80', 'min-h-13', 'min-h-30', 'h-8.5', 'h-5.5'],
  type: ['font-display', 'font-body', 'font-mono', 'text-h1', 'text-h2', 'text-h3', 'text-h4',
    'text-md', 'text-sm', 'text-ctl', 'text-ctl-md', 'text-ctl-sm', 'text-ctl-xs', 'text-ctl-2xs',
    'font-regular', 'font-medium', 'font-semibold', 'font-bold', 'font-extrabold',
    'leading-ctl', 'leading-snug', 'leading-body', 'tracking-tight', 'tracking-normal',
    'tracking-label', 'tracking-field-label', 'tracking-badge', 'tracking-mono-nav',
    'tracking-uppercase-status'],
  effects: ['rounded-xs', 'rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-pill', 'rounded-full',
    'shadow-2', 'shadow-3', 'ease-out', 'ease-in-out',
    'z-modal-nested', 'z-palette', 'z-onboarding'],
  icon: ['size-icon-sm', 'size-icon-md', 'size-icon-lg', 'size-icon-xl',
    'text-[length:var(--icon-sm)]', 'text-[length:var(--icon-md)]',
    'text-[length:var(--icon-lg)]', 'text-[length:var(--icon-xl)]'],
  avatar: ['size-avatar-xs', 'size-avatar-sm', 'size-avatar-md', 'size-avatar-lg',
    'text-[length:calc(var(--avatar-md)*0.4)]',
    'size-[max(calc(var(--sp-1)*2),calc(var(--avatar-md)*0.28))]'],
  derived: ['text-ctl-lg', 'duration-[var(--loop-spin)]',
    'shadow-[inset_0_calc(var(--bw-strong)*-1)_0_var(--crimson)]'],
  unmodelled: ['max-w-[42ch]', 'max-w-[92vw]', 'pt-[12vh]', 'w-[62%]'],
  bracketed: ['border-[length:var(--bw)]', 'border-[length:var(--bw-strong)]',
    'border-b-[length:var(--bw)]', 'duration-[var(--dur-fast)]', 'duration-[var(--dur-mid)]'],
  states: ['hover:bg-base-200', 'hover:text-base-content/82', 'disabled:opacity-45',
    'disabled:cursor-not-allowed', 'border-dashed', 'tabular-nums', 'sr-only'],
};

function compileWith(classes: string[]) {
  const dir = mkdtempSync(join(tmpdir(), 'arena-vocab-'));
  try {
    writeFileSync(join(dir, 'Vocabulary.manifest.json'),
      JSON.stringify({ component: 'Vocabulary', slots: { root: classes.join(' ') } }));
    return compileLayer({ extraSource: join(dir, '*.manifest.json') }).css;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

for (const [family, classes] of Object.entries(VOCABULARY)) {
  test(`every ${family} utility the ledger promises emits a rule`, () => {
    const css = compileWith(classes);
    const missing = classes.filter((c) => !css.includes(`.${escapeClass(c)}`));
    assert.deepEqual(missing, []);
  });
}
