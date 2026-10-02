// Shared harness primitives: the four-field result contract, bounded child
// processes, and git helpers. Project-agnostic: project facts live in
// harness.config.json, never here.
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const STATUSES = ['success', 'warning', 'error']
const SENSITIVE = /(PASSWORD|TOKEN|SECRET|PRIVATE|CREDENTIAL|ACCESS_KEY|API_KEY|DSN)/i

export class HarnessError extends Error {}

/** The repository result contract: status, summary, next_actions, artifacts. */
export function result(status, summary, nextActions = [], artifacts = {}) {
  if (!STATUSES.includes(status)) throw new HarnessError(`unknown status ${status}`)
  return { status, summary, next_actions: nextActions, artifacts }
}

export const exitCode = (r) => (r.status === 'success' ? 0 : r.status === 'warning' ? 2 : 1)

export function render(r, json) {
  if (json) return JSON.stringify(r, null, 2)
  return [
    `status: ${r.status}`,
    `summary: ${r.summary}`,
    `next_actions: ${JSON.stringify(r.next_actions)}`,
    `artifacts: ${JSON.stringify(r.artifacts, null, 2)}`,
  ].join('\n')
}

/** Print one final result (stdout) and exit with its code. Logs go to stderr. */
export function finish(r, argv = process.argv) {
  console.log(render(r, argv.includes('--json')))
  process.exit(exitCode(r))
}

export function redact(text) {
  let value = String(text ?? '')
  for (const [key, secret] of Object.entries(process.env)) {
    if (secret && secret.length >= 4 && SENSITIVE.test(key)) value = value.split(secret).join('[REDACTED]')
  }
  return value.replace(/\b(https?):\/\/[^\s/@:]+:[^\s/@]+@/gi, '$1://[REDACTED]@')
}

/** Run a child with a hard timeout. Never throws for a non-zero exit unless check. */
export function run(argv, { cwd, timeout = 120_000, check = false, input, inherit = false } = {}) {
  const [cmd, ...args] = argv
  const started = Date.now()
  const r = spawnSync(cmd, args, {
    cwd, input, encoding: 'utf8', timeout, windowsHide: true,
    // npm/npx are .cmd shims on Windows and need a shell to resolve.
    shell: process.platform === 'win32' && /^(npm|npx)$/.test(cmd),
    stdio: inherit ? ['ignore', 'pipe', 'pipe'] : undefined,
    maxBuffer: 64 * 1024 * 1024,
  })
  const out = {
    argv, cwd: cwd ?? process.cwd(), code: r.status, signal: r.signal,
    timedOut: r.error?.code === 'ETIMEDOUT',
    ms: Date.now() - started,
    stdout: redact(r.stdout ?? ''), stderr: redact(r.stderr ?? ''),
    error: r.error && r.error.code !== 'ETIMEDOUT' ? r.error.message : null,
  }
  if (inherit) {
    if (out.stdout) process.stderr.write(out.stdout)
    if (out.stderr) process.stderr.write(out.stderr)
  }
  if (check && out.code !== 0) {
    const detail = (out.stderr || out.stdout || out.error || '').trim()
    throw new HarnessError(`command failed (${out.timedOut ? 'timeout' : out.code}): ${argv.join(' ')}${detail ? `: ${detail}` : ''}`)
  }
  return out
}

/** A compact receipt of a command, for artifacts. */
export const receipt = (o) => ({ argv: o.argv.join(' '), cwd: o.cwd, exit: o.timedOut ? 'timeout' : o.code, ms: o.ms })

export function git(cwd, args, opts = {}) {
  return run(['git', '-C', cwd, ...args], { timeout: 30_000, ...opts })
}

export const gitOut = (cwd, args) => {
  const r = git(cwd, args)
  return r.code === 0 ? r.stdout.trim() : null
}

/** The toplevel of the checkout containing `start` (a worktree's own root). */
export function repoRoot(start = process.cwd()) {
  const top = gitOut(start, ['rev-parse', '--show-toplevel'])
  if (top) return path.resolve(top)
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
}

/** The shared .git directory, identical for every worktree of one repository. */
export function commonDir(root) {
  const dir = gitOut(root, ['rev-parse', '--path-format=absolute', '--git-common-dir'])
  if (!dir) throw new HarnessError(`not a git repository: ${root}`)
  return path.resolve(dir)
}

export function parseWorktrees(text) {
  return text.split(/\n\n+/).filter(Boolean).map((block) => {
    const w = { path: '', branch: null, head: '', detached: false, locked: false, prunable: false }
    for (const line of block.split('\n')) {
      if (line.startsWith('worktree ')) w.path = line.slice(9)
      else if (line.startsWith('HEAD ')) w.head = line.slice(5)
      else if (line.startsWith('branch ')) w.branch = line.slice(7).replace('refs/heads/', '')
      else if (line === 'detached') w.detached = true
      else if (line.startsWith('locked')) w.locked = true
      else if (line.startsWith('prunable')) w.prunable = true
    }
    return w
  })
}

export function worktrees(root) {
  const out = gitOut(root, ['worktree', 'list', '--porcelain'])
  return out === null ? [] : parseWorktrees(out)
}

export function branchWorktree(root, branch) {
  return worktrees(root).find((w) => w.branch === branch)?.path ?? null
}

export const isAncestor = (root, ancestor, descendant) =>
  git(root, ['merge-base', '--is-ancestor', ancestor, descendant]).code === 0

/** Paths with uncommitted changes (tracked + untracked), or null when unknown. */
export function dirtyPaths(cwd) {
  const r = git(cwd, ['status', '--porcelain', '-z', '--untracked-files=all'])
  if (r.code !== 0) return null
  const out = []
  const parts = r.stdout.split('\0').filter(Boolean)
  for (let i = 0; i < parts.length; i++) {
    const entry = parts[i]
    out.push(entry.slice(3))
    // A rename/copy record carries its source path as the next NUL field.
    if (entry[0] === 'R' || entry[0] === 'C') i++
  }
  return out
}

export const isMain = (argv1, metaUrl) => argv1 && path.resolve(argv1) === fileURLToPath(metaUrl)

/** Flags: `--name value` for names in valueFlags, bare `--name` otherwise; the rest are positionals. */
export function parseArgs(argv, valueFlags = []) {
  const flags = {}
  const positionals = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) { positionals.push(a); continue }
    const name = a.slice(2)
    if (valueFlags.includes(name)) {
      if (i + 1 >= argv.length) throw new HarnessError(`--${name} needs a value`)
      flags[name] = argv[++i]
    } else flags[name] = true
  }
  return { flags, positionals }
}
