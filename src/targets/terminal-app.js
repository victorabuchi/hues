'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const plist = require('../plist');
const { ansi16 } = require('../ansi');

const SWIFT_HELPER = path.join(__dirname, '..', 'helpers', 'nscolor.swift');

/** hex[] -> base64 NSKeyedArchiver NSColor blobs, via AppKit. */
function archiveColors(hexes) {
  const out = execFileSync('swift', [SWIFT_HELPER, ...hexes], {
    encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
  });
  const lines = out.trim().split('\n');
  if (lines.length !== hexes.length) {
    throw new Error(`nscolor helper returned ${lines.length} blobs for ${hexes.length} colors`);
  }
  return lines;
}

module.exports = {
  id: 'terminal-app',
  label: 'Terminal.app',
  detect: () => fs.existsSync('/System/Applications/Utilities/Terminal.app') ||
                fs.existsSync('/Applications/Utilities/Terminal.app'),

  build(p) {
    const c = p.colors;
    const a = ansi16(p);
    const map = {
      BackgroundColor: c.bg,
      TextColor: c.fg,
      TextBoldColor: c.fg,
      SelectionColor: c.selection,
      CursorColor: c.fg,
      ANSIBlackColor: a.black,
      ANSIRedColor: a.red,
      ANSIGreenColor: a.green,
      ANSIYellowColor: a.yellow,
      ANSIBlueColor: a.blue,
      ANSIMagentaColor: a.magenta,
      ANSICyanColor: a.cyan,
      ANSIWhiteColor: a.white,
      ANSIBrightBlackColor: a.brightBlack,
      ANSIBrightRedColor: a.brightRed,
      ANSIBrightGreenColor: a.brightGreen,
      ANSIBrightYellowColor: a.brightYellow,
      ANSIBrightBlueColor: a.brightBlue,
      ANSIBrightMagentaColor: a.brightMagenta,
      ANSIBrightCyanColor: a.brightCyan,
      ANSIBrightWhiteColor: a.brightWhite,
    };
    const keys = Object.keys(map);
    const blobs = archiveColors(keys.map((k) => map[k]));

    const profile = { name: p.name, type: 'Window Settings', ProfileCurrentVersion: 2.06 };
    keys.forEach((k, i) => { profile[k] = plist.data(blobs[i]); });

    return [{ name: `${p.name}.terminal`, content: plist.build(profile) }];
  },

  /** Terminal reads imported profiles from its own prefs, so `open` is the install. */
  install(p, files, { write }) {
    const out = write(files[0]);
    execFileSync('/usr/bin/open', [out]);
    return { notes: [`imported profile "${p.name}" into Terminal.app`] };
  },

  activate(p) {
    const script = `tell application "Terminal"
      set default settings to settings set "${p.name}"
      set startup settings to settings set "${p.name}"
    end tell`;
    execFileSync('/usr/bin/osascript', ['-e', script]);
    return `set "${p.name}" as default + startup profile`;
  },
};
