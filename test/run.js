'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const color = require('../src/color');
const paletteLib = require('../src/palette');
const registry = require('../src/registry');
const png = require('../src/png');
const plist = require('../src/plist');
const { ansi16 } = require('../src/ansi');

let pass = 0, fail = 0;
const t = (name, fn) => {
  try { fn(); pass++; console.log(`  ok   ${name}`); }
  catch (e) { fail++; console.log(`  FAIL ${name}\n       ${e.message}`); }
};

// ---- colour maths ----
t('parseHex handles # and bare forms', () => {
  assert.deepStrictEqual(color.parseHex('#282a36'), { r: 40, g: 42, b: 54 });
  assert.deepStrictEqual(color.parseHex('282a36'), { r: 40, g: 42, b: 54 });
});
t('parseHex rejects junk', () => {
  assert.throws(() => color.parseHex('#xyz'));
  assert.throws(() => color.parseHex('#fff'));
});
t('contrast is symmetric and bounded', () => {
  assert.strictEqual(Math.round(color.contrast('#000000', '#ffffff') * 100) / 100, 21);
  assert.strictEqual(color.contrast('#282a36', '#f8f8f2'), color.contrast('#f8f8f2', '#282a36'));
  assert.strictEqual(color.contrast('#123456', '#123456'), 1);
});
t('known WCAG value: Dracula fg on bg', () => {
  // Hand-computed from WCAG 2.1: L(fg)=0.934835, L(bg)=0.023733
  // -> (0.984835 / 0.073733) = 13.355
  const r = color.contrast('#f8f8f2', '#282a36');
  assert.ok(Math.abs(r - 13.355) < 0.01, `expected ~13.355, got ${r}`);
});
t('blend endpoints are exact', () => {
  assert.strictEqual(color.blend('#ff0000', '#0000ff', 1), '#ff0000');
  assert.strictEqual(color.blend('#ff0000', '#0000ff', 0), '#0000ff');
});
t('lighten/darken move toward white/black', () => {
  assert.strictEqual(color.lighten('#000000', 1), '#ffffff');
  assert.strictEqual(color.darken('#ffffff', 1), '#000000');
});

// ---- palettes ----
t('every shipped palette validates', () => {
  const slugs = paletteLib.list();
  assert.ok(slugs.length >= 2, 'expected at least 2 palettes');
  for (const s of slugs) paletteLib.load(s);
});
t('validate rejects a missing colour', () => {
  assert.throws(() => paletteLib.validate({ colors: { bg: '#000000' } }, 'x'), /missing colors/);
});
t('validate rejects a bad hex', () => {
  const p = paletteLib.load('dracula');
  const broken = { ...p, colors: { ...p.colors, red: 'nope' } };
  assert.throws(() => paletteLib.validate(broken, 'x'), /not a 6-digit hex/);
});
t('audit flags Dracula comment as below AA', () => {
  const a = paletteLib.audit(paletteLib.load('dracula'));
  assert.ok(a.failing.some((f) => f.key === 'comment'), 'comment should fail 4.5:1');
});
t('Alucard passes AA on every accent', () => {
  const a = paletteLib.audit(paletteLib.load('alucard'));
  assert.strictEqual(a.failing.length, 0, `failing: ${a.failing.map((f) => f.key)}`);
});

// ---- ansi ----
t('ansi16 yields all 16 slots for any palette', () => {
  const keys = ['black','red','green','yellow','blue','magenta','cyan','white',
    'brightBlack','brightRed','brightGreen','brightYellow','brightBlue','brightMagenta','brightCyan','brightWhite'];
  for (const s of paletteLib.list()) {
    const a = ansi16(paletteLib.load(s));
    for (const k of keys) {
      assert.ok(a[k], `${s}: missing ansi.${k}`);
      color.parseHex(a[k]);
    }
  }
});
t('a palette with no ansi block still derives 16 colours', () => {
  const p = paletteLib.load('alucard');
  delete p.ansi;
  const a = ansi16(p);
  assert.ok(a.brightRed && a.brightRed !== a.red);
});

