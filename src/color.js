'use strict';

function parseHex(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) throw new Error(`invalid hex color: ${hex}`);
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

const toHex = ({ r, g, b }) =>
  '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

/** sRGB channel (0-255) -> linear light (0-1). */
function linearize(c) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2.1 relative luminance. */
function luminance(hex) {
  const { r, g, b } = parseHex(hex);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/** WCAG 2.1 contrast ratio between two colors (1..21). */
function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Blend `fg` over `bg` at `alpha` (0..1) and return an opaque hex. */
function blend(fg, bg, alpha) {
  const f = parseHex(fg);
  const b = parseHex(bg);
  return toHex({
    r: f.r * alpha + b.r * (1 - alpha),
    g: f.g * alpha + b.g * (1 - alpha),
    b: f.b * alpha + b.b * (1 - alpha),
  });
}

function mix(a, b, t = 0.5) {
  return blend(a, b, 1 - t);
}

/** Lighten/darken toward white/black by `amount` (0..1). */
const lighten = (hex, amount) => blend('#ffffff', hex, amount);
const darken = (hex, amount) => blend('#000000', hex, amount);

/** "#282a36" -> "40 42 54" (for CSS/manifest consumers). */
function rgbTriplet(hex) {
  const { r, g, b } = parseHex(hex);
  return `${r} ${g} ${b}`;
}

function rgbArray(hex) {
  const { r, g, b } = parseHex(hex);
  return [r, g, b];
}

module.exports = {
  parseHex, toHex, luminance, contrast, blend, mix,
  lighten, darken, rgbTriplet, rgbArray,
};
