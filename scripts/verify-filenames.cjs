#!/usr/bin/env node
/*
  Filename anomaly guard: fails on files ending with .ts.ts, .tsx.tsx, .js.js
  Skips common output/vendor dirs.
*/
const fs = require('fs');
const path = require('path');

const REPO_ROOT = process.cwd();
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'coverage',
  '.git',
  '.husky',
]);
const BAD_SUFFIXES = [
  /\.ts\.ts$/i,
  /\.tsx\.tsx$/i,
  /\.js\.js$/i,
  /\.jsx\.jsx$/i,
];

/** @param {string} file */
function isBad(file) {
  return BAD_SUFFIXES.some((re) => re.test(file));
}

/** @param {string} dir */
function walk(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.npm')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, out);
    } else if (entry.isFile()) {
      const rel = path.relative(REPO_ROOT, full).replace(/\\/g, '/');
      if (isBad(rel)) out.push(rel);
    }
  }
}

const offenders = [];
walk(REPO_ROOT, offenders);

if (offenders.length > 0) {
  console.error('\nFilename verification failed. Fix the following files:');
  for (const f of offenders) console.error(' -', f);
  process.exit(1);
}

console.log('✅ Filename verification passed');