// ---- encoders ----
t('plist writer emits parseable XML', () => {
  const xml = plist.build({ name: 'x', n: 2.5, i: 3, d: plist.data('YWJj') });
  const tmp = path.join(os.tmpdir(), `hues-test-${process.pid}.plist`);
  fs.writeFileSync(tmp, xml);
  execFileSync('/usr/bin/plutil', ['-lint', tmp], { stdio: 'pipe' });
  fs.unlinkSync(tmp);
});
t('plist writer escapes XML metacharacters', () => {
  const xml = plist.build({ name: 'a & b <c>' });
  assert.ok(xml.includes('a &amp; b &lt;c&gt;'));
});
t('png encoder produces a valid signature and size', () => {
  const buf = png.encode(8, 8, () => [255, 0, 0, 255]);
  assert.deepStrictEqual([...buf.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.strictEqual(buf.readUInt32BE(16), 8); // IHDR width
  assert.strictEqual(buf.readUInt32BE(20), 8); // IHDR height
});

// ---- targets ----
t('every target exposes the required shape', () => {
  for (const tg of registry.all()) {
    assert.ok(tg.id, 'missing id');
    assert.strictEqual(typeof tg.label, 'string', `${tg.id}: label`);
    assert.strictEqual(typeof tg.detect, 'function', `${tg.id}: detect`);
    assert.strictEqual(typeof tg.build, 'function', `${tg.id}: build`);
    assert.strictEqual(typeof tg.install, 'function', `${tg.id}: install`);
  }
});
t('every target builds non-empty files for every palette', () => {
  for (const s of paletteLib.list()) {
    const p = paletteLib.load(s);
    for (const tg of registry.all()) {
      if (tg.id === 'terminal-app') continue; // needs AppKit; covered separately
      const files = tg.build(p);
      assert.ok(Array.isArray(files) && files.length, `${tg.id}/${s}: no files`);
      for (const f of files) {
        assert.ok(f.name, `${tg.id}: file without a name`);
        assert.ok(f.content && f.content.length, `${tg.id}/${f.name}: empty`);
      }
    }
  }
});
t('generated JSON targets are parseable', () => {
  const p = paletteLib.load('dracula');
  for (const id of ['chromium', 'vscode', 'zed', 'safari']) {
    const tg = registry.all().find((x) => x.id === id);
    for (const f of tg.build(p)) {
      if (f.name.endsWith('.json')) JSON.parse(f.content.toString());
    }
  }
});
t('vscode theme carries the palette background', () => {
  const p = paletteLib.load('dracula');
  const tg = registry.all().find((x) => x.id === 'vscode');
  const theme = JSON.parse(tg.build(p).find((f) => f.name.endsWith(`${p.slug}.json`)).content);
  assert.strictEqual(theme.colors['editor.background'], p.colors.bg);
  assert.strictEqual(theme.colors['editor.foreground'], p.colors.fg);
});
t('chromium manifest uses 0-255 rgb triples', () => {
  const p = paletteLib.load('dracula');
  const tg = registry.all().find((x) => x.id === 'chromium');
  const mf = JSON.parse(tg.build(p)[0].content);
  for (const [k, v] of Object.entries(mf.theme.colors)) {
    assert.ok(Array.isArray(v) && v.length === 3, `${k}: not a triple`);
    for (const n of v) assert.ok(Number.isInteger(n) && n >= 0 && n <= 255, `${k}: ${n} out of range`);
  }
});
t('vim colorscheme defines Normal and sets colors_name', () => {
  const p = paletteLib.load('dracula');
  const tg = registry.all().find((x) => x.id === 'vim');
  const body = tg.build(p)[0].content;
  assert.ok(/^hi Normal .*guifg=#f8f8f2.*guibg=#282a36/m.test(body));
  assert.ok(body.includes(`let g:colors_name = "${p.slug}"`));
  assert.ok(/^hi Keyword /m.test(body), 'Keyword group missing');
});
t('safari palette.css exposes every custom property', () => {
  const p = paletteLib.load('dracula');
  const tg = registry.all().find((x) => x.id === 'safari');
  const css = tg.build(p).find((f) => f.name.endsWith('palette.css')).content;
  for (const k of ['bg', 'fg', 'comment', 'purple', 'pink', 'cyan']) {
    assert.ok(css.includes(`--hues-${k}:`), `missing --hues-${k}`);
  }
});
t('safari tuned-site CSS includes Claude and readable composer controls', () => {
  const tg = registry.all().find((x) => x.id === 'safari');
  const css = tg.build(paletteLib.load('dracula')).find((f) => f.name.endsWith('styles/sites.css')).content;
  assert.ok(css.includes('[data-hues-site$="claude.ai"]'));
  assert.ok(css.includes('[contenteditable="true"]'));
  assert.ok(css.includes('[data-testid*="send"]'));
});
t('JetBrains theme carries Dracula editor and console colours', () => {
  const tg = registry.all().find((x) => x.id === 'jetbrains');
  const theme = tg.build(paletteLib.load('dracula'))[0].content;
  assert.ok(theme.includes('name="CARET_COLOR" value="F8F8F2"'));
  assert.ok(theme.includes('name="CONSOLE_BACKGROUND_KEY" value="21222C"'));
  assert.ok(theme.includes('name="DEFAULT_KEYWORD"'));
});

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
