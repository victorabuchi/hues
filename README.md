# Hues

**One palette. Every app on your Mac.**

Hues takes a single colour definition and generates *native* theme files for
every app you use, installs them, and switches each app over — in one command.

```sh
hues apply dracula
```

```
  applying Dracula

  ✓ chromium       Brave / Chrome (browser theme)
  ✓ git            git (diff/status colors)
  ✓ safari         Safari / browser web extension (recolours websites)
  ✓ terminal-app   Terminal.app
      imported profile "Dracula" into Terminal.app
      set "Dracula" as default + startup profile
  ✓ vim            Vim
  ✓ vscode         Visual Studio Code
  ✓ xcode          Xcode
  ✓ zed            Zed

  restore point: 2026-11-03T19-22-41-dracula
  undo with: hues revert
```

## Why it exists

Most theme projects are a repository per application, each one hand-maintained,
each one installed by hand. That is fine if you want one theme in one editor. It
breaks down the moment you want *your own* colours, because every app has to be
re-themed by hand, forever.

Hues inverts it. The palette is the source of truth; the per-app formats are
generated output. Change one hex value, re-run one command, and every app follows.

## What makes it different

- **A palette is 16 colours.** Write those, get themes for every target. Your own
  palette is a first-class citizen, not a fork of someone else's.
- **It actually installs things.** It writes to the paths each app really reads,
  and flips the app's own setting where the app allows it.
- **Everything is undoable.** Every apply snapshots the files it is about to
  touch. `hues revert` puts them back.
- **It checks your colours.** `hues check` runs a WCAG 2.1 contrast audit, so a
  palette you invented stays readable instead of merely looking nice.
- **It themes the web too.** A generated browser extension recolours the sites
  you actually use, which is the only way to theme Safari at all.
- **It picks your wallpaper.** `--wallpaper auto` ranks a directory of images by
  how closely each one's average colour matches your palette background.

## Install

```sh
curl -fsSL https://raw.githubusercontent.com/victorabuchi/hues/main/install.sh | bash
```

Or from a clone:

```sh
git clone https://github.com/victorabuchi/hues.git && cd hues && npm link
```

Node 18+. macOS only — the installers and the colour conversion are
platform-specific. No npm dependencies.

## Undoing everything

```sh
hues reset              # put the machine back exactly as it was
hues reset --dry-run    # show what that would do, change nothing
```

Before its first change, Hues records a **baseline**: your appearance, accent
and highlight colours, your Terminal profile, your editor themes and your
wallpaper. That file is written once and never overwritten, so `reset` always
knows what "normal" meant on your machine — not merely what the last run did.

`reset` restores app icons, macOS appearance, the Terminal profile, VS Code,
Zed, vim, git and the wallpaper. It does not touch browser themes or extensions
you loaded by hand, because the browser owns those; remove them from each
browser's extensions page. `--remove-app` also deletes the Safari extension app.

To remove Hues itself as well:

```sh
curl -fsSL https://raw.githubusercontent.com/victorabuchi/hues/main/uninstall.sh | bash
```

## Commands

| Command | What it does |
| --- | --- |
| `hues palettes` | List palettes, with swatches |
| `hues targets` | List targets, marking which apps are installed |
| `hues check <palette>` | WCAG 2.1 contrast audit |
| `hues build <palette>` | Generate theme files into `build/` |
| `hues apply <palette>` | Generate, install, and switch apps over |
| `hues icons [--apply\|--clear]` | Recolour app icons through the palette |
| `hues wallpaper <dir> --match <palette>` | Rank wallpapers by palette fit |
| `hues set-wallpaper <image>` | Set the desktop wallpaper |
| `hues snapshots` / `hues revert` | List and undo the last apply |
| `hues reset [--dry-run]` | Put **everything** back: icons, appearance, wallpaper, editors |

Useful flags: `--only vscode,vim` to limit targets, `--all` to include apps that
were not detected, `--no-activate` to install without switching, and
`--wallpaper auto|<path>|off`.

## Targets

