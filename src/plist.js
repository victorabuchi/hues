'use strict';
/** Minimal XML plist writer -- strings, reals, ints and base64 data only. */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function node(v, indent = '\t') {
  if (v && v.__data) return `${indent}<data>${v.__data}</data>`;
  if (typeof v === 'number') {
    return Number.isInteger(v)
      ? `${indent}<integer>${v}</integer>`
      : `${indent}<real>${v}</real>`;
  }
  if (typeof v === 'boolean') return `${indent}<${v}/>`;
  if (v && typeof v === 'object') {
    const inner = Object.entries(v)
      .map(([k, val]) => `${indent}\t<key>${esc(k)}</key>\n${node(val, indent + '\t')}`)
      .join('\n');
    return `${indent}<dict>\n${inner}\n${indent}</dict>`;
  }
  return `${indent}<string>${esc(v)}</string>`;
}

const data = (b64) => ({ __data: b64 });

function build(obj) {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n' +
    '<plist version="1.0">\n' + node(obj, '') + '\n</plist>\n'
  );
}

module.exports = { build, data };
