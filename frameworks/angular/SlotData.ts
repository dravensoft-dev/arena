import { Directive, ElementRef, Renderer2, effect, inject, input } from '@angular/core';

@Directive({ selector: '[arenaSlotData]', standalone: true })
export class ArenaSlotAttributes {
  readonly arenaSlotData = input.required<Readonly<Record<string, string>>>();

  private readonly element = inject<ElementRef<Element>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private rendered: readonly string[] = [];

  constructor() {
    effect(() => {
      const next = this.arenaSlotData();
      const host = this.element.nativeElement;
      for (const name of this.rendered) {
        if (!(name in next)) this.renderer.removeAttribute(host, name);
      }
      for (const [name, value] of Object.entries(next)) this.renderer.setAttribute(host, name, value);
      this.rendered = Object.keys(next);
    });
  }
}
