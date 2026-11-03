'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const plist = require('../plist');
const { parseHex } = require('../color');
const { ansi16 } = require('../ansi');

const THEME_DIR = path.join(os.homedir(), 'Library', 'Developer', 'Xcode', 'UserData', 'FontAndColorThemes');
const FONT = 'SFMono-Regular - 12.0';

/** Xcode stores colors as "r g b a" floats in 0..1. */
const xc = (hex, a = 1) => {
  const { r, g, b } = parseHex(hex);
  return `${(r / 255).toFixed(10)} ${(g / 255).toFixed(10)} ${(b / 255).toFixed(10)} ${a}`;
};

module.exports = {
  id: 'xcode',
  label: 'Xcode',
  detect: () => fs.existsSync('/Applications/Xcode.app'),

  build(p) {
    const c = p.colors;
    const a = ansi16(p);
    const syntax = {
      'xcode.syntax.plain': c.fg,
      'xcode.syntax.comment': c.comment,
      'xcode.syntax.comment.doc': c.comment,
      'xcode.syntax.comment.doc.keyword': c.comment,
      'xcode.syntax.string': c.yellow,
      'xcode.syntax.character': c.purple,
      'xcode.syntax.number': c.purple,
      'xcode.syntax.keyword': c.pink,
      'xcode.syntax.preprocessor': c.orange,
      'xcode.syntax.attribute': c.green,
      'xcode.syntax.identifier.type': c.cyan,
      'xcode.syntax.identifier.type.system': c.cyan,
      'xcode.syntax.identifier.class': c.cyan,
      'xcode.syntax.identifier.class.system': c.cyan,
      'xcode.syntax.identifier.constant': c.purple,
      'xcode.syntax.identifier.constant.system': c.purple,
      'xcode.syntax.identifier.function': c.green,
      'xcode.syntax.identifier.function.system': c.cyan,
      'xcode.syntax.identifier.macro': c.orange,
      'xcode.syntax.identifier.macro.system': c.orange,
      'xcode.syntax.identifier.variable': c.fg,
      'xcode.syntax.identifier.variable.system': c.purple,
      'xcode.syntax.declaration.type': c.cyan,
      'xcode.syntax.declaration.other': c.fg,
      'xcode.syntax.mark': c.comment,
      'xcode.syntax.url': c.cyan,
    };

    const theme = {
      DVTFontAndColorVersion: 1,
      DVTLineSpacing: 1.1,
      DVTSourceTextBackground: xc(c.bg),
      DVTSourceTextInsertionPointColor: xc(c.fg),
      DVTSourceTextSelectionColor: xc(c.selection),
      DVTSourceTextCurrentLineHighlightColor: xc(c.currentLine),
      DVTSourceTextInvisiblesColor: xc(c.comment),
      DVTSourceTextBlockDimBackgroundColor: xc(c.bgDark),
      DVTConsoleTextBackgroundColor: xc(c.bgDark),
      DVTConsoleTextInsertionPointColor: xc(c.fg),
      DVTConsoleDebuggerInputTextColor: xc(c.fg),
      DVTConsoleDebuggerOutputTextColor: xc(c.cyan),
      DVTConsoleDebuggerPromptTextColor: xc(c.pink),
      DVTConsoleExectuableInputTextColor: xc(c.fg),
      DVTConsoleExectuableOutputTextColor: xc(c.green),
      DVTDebuggerInstructionPointerColor: xc(c.purple),
      DVTDebuggerDisabledBreakpointColor: xc(c.comment),
      DVTDebuggerEnabledBreakpointColor: xc(c.red),
      DVTConsoleDebuggerInputTextFont: FONT,
      DVTConsoleDebuggerOutputTextFont: FONT,
      DVTConsoleDebuggerPromptTextFont: FONT,
      DVTConsoleExectuableInputTextFont: FONT,
      DVTConsoleExectuableOutputTextFont: FONT,
      DVTSourceTextSyntaxColors: Object.fromEntries(
        Object.entries(syntax).map(([k, v]) => [k, xc(v)])
      ),
      DVTSourceTextSyntaxFonts: Object.fromEntries(Object.keys(syntax).map((k) => [k, FONT])),
      DVTMarkupTextBackgroundColor: xc(c.bg),
      DVTMarkupTextNormalColor: xc(c.fg),
      DVTMarkupTextCodeColor: xc(a.green),
      DVTMarkupTextLinkColor: xc(c.cyan),
      DVTMarkupTextPrimaryHeadingColor: xc(c.pink),
      DVTMarkupTextSecondaryHeadingColor: xc(c.purple),
      DVTMarkupTextOtherHeadingColor: xc(c.comment),
    };

    return [{ name: `${p.name}.xccolortheme`, content: plist.build(theme) }];
  },

  install(p, files, { write }) {
    fs.mkdirSync(THEME_DIR, { recursive: true });
    const dest = path.join(THEME_DIR, files[0].name);
    write(files[0], dest);
    return {
      notes: [
        `installed ${files[0].name}`,
        'activate: Xcode -> Settings -> Themes -> pick it (Xcode has no CLI for this)',
      ],
    };
  },
  targets: () => [path.join(THEME_DIR)],
};
