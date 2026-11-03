#!/usr/bin/env node
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const paletteLib = require('./palette');
const registry = require('./registry');
const applyLib = require('./apply');
const backup = require('./backup');
const wall = require('./wallpaper');

const C = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
};
const swatch = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `\x1b[48;2;${(n >> 16) & 255};${(n >> 8) & 255};${n & 255}m   \x1b[0m`;
};

function parseArgs(argv) {
  const out = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      out.flags[k] = v === undefined ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true) : v;
    } else out._.push(a);
  }
  return out;
}

const HELP = `
${C.bold('varjo')} -- one palette, themed across every app on the machine.

  varjo palettes                     list palettes
  varjo targets                      list targets and whether the app is installed
  varjo check [palette]              WCAG 2.1 contrast audit of a palette
  varjo build <palette> [--only a,b] generate theme files into build/
  varjo apply <palette> [--only a,b] generate, install and switch apps over
                         [--all]     include targets whose app was not detected
                         [--no-activate]
                         [--wallpaper <path|auto|off>]
  varjo wallpaper <dir> [--match p]  rank wallpapers in a directory by palette fit
  varjo set-wallpaper <image>        set the desktop wallpaper
  varjo snapshots                    list restore points
  varjo revert [id]                  undo an apply (defaults to the newest)
`;

function cmdPalettes() {
  for (const slug of paletteLib.list()) {
    const p = paletteLib.load(slug);
    const bar = ['bg', 'fg', 'cyan', 'green', 'orange', 'pink', 'purple', 'red', 'yellow']
      .map((k) => swatch(p.colors[k])).join('');
    console.log(`  ${C.bold(slug.padEnd(10))} ${bar}  ${C.dim(p.appearance || 'dark')}`);
  }
}

function cmdTargets() {
  for (const t of registry.all()) {
    const on = t.detect();
    console.log(`  ${(on ? C.green('✓') : C.dim('·'))} ${C.bold(t.id.padEnd(14))} ${t.label}${on ? '' : C.dim('  (not installed)')}`);
  }
}

function cmdCheck(slug = 'dracula') {
  const p = paletteLib.load(slug);
  const a = paletteLib.audit(p);
  console.log(`\n  ${C.bold(p.name)} on ${p.colors.bg} -- WCAG 2.1 contrast\n`);
  for (const r of a.rows) {
    const tag = r.aaa ? C.green('AAA') : r.aa ? C.green('AA ') : r.aaLarge ? C.yellow('AA*') : C.red('FAIL');
    console.log(`  ${swatch(r.color)} ${r.key.padEnd(8)} ${String(r.ratio).padStart(5)}:1  ${tag}`);
  }
  console.log(`\n  ${C.dim('AA = 4.5:1 normal text | AA* = 3:1, large text only | AAA = 7:1')}`);
  if (a.failing.length) {
    console.log(`  ${C.yellow(`${a.failing.length} below 4.5:1: ${a.failing.map((f) => f.key).join(', ')}`)}\n`);
  } else console.log(`  ${C.green('all accents pass AA')}\n`);
}

function reportLines(report) {
  for (const r of report) {
    if (r.skipped) { console.log(`  ${C.dim('·')} ${r.target.id.padEnd(14)} ${C.dim(r.skipped)}`); continue; }
    if (r.error) { console.log(`  ${C.red('✗')} ${r.target.id.padEnd(14)} ${C.red(r.error.split('\n')[0])}`); continue; }
    const mark = r.manual ? C.yellow('!') : C.green('✓');
    console.log(`  ${mark} ${r.target.id.padEnd(14)} ${r.target.label}`);
    for (const n of r.notes || []) console.log(`      ${C.dim(n)}`);
  }
}

function cmdBuild(slug, flags) {
  const p = paletteLib.load(slug);
  const only = flags.only ? String(flags.only).split(',') : null;
  const res = applyLib.buildAll(p, only, { onlyDetected: false });
  console.log(`\n  built ${C.bold(p.name)}\n`);
  for (const r of res) {
    if (r.error) console.log(`  ${C.red('✗')} ${r.target.id.padEnd(14)} ${r.error}`);
    else console.log(`  ${C.green('✓')} ${r.target.id.padEnd(14)} ${C.dim(r.files.map((f) => f.name).join(', '))}`);
  }
  console.log(`\n  ${C.dim('output: ' + path.join(applyLib.BUILD_DIR, p.slug))}\n`);
}

