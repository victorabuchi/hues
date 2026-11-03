'use strict';
const fs = require('fs');
const { execFileSync } = require('child_process');
const { parseHex, contrast } = require('../color');

/**
 * macOS exposes no theming API for the Dock, menu bar or Finder -- the
 * GNOME-style shell theming you see in Linux Dracula screenshots has no
 * equivalent here. What macOS *does* expose is appearance, one of eight fixed
 * accent swatches, and an arbitrary highlight colour. That is this target.
 */

// The eight swatches in System Settings -> Appearance, with their defaults index.
const ACCENTS = [
  { name: 'red', index: 0, hex: '#ff5257' },
  { name: 'orange', index: 1, hex: '#f7821b' },
  { name: 'yellow', index: 2, hex: '#ffc600' },
  { name: 'green', index: 3, hex: '#62ba46' },
  { name: 'blue', index: 4, hex: '#007aff' },
  { name: 'purple', index: 5, hex: '#a550a7' },
  { name: 'pink', index: 6, hex: '#f74f9e' },
  { name: 'graphite', index: -1, hex: '#8c8c8c' },
];

function nearestAccent(hex) {
  const t = parseHex(hex);
  let best = ACCENTS[0], bestD = Infinity;
  for (const a of ACCENTS) {
    const c = parseHex(a.hex);
    // Weighted to track perceived hue rather than raw distance.
    const d = 2 * (t.r - c.r) ** 2 + 4 * (t.g - c.g) ** 2 + 3 * (t.b - c.b) ** 2;
    if (d < bestD) { bestD = d; best = a; }
  }
  return best;
}

const defaultsWrite = (args) => execFileSync('/usr/bin/defaults', args, { stdio: 'pipe' });
const defaultsDelete = (key) => {
  try { execFileSync('/usr/bin/defaults', ['delete', '-g', key], { stdio: 'pipe' }); } catch { /* absent */ }
};

module.exports = {
  id: 'macos',
  label: 'macOS appearance (accent + highlight)',
  detect: () => process.platform === 'darwin',

  build(p) {
    const accent = nearestAccent(p.colors.purple);
    const { r, g, b } = parseHex(p.colors.selection);
    const highlight = `${(r / 255).toFixed(6)} ${(g / 255).toFixed(6)} ${(b / 255).toFixed(6)} ${p.name}`;
    const summary = {
      appearance: p.appearance === 'light' ? 'Light' : 'Dark',
      accent: `${accent.name} (nearest of the 8 fixed swatches to ${p.colors.purple})`,
      highlight: `${p.colors.selection} -> "${highlight}"`,
      note: 'macOS has no API to theme the Dock, menu bar or Finder; these three settings are the whole surface.',
    };
    return [{ name: 'appearance.json', content: JSON.stringify(summary, null, 2) + '\n' }];
  },

  install() {
    return { notes: [] };
  },

  activate(p) {
    const accent = nearestAccent(p.colors.purple);
    const { r, g, b } = parseHex(p.colors.selection);
    const highlight = `${(r / 255).toFixed(6)} ${(g / 255).toFixed(6)} ${(b / 255).toFixed(6)} ${p.name}`;

    if (p.appearance === 'light') defaultsDelete('AppleInterfaceStyle');
    else defaultsWrite(['write', '-g', 'AppleInterfaceStyle', '-string', 'Dark']);

    if (accent.index < 0) defaultsDelete('AppleAccentColor');
    else defaultsWrite(['write', '-g', 'AppleAccentColor', '-int', String(accent.index)]);

    defaultsWrite(['write', '-g', 'AppleHighlightColor', '-string', highlight]);

    return `appearance=${p.appearance === 'light' ? 'Light' : 'Dark'}, accent=${accent.name}, highlight=${p.colors.selection} (log out/in for every app to pick it up)`;
  },

  /** `defaults` lives in a plist we do not rewrite wholesale, so nothing to snapshot by path. */
  targets: () => [],
};
