'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { blend } = require('../color');
const { ansi16 } = require('../ansi');

const ZED_THEMES = path.join(os.homedir(), '.config', 'zed', 'themes');
const ZED_SETTINGS = path.join(os.homedir(), '.config', 'zed', 'settings.json');

module.exports = {
  id: 'zed',
  label: 'Zed',
  detect: () => fs.existsSync('/Applications/Zed.app') || fs.existsSync(path.join(os.homedir(), '.config', 'zed')),

  build(p) {
    const c = p.colors;
    const a = ansi16(p);
    const dark = p.appearance !== 'light';
    const style = {
      background: c.bg,
      'editor.background': c.bg,
      'editor.foreground': c.fg,
      'editor.gutter.background': c.bg,
      'editor.line_number': c.comment,
      'editor.active_line_number': c.fg,
      'editor.active_line.background': c.currentLine,
      'editor.highlighted_line.background': c.currentLine,
      'elevated_surface.background': c.bgDark,
      'surface.background': c.bgDark,
      'element.background': c.bgLight,
      'element.hover': c.bgLighter,
      'element.selected': c.currentLine,
      'element.active': c.currentLine,
      'ghost_element.hover': c.bgLight,
      'text': c.fg,
      'text.muted': c.comment,
      'text.placeholder': c.comment,
      'text.accent': c.cyan,
      'border': c.bgLighter,
      'border.variant': c.bgLight,
      'border.focused': c.purple,
      'border.selected': c.purple,
      'tab_bar.background': c.bgDarker,
      'tab.active_background': c.bg,
      'tab.inactive_background': c.bgDark,
      'title_bar.background': c.bgDarker,
      'status_bar.background': c.bgDarker,
      'panel.background': c.bgDark,
      'scrollbar.thumb.background': blend(c.comment, c.bg, 0.4),
      'terminal.background': c.bg,
      'terminal.foreground': c.fg,
      'terminal.ansi.black': a.black,
      'terminal.ansi.red': a.red,
      'terminal.ansi.green': a.green,
      'terminal.ansi.yellow': a.yellow,
      'terminal.ansi.blue': a.blue,
      'terminal.ansi.magenta': a.magenta,
      'terminal.ansi.cyan': a.cyan,
      'terminal.ansi.white': a.white,
      'terminal.ansi.bright_black': a.brightBlack,
      'terminal.ansi.bright_red': a.brightRed,
      'terminal.ansi.bright_green': a.brightGreen,
      'terminal.ansi.bright_yellow': a.brightYellow,
      'terminal.ansi.bright_blue': a.brightBlue,
      'terminal.ansi.bright_magenta': a.brightMagenta,
      'terminal.ansi.bright_cyan': a.brightCyan,
      'terminal.ansi.bright_white': a.brightWhite,
      'error': c.red,
      'warning': c.orange,
      'info': c.cyan,
      'success': c.green,
      'created': c.green,
      'modified': c.orange,
      'deleted': c.red,
      syntax: {
        comment: { color: c.comment, font_style: 'italic' },
        string: { color: c.yellow },
        'string.special': { color: c.purple },
        number: { color: c.purple },
        boolean: { color: c.purple },
        constant: { color: c.purple },
        keyword: { color: c.pink },
        operator: { color: c.fg },
        function: { color: c.green },
        type: { color: c.cyan, font_style: 'italic' },
        variable: { color: c.fg },
        'variable.special': { color: c.purple },
        property: { color: c.fg },
        tag: { color: c.pink },
        attribute: { color: c.green, font_style: 'italic' },
        punctuation: { color: c.fg },
        emphasis: { color: c.orange, font_style: 'italic' },
        title: { color: c.purple, font_weight: 700 },
        link_uri: { color: c.cyan },
        link_text: { color: c.orange },
      },
    };

    const theme = {
      $schema: 'https://zed.dev/schema/themes/v0.2.0.json',
      name: `${p.name} (Varjo)`,
      author: 'Varjo',
      themes: [{ name: `${p.name} (Varjo)`, appearance: dark ? 'dark' : 'light', style }],
    };
    return [{ name: `${p.slug}.json`, content: JSON.stringify(theme, null, 2) + '\n' }];
  },

  install(p, files, { write }) {
    fs.mkdirSync(ZED_THEMES, { recursive: true });
    write(files[0], path.join(ZED_THEMES, files[0].name));
    return { notes: [`installed ~/.config/zed/themes/${files[0].name}`] };
  },

  activate(p) {
    let s = {};
    if (fs.existsSync(ZED_SETTINGS)) {
      try { s = JSON.parse(fs.readFileSync(ZED_SETTINGS, 'utf8').replace(/^\s*\/\/.*$/gm, '')); } catch { s = {}; }
    }
    s.theme = `${p.name} (Varjo)`;
    fs.mkdirSync(path.dirname(ZED_SETTINGS), { recursive: true });
    fs.writeFileSync(ZED_SETTINGS, JSON.stringify(s, null, 2) + '\n');
    return `set theme = "${p.name} (Varjo)"`;
  },
  targets: () => [ZED_SETTINGS],
};
