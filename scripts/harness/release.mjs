// Frozen-SHA push and release (docs/agent/delivery.md §6). Only on an explicit
// user request for this task; local integration never implies either.
//
//   node scripts/harness/release.mjs check   --sha <sha> [--json]
//        read-only (except `git fetch`): what a push/publish of <sha> would send
//   node scripts/harness/release.mjs push    --sha <sha> --confirm <same full sha> [--json]
//        push-only request: <sha> → <remote>/<main>, read back
//   node scripts/harness/release.mjs publish --sha <sha> --confirm <same full sha> [--json]
//        versioned release: complete suite on the frozen tree (needs user consent),
//        annotated tag <prefix><version>, push <sha> and the tag, read back
//
// The SHA must be on local main's first-parent history and must contain the
// remote main. Never force; never substitute a newer HEAD for the frozen SHA.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { HarnessError, commonDir, finish, git, gitOut, isAncestor, isMain, parseArgs, receipt, repoRoot, result, run } from './lib/common.mjs'
import { requireConfig } from './lib/config.mjs'
import { acquire } from './lib/lock.mjs'

/** First changelog heading's version, or null. */
export function changelogVersion(text, headingPattern) {
  const re = new RegExp(headingPattern, 'm')
  return re.exec(text)?.groups?.version ?? null
}

export function preflight(root, cfg, sha, { versioned }) {
  const main = cfg.main_branch
  const remote = cfg.remote
  const errors = []
  const full = gitOut(root, ['rev-parse', '--verify', `${sha}^{commit}`])
  if (!full) throw new HarnessError(`unknown commit ${sha}`)
  const f = git(root, ['fetch', '--no-tags', remote, main])
  if (f.code !== 0) errors.push(`fetch ${remote} ${main} failed: ${f.stderr.trim()}`)
  const firstParent = (gitOut(root, ['rev-list', '--first-parent', main]) ?? '').split('\n')
  if (!firstParent.includes(full)) errors.push(`${full.slice(0, 7)} is not on local ${main}'s first-parent history`)
  const remoteSha = gitOut(root, ['rev-parse', '--verify', '-q', `${remote}/${main}`])
  if (remoteSha && !isAncestor(root, remoteSha, full)) errors.push(`${remote}/${main} (${remoteSha.slice(0, 7)}) is not an ancestor of ${full.slice(0, 7)}: integrate the remote first, never force`)
  const commits = (gitOut(root, ['log', '--format=%h %s', remoteSha ? `${remoteSha}..${full}` : full]) ?? '').split('\n').filter(Boolean)
  if (remoteSha === full) errors.push(`${remote}/${main} is already at ${full.slice(0, 7)}; nothing to push`)
  const plan = { sha: full, remote, main, remote_sha: remoteSha, commits }
  if (versioned) {
    const r = cfg.release
    let version = null
    try { version = JSON.parse(gitOut(root, ['show', `${full}:${r.version_file}`]) ?? 'null')?.version ?? null } catch { /* reported below */ }
    if (!version) errors.push(`no version in ${r.version_file} at ${full.slice(0, 7)}`)
    const logVersion = changelogVersion(gitOut(root, ['show', `${full}:${r.changelog}`]) ?? '', r.changelog_heading)
    if (version && logVersion !== version) errors.push(`${r.changelog}'s first entry is ${logVersion ?? 'missing'}, ${r.version_file} says ${version}`)
    const tag = version ? `${r.tag_prefix}${version}` : null
    if (tag) {
      if (gitOut(root, ['rev-parse', '-q', '--verify', `refs/tags/${tag}`])) errors.push(`tag ${tag} already exists locally`)
      const remoteTag = git(root, ['ls-remote', '--tags', remote, `refs/tags/${tag}`])
      if (remoteTag.code !== 0) errors.push(`cannot read ${remote} tags: ${remoteTag.stderr.trim()}`)
      else if (remoteTag.stdout.trim()) errors.push(`tag ${tag} already exists on ${remote}`)
    }
    Object.assign(plan, { version, tag })
  }
  return { errors, plan }
}

/** What the remote says now: used after every push, and after a failed one. */
function readBack(root, remote, ref) {
  const r = git(root, ['ls-remote', remote, ref])
  if (r.code !== 0) return 'unknown'
  return r.stdout.trim().split(/\s+/)[0] || null
}

function push(root, cfg, plan) {
  const out = { attempted: true }
  const p = git(root, ['push', cfg.remote, `${plan.sha}:refs/heads/${cfg.main_branch}`], { timeout: 120_000 })
  out.push = receipt(p)
  out.remote_main = readBack(root, cfg.remote, `refs/heads/${cfg.main_branch}`)
  out.confirmed = out.remote_main === plan.sha
  if (!out.confirmed) out.error = (p.stderr || p.stdout).trim() || 'remote main does not match the frozen SHA after push'
  return out
}

