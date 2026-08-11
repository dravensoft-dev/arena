/* The design-extension control, the third sibling of theme.js and density.js.
 *
 * It is not a switch, and that is why it does not draw a knob. Theme and density are two-state
 * questions, so a thumb that slides between two ends says everything there is to say. A voice is
 * an N-state one: the catalogue grows, and a control shaped like a switch would have to be
 * rebuilt the first time a third voice shipped. This one cycles, and draws one dot per voice.
 *
 * The catalogue is READ, never listed here. --arena-extensions is emitted into
 * effects.generated.css by the generator that emits the extension blocks themselves, so a new
 * extension appears in this control the moment its block exists, and a list in this file could
 * only ever lag that one. Every page that draws Arena already loads that sheet, so the value is
 * there at any depth with no fetch. `none` is not in the token and is prepended here: it is the
 * absence of an extension rather than one the build ships, which is also why arena.config.json
 * spells it rather than omitting the field.
 *
 * Where this parts company with density.js: an EXPLICIT choice applies whether or not the page
 * has a control, and a REMEMBERED one applies only where a control exists. density.js leaves a
 * control-less page alone entirely, and the reason it gives is right for a stored preference —
 * silently re-densifying a page nobody asked to. It is wrong for ?extension= in the URL, because
 * a reader who typed it has asked. That distinction is what lets the specimen cards, which carry
 * no dock on purpose, still be compared voice by voice from a link.
 *
 * Consumers hear arena:extension rather than the button, for the reason density.js gives: a
 * module script registers its listener before this classic script runs.
 */
(function () {
  var KEY = 'draven-extension';
  var NONE = 'none';

  function catalogue() {
    var raw = getComputedStyle(document.documentElement).getPropertyValue('--arena-extensions');
    var names = raw.split(',').map(function (n) { return n.trim(); }).filter(Boolean);
    return [NONE].concat(names);
  }

  function label(name) {
    return name === NONE ? 'No extension' : name.charAt(0).toUpperCase() + name.slice(1);
  }

  function apply(name, names) {
    for (var i = 0; i < names.length; i++) {
      if (names[i] === NONE) continue;
      document.documentElement.classList.toggle('arena-' + names[i], names[i] === name);
    }
    var b = document.getElementById('extension');
    if (b) {
      b.setAttribute('data-extension', name);
      b.setAttribute('aria-label', 'Design extension: ' + label(name) + '. Activate to cycle.');
      var l = b.querySelector('.tlabel');
      if (l) l.textContent = label(name);
      var dots = b.querySelectorAll('.cycle i');
      for (var j = 0; j < dots.length; j++) dots[j].classList.toggle('on', names[j] === name);
    }
    document.dispatchEvent(new CustomEvent('arena:extension', { detail: { extension: name } }));
  }

  function remember(name) {
    try { localStorage.setItem(KEY, name); } catch (_) {}
    var url = new URL(window.location.href);
    url.searchParams.set('extension', name);
    history.replaceState(null, '', url);
  }

  function cycle() {
    var names = catalogue();
    var at = names.indexOf(current(names));
    var next = names[(at + 1) % names.length];
    remember(next);
    apply(next, names);
  }

  window.__cycleExtension = cycle;

  function current(names) {
    for (var i = 0; i < names.length; i++) {
      if (names[i] !== NONE && document.documentElement.classList.contains('arena-' + names[i]))
        return names[i];
    }
    return NONE;
  }

  /* A name the build does not ship falls back to none rather than painting a class nothing
   * defines, which is the same answer configProblems gives a consumer who writes one. */
  function known(name, names) {
    return names.indexOf(name) === -1 ? null : name;
  }

  function asked(names) {
    return known(new URLSearchParams(window.location.search).get('extension'), names);
  }

  function stored(names) {
    try { return known(localStorage.getItem(KEY), names); } catch (_) { return null; }
  }

  function dots(btn, names) {
    var host = btn.querySelector('.cycle');
    if (!host) return;
    host.textContent = '';
    for (var i = 0; i < names.length; i++) host.append(document.createElement('i'));
  }

  /* The catalogue arrives with the stylesheet, and styles.css reaches the token files through
   * @import, so a first read can land before the value exists. Retrying is what theme.js does for
   * its own late button; the bound is here so a page that genuinely ships no Arena CSS stops
   * asking instead of polling forever. */
  var tries = 0;

  function start() {
    var names = catalogue();
    if (names.length === 1 && tries++ < 20) return setTimeout(start, 30);

    var btn = document.getElementById('extension');
    var explicit = asked(names);
    if (btn) {
      dots(btn, names);
      btn.addEventListener('click', cycle);
      apply(explicit || stored(names) || NONE, names);
      return;
    }
    if (explicit) apply(explicit, names);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
