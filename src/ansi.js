'use strict';
const { lighten } = require('./color');

/**
 * ANSI 16 for a palette. A palette may pin exact values via an `ansi` block
 * (so a hand-tuned theme stays faithful); anything absent is derived, which
 * is what makes an arbitrary custom palette usable in a terminal.
 */
function ansi16(p) {
  const c = p.colors;
  const base = {
    black: c.bgDark, red: c.red, green: c.green, yellow: c.yellow,
    blue: c.purple, magenta: c.pink, cyan: c.cyan, white: c.fg,
    brightBlack: c.comment,
    brightRed: lighten(c.red, 0.18),
    brightGreen: lighten(c.green, 0.18),
    brightYellow: lighten(c.yellow, 0.18),
    brightBlue: lighten(c.purple, 0.18),
    brightMagenta: lighten(c.pink, 0.18),
    brightCyan: lighten(c.cyan, 0.18),
    brightWhite: lighten(c.fg, 0.35),
  };
  return { ...base, ...(p.ansi || {}) };
}

module.exports = { ansi16 };
