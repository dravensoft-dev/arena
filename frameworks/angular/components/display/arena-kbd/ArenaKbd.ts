import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { arenaKbdStyles } from './ArenaKbd.variants';
import manifest from './ArenaKbd.classes.generated';
import { ArenaSlotAttributes } from '../../../SlotData';

@Component({
  selector: 'arena-kbd',
  standalone: true,
  imports: [ArenaSlotAttributes],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    <kbd [class]="styles().root()" [arenaSlotData]="styles().$data.root()" [attr.data-arena-part]="parts.root">
      @for (key of caps(); track $index; let first = $first) {
        @if (!first && separator() !== '') {
          <span aria-hidden="true" [class]="styles().separator()" [arenaSlotData]="styles().$data.separator()" [attr.data-arena-part]="parts.separator">{{ separator() }}</span>
        }
        <kbd [class]="styles().key()" [arenaSlotData]="styles().$data.key()" [attr.data-arena-part]="parts.key" [attr.aria-hidden]="spoken() === null ? null : 'true'">{{ key }}</kbd>
      }
      @if (spoken(); as name) {
        <span [class]="styles().name()" [arenaSlotData]="styles().$data.name()" [attr.data-arena-part]="parts.name">{{ name }}</span>
      }
    </kbd>
  `,
})
export class ArenaKbd {
  protected readonly parts = manifest.parts;

  /** One entry per key, in the order pressed, each spelled as the keyboard prints it: "Ctrl", "K", the command glyph. Required, and guarded at runtime after trimming: an empty list, or an entry with nothing on it, is a cap with no key, so the component throws. */
  readonly keys = input.required<readonly string[]>();
  /** Drawn between caps, never before the first. An empty string glues the caps together, as a Mac shortcut is printed. Arena draws it in its own aria-hidden span. */
  readonly separator = input<string, string | undefined>('+', { transform: (value) => value ?? '+' });
  /** What a reader hears instead of the caps, for a combination whose glyphs a screen reader reads badly, such as the command glyph. Present and not blank, the caps are hidden from assistive technology and the label is the one spoken text. Arena maps no glyph to a word, so a cap holding a symbol wants one. */
  readonly label = input<string>();

  protected readonly caps = computed(() => {
    const keys = this.keys();
    if (!keys || keys.length === 0 || keys.some((key) => !key?.trim())) {
      throw new Error('ArenaKbd: `keys` is required, and every entry names a key: an empty list or a blank entry is a cap with nothing on it');
    }
    return keys;
  });

  protected readonly spoken = computed(() => {
    const text = this.label();
    return text?.trim() ? text : null;
  });

  protected readonly styles = computed(() => arenaKbdStyles());
}
