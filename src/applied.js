'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const STATE_DIR = path.join(os.homedir(), '.hues');
const FILE = path.join(STATE_DIR, 'applied.json');

/**
 * The last configuration Hues put on this machine: which palette, which
 * targets, the wallpaper, and whether icons were recoloured.
 *
 * `reset` deliberately leaves this file alone, which is what makes the reset
 * reversible -- `hues redo` replays exactly what was there before rather than
 * making you remember it.
 */
function load() {
  if (!fs.existsSync(FILE)) return null;
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return null; }
}

function save(patch) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  const cur = load() || {};
  const next = { ...cur, ...patch, updated: new Date().toISOString() };
  fs.writeFileSync(FILE, JSON.stringify(next, null, 2) + '\n');
  return next;
}

/** Record a theme application (not icons -- those go through recordIcons). */
function recordApply({ palette, targets, activate, all, wallpaper }) {
  return save({
    palette,
    targets: targets && targets.length ? targets : null,
    activate: activate !== false,
    all: !!all,
    ...(wallpaper ? { wallpaper } : {}),
  });
}

function recordIcons({ palette, apps }) {
  return save({ icons: { palette, apps, at: new Date().toISOString() } });
}

function clearIcons() {
  return save({ icons: null });
}

module.exports = { load, save, recordApply, recordIcons, clearIcons, FILE };
