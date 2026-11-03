'use strict';
const DEFAULTS = { enabled: true, mode: 'sites', disabledHosts: [] };

chrome.runtime.onInstalled.addListener(async () => {
  const cur = await chrome.storage.local.get(DEFAULTS);
  await chrome.storage.local.set({ ...DEFAULTS, ...cur });
});
