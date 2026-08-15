/* The style plugin control, the sibling of theme.js and density.js and read by the same
 * toggle.css.
 *
 * Two positions rather than a cycle, because a build carries a root plugin and the rest are
 * differences: off is what a page with no class on it looks like, on is the one scoped plugin
 * this page loaded. The name is read from the sheet the page links rather than from a list
 * written here, so a plugin the site stops shipping stops being offered instead of becoming a
 * class that resolves to nothing.
 *
 * A page with no #style-plugin button, or one that links no scoped plugin sheet, is left alone
 * entirely: the class is a control's state, and a page with no control has no state to restore.
 *
 * Consumers are notified by an arena:style-plugin event rather than by listening to the button,
 * for the reason density.js says: a module script registers its listener before this classic
 * script does and would otherwise read the state it is about to be told changed.
 */
(function () {
  var KEY = 'draven-style-plugin';
  var SHEET = /style-plugin\.([a-z0-9-]+)\.generated\.css/;
  var ROOT = 'default';

  function scopedIn(href, found) {
    var m = href && SHEET.exec(href);
    if (!m || m[1] === ROOT || found.indexOf(m[1]) >= 0) return;
    found.push(m[1]);
  }

  function declared() {
    var found = [];
    var links = document.querySelectorAll('link[rel="stylesheet"]');
    for (var i = 0; i < links.length; i++) scopedIn(links[i].getAttribute('href'), found);
    var sheets = document.styleSheets;
    for (var s = 0; s < sheets.length; s++) {
      var rules = null;
      try { rules = sheets[s].cssRules; } catch (_) { rules = null; }
      for (var r = 0; rules && r < rules.length; r++) scopedIn(rules[r].href, found);
    }
    return found[0] || null;
  }

  function apply(name, on) {
    document.documentElement.classList.toggle('arena-' + name, on);
    var b = document.getElementById('style-plugin');
    if (b) {
      b.setAttribute('data-plugin', on ? '1' : '0');
      var l = b.querySelector('.tlabel');
      if (l) l.textContent = on ? name : ROOT;
    }
    document.dispatchEvent(new CustomEvent('arena:style-plugin', { detail: { plugin: on ? name : ROOT } }));
  }

  function remember(name, on) {
    var value = on ? name : ROOT;
    try { localStorage.setItem(KEY, value); } catch (_) {}
    var url = new URL(window.location.href);
    url.searchParams.set('plugin', value);
    history.replaceState(null, '', url);
  }

  function chosen(name) {
    var q = new URLSearchParams(window.location.search).get('plugin');
    if (q === name || q === ROOT) return q;
    var stored = null;
    try { stored = localStorage.getItem(KEY); } catch (_) { stored = null; }
    return stored === name ? name : ROOT;
  }

  function start() {
    var name = declared();
    if (!name) return;
    window.__toggleStylePlugin = function () {
      var on = !document.documentElement.classList.contains('arena-' + name);
      remember(name, on);
      apply(name, on);
    };
    var btn = document.getElementById('style-plugin');
    if (!btn) return;
    btn.addEventListener('click', window.__toggleStylePlugin);
    apply(name, chosen(name) === name);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
