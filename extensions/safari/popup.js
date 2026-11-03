'use strict';
const DEFAULTS = { enabled: true, mode: 'sites', disabledHosts: [] };
const $ = (id) => document.getElementById(id);

let host = '';

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

(async function init() {
  const tab = await activeTab();
  try { host = new URL(tab.url).hostname.replace(/^www\./, ''); } catch { host = ''; }
  $('host').textContent = host || 'no page';
  $('host').className = 'sub host';

  const s = await chrome.storage.local.get(DEFAULTS);
  $('enabled').checked = !!s.enabled;
  $('mode').value = s.mode || 'sites';
  $('site').checked = !(s.disabledHosts || []).includes(host);

  const save = async () => {
    const cur = await chrome.storage.local.get(DEFAULTS);
    const set = new Set(cur.disabledHosts || []);
    if ($('site').checked) set.delete(host); else if (host) set.add(host);
    await chrome.storage.local.set({
      enabled: $('enabled').checked,
      mode: $('mode').value,
      disabledHosts: [...set],
    });
  };

  $('enabled').addEventListener('change', save);
  $('mode').addEventListener('change', save);
  $('site').addEventListener('change', save);
  $('reload').addEventListener('click', async () => {
    await save();
    const t = await activeTab();
    if (t) chrome.tabs.reload(t.id);
    window.close();
  });
})();
