'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { blend, lighten } = require('../color');
const { ansi16 } = require('../ansi');

const CODE_CLI = '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code';
const SETTINGS = path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'settings.json');

module.exports = {
  id: 'vscode',
  label: 'Visual Studio Code',
  detect: () => fs.existsSync('/Applications/Visual Studio Code.app'),

  build(p) {
    const c = p.colors;
    const a = ansi16(p);
    const dark = p.appearance !== 'light';

    const theme = {
      name: p.name,
      type: dark ? 'dark' : 'light',
      semanticHighlighting: true,
      colors: {
        'editor.background': c.bg,
        'editor.foreground': c.fg,
        'editorLineNumber.foreground': c.comment,
        'editorLineNumber.activeForeground': c.fg,
        'editor.lineHighlightBackground': c.currentLine,
        'editor.selectionBackground': c.selection,
        'editor.selectionHighlightBackground': blend(c.selection, c.bg, 0.6),
        'editor.wordHighlightBackground': blend(c.purple, c.bg, 0.2),
        'editor.findMatchBackground': blend(c.orange, c.bg, 0.45),
        'editor.findMatchHighlightBackground': blend(c.orange, c.bg, 0.22),
        'editorCursor.foreground': c.fg,
        'editorWhitespace.foreground': blend(c.comment, c.bg, 0.5),
        'editorIndentGuide.background1': c.bgLighter,
        'editorIndentGuide.activeBackground1': c.comment,
        'editorBracketMatch.background': c.bgLighter,
        'editorBracketMatch.border': c.purple,
        'sideBar.background': c.bgDark,
        'sideBar.foreground': c.fg,
        'sideBarTitle.foreground': c.fg,
        'sideBarSectionHeader.background': c.bg,
        'activityBar.background': c.bgDarker,
        'activityBar.foreground': c.fg,
        'activityBarBadge.background': c.purple,
        'activityBarBadge.foreground': c.bgDarker,
        'statusBar.background': c.bgDarker,
        'statusBar.foreground': c.fg,
        'statusBar.noFolderBackground': c.bgDarker,
        'statusBar.debuggingBackground': c.red,
        'statusBarItem.remoteBackground': c.purple,
        'statusBarItem.remoteForeground': c.bgDarker,
        'titleBar.activeBackground': c.bgDarker,
        'titleBar.activeForeground': c.fg,
        'titleBar.inactiveBackground': c.bgDarker,
        'titleBar.inactiveForeground': c.comment,
        'tab.activeBackground': c.bg,
        'tab.activeForeground': c.fg,
        'tab.inactiveBackground': c.bgDark,
        'tab.inactiveForeground': c.comment,
        'tab.activeBorderTop': c.purple,
        'tab.border': c.bgDarker,
        'editorGroupHeader.tabsBackground': c.bgDarker,
        'panel.background': c.bg,
        'panel.border': c.bgLighter,
        'panelTitle.activeBorder': c.purple,
        'panelTitle.activeForeground': c.fg,
        'panelTitle.inactiveForeground': c.comment,
        'dropdown.background': c.bgDark,
        'dropdown.foreground': c.fg,
        'dropdown.border': c.bgLighter,
        'input.background': c.bgLight,
        'input.foreground': c.fg,
        'input.border': c.bgLighter,
        'input.placeholderForeground': c.comment,
        'inputOption.activeBorder': c.purple,
        'list.activeSelectionBackground': c.currentLine,
        'list.activeSelectionForeground': c.fg,
        'list.inactiveSelectionBackground': c.bgLight,
        'list.hoverBackground': c.bgLight,
        'list.highlightForeground': c.cyan,
        'button.background': c.purple,
        'button.foreground': c.bgDarker,
        'button.hoverBackground': lighten(c.purple, 0.1),
        'badge.background': c.purple,
        'badge.foreground': c.bgDarker,
        'progressBar.background': c.purple,
        'scrollbarSlider.background': blend(c.comment, c.bg, 0.4),
        'scrollbarSlider.hoverBackground': blend(c.comment, c.bg, 0.6),
        'scrollbarSlider.activeBackground': c.comment,
        'editorWidget.background': c.bgDark,
        'editorWidget.border': c.bgLighter,
        'editorSuggestWidget.background': c.bgDark,
        'editorSuggestWidget.selectedBackground': c.currentLine,
        'editorHoverWidget.background': c.bgDark,
        'editorHoverWidget.border': c.bgLighter,
        'peekViewEditor.background': c.bgDark,
        'peekViewResult.background': c.bgDarker,
        'editorError.foreground': c.red,
        'editorWarning.foreground': c.orange,
        'editorInfo.foreground': c.cyan,
        'editorGutter.addedBackground': c.green,
        'editorGutter.modifiedBackground': c.orange,
        'editorGutter.deletedBackground': c.red,
        'gitDecoration.addedResourceForeground': c.green,
        'gitDecoration.modifiedResourceForeground': c.orange,
        'gitDecoration.deletedResourceForeground': c.red,
        'gitDecoration.untrackedResourceForeground': c.cyan,
        'gitDecoration.ignoredResourceForeground': c.comment,
        'gitDecoration.conflictingResourceForeground': c.pink,
        'terminal.background': c.bg,
        'terminal.foreground': c.fg,
        'terminalCursor.foreground': c.fg,
        'terminal.ansiBlack': a.black,
        'terminal.ansiRed': a.red,
        'terminal.ansiGreen': a.green,
        'terminal.ansiYellow': a.yellow,
        'terminal.ansiBlue': a.blue,
        'terminal.ansiMagenta': a.magenta,
        'terminal.ansiCyan': a.cyan,
        'terminal.ansiWhite': a.white,
        'terminal.ansiBrightBlack': a.brightBlack,
        'terminal.ansiBrightRed': a.brightRed,
        'terminal.ansiBrightGreen': a.brightGreen,
        'terminal.ansiBrightYellow': a.brightYellow,
        'terminal.ansiBrightBlue': a.brightBlue,
        'terminal.ansiBrightMagenta': a.brightMagenta,
        'terminal.ansiBrightCyan': a.brightCyan,
        'terminal.ansiBrightWhite': a.brightWhite,
        focusBorder: c.purple,
        foreground: c.fg,
        descriptionForeground: c.comment,
        errorForeground: c.red,
        'widget.shadow': c.bgDarker,
        'selection.background': c.selection,
      },
      tokenColors: [
        { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: c.comment, fontStyle: 'italic' } },
        { scope: ['string', 'string.quoted', 'punctuation.definition.string'], settings: { foreground: c.yellow } },
        { scope: ['constant.numeric', 'constant.language', 'constant.character'], settings: { foreground: c.purple } },
        { scope: ['keyword', 'storage.type', 'storage.modifier', 'keyword.operator.new'], settings: { foreground: c.pink } },
        { scope: ['keyword.operator'], settings: { foreground: c.fg } },
        { scope: ['entity.name.function', 'support.function', 'meta.function-call.generic'], settings: { foreground: c.green } },
        { scope: ['entity.name.type', 'entity.name.class', 'support.type', 'support.class', 'entity.other.inherited-class'], settings: { foreground: c.cyan, fontStyle: 'italic' } },
        { scope: ['variable', 'meta.definition.variable.name', 'support.variable'], settings: { foreground: c.fg } },
        { scope: ['variable.parameter'], settings: { foreground: c.orange, fontStyle: 'italic' } },
        { scope: ['variable.other.property', 'support.variable.property', 'meta.object-literal.key'], settings: { foreground: c.fg } },
        { scope: ['entity.name.tag'], settings: { foreground: c.pink } },
        { scope: ['entity.other.attribute-name'], settings: { foreground: c.green, fontStyle: 'italic' } },
        { scope: ['support.type.property-name.css', 'support.constant.property-value.css'], settings: { foreground: c.cyan } },
        { scope: ['invalid'], settings: { foreground: c.red } },
        { scope: ['invalid.deprecated'], settings: { foreground: c.orange } },
        { scope: ['markup.heading'], settings: { foreground: c.purple, fontStyle: 'bold' } },
        { scope: ['markup.bold'], settings: { fontStyle: 'bold' } },
        { scope: ['markup.italic'], settings: { fontStyle: 'italic' } },
        { scope: ['markup.inserted'], settings: { foreground: c.green } },
        { scope: ['markup.deleted'], settings: { foreground: c.red } },
        { scope: ['markup.changed'], settings: { foreground: c.orange } },
        { scope: ['markup.inline.raw', 'markup.fenced_code'], settings: { foreground: c.cyan } },
        { scope: ['meta.diff.header', 'meta.diff.range'], settings: { foreground: c.comment } },
      ],
    };

    const pkg = {
      name: `varjo-theme-${p.slug}`,
      displayName: `${p.name} (Varjo)`,
      description: `${p.name} theme generated by Varjo.`,
      version: '1.0.0',
      publisher: 'varjo',
      engines: { vscode: '^1.70.0' },
      categories: ['Themes'],
      contributes: {
        themes: [{
          label: `${p.name} (Varjo)`,
          uiTheme: dark ? 'vs-dark' : 'vs',
          path: `./themes/${p.slug}.json`,
        }],
      },
    };

    return [
      { name: 'package.json', content: JSON.stringify(pkg, null, 2) + '\n' },
      { name: `themes/${p.slug}.json`, content: JSON.stringify(theme, null, 2) + '\n' },
    ];
  },

  /**
   * VS Code 1.74+ treats ~/.vscode/extensions/extensions.json as the
   * authoritative registry, so copying a folder in is silently ignored.
   * The supported path is a packaged .vsix through the CLI.
   */
  install(p, files, { write, outDir, run }) {
    files.forEach((f) => write(f));
    if (!fs.existsSync(CODE_CLI)) {
      return { manual: true, notes: ['VS Code CLI not found; staged only at ' + outDir] };
    }
    run('npx', ['--yes', '@vscode/vsce@3.2.1', 'package', '--allow-missing-repository',
                '--skip-license', '-o', path.join(outDir, 'theme.vsix')], { cwd: outDir });
    run(CODE_CLI, ['--install-extension', path.join(outDir, 'theme.vsix'), '--force']);
    return { notes: [`installed extension varjo.varjo-theme-${p.slug}`] };
  },

  activate(p) {
    const label = `${p.name} (Varjo)`;
    let s = {};
    if (fs.existsSync(SETTINGS)) {
      try { s = JSON.parse(fs.readFileSync(SETTINGS, 'utf8')); } catch { s = {}; }
    }
    s['workbench.colorTheme'] = label;
    fs.mkdirSync(path.dirname(SETTINGS), { recursive: true });
    fs.writeFileSync(SETTINGS, JSON.stringify(s, null, 4) + '\n');
    return `set workbench.colorTheme = "${label}"`;
  },
  targets: () => [SETTINGS],
};
