'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const baselineLib = require('./baseline');
const iconsLib = require('./icons');

const HOME = os.homedir();
const CODE_CLI = '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code';
const SAFARI_APP = '/Applications/Hues for the Web.app';

const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'pipe', encoding: 'utf8' });
const osa = (s) => run('/usr/bin/osascript', ['-e', s]);

/** Strip a `>>> hues >>>` block from a dotfile. */
function stripBlock(file, start, end) {
  if (!fs.existsSync(file)) return false;
  const s = fs.readFileSync(file, 'utf8');
  const re = new RegExp(`${start}[\\s\\S]*?${end}\\n?`, 'm');
  if (!re.test(s)) return false;
  const out = s.replace(re, '').replace(/\n{3,}/g, '\n\n').trimEnd();
  fs.writeFileSync(file, out ? out + '\n' : '');
  return true;
}

/**
 * Put the machine back the way it was. Each step is independent and reports
 * its own outcome, so one failure never blocks the rest.
 */
function reset({ dryRun = false, removeSafariApp = false } = {}) {
  const base = baselineLib.load();
  const steps = [];
  const add = (name, detail, fn) => {
    if (dryRun) { steps.push({ name, detail, planned: true }); return; }
    try { const r = fn(); steps.push({ name, detail: r || detail, ok: true }); }
    catch (err) { steps.push({ name, detail, ok: false, error: err.message.split('\n')[0] }); }
  };

  if (!base) throw new Error('no baseline recorded; nothing to restore to');

  // 1. app icons
  const themed = iconsLib.listApps().map(iconsLib.probe).filter((a) => a.writable);
  add('app icons', `restore ${themed.length} original icons`, () => {
    let n = 0;
    for (const a of themed) if (iconsLib.clear(a).ok) n++;
    iconsLib.refreshDock();
    return `restored ${n}/${themed.length} original icons`;
  });

  // 2. macOS appearance
  add('macos appearance', 'restore accent, highlight and appearance', () => {
    const m = base.macos || {};
    const set = (key, val, type) => {
      if (val === null || val === undefined) {
        try { run('/usr/bin/defaults', ['delete', '-g', key]); } catch { /* already absent */ }
      } else {
        run('/usr/bin/defaults', ['write', '-g', key, type, String(val)]);
      }
    };
    set('AppleInterfaceStyle', m.AppleInterfaceStyle, '-string');
    set('AppleAccentColor', m.AppleAccentColor, '-int');
    set('AppleHighlightColor', m.AppleHighlightColor, '-string');
    return `appearance=${m.AppleInterfaceStyle || 'Light'}, accent=${m.AppleAccentColor ?? 'default'}`;
  });

  // 3. Terminal.app
  add('terminal.app', 'restore default profile', () => {
    const want = (base.terminal && base.terminal.default) || 'Basic';
    const names = osa('tell application "Terminal" to get name of every settings set').trim();
    if (!names.split(', ').includes(want)) return `baseline profile "${want}" no longer exists; left as is`;
    osa(`tell application "Terminal"
      set default settings to settings set "${want}"
      set startup settings to settings set "${want}"
    end tell`);
    return `default profile back to "${want}"`;
  });

  // 4. VS Code
  add('vscode', 'uninstall theme, restore colorTheme', () => {
    const notes = [];
    if (fs.existsSync(CODE_CLI)) {
      const list = run(CODE_CLI, ['--list-extensions']).split('\n');
      for (const id of list.filter((x) => x.startsWith('hues.'))) {
        run(CODE_CLI, ['--uninstall-extension', id]);
        notes.push(`uninstalled ${id}`);
      }
    }
    const p = baselineLib.CODE_SETTINGS;
    if (fs.existsSync(p)) {
      const s = JSON.parse(fs.readFileSync(p, 'utf8'));
      const want = base.vscode ? base.vscode.colorTheme : null;
      if (want === null || want === undefined) delete s['workbench.colorTheme'];
      else s['workbench.colorTheme'] = want;
      fs.writeFileSync(p, JSON.stringify(s, null, 4) + '\n');
      notes.push(want ? `colorTheme -> "${want}"` : 'colorTheme removed (back to default)');
    }
    return notes.join('; ') || 'nothing to undo';
  });

  // 5. Zed
  add('zed', 'remove theme, restore setting', () => {
    const notes = [];
    const themes = path.join(HOME, '.config', 'zed', 'themes');
    if (fs.existsSync(themes)) {
      for (const f of fs.readdirSync(themes)) {
        const body = fs.readFileSync(path.join(themes, f), 'utf8');
        if (body.includes('(Hues)') || body.includes('Hues')) {
          fs.unlinkSync(path.join(themes, f));
          notes.push(`removed themes/${f}`);
        }
      }
    }
    const p = baselineLib.ZED_SETTINGS;
    if (fs.existsSync(p)) {
      const s = JSON.parse(fs.readFileSync(p, 'utf8'));
      const want = base.zed ? base.zed.theme : null;
      if (want === null || want === undefined) delete s.theme;
      else s.theme = want;
      fs.writeFileSync(p, JSON.stringify(s, null, 2) + '\n');
      notes.push(want ? `theme -> "${want}"` : 'theme removed');
    }
    return notes.join('; ') || 'nothing to undo';
  });

  // 6. vim
  add('vim', 'remove colorscheme and vimrc block', () => {
    const notes = [];
    const colors = path.join(HOME, '.vim', 'colors');
    for (const f of ['dracula.vim', 'dracula_base.vim', 'alucard.vim']) {
      const p = path.join(colors, f);
      if (fs.existsSync(p)) { fs.unlinkSync(p); notes.push(`removed .vim/colors/${f}`); }
    }
    const vimrc = path.join(HOME, '.vimrc');
    if (stripBlock(vimrc, '" >>> hues >>>', '" <<< hues <<<')) notes.push('stripped .vimrc block');
    // We created .vimrc ourselves; if nothing else is left in it, take it away too.
    if (!base.hadVimrc && fs.existsSync(vimrc) && !fs.readFileSync(vimrc, 'utf8').trim()) {
      fs.unlinkSync(vimrc); notes.push('removed .vimrc (we created it)');
    }
    return notes.join('; ') || 'nothing to undo';
  });

  // 7. git
  add('git', 'remove gitconfig block', () => {
    return stripBlock(path.join(HOME, '.gitconfig'), '# >>> hues >>>', '# <<< hues <<<')
      ? 'stripped .gitconfig block' : 'nothing to undo';
  });

  // 8. wallpaper
  add('wallpaper', 'restore original wallpaper', () => {
    if (!base.wallpaper) return 'no baseline wallpaper recorded';
    const src = baselineLib.WALL_COPY;
    if (!fs.existsSync(src)) return 'baseline wallpaper file missing';
    fs.copyFileSync(src, baselineLib.WALL_INDEX);
    try { run('/usr/bin/killall', ['WallpaperAgent']); } catch { /* may not be running */ }
    return 'restored original wallpaper config (WallpaperAgent restarted)';
  });

  // 9. Safari app (opt-in: it is an installed application, not a setting)
  if (removeSafariApp) {
    add('safari app', 'remove the extension app', () => {
      if (!fs.existsSync(SAFARI_APP)) return 'not installed';
      fs.rmSync(SAFARI_APP, { recursive: true, force: true });
      return 'removed /Applications/Hues for the Web.app';
    });
  }

  return { steps, baseline: base, dryRun };
}

module.exports = { reset, SAFARI_APP };
