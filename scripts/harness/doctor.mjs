// Read-only diagnostic snapshot. Never fetches, writes, or takes a lock.
// A snapshot, not a gate: warnings exit 0 but set preflight_pass=false.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { commonDir, gitOut, isMain, parseWorktrees, repoRoot, worktrees } from './lib/common.mjs'
import { loadConfig } from './lib/config.mjs'
import { readLock } from './lib/lock.mjs'

export { parseWorktrees }

/** Where the user's real save lives (store.js: $DSH_HOME or ~/.dsh, then dsh-pig/state.json). */
function realSave() {
  const home = process.env.DSH_HOME && process.env.DSH_HOME.trim() !== '' ? process.env.DSH_HOME : path.join(os.homedir(), '.dsh')
  const file = path.join(home, 'dsh-pig', 'state.json')
  return { path: file, exists: fs.existsSync(file) }
}

export function collect(root = repoRoot()) {
  const warnings = []
  const { cfg, issues } = loadConfig(root)
  if (issues.length) warnings.push(`harness.config.json: ${issues.join('; ')}`)
  const main = cfg?.main_branch ?? 'main'
  const remote = cfg?.remote ?? 'origin'
  const branch = gitOut(root, ['rev-parse', '--abbrev-ref', 'HEAD']) ?? 'unknown'
  const head = gitOut(root, ['rev-parse', '--short', 'HEAD']) ?? 'unknown'
  const status = gitOut(root, ['status', '--porcelain'])
  const dirty = status === null ? null : status.split('\n').filter(Boolean)
  let divergence = 'unknown'
  if (gitOut(root, ['remote', 'get-url', remote]) !== null) {
    const d = gitOut(root, ['rev-list', '--left-right', '--count', `${main}...${remote}/${main}`])
    if (d) {
      const [localOnly, remoteOnly] = d.split(/\s+/).map(Number)
      divergence = { local_only: localOnly, remote_only: remoteOnly }
      if (remoteOnly > 0) warnings.push(`${remote}/${main} has commits missing locally; integrate them first`)
    } else warnings.push(`${main}...${remote}/${main} comparison unavailable (unknown)`)
  }
  let common = null
  try { common = commonDir(root) } catch { warnings.push('git common dir unknown') }
  let fetchedAt = 'unknown'
  try { fetchedAt = fs.statSync(path.join(common ?? path.join(root, '.git'), 'FETCH_HEAD')).mtime.toISOString() } catch { warnings.push('tracking freshness unknown (no FETCH_HEAD)') }
  const wts = worktrees(root)
  const linked = path.resolve(gitOut(root, ['rev-parse', '--git-dir']) ?? '') !== path.resolve(common ?? '')
  const locks = common ? Object.fromEntries(['integrate', 'release'].map((n) => [n, readLock(common, n)])) : 'unknown'
  for (const [name, lock] of Object.entries(locks === 'unknown' ? {} : locks)) {
    if (lock) warnings.push(`${name} lock held: ${JSON.stringify(lock)}; do not remove it without confirming its owner is gone`)
  }
  if (!linked && branch !== main) warnings.push(`main checkout is on ${branch}, not ${main}`)
  if (dirty === null) warnings.push('git status unavailable (unknown)')
  else if (dirty.length) warnings.push(`${dirty.length} uncommitted path(s): confirm ownership before staging; stage exact paths only`)
  if (wts.some((w) => w.locked)) warnings.push('a worktree is locked')
  const hook = fs.existsSync(path.join(root, '.claude', 'settings.json')) && fs.existsSync(path.join(root, 'scripts', 'harness', 'claude-test-consent.mjs'))
  if (!hook) warnings.push('test-consent hook not installed')
  return {
    root,
    environment_mode: linked ? 'isolated-worktree' : 'main-checkout',
    branch,
    head,
    dirty_count: dirty ? dirty.length : 'unknown',
    origin_divergence: divergence,
    tracking_freshness: { fetch_head_mtime: fetchedAt },
    worktrees: wts.map((w) => ({ path: w.path, branch: w.branch, detached: w.detached, locked: w.locked })),
    locks,
    config: { valid: issues.length === 0, contracts: cfg?.gates?.contracts?.rules?.map((r) => r.id) ?? [] },
    real_save: realSave(),
    test_consent_hook: hook,
    warnings,
    preflight_pass: warnings.length === 0,
  }
}

if (isMain(process.argv[1], import.meta.url)) {
  const report = collect()
  if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2))
  else {
    console.log(`${report.environment_mode}: ${report.branch} @ ${report.head}, ${report.dirty_count} uncommitted`)
    for (const w of report.warnings) console.log(`warning: ${w}`)
    console.log(`preflight_pass=${report.preflight_pass}`)
  }
}
