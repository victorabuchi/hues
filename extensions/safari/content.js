'use strict';
/**
 * The stylesheets are injected declaratively by the manifest, which is what
 * avoids a flash of the original colours. This script only decides whether
 * they should apply to this site, by putting a marker attribute on <html>
 * that every rule is scoped to.
 */
const ROOT_ATTR = 'data-hues';

const DEFAULTS = { enabled: true, mode: 'sites', disabledHosts: [] };

function hostOf() {
  try { return location.hostname.replace(/^www\./, ''); } catch { return ''; }
}

function apply({ enabled, mode, disabledHosts }) {
  const host = hostOf();
  const root = document.documentElement;
  if (!enabled || (disabledHosts || []).includes(host)) {
    root.removeAttribute(ROOT_ATTR);
    return;
  }
  // "sites" applies only the hand-tuned per-site rules; "all" also turns on
  // the generic recolour, which is riskier on unknown layouts.
  root.setAttribute(ROOT_ATTR, mode === 'all' ? 'all' : 'sites');
}

chrome.storage.local.get(DEFAULTS, apply);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  chrome.storage.local.get(DEFAULTS, apply);
});