function cmdApply(slug, flags) {
  const p = paletteLib.load(slug);
  const only = flags.only ? String(flags.only).split(',') : null;
  console.log(`\n  applying ${C.bold(p.name)}\n`);
  const { report, snapshot } = applyLib.applyAll(p, only, {
    activate: flags.activate !== false && !flags['no-activate'],
    onlyDetected: !flags.all,
  });
  reportLines(report);

  const w = flags.wallpaper;
  if (w && w !== 'off') {
    try {
      let img = w;
      if (w === 'auto' || w === true) {
        const dir = flags['wallpaper-dir'] || path.join(os.homedir(), 'wallpaper');
        const ranked = wall.rank(wall.describe(wall.scan(dir)), p);
        if (!ranked.length) throw new Error(`no landscape desktop images found in ${dir}`);
        img = ranked[0].file;
      }
      const set = wall.set(img);
      console.log(`  ${C.green('✓')} ${'wallpaper'.padEnd(14)} ${C.dim(set)}`);
    } catch (err) {
      console.log(`  ${C.red('✗')} ${'wallpaper'.padEnd(14)} ${C.red(err.message)}`);
    }
  }
  console.log(`\n  ${C.dim('restore point: ' + snapshot.id)}`);
  console.log(`  ${C.dim('undo with: varjo revert')}\n`);
}

function cmdWallpaper(dir, flags) {
  if (!dir) throw new Error('usage: varjo wallpaper <dir> [--match <palette>]');
  const files = wall.scan(dir);
  const described = wall.describe(files);
  console.log(`\n  ${files.length} images in ${dir}\n`);
  if (flags.match) {
    const p = paletteLib.load(flags.match);
    const ranked = wall.rank(described, p);
    console.log(`  best fit for ${C.bold(p.name)} (bg ${p.colors.bg}):\n`);
    for (const r of ranked.slice(0, Number(flags.top) || 10)) {
      console.log(`  ${swatch(r.avg)} ${r.avg}  ${String(`${r.width}x${r.height}`).padEnd(11)} ${C.dim('score ' + r.score)}  ${path.relative(dir, r.file)}`);
    }
    console.log();
  } else {
    for (const d of described.slice(0, 40)) {
      console.log(`  ${d.avg ? swatch(d.avg) : '   '} ${String(`${d.width}x${d.height}`).padEnd(11)} ${path.relative(dir, d.file)}`);
    }
    console.log();
  }
}

function cmdSnapshots() {
  const snaps = backup.listSnapshots();
  if (!snaps.length) return console.log('  no snapshots yet');
  for (const s of snaps) {
    console.log(`  ${C.bold(s.id)}  ${C.dim(`${s.entries.length} paths, palette=${s.palette || '?'}`)}`);
  }
}

function cmdRevert(id) {
  const r = backup.revert(id);
  console.log(`\n  reverted ${C.bold(r.snapshot.id)}`);
  for (const p of r.restored) console.log(`  ${C.green('↩')} restored ${C.dim(p)}`);
  for (const p of r.removed) console.log(`  ${C.yellow('✗')} removed  ${C.dim(p)}`);
  console.log(`\n  ${C.dim('app-level settings (Xcode theme picker, loaded browser themes) are not reverted')}\n`);
}

function main() {
  const { _: pos, flags } = parseArgs(process.argv.slice(2));
  const cmd = pos[0];
  try {
    switch (cmd) {
      case 'palettes': return cmdPalettes();
      case 'targets': return cmdTargets();
      case 'check': return cmdCheck(pos[1]);
      case 'build': if (!pos[1]) throw new Error('usage: varjo build <palette>'); return cmdBuild(pos[1], flags);
      case 'apply': if (!pos[1]) throw new Error('usage: varjo apply <palette>'); return cmdApply(pos[1], flags);
      case 'wallpaper': return cmdWallpaper(pos[1], flags);
      case 'set-wallpaper': {
        if (!pos[1]) throw new Error('usage: varjo set-wallpaper <image>');
        console.log(`  set wallpaper: ${wall.set(pos[1])}`);
        return;
      }
      case 'snapshots': return cmdSnapshots();
      case 'revert': return cmdRevert(pos[1]);
      case undefined: case 'help': case '--help': case '-h': return console.log(HELP);
      default: throw new Error(`unknown command "${cmd}" -- try: varjo help`);
    }
  } catch (err) {
    console.error(`\n  ${C.red('error')} ${err.message}\n`);
    process.exit(1);
  }
}

main();
