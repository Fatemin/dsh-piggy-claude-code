// Serialized integration of a verified feature branch into local main
// (docs/agent/delivery.md §5). Never pushes, never runs tests, never deletes
// the feature branch or worktree.
//
//   node scripts/harness/integrate.mjs feature/<id>-<name> --dry-run --json
//   node scripts/harness/integrate.mjs feature/<id>-<name> --json
//     [--design-handoff docs/design/<...>-design-handoff.md | --design-exempt "<reason>"]
//     [--contract-exempt "<reason>"] [--docs-sync-exempt "<reason>"] [--no-fetch]
//
// Failed preconditions leave every ref unchanged. Merge success proves nothing
// about tests: report verification separately.
import { HarnessError, branchWorktree, commonDir, dirtyPaths, finish, git, gitOut, isMain, parseArgs, repoRoot, result } from './lib/common.mjs'
import { validateConfig } from './lib/config.mjs'
import { acquire } from './lib/lock.mjs'
import { commitPrefixGate, contractGate, designGate, docsSyncGate, pathsOverlap } from './gates.mjs'

const lines = (text) => (text ?? '').split('\n').map((l) => l.trim()).filter(Boolean)

/** The config as it will be after the merge: read from the incoming branch tree. */
function branchConfig(root, branch) {
  const text = gitOut(root, ['show', `${branch}:harness.config.json`])
  if (text === null) throw new HarnessError(`${branch} has no harness.config.json`)
  const cfg = JSON.parse(text)
  const issues = validateConfig(cfg)
  if (issues.length) throw new HarnessError(`harness.config.json on ${branch} is invalid: ${issues.join('; ')}`)
  return cfg
}

export function collect(root, branch, { fetch = true } = {}) {
  const cfg = branchConfig(root, branch)
  const main = cfg.main_branch
  if (branch === main) throw new HarnessError(`the feature branch must not be ${main}`)
  const branchSha = gitOut(root, ['rev-parse', '--verify', `refs/heads/${branch}`])
  if (!branchSha) throw new HarnessError(`no local branch ${branch}`)
  const mainWorktree = branchWorktree(root, main)
  if (!mainWorktree) throw new HarnessError(`${main} is not checked out in any worktree`)
  const remote = cfg.remote
  const warnings = []
  const hasRemote = gitOut(root, ['remote', 'get-url', remote]) !== null
  if (hasRemote && fetch) {
    const f = git(root, ['fetch', '--no-tags', remote, main])
    if (f.code !== 0) warnings.push(`fetch ${remote} failed: ${f.stderr.trim()}`)
  }
  let divergence = null
  if (hasRemote) {
    const d = gitOut(root, ['rev-list', '--left-right', '--count', `${main}...${remote}/${main}`])
    if (d) { const [a, b] = d.split(/\s+/).map(Number); divergence = { local_only: a, remote_only: b } }
  }
  const mainSha = gitOut(root, ['rev-parse', main])
  const featureWorktree = branchWorktree(root, branch)
  const featureDirty = featureWorktree ? (dirtyPaths(featureWorktree) ?? ['<unknown>']) : []
  const mainStaged = git(mainWorktree, ['diff', '--cached', '--quiet']).code !== 0
  const mergeInProgress = git(mainWorktree, ['rev-parse', '--verify', '-q', 'MERGE_HEAD']).code === 0
  const incoming = lines(gitOut(root, ['diff', '--name-only', `${mainSha}...${branchSha}`]))
  const subjects = lines(gitOut(root, ['log', '--format=%s', `${mainSha}..${branchSha}`]))
  const mainDirty = dirtyPaths(mainWorktree) ?? []
  const conflictProbe = git(root, ['merge-tree', '--write-tree', '--name-only', '--no-messages', mainSha, branchSha])
  const conflicts = conflictProbe.code === 1 ? lines(conflictProbe.stdout).slice(1) : []
  if (conflictProbe.code > 1) warnings.push(`merge-tree probe unavailable: ${conflictProbe.stderr.trim()}`)
  return {
    cfg, root, branch, branchSha, main, mainSha, mainWorktree, featureWorktree, featureDirty,
    mainStaged, mergeInProgress, incoming, subjects, mainDirty, divergence, hasRemote, conflicts, warnings,
  }
}

