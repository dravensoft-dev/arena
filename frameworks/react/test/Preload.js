/* The breakpoints are bridged from the generated token file rather than typed
 * here, so no value is duplicated. This flips nothing on its own: happy-dom has
 * a ResizeObserver that never fires, so useArenaContainerWidth's width stays null and
 * every responsive branch stays wide -- a suite wanting the narrow one stubs the
 * observer. Without this, arenaReadBreakpoint() reads '', returns NaN and warns, and
 * `width < NaN` is false, so every suite would assert around a wide-only tree. happy-dom
 * reads the popover attribute and implements neither showPopover nor hidePopover, so both are
 * stubbed where missing with the platform's checks: no popover attribute refuses, a second show
 * or hide of the same state does nothing, and a detached element refuses. Nothing here lays a
 * shown panel out or moves it to a top layer. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register();

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const spacing = readFileSync(join(repo, 'contracts', 'design-generated', 'spacing.generated.css'), 'utf8');
for (const [, name, value] of spacing.matchAll(/(--bp-[a-z]+)\s*:\s*([^;]+);/g)) {
  document.documentElement.style.setProperty(name, value.trim());
}

const showing = new WeakSet();
const popoverValid = (element, name, expectShowing) => {
  if (!element.hasAttribute('popover')) throw new DOMException(`${name}: the element carries no popover attribute`, 'NotSupportedError');
  if (showing.has(element) !== expectShowing) return false;
  if (!element.isConnected) throw new DOMException(`${name}: the element is not in the document`, 'InvalidStateError');
  return true;
};
if (typeof HTMLElement.prototype.showPopover !== 'function') {
  HTMLElement.prototype.showPopover = function showPopover() {
    if (popoverValid(this, 'showPopover', false)) showing.add(this);
  };
  HTMLElement.prototype.hidePopover = function hidePopover() {
    if (popoverValid(this, 'hidePopover', true)) showing.delete(this);
  };
}
