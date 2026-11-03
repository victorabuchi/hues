'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const registry = require('./registry');
const backup = require('./backup');
const wall = require('./wallpaper');

const BUILD_DIR = path.join(__dirname, '..', 'build');

/** Generate every target's files into build/<palette>/<target>/. */
function buildAll(palette, targetIds, { onlyDetected = false } = {}) {
  const results = [];
  for (const t of registry.get(targetIds)) {
    if (onlyDetected && !t.detect()) {
      results.push({ target: t, skipped: 'not installed' });
      continue;
    }
    const outDir = path.join(BUILD_DIR, palette.slug, t.id);
    fs.mkdirSync(outDir, { recursive: true });
    let files;
    try {
      files = t.build(palette);
    } catch (err) {
      results.push({ target: t, error: err.message });
      continue;
    }
    for (const f of files) {
      const dest = path.join(outDir, f.name);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, f.content);
    }
    results.push({ target: t, files, outDir });
  }
  return results;
}

/**
 * Install + activate, recording every touched path in a snapshot first so
 * `hues revert` can put the machine back.
 */
function applyAll(palette, targetIds, { activate = true, onlyDetected = true, wallpaper, wallpaperDir } = {}) {
  const built = buildAll(palette, targetIds, { onlyDetected });
  const snap = backup.newSnapshot(palette.slug);
  const report = [];

  for (const b of built) {
    if (b.skipped || b.error) { report.push(b); continue; }
    const t = b.target;
    const notes = [];

    // Snapshot anything the target declares it will modify in place.
    if (typeof t.targets === 'function') {
      for (const p of t.targets()) backup.capture(snap, p);
    }

    const write = (file, dest) => {
      const target = dest || path.join(b.outDir, file.name);
      if (dest) backup.capture(snap, dest);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, file.content);
      return target;
    };
    const run = (cmd, args, opts = {}) =>
      execFileSync(cmd, args, { stdio: 'pipe', encoding: 'utf8', ...opts });

    let res = {};
    try {
      res = t.install(palette, b.files, { write, outDir: b.outDir, run }) || {};
      notes.push(...(res.notes || []));
      if (activate && typeof t.activate === 'function' && !res.manual) {
        notes.push(t.activate(palette, b.files));
      }
      report.push({ target: t, ok: true, manual: !!res.manual, notes });
    } catch (err) {
      report.push({ target: t, ok: false, error: err.message, notes });
    }
  }

  // The wallpaper runs inside the snapshot too, otherwise `revert` would
  // silently leave the desktop changed.
  let wallpaperResult = null;
  if (wallpaper && wallpaper !== 'off') {
    try {
      let img = wallpaper;
      if (wallpaper === 'auto' || wallpaper === true) {
        const dir = wallpaperDir || path.join(require('os').homedir(), 'wallpaper');
        const ranked = wall.rank(wall.describe(wall.scan(dir)), palette);
        if (!ranked.length) throw new Error(`no landscape desktop images found in ${dir}`);
        img = ranked[0].file;
      }
      if (fs.existsSync(wall.INDEX)) backup.capture(snap, wall.INDEX);
      wallpaperResult = { ok: true, file: wall.set(img) };
    } catch (err) {
      wallpaperResult = { ok: false, error: err.message };
    }
  }

  const manifest = backup.writeSnapshot(snap, { palette: palette.slug });
  return { report, snapshot: manifest, wallpaper: wallpaperResult };
}

module.exports = { buildAll, applyAll, BUILD_DIR };