export function validate(ctx, opts = {}) {
  const errors = []
  const gates = {}
  const g = ctx.cfg.gates ?? {}
  const handoffInTree = opts.designHandoff
    ? git(ctx.root, ['cat-file', '-e', `${ctx.branchSha}:${opts.designHandoff}`]).code === 0
    : false
  for (const [name, outcome] of Object.entries({
    design: designGate(ctx.incoming, g.design, { handoff: opts.designHandoff, handoffInTree, exempt: opts.designExempt }),
    contracts: contractGate(ctx.incoming, g.contracts, { exempt: opts.contractExempt }),
    docs_sync: docsSyncGate(ctx.incoming, g.docs_sync, { exempt: opts.docsSyncExempt }),
    commit_prefix: commitPrefixGate(ctx.subjects, ctx.cfg.session_numbering?.commit_prefix),
  })) {
    gates[name] = outcome.artifacts
    if (outcome.error) errors.push(outcome.error)
  }
  if (!ctx.incoming.length) errors.push(`${ctx.branch} has nothing to integrate`)
  if (ctx.divergence?.remote_only > 0) errors.push(`${ctx.cfg.remote}/${ctx.main} has ${ctx.divergence.remote_only} commit(s) missing from local ${ctx.main}; integrate them first, never force`)
  if (ctx.featureDirty.length) errors.push(`feature worktree is dirty: ${ctx.featureDirty.slice(0, 5).join(', ')}`)
  if (ctx.mainStaged) errors.push(`the ${ctx.main} worktree has staged changes`)
  if (ctx.mergeInProgress) errors.push(`the ${ctx.main} worktree already has a merge in progress`)
  const overlap = ctx.mainDirty.filter((d) => ctx.incoming.some((i) => pathsOverlap(d, i))).sort()
  if (overlap.length) errors.push(`${ctx.main} has uncommitted changes on incoming paths: ${overlap.join(', ')}`)
  if (ctx.conflicts.length) errors.push(`the merge would conflict: ${ctx.conflicts.join(', ')}`)
  return { errors, gates, overlap }
}

function artifactsOf(ctx, v) {
  return {
    branch: ctx.branch, branch_sha: ctx.branchSha, main: ctx.main, main_sha: ctx.mainSha,
    main_worktree: ctx.mainWorktree, feature_worktree: ctx.featureWorktree,
    remote_divergence: ctx.divergence, incoming_paths: ctx.incoming, commits: ctx.subjects,
    main_dirty_paths: ctx.mainDirty, overlap: v.overlap, conflicts: ctx.conflicts, gates: v.gates,
    warnings: ctx.warnings, pushed: false,
  }
}

export function integrate(root, branch, opts = {}) {
  const ctx = collect(root, branch, { fetch: opts.fetch !== false })
  const v = validate(ctx, opts)
  const artifacts = artifactsOf(ctx, v)
  if (v.errors.length) {
    return result('error', v.errors.join('; '), ['refs are unchanged; fix the preconditions and rerun --dry-run'], artifacts)
  }
  if (opts.dryRun) {
    return result(ctx.warnings.length ? 'warning' : 'success', `${branch} can be merged into local ${ctx.main}`,
      ['check artifacts (incoming paths, gates), then rerun without --dry-run'], artifacts)
  }
  const release = acquire(commonDir(root), 'integrate', `integrate ${branch}`)
  try {
    // Re-check under the lock: nothing may have moved since collection.
    if (gitOut(root, ['rev-parse', ctx.main]) !== ctx.mainSha || gitOut(root, ['rev-parse', branch]) !== ctx.branchSha) {
      return result('error', 'main or the feature branch moved during integration; nothing merged', ['rerun --dry-run'], artifacts)
    }
    const id = /(ST|AC|Q)\d{4}/.exec(branch)?.[0]
    const message = `${id ? `[${id}] ` : ''}Merge ${branch}`
    const m = git(ctx.mainWorktree, ['merge', '--no-ff', '--no-edit', '-m', message, branch], { timeout: 120_000 })
    if (m.code !== 0) {
      const abort = git(ctx.mainWorktree, ['merge', '--abort'])
      return result('error', `merge failed and was ${abort.code === 0 ? 'aborted' : 'NOT aborted (inspect the main worktree)'}: ${(m.stderr || m.stdout).trim()}`,
        ['resolve the cause on the feature branch, then rerun --dry-run'], artifacts)
    }
    artifacts.merged_main_sha = gitOut(root, ['rev-parse', ctx.main])
    artifacts.merge_message = message
  } finally {
    release()
  }
  const restart = ctx.cfg.post_integrate?.restart
  const next = []
  if (restart) next.push(`restart: (cd ${restart.cwd} && ${restart.command.join(' ')}) — ${restart.reason ?? 'post-integration restart'}`)
  next.push(`awaiting user acceptance on local ${ctx.main}; not pushed. Keep ${branch} and its worktree until accepted`)
  return result('success', `${branch} merged into local ${ctx.main} (${artifacts.merged_main_sha?.slice(0, 7)}); not pushed`, next, artifacts)
}

if (isMain(process.argv[1], import.meta.url)) {
  try {
    const { flags, positionals } = parseArgs(process.argv.slice(2),
      ['design-handoff', 'design-exempt', 'contract-exempt', 'docs-sync-exempt'])
    if (positionals.length !== 1) throw new HarnessError('usage: integrate.mjs <feature-branch> [--dry-run] [--json] [...]')
    finish(integrate(repoRoot(), positionals[0], {
      dryRun: flags['dry-run'] === true,
      fetch: flags['no-fetch'] !== true,
      designHandoff: flags['design-handoff'],
      designExempt: flags['design-exempt'],
      contractExempt: flags['contract-exempt'],
      docsSyncExempt: flags['docs-sync-exempt'],
    }))
  } catch (e) {
    finish(result('error', e.message, e.code === 'ELOCKED' ? ['wait for the other integration; never remove its lock to force'] : ['fix the root cause; refs are unchanged unless the summary says otherwise'], {}))
  }
}