| Target | Installs to | Switches itself? |
| --- | --- | --- |
| `vscode` | packaged `.vsix` via the VS Code CLI | yes |
| `terminal-app` | imported profile | yes, default + startup |
| `xcode` | `~/Library/Developer/Xcode/UserData/FontAndColorThemes` | no — Xcode has no CLI for it |
| `vim` | `~/.vim/colors` | yes, via a marked block in `.vimrc` |
| `git` | marked block in `~/.gitconfig` | yes |
| `zed` | `~/.config/zed/themes` | yes |
| `chromium` | staged unpacked theme | no — browsers require a manual load |
| `safari` | staged web extension | no — needs Xcode conversion |
| `iterm` | staged `.itermcolors` | no — manual import |
| `alacritty` | `~/.config/alacritty/themes` | no — needs one `import` line |
| `macos` | `defaults` (appearance, accent, highlight) | yes |

"Switches itself: no" means the app provides no supported way to do it from the
command line. Hues prints the one manual step instead of pretending.

## Writing a palette

Drop a JSON file in `palettes/`:

```json
{
  "name": "Midnight",
  "slug": "midnight",
  "appearance": "dark",
  "colors": {
    "bg": "#11131a", "bgDark": "#0d0f14", "bgDarker": "#090a0e",
    "bgLight": "#1a1d26", "bgLighter": "#242833",
    "fg": "#e8eaf0", "currentLine": "#242833", "selection": "#2e3340",
    "comment": "#7d87a0",
    "cyan": "#7fd6e8", "green": "#8fe388", "orange": "#f0a868",
    "pink": "#f08cc4", "purple": "#b088f9", "red": "#f07878",
    "yellow": "#e8d888"
  }
}
```

Then `hues check midnight` to audit the contrast, and `hues apply midnight`.

An optional `ansi` block pins the 16 terminal colours exactly; without it they
are derived from the palette, which is what lets any palette work in a terminal.

## What cannot be themed on macOS

Linux Dracula screenshots show a themed desktop *shell* — panels, menus, the
dock, the window manager. GNOME exposes that; macOS does not. There is no API
to theme the Dock, menu bar, Finder, or system windows, and no supported way to
add one. The `macos` target sets the three things Apple does expose: appearance,
one of eight fixed accent swatches, and the highlight colour.

Worth noting about those screenshots: the **app icons in them are stock**. Dracula
does not ship recoloured app icons, so nothing in a normal Dracula install
changes them. Hues's `icons` command goes beyond that — it rasterises each
app's real icon and maps every pixel to its nearest palette colour — but it only
works on bundles you can write to, which rules out Apple's apps and anything
owned by root.

## Notes on a few hard parts

**Terminal.app** stores each colour as an `NSKeyedArchiver` blob of an `NSColor`
in Apple's *generic RGB* space, not sRGB. Those primaries are not public, and
approximating them with a gamma curve is off by up to 0.04 per channel on
saturated colours — visible. Hues calls AppKit to do the conversion, which
reproduces the official Dracula profile's bytes to six decimal places.

**VS Code** treats `~/.vscode/extensions/extensions.json` as the authoritative
registry since 1.74. Copying a theme folder in there does nothing, no matter how
often you restart. Hues packages a `.vsix` and installs it through the CLI.

**Safari** extensions cannot be loaded from a folder. The extension has to be
embedded in a native macOS app, signed, and enabled by hand;
`scripts/build-safari-app.sh` does all of that bar the final consent. Note that
Apple's own `safari-web-extension-converter` derives the app's bundle id from
the app name while using `--bundle-identifier` for the extension, so the two
disagree and the build fails until one is patched. The script patches it.

**Safari** has no theming API — it cannot be themed, by anyone. The extension
recolours *web pages*, which is a different thing, and is the reason it also
works in Brave and Chrome.

**Wallpapers** moved to `com.apple.wallpaper/Store/Index.plist` in recent macOS.
Reading the current wallpaper via AppleScript returns `missing value` there, but
setting it still works; Hues verifies the result by decoding that plist.

## Credits

The Dracula and Alucard palettes come from
[Dracula Theme](https://draculatheme.com) (MIT). Hues is independent and not
affiliated with it. The name is the job: a hue is a colour, and this turns one set of them into every theme on the machine.

MIT licensed.
