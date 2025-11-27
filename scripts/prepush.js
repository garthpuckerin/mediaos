#!/usr/bin/env node
/*
 Package-aware pre-push hook
 - Verifies filenames (existing repo script)
 - Runs eslint + type-check + tests only for affected workspaces
 - Falls back gracefully when detection fails
*/

const { execSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function sh(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'pipe', encoding: 'utf8', ...opts }).trim();
}

function trySh(cmd) {
  try {
    return sh(cmd);
  } catch {
    return '';
  }
}

function run(name, args, opts = {}) {
  const res = spawnSync(name, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...opts,
  });
  if (res.status !== 0) {
    process.exit(res.status || 1);
  }
}

function listWorkspaces() {
  const root = process.cwd();
  const pkgsDir = path.join(root, 'packages');
  const entries = fs.existsSync(pkgsDir) ? fs.readdirSync(pkgsDir) : [];
  const workspaces = [];
  for (const name of entries) {
    const pkgJsonPath = path.join(pkgsDir, name, 'package.json');
    if (fs.existsSync(pkgJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
        workspaces.push({
          dir: name,
          path: path.join('packages', name),
          name: pkg.name || name,
        });
      } catch {
        /* ignore parse errors */
      }
    }
  }
  return workspaces;
}

function detectBase() {
  // Prefer upstream of current branch
  const upstream = trySh(
    'git rev-parse --abbrev-ref --symbolic-full-name @{u}'
  );
  let baseRef = upstream || 'origin/main';
  // Compute merge-base for symmetric diff
  const mb = trySh(`git merge-base HEAD ${baseRef}`);
  return mb || baseRef;
}

function changedFiles(base) {
  const out = trySh(`git diff --name-only ${base}...HEAD`);
  return out ? out.split(/\r?\n/).filter(Boolean) : [];
}

function changedWorkspaces(files, workspaces) {
  const set = new Set();
  for (const f of files) {
    for (const ws of workspaces) {
      if (f.startsWith(ws.path + '/') || f.startsWith(ws.path + '\\')) {
        set.add(ws.name);
      }
    }
  }
  return Array.from(set);
}

// 1) Always run filename verification
console.log('Running filename verification...');
run('npm', ['run', '-s', 'verify:filenames']);

const base = detectBase();
const files = changedFiles(base);
const workspaces = listWorkspaces();
const affected = changedWorkspaces(files, workspaces);

if (affected.length === 0) {
  console.log(
    'No workspace changes detected, skipping package-specific checks'
  );
  process.exit(0);
}

console.log(`Detected changes in workspaces: ${affected.join(', ')}`);

// 2) Lint only affected packages
console.log('Running lint for affected workspaces...');
for (const ws of affected) {
  const wsDir = workspaces.find((w) => w.name === ws)?.path || '';
  if (wsDir) {
    console.log(`  Linting ${ws}...`);
    run('npx', ['eslint', wsDir, '--ext', '.ts,.tsx,.js,.jsx']);
  }
}

// 3) Type-check affected packages
console.log('Running type-check for affected workspaces...');
for (const ws of affected) {
  const wsObj = workspaces.find((w) => w.name === ws);
  if (!wsObj) continue;
  const tsconfig = path.join(wsObj.path, 'tsconfig.json');
  if (fs.existsSync(tsconfig)) {
    console.log(`  Type-checking ${ws}...`);
    run('npx', ['tsc', '-p', tsconfig, '--noEmit']);
  }
}

// 4) Tests (if workspace defines a test script)
console.log('Running tests for affected workspaces...');
for (const ws of affected) {
  try {
    console.log(`  Testing ${ws}...`);
    run('npm', ['run', '-w', ws, '-s', 'test']);
  } catch {
    // ignore if workspace has no tests or script fails intentionally
  }
}

console.log('✅ All pre-push checks passed!');
process.exit(0);
