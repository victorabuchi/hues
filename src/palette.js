'use strict';
const fs = require('fs');
const path = require('path');
const { contrast, parseHex } = require('./color');

const PALETTE_DIR = path.join(__dirname, '..', 'palettes');

const REQUIRED = [
  'bg', 'bgDark', 'bgDarker', 'bgLight', 'bgLighter', 'fg',
  'currentLine', 'selection', 'comment',
  'cyan', 'green', 'orange', 'pink', 'purple', 'red', 'yellow',
];

function list() {
  if (!fs.existsSync(PALETTE_DIR)) return [];
  return fs.readdirSync(PALETTE_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
    .sort();
}

function load(slug) {
  const file = path.join(PALETTE_DIR, `${slug}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`unknown palette "${slug}". available: ${list().join(', ') || '(none)'}`);
  }
  const p = JSON.parse(fs.readFileSync(file, 'utf8'));
  validate(p, slug);
  return p;
}

function validate(p, slug) {
  if (!p || typeof p !== 'object') throw new Error(`${slug}: palette must be an object`);
  if (!p.colors || typeof p.colors !== 'object') throw new Error(`${slug}: missing "colors"`);
  const missing = REQUIRED.filter((k) => !(k in p.colors));
  if (missing.length) throw new Error(`${slug}: missing colors: ${missing.join(', ')}`);
  for (const [k, v] of Object.entries(p.colors)) {
    try { parseHex(v); } catch { throw new Error(`${slug}: colors.${k} is not a 6-digit hex: ${v}`); }
  }
  if (p.appearance && !['dark', 'light'].includes(p.appearance)) {
    throw new Error(`${slug}: appearance must be "dark" or "light"`);
  }
  return true;
}

/**
 * WCAG 2.1 audit of every accent against the background.
 * Dracula's own claim is 4.5:1 (Level AA) for normal text.
 */
function audit(p, { threshold = 4.5 } = {}) {
  const bg = p.colors.bg;
  const keys = ['fg', 'comment', 'cyan', 'green', 'orange', 'pink', 'purple', 'red', 'yellow'];
  const rows = keys.map((k) => {
    const ratio = contrast(p.colors[k], bg);
    return {
      key: k,
      color: p.colors[k],
      ratio: Math.round(ratio * 100) / 100,
      aa: ratio >= 4.5,
      aaLarge: ratio >= 3.0,
      aaa: ratio >= 7.0,
      pass: ratio >= threshold,
    };
  });
  return { background: bg, threshold, rows, failing: rows.filter((r) => !r.pass) };
}

module.exports = { list, load, validate, audit, REQUIRED, PALETTE_DIR };
