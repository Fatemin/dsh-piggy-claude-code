/**
 * Package contents: every file the published entries reach must be in the
 * tarball. Walks relative imports and `new URL('./…', import.meta.url)` from
 * package.json `main`/`exports`, bin/ and the hook commands, then checks the
 * result against `npm pack --dry-run`. A failure means package.json "files"
 * is missing a runtime path.
 *
 * Run: node --test test/package-files.test.js
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))

const REF = /(?:from\s*|import\s*\(\s*|import\s+|new URL\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g

function reachable(entries) {
  const seen = new Set()
  const walk = file => {
    if (seen.has(file)) return
    seen.add(file)
    if (!/\.m?js$/.test(file) || !existsSync(file)) return
    for (const [, spec] of readFileSync(file, 'utf8').matchAll(REF)) walk(resolve(dirname(file), spec))
  }
  for (const entry of entries) walk(join(ROOT, entry))
  return [...seen].map(file => relative(ROOT, file))
}

function entries() {
  const list = [pkg.main, ...Object.values(pkg.exports)]
  for (const name of readdirSync(join(ROOT, 'bin'))) list.push(join('bin', name))
  const hooks = readFileSync(join(ROOT, 'hooks', 'hooks.json'), 'utf8')
  for (const [, path] of hooks.matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}\/([^"\\]+)/g)) list.push(path)
  return [...new Set(list.map(p => p.replace(/^\.\//, '')))]
}

function packed() {
  const run = spawnSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: ROOT, encoding: 'utf8' })
  assert.equal(run.status, 0, run.stderr)
  return new Set(JSON.parse(run.stdout)[0].files.map(f => f.path))
}

test('npm package ships every file its entries reach', () => {
  const files = packed()
  const covered = path => files.has(path) || [...files].some(f => f.startsWith(path + '/'))
  const missing = [...entries(), ...reachable(entries())].filter(path => !covered(path))
  assert.deepEqual([...new Set(missing)].sort(), [], 'add these to package.json "files"')
})
