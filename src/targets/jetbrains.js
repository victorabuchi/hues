'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseHex } = require('../color');

const APPS = [
  '/Applications/IntelliJ IDEA.app',
  '/Applications/IntelliJ IDEA CE.app',
  '/Applications/IntelliJ IDEA Ultimate.app',
];
const ROOT = path.join(os.homedir(), 'Library', 'Application Support', 'JetBrains');

const rgb = (hex) => {
  const { r, g, b } = parseHex(hex);
  return [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase();
};

const option = (name, value) => `    <option name="${name}" value="${value}" />`;

module.exports = {
  id: 'jetbrains',
  label: 'IntelliJ IDEA / JetBrains IDEs',
  detect: () => APPS.some(fs.existsSync) || fs.existsSync(ROOT),

  build(p) {
    const c = p.colors;
    const attrs = [
      ['TEXT', c.fg, c.bg],
      ['DEFAULT_KEYWORD', c.pink, c.bg],
      ['STRING', c.yellow, c.bg],
      ['NUMBER', c.purple, c.bg],
      ['LINE_COMMENT', c.comment, c.bg],
      ['BLOCK_COMMENT', c.comment, c.bg],
      ['DOC_COMMENT', c.comment, c.bg],
      ['FUNCTION_DECLARATION', c.green, c.bg],
      ['CLASS_NAME', c.cyan, c.bg],
      ['LOCAL_VARIABLE', c.fg, c.bg],
      ['IDENTIFIER', c.fg, c.bg],
    ].map(([name, fg, bg]) => [
      `    <option name="${name}">`,
      '      <value>',
      option('FOREGROUND', rgb(fg)),
      option('BACKGROUND', rgb(bg)),
      '      </value>',
      '    </option>',
    ].join('\n')).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<scheme name="${p.name} (Hues)" version="142" parent_scheme="Darcula">
  <option name="LINE_SPACING" value="1.1" />
  <metaInfo>
    <option name="created">Hues</option>
    <option name="originalScheme">${p.name}</option>
  </metaInfo>
  <option name="EDITOR_FONT_SIZE" value="12" />
  <option name="CONSOLE_LINE_SPACING" value="1.1" />
  <colors>
${option('CARET_COLOR', rgb(c.fg))}
${option('SELECTION_BACKGROUND', rgb(c.selection))}
${option('SELECTION_FOREGROUND', rgb(c.fg))}
${option('CONSOLE_BACKGROUND_KEY', rgb(c.bgDark))}
${option('CONSOLE_FOREGROUND_KEY', rgb(c.fg))}
  </colors>
  <attributes>
${attrs}
  </attributes>
</scheme>
`;
    return [{ name: `${p.slug}.icls`, content: xml }];
  },

  install(p, files, { write, outDir }) {
    const destinations = [];
    if (fs.existsSync(ROOT)) {
      for (const product of fs.readdirSync(ROOT)) {
        const productDir = path.join(ROOT, product);
        if (!fs.statSync(productDir).isDirectory()) continue;
        const colors = path.join(productDir, 'colors');
        fs.mkdirSync(colors, { recursive: true });
        write(files[0], path.join(colors, files[0].name));
        destinations.push(colors);
      }
    }
    if (!destinations.length) write(files[0]);
    return {
      manual: !destinations.length,
      notes: destinations.length
        ? [`installed ${files[0].name} in ${destinations.length} JetBrains configuration director${destinations.length === 1 ? 'y' : 'ies'}`,
           'activate: IntelliJ IDEA -> Settings -> Editor -> Color Scheme']
        : [`staged theme at ${outDir}`, 'copy the .icls file into IntelliJ IDEA -> Settings -> Editor -> Color Scheme'],
    };
  },
  targets: () => [],
};
