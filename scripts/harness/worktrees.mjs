// Worktree audit and bounded cleanup (docs/agent/delivery.md §7).
//
//   node scripts/harness/worktrees.mjs audit [--json]
//   node scripts/harness/worktrees.mjs cleanup --execute --confirm <full local main sha> [--json]
//
// `cleanup` without --execute only reports. A candidate is merged into local
// main, clean (no tracked or untracked changes), not locked, not main, not the
// current checkout, and untouched for at least 7 days. Removal is a plain
// `git worktree remove`: never --force, never a branch deletion.
import fs from 'node:fs'
import path from 'node:path'
import { HarnessError, dirtyPaths, finish, git, gitOut, isAncestor, isMain, parseArgs, repoRoot, result, worktrees } from './lib/common.mjs'
import { requireConfig } from './lib/config.mjs'

export const MIN_AGE_DAYS = 7

export function evaluate(root, main, item, { now = Date.now(), current = repoRoot() } = {}) {
  const reasons = []
  const resolved = path.resolve(item.path)
  if (item.branch === main) reasons.push('main checkout')
  if (path.resolve(current) === resolved) reasons.push('current checkout')
  if (item.locked) reasons.push('locked')
  if (item.prunable) reasons.push('prunable (directory gone): run git worktree prune by hand after checking')
  if (!fs.existsSync(resolved)) reasons.push('directory missing')
  const merged = item.head ? isAncestor(root, item.head, main) : false
  if (!merged) reasons.push(item.detached ? 'detached HEAD not in main' : 'not merged into main')
  const dirty = fs.existsSync(resolved) ? dirtyPaths(resolved) : null
  if (dirty === null) reasons.push('status unknown')
  else if (dirty.length) reasons.push(`${dirty.length} uncommitted path(s)`)
  const committedAt = Number(gitOut(root, ['log', '-1', '--format=%ct', item.head || 'HEAD'])) * 1000
  const ageDays = Number.isFinite(committedAt) ? Math.floor((now - committedAt) / 86_400_000) : null
  if (ageDays === null || ageDays < MIN_AGE_DAYS) reasons.push(`last commit ${ageDays ?? '?'} day(s) ago (< ${MIN_AGE_DAYS})`)
  return { path: item.path, branch: item.branch, head: item.head, merged, dirty: dirty?.length ?? null, age_days: ageDays, candidate: reasons.length === 0, reasons }
}

export function audit(root) {
  const cfg = requireConfig(root)
  const items = worktrees(root).map((w) => evaluate(root, cfg.main_branch, w))
  return { cfg, items }
}

if (isMain(process.argv[1], import.meta.url)) {
  try {
    const { flags, positionals } = parseArgs(process.argv.slice(2), ['confirm'])
    const root = repoRoot()
    const { cfg, items } = audit(root)
    const candidates = items.filter((i) => i.candidate)
    if (positionals[0] === 'audit' || (positionals[0] === 'cleanup' && !flags.execute)) {
      finish(result('success', `${items.length} worktree(s), ${candidates.length} removable`,
        candidates.length ? [`to remove them: worktrees.mjs cleanup --execute --confirm $(git rev-parse ${cfg.main_branch})`] : [], { items }))
    }
    if (positionals[0] !== 'cleanup') throw new HarnessError('usage: worktrees.mjs <audit|cleanup> [--execute --confirm <main sha>] [--json]')
    const mainSha = gitOut(root, ['rev-parse', cfg.main_branch])
    if (flags.confirm !== mainSha) throw new HarnessError(`--confirm must be the complete current ${cfg.main_branch} SHA`)
    const removed = []
    const kept = []
    for (const c of candidates) {
      // Re-evaluate right before removal; anything changed since the audit is kept.
      const again = evaluate(root, cfg.main_branch, worktrees(root).find((w) => path.resolve(w.path) === path.resolve(c.path)) ?? { path: c.path })
      if (!again.candidate) { kept.push({ ...again, reason: 'changed since audit' }); continue }
      const r = git(root, ['worktree', 'remove', c.path])
      if (r.code === 0) removed.push({ path: c.path, branch: c.branch, head: c.head, restore: `git worktree add ${c.path} ${c.branch ?? c.head}` })
      else kept.push({ ...again, reason: r.stderr.trim() })
    }
    finish(result(kept.length ? 'warning' : 'success', `removed ${removed.length} worktree(s); branches kept`, kept.length ? ['inspect the kept entries'] : [], { removed, kept }))
  } catch (e) {
    finish(result('error', e.message, ['nothing was removed unless artifacts say otherwise'], {}))
  }
}
