'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const STATE_DIR = path.join(os.homedir(), '.hues');
const FILE = path.join(STATE_DIR, 'baseline.json');
const WALL_COPY = path.join(STATE_DIR, 'baseline-Index.plist');

const WALL_INDEX = path.join(os.homedir(), 'Library', 'Application Support',
  'com.apple.wallpaper', 'Store', 'Index.plist');
const CODE_SETTINGS = path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'settings.json');
const ZED_SETTINGS = path.join(os.homedir(), '.config', 'zed', 'settings.json');

const readDefault = (key) => {
  try {
    return execFileSync('/usr/bin/defaults', ['read', '-g', key], { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch { return null; }
};

const readJson = (p) => {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
};

function terminalSettings() {
  try {
    const out = execFileSync('/usr/bin/osascript', ['-e',
      'tell application "Terminal" to return (name of default settings) & "\\n" & (name of startup settings)',
    ], { encoding: 'utf8', stdio: 'pipe' }).trim().split('\n');
    return { default: out[0] || null, startup: out[1] || out[0] || null };
  } catch { return { default: null, startup: null }; }
}

/**
 * The baseline is what the machine looked like before Hues ever ran. It is
 * written once and never overwritten, because the whole point is to survive
 * every later apply.
 */
function capture({ force = false, seed = null } = {}) {
  if (fs.existsSync(FILE) && !force) return load();
  fs.mkdirSync(STATE_DIR, { recursive: true });

  const code = readJson(CODE_SETTINGS) || {};
  const zed = readJson(ZED_SETTINGS) || {};
  const base = seed || {
    captured: new Date().toISOString(),
    macos: {
      AppleInterfaceStyle: readDefault('AppleInterfaceStyle'),
      AppleAccentColor: readDefault('AppleAccentColor'),
      AppleHighlightColor: readDefault('AppleHighlightColor'),
    },
    terminal: terminalSettings(),
    vscode: { colorTheme: code['workbench.colorTheme'] ?? null },
    zed: { theme: zed.theme ?? null },
    hadVimrc: fs.existsSync(path.join(os.homedir(), '.vimrc')),
    wallpaper: null,
  };

  if (fs.existsSync(WALL_INDEX) && !fs.existsSync(WALL_COPY)) {
    fs.copyFileSync(WALL_INDEX, WALL_COPY);
    base.wallpaper = path.basename(WALL_COPY);
  }

  fs.writeFileSync(FILE, JSON.stringify(base, null, 2) + '\n');
  return base;
}

function load() {
  if (!fs.existsSync(FILE)) return null;
  return JSON.parse(fs.readFileSync(FILE, 'utf8'));
}

module.exports = { capture, load, FILE, WALL_COPY, WALL_INDEX, CODE_SETTINGS, ZED_SETTINGS, STATE_DIR };
