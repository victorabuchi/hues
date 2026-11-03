'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const HELPER = path.join(__dirname, 'helpers', 'appicon.swift');
const APP_DIRS = ['/Applications', path.join(os.homedir(), 'Applications'), '/Applications/Utilities'];

/** Palette entries used for icon quantisation, darkest to lightest. */
const RAMP = ['bgDarker', 'bgDark', 'bg', 'bgLight', 'bgLighter', 'currentLine',
  'comment', 'fg', 'cyan', 'green', 'orange', 'pink', 'purple', 'red', 'yellow'];

function swift(args) {
  try {
    return execFileSync('swift', [HELPER, ...args], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 4 * 1024 * 1024,
    }).trim();
  } catch (err) {
    const out = (err.stdout || '').trim();
    return out || `ERR\t${err.message.split('\n')[0]}`;
  }
}

function listApps() {
  const apps = [];
  for (const dir of APP_DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith('.app')) continue;
      apps.push({ name: name.replace(/\.app$/, ''), path: path.join(dir, name) });
    }
  }
  return apps.sort((a, b) => a.name.localeCompare(b.name));
}

/** Writable bundles only: setting a custom icon writes to the bundle. */
function probe(app) {
  const out = swift(['probe', app.path]);
  const [state] = out.split('\t');
  return { ...app, writable: state === 'writable', reason: state === 'writable' ? null : 'bundle not writable (SIP or owned by root)' };
}

function recolor(app, palette, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const png = path.join(outDir, `${app.name.replace(/[^\w.-]+/g, '_')}.png`);
  const colors = RAMP.map((k) => palette.colors[k]).filter(Boolean);
  const out = swift(['apply', app.path, png, ...colors]);
  if (out.startsWith('OK')) return { ...app, ok: true, png };
  return { ...app, ok: false, error: out.replace(/^ERR\t?/, '') || 'unknown failure' };
}

function clear(app) {
  const out = swift(['clear', app.path]);
  return { ...app, ok: out.startsWith('OK'), error: out.startsWith('OK') ? null : out.replace(/^ERR\t?/, '') };
}

/** Finder and the Dock cache icons; they need a nudge to re-read them. */
function refreshDock() {
  try { execFileSync('/usr/bin/killall', ['Dock'], { stdio: 'ignore' }); } catch { /* not fatal */ }
}

module.exports = { listApps, probe, recolor, clear, refreshDock, RAMP };
