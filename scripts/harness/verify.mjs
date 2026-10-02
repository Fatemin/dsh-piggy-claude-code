// Verification entry points (docs/agent/delivery.md §3).
//
//   node scripts/harness/verify.mjs --scope static   [--json]   whitespace, config, entry-doc links, contract registry
//   node scripts/harness/verify.mjs --scope affected [--base main] [--json]
//                                                         static + the targeted tests the impact map selects
//   node scripts/harness/verify.mjs --scope full     [--json]   static + the complete suite (needs user consent)
//
// `affected` refuses to run when its selection would be every test file: that
// is the complete suite under another name and needs the user's approval.
import fs from 'node:fs'
import path from 'node:path'
import { HarnessError, dirtyPaths, finish, gitOut, isMain, parseArgs, receipt, repoRoot, result, run } from './lib/common.mjs'
import { loadConfig } from './lib/config.mjs'
import { checkContracts } from './contracts.mjs'
import { selectTests } from './gates.mjs'

export const SCOPES = ['static', 'affected', 'full']

/** Relative markdown links in entry docs that point at missing files. */
export function brokenLinks(root, docs) {
  const issues = []
  for (const doc of docs) {
    let text
    try { text = fs.readFileSync(path.join(root, doc), 'utf8') } catch { issues.push(`${doc}: missing`); continue }
    // Drop fenced code so example links in code blocks are not checked.
    const prose = text.replace(/```[\s\S]*?```/g, '')
    for (const m of prose.matchAll(/\]\(([^)\s]+)\)/g)) {
      const target = m[1]
      if (/^(https?:|mailto:|#)/.test(target)) continue
      const file = decodeURIComponent(target.split('#')[0])
      if (file === '') continue
      if (!fs.existsSync(path.join(root, path.dirname(doc), file))) issues.push(`${doc}: broken link ${target}`)
    }
  }
  return issues
}

export function allTests(root, cfg) {
  const dir = path.join(root, cfg.tests.dir)
  let names = []
  try { names = fs.readdirSync(dir) } catch { return [] }
  return names.filter((n) => n.endsWith(cfg.tests.suffix)).map((n) => `${cfg.tests.dir}/${n}`).sort()
}

/** Changed paths of this checkout relative to base: committed (base...HEAD) plus uncommitted. */
export function changedPaths(root, base) {
  const committed = gitOut(root, ['diff', '--name-only', `${base}...HEAD`])
  if (committed === null) throw new HarnessError(`cannot diff against ${base}`)
  const dirty = dirtyPaths(root) ?? []
  return [...new Set([...committed.split('\n').filter(Boolean), ...dirty])].sort()
}

function staticChecks(root, cfg, configIssues) {
  const commands = []
  const issues = [...configIssues]
  for (const args of [['diff', '--check'], ['diff', '--cached', '--check']]) {
    const o = run(['git', '-C', root, ...args])
    commands.push(receipt(o))
    if (o.code !== 0) issues.push(`git ${args.join(' ')}: ${(o.stdout || o.stderr).trim().split('\n').slice(0, 5).join(' | ')}`)
  }
  if (cfg) {
    issues.push(...brokenLinks(root, cfg.entry_docs))
    issues.push(...checkContracts(root, cfg).issues)
  }
  return { commands, issues }
}

export function verify(root, scope, { base } = {}) {
  if (!SCOPES.includes(scope)) throw new HarnessError(`--scope must be one of ${SCOPES.join(', ')}`)
  const { cfg, issues: configIssues } = loadConfig(root)
  const { commands, issues } = staticChecks(root, cfg, configIssues)
  const artifacts = { scope, root, head: gitOut(root, ['rev-parse', 'HEAD']), commands }
  if (issues.length) {
    return result('error', `static checks failed (${issues.length})`, ['fix the listed issues and rerun'], { ...artifacts, issues })
  }
  if (scope === 'static') return result('success', 'static checks passed', [], artifacts)

  let tests
  if (scope === 'affected') {
    const changed = changedPaths(root, base ?? cfg.main_branch)
    const selection = selectTests(changed, cfg.impact)
    const everything = allTests(root, cfg)
    tests = selection.tests.filter((t) => fs.existsSync(path.join(root, t)))
    Object.assign(artifacts, { changed, unmapped: selection.unmapped, selected: tests })
    if (tests.length && tests.length >= everything.length && everything.every((t) => tests.includes(t))) {
      return result('warning', 'the affected selection is the complete suite; it needs explicit user approval',
        ['ask the user to approve the complete suite, then run --scope full'], artifacts)
    }
    if (!tests.length) {
      return result(selection.unmapped.length ? 'warning' : 'success',
        selection.unmapped.length ? 'no tests mapped to the changed paths' : 'nothing changed that has tests',
        selection.unmapped.length ? ['state the impact by hand for the unmapped paths, or extend impact in harness.config.json'] : [],
        artifacts)
    }
  }
  const argv = scope === 'full' ? cfg.tests.full : [...cfg.tests.targeted, ...tests]
  const o = run(argv, { cwd: root, timeout: 30 * 60_000, inherit: true })
  commands.push(receipt(o))
  const counts = Object.fromEntries(['tests', 'pass', 'fail', 'skipped', 'todo']
    .map((k) => [k, Number((new RegExp(`^ℹ ${k} (\\d+)`, 'm').exec(o.stdout) ?? [])[1] ?? NaN)])
    .filter(([, v]) => Number.isFinite(v)))
  artifacts.counts = counts
  if (o.code !== 0) {
    return result('error', `${scope} tests failed (exit ${o.timedOut ? 'timeout' : o.code})`,
      ['keep the full error, classify baseline / environment / regression, fix the root cause and rerun the affected tests'], artifacts)
  }
  const unmapped = artifacts.unmapped ?? []
  return result(unmapped.length ? 'warning' : 'success',
    `${scope} verification passed${counts.pass !== undefined ? ` (${counts.pass} passed)` : ''}` +
      (unmapped.length ? `; ${unmapped.length} changed path(s) have no mapped tests` : ''),
    unmapped.length ? ['state the impact of the unmapped paths in the report; unverified is not passed'] : [],
    artifacts)
}

if (isMain(process.argv[1], import.meta.url)) {
  try {
    const { flags } = parseArgs(process.argv.slice(2), ['scope', 'base'])
    finish(verify(repoRoot(), flags.scope, { base: flags.base }))
  } catch (e) {
    finish(result('error', e.message, ['fix the root cause and retry'], {}))
  }
}
