'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { contrast, luminance, parseHex } = require('./color');

const AVG_HELPER = path.join(__dirname, 'helpers', 'avgcolor.swift');
const INDEX = path.join(os.homedir(), 'Library', 'Application Support',
  'com.apple.wallpaper', 'Store', 'Index.plist');
const EXTS = new Set(['.png', '.jpg', '.jpeg', '.heic', '.tif', '.tiff']);

/** Recursively collect images under `dir`. */
function scan(dir, { minWidth = 0 } = {}) {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name.startsWith('.')) continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (EXTS.has(path.extname(e.name).toLowerCase())) out.push(full);
    }
  };
  if (!fs.existsSync(dir)) throw new Error(`no such wallpaper directory: ${dir}`);
  walk(dir);
  return out.sort();
}

/** Average color + dimensions for each image, via CoreImage. */
function describe(files) {
  if (!files.length) return [];
  const out = [];
  // Chunked so the argv stays well under ARG_MAX on large collections.
  for (let i = 0; i < files.length; i += 60) {
    const chunk = files.slice(i, i + 60);
    const res = execFileSync('swift', [AVG_HELPER, ...chunk], {
      encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
    });
    for (const line of res.trim().split('\n')) {
      const [hex, dims, ...rest] = line.split('\t');
      const file = rest.join('\t');
      const [w, h] = dims.split('x').map(Number);
      out.push({ file, avg: hex === 'ERR' ? null : hex, width: w, height: h });
    }
  }
  return out;
}

/**
 * Rank wallpapers by fit to a palette: we want the average color close to
 * the palette background in luminance (so the desktop reads as the same
 * "weight"), and we reject anything too small for the display.
 */
function rank(described, palette, { minWidth = 2560 } = {}) {
  const bg = palette.colors.bg;
  const bgLum = luminance(bg);
  return described
    // Landscape only: the collection mixes in phone wallpapers (e.g. 6000x12000)
    // which pass a width test but are wrong for a desktop.
    .filter((d) => d.avg && d.width >= minWidth && d.width > d.height)
    .map((d) => {
      const lumDelta = Math.abs(luminance(d.avg) - bgLum);
      const a = parseHex(d.avg);
      const b = parseHex(bg);
      const rgbDist = Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2) / 441.67;
      // Luminance match matters more than exact hue for a backdrop.
      const score = lumDelta * 0.7 + rgbDist * 0.3;
      return { ...d, score: Math.round(score * 1000) / 1000, lumDelta: Math.round(lumDelta * 1000) / 1000 };
    })
    .sort((x, y) => x.score - y.score);
}

/** Current wallpaper is not readable on macOS 26+; the Index.plist is the state. */
function backupIndex(snapshotCapture) {
  if (fs.existsSync(INDEX)) snapshotCapture(INDEX);
  return INDEX;
}

function set(file) {
  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) throw new Error(`no such image: ${abs}`);
  // Reading the current picture returns "missing value" on macOS 26+, but
  // setting still works and WallpaperAgent persists it to Index.plist.
  execFileSync('/usr/bin/osascript', [
    '-e', `tell application "System Events" to set picture of every desktop to ${JSON.stringify(abs)}`,
  ]);
  return abs;
}

/** Verify by decoding Index.plist rather than trusting the AppleScript. */
function current() {
  if (!fs.existsSync(INDEX)) return null;
  const xml = execFileSync('/usr/bin/plutil', ['-convert', 'xml1', '-o', '-', INDEX], { encoding: 'utf8' });
  const blobs = [...xml.matchAll(/<data>([\s\S]*?)<\/data>/g)].map((m) => m[1].replace(/\s/g, ''));
  for (const b of blobs) {
    const txt = Buffer.from(b, 'base64').toString('latin1');
    const m = /file:\/\/\/[^\x00]*?\.(?:png|jpg|jpeg|heic|tiff?)/i.exec(txt);
    if (m) return decodeURIComponent(m[0].replace('file://', ''));
  }
  return null;
}

module.exports = { scan, describe, rank, set, current, backupIndex, INDEX };
