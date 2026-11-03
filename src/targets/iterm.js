'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const plist = require('../plist');
const { parseHex } = require('../color');
const { ansi16 } = require('../ansi');

const comp = (hex) => {
  const { r, g, b } = parseHex(hex);
  return {
    'Color Space': 'sRGB',
    'Red Component': +(r / 255).toFixed(10),
    'Green Component': +(g / 255).toFixed(10),
    'Blue Component': +(b / 255).toFixed(10),
    'Alpha Component': 1,
  };
};

module.exports = {
  id: 'iterm',
  label: 'iTerm2',
  detect: () => fs.existsSync('/Applications/iTerm.app'),
  build(p) {
    const c = p.colors;
    const a = ansi16(p);
    const order = [a.black, a.red, a.green, a.yellow, a.blue, a.magenta, a.cyan, a.white,
      a.brightBlack, a.brightRed, a.brightGreen, a.brightYellow, a.brightBlue, a.brightMagenta, a.brightCyan, a.brightWhite];
    const o = {};
    order.forEach((hex, i) => { o[`Ansi ${i} Color`] = comp(hex); });
    Object.assign(o, {
      'Background Color': comp(c.bg),
      'Foreground Color': comp(c.fg),
      'Bold Color': comp(c.fg),
      'Cursor Color': comp(c.fg),
      'Cursor Text Color': comp(c.bg),
      'Selection Color': comp(c.selection),
      'Selected Text Color': comp(c.fg),
      'Link Color': comp(c.cyan),
      'Badge Color': comp(c.red),
    });
    return [{ name: `${p.name}.itermcolors`, content: plist.build(o) }];
  },
  install(p, files, { write, outDir }) {
    write(files[0]);
    return { manual: true, notes: [`staged at ${outDir}`, 'import: iTerm2 -> Settings -> Profiles -> Colors -> Color Presets -> Import'] };
  },
};
