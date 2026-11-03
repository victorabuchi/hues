'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

const STATE_DIR = path.join(os.homedir(), '.varjo');
const SNAP_DIR = path.join(STATE_DIR, 'snapshots');

/**
 * A snapshot records every path varjo is about to touch, together with that
 * path's prior contents (or a marker saying it did not exist). `revert`
 * replays the newest snapshot, so an apply is always undoable.
 */
function newSnapshot(label) {
  fs.mkdirSync(SNAP_DIR, { recursive: true });
  const id = new Date().toISOString().replace(/[:.]/g, '-') + '-' + label;
  const dir = path.join(SNAP_DIR, id);
  fs.mkdirSync(dir, { recursive: true });
  return { id, dir, entries: [] };
}

/** Record `target`'s current state into `snap` before it is overwritten. */
function capture(snap, target) {
  const existed = fs.existsSync(target);
  const entry = { target, existed };
  if (existed) {
    const st = fs.statSync(target);
    if (st.isDirectory()) {
      entry.kind = 'dir';
    } else {
      entry.kind = 'file';
      const stored = path.join(snap.dir, 'f' + snap.entries.length + path.extname(target));
      fs.copyFileSync(target, stored);
      entry.stored = path.basename(stored);
    }
  }
  snap.entries.push(entry);
  return entry;
}

function writeSnapshot(snap, meta = {}) {
  const manifest = { id: snap.id, created: new Date().toISOString(), ...meta, entries: snap.entries };
  fs.writeFileSync(path.join(snap.dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return manifest;
}

function listSnapshots() {
  if (!fs.existsSync(SNAP_DIR)) return [];
  return fs.readdirSync(SNAP_DIR)
    .filter((d) => fs.existsSync(path.join(SNAP_DIR, d, 'manifest.json')))
    .sort()
    .map((d) => JSON.parse(fs.readFileSync(path.join(SNAP_DIR, d, 'manifest.json'), 'utf8')));
}

/** Restore a snapshot. Files varjo created (existed:false) are removed. */
function revert(id) {
  const snaps = listSnapshots();
  const snap = id ? snaps.find((s) => s.id === id) : snaps[snaps.length - 1];
  if (!snap) throw new Error('no snapshot to revert');
  const dir = path.join(SNAP_DIR, snap.id);
  const restored = [];
  const removed = [];
  // Reverse order so nested paths unwind correctly.
  for (const e of [...snap.entries].reverse()) {
    if (e.existed && e.kind === 'file') {
      fs.mkdirSync(path.dirname(e.target), { recursive: true });
      fs.copyFileSync(path.join(dir, e.stored), e.target);
      restored.push(e.target);
    } else if (!e.existed && fs.existsSync(e.target)) {
      fs.rmSync(e.target, { recursive: true, force: true });
      removed.push(e.target);
    }
  }
  return { snapshot: snap, restored, removed };
}

module.exports = { newSnapshot, capture, writeSnapshot, listSnapshots, revert, STATE_DIR, SNAP_DIR };
