// Read-only diagnostic snapshot. Never fetches, writes, or takes a lock.
// A snapshot, not a gate: warnings exit 0 but set preflight_pass=false.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const DEADLINE = Date.now() + 12_000

function git(...args) {
  const left = DEADLINE - Date.now()
  if (left <= 0) return { ok: false, out: '', err: 'deadline' }
  const r = spawnSync('git', ['-C', ROOT, ...args], { encoding: 'utf8', timeout: Math.min(left, 5000) })
  return { ok: r.status === 0, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() }
}

export function parseWorktrees(text) {
  return text.split(/\n\n+/).filter(Boolean).map((block) => {
    const w = { path: '', branch: null, head: '', detached: false, locked: false }
    for (const line of block.split('\n')) {
      if (line.startsWith('worktree ')) w.path = line.slice(9)
      else if (line.startsWith('HEAD ')) w.head = line.slice(5)
      else if (line.startsWith('branch ')) w.branch = line.slice(7).replace('refs/heads/', '')
      else if (line === 'detached') w.detached = true
      else if (line.startsWith('locked')) w.locked = true
    }
    return w
  })
}

export function collect() {
  const warnings = []
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD')
  const head = git('rev-parse', '--short', 'HEAD')
  const status = git('status', '--porcelain')
  const dirty = status.ok ? status.out.split('\n').filter(Boolean) : null
  const hasOrigin = git('remote', 'get-url', 'origin')
  let divergence = 'unknown'
  if (hasOrigin.ok) {
    const d = git('rev-list', '--left-right', '--count', 'main...origin/main')
    if (d.ok) {
      const [localOnly, originOnly] = d.out.split(/\s+/).map(Number)
      divergence = { local_only: localOnly, origin_only: originOnly }
      if (originOnly > 0) warnings.push('origin/main has commits missing locally; integrate them first')
    } else warnings.push('main...origin/main comparison unavailable (unknown)')
  }
  const fetchHead = path.join(git('rev-parse', '--path-format=absolute', '--git-common-dir').out || path.join(ROOT, '.git'), 'FETCH_HEAD')
  let fetchedAt = 'unknown'
  try { fetchedAt = fs.statSync(fetchHead).mtime.toISOString() } catch { warnings.push('tracking freshness unknown (no FETCH_HEAD)') }
  const wt = git('worktree', 'list', '--porcelain')
  const worktrees = wt.ok ? parseWorktrees(wt.out) : []
  if (branch.ok && branch.out !== 'main') warnings.push(`current branch is ${branch.out}, not main`)
  if (dirty === null) warnings.push('git status unavailable (unknown)')
  else if (dirty.length) warnings.push(`${dirty.length} uncommitted path(s): confirm ownership before staging; stage exact paths only`)
  if (worktrees.some((w) => w.locked)) warnings.push('a worktree is locked')
  const hook = fs.existsSync(path.join(ROOT, '.claude', 'settings.json')) && fs.existsSync(path.join(ROOT, 'scripts', 'harness', 'claude-test-consent.mjs'))
  if (!hook) warnings.push('test-consent hook not installed')
  return {
    root: ROOT,
    branch: branch.ok ? branch.out : 'unknown',
    head: head.ok ? head.out : 'unknown',
    dirty_count: dirty ? dirty.length : 'unknown',
    origin_divergence: divergence,
    tracking_freshness: { fetch_head_mtime: fetchedAt },
    worktrees: worktrees.map((w) => ({ path: w.path, branch: w.branch, detached: w.detached, locked: w.locked })),
    test_consent_hook: hook,
    warnings,
    preflight_pass: warnings.length === 0,
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = collect()
  if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2))
  else {
    console.log(`branch ${report.branch} @ ${report.head}, ${report.dirty_count} uncommitted`)
    for (const w of report.warnings) console.log(`warning: ${w}`)
    console.log(`preflight_pass=${report.preflight_pass}`)
  }
}