export function release(root, mode, sha, confirm) {
  const cfg = requireConfig(root)
  const versioned = mode === 'publish'
  const { errors, plan } = preflight(root, cfg, sha, { versioned })
  const artifacts = { mode, plan }
  if (errors.length) return result('error', errors.join('; '), ['nothing was pushed; fix the preconditions or freeze a new SHA'], artifacts)
  if (mode === 'check') {
    return result('success', `${plan.sha.slice(0, 7)} can be pushed (${plan.commits.length} commit(s) ahead of ${cfg.remote}/${cfg.main_branch})`,
      [`review every commit in artifacts.plan.commits; push only on an explicit request: release.mjs push --sha ${plan.sha} --confirm ${plan.sha}`,
        'or a versioned release (complete suite, needs approval): release.mjs publish --sha <sha> --confirm <sha>'], artifacts)
  }
  if (confirm !== plan.sha) {
    return result('error', '--confirm must repeat the complete 40-character frozen SHA', ['nothing was pushed'], artifacts)
  }
  const unlock = acquire(commonDir(root), 'release', `${mode} ${plan.sha}`)
  try {
    if (versioned) {
      // Verify the frozen tree, not a working copy that may hold other edits.
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), `harness-release-${plan.sha.slice(0, 7)}-`))
      fs.rmSync(dir, { recursive: true })
      const add = git(root, ['worktree', 'add', '--detach', dir, plan.sha])
      if (add.code !== 0) return result('error', `cannot create the release worktree: ${add.stderr.trim()}`, ['nothing was pushed'], artifacts)
      artifacts.release_worktree = dir
      const t = run(cfg.tests.full, { cwd: dir, timeout: 30 * 60_000, inherit: true })
      artifacts.verification = receipt(t)
      if (t.code !== 0) {
        return result('error', 'the complete suite failed on the frozen SHA; nothing was pushed',
          [`the release worktree ${dir} is kept as the scene; fix on a feature branch and freeze a new SHA`], artifacts)
      }
      const removed = git(root, ['worktree', 'remove', dir])
      artifacts.release_worktree_cleanup = removed.code === 0 ? 'removed' : `retained: ${removed.stderr.trim()}`
      const tag = git(root, ['tag', '-a', plan.tag, '-m', plan.tag, plan.sha])
      if (tag.code !== 0) return result('error', `cannot create tag ${plan.tag}: ${tag.stderr.trim()}`, ['nothing was pushed'], artifacts)
    }
    artifacts.push = push(root, cfg, plan)
    if (!artifacts.push.confirmed) {
      return result('error', `push not confirmed (${cfg.remote}/${cfg.main_branch} = ${artifacts.push.remote_main})`,
        ['do not blindly re-push: compare the remote with the frozen SHA first; unknown is not "not pushed"'], artifacts)
    }
    if (versioned) {
      const t = git(root, ['push', cfg.remote, `refs/tags/${plan.tag}`])
      artifacts.tag_push = receipt(t)
      const tagSha = readBack(root, cfg.remote, `refs/tags/${plan.tag}^{}`)
      artifacts.tag_confirmed = tagSha === plan.sha
      if (!artifacts.tag_confirmed) {
        return result('warning', `${cfg.main_branch} pushed but tag ${plan.tag} not confirmed on ${cfg.remote}`,
          [`push the existing local tag: git push ${cfg.remote} refs/tags/${plan.tag}`], artifacts)
      }
    }
  } finally {
    unlock()
  }
  return result('success',
    versioned ? `released ${plan.tag} at ${plan.sha.slice(0, 7)}: suite passed, ${cfg.main_branch} and tag pushed` : `pushed ${plan.sha.slice(0, 7)} to ${cfg.remote}/${cfg.main_branch}`,
    ['feature branches/worktrees of the released commits may now be cleaned up (worktrees.mjs audit)'], artifacts)
}

if (isMain(process.argv[1], import.meta.url)) {
  try {
    const { flags, positionals } = parseArgs(process.argv.slice(2), ['sha', 'confirm'])
    const mode = positionals[0]
    if (!['check', 'push', 'publish'].includes(mode) || typeof flags.sha !== 'string') {
      throw new HarnessError('usage: release.mjs <check|push|publish> --sha <sha> [--confirm <sha>] [--json]')
    }
    finish(release(repoRoot(), mode, flags.sha, flags.confirm))
  } catch (e) {
    finish(result('error', e.message, e.code === 'ELOCKED' ? ['another release holds the lock; wait, never remove it to force'] : ['nothing was pushed unless artifacts say otherwise'], {}))
  }
}
