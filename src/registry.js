'use strict';
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'targets');

function all() {
  return fs.readdirSync(DIR)
    .filter((f) => f.endsWith('.js'))
    .map((f) => require(path.join(DIR, f)))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function get(ids) {
  const everything = all();
  if (!ids || !ids.length) return everything;
  const byId = new Map(everything.map((t) => [t.id, t]));
  return ids.map((id) => {
    const t = byId.get(id);
    if (!t) throw new Error(`unknown target "${id}". available: ${everything.map((x) => x.id).join(', ')}`);
    return t;
  });
}

module.exports = { all, get };
