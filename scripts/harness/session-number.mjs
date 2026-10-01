// Session numbering (bootloader rule): one sequence of ST/AC/Q numbers PER PROJECT.
//   ST = development, AC = operation (real-data writes, release, environment), Q = query (read-only).
// Usage: node scripts/harness/session-number.mjs new --type <ST|AC|Q> --title "<=30 chars>" --session <id> [--cwd <dir>] [--project <key>] [--json]
//        node scripts/harness/session-number.mjs show --session <id> [--json]
// The counter continues only inside one project (the git repository, worktrees included; the cwd
// itself outside git). A different project starts again at 0001. The registry file is shared on
// this machine (override the location with AGENTFW_HOME). Numbers are only allocated here; never
// hand-written. The same session id always gets the same number.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const TYPES = ['ST', 'AC', 'Q']
const MAX_TITLE = 30

export const registryDir = () => process.env.AGENTFW_HOME || path.join(os.homedir(), '.agent-framework')
const registryFile = (dir) => path.join(dir, 'sessions.json')

export const format = (type, n) => `${type}${String(n).padStart(4, '0')}`

// Project identity: the main repository root (shared by all its worktrees), else the cwd itself.
export function projectKey(cwd) {
  const r = spawnSync('git', ['-C', cwd, 'rev-parse', '--path-format=absolute', '--git-common-dir'], {
    encoding: 'utf8', timeout: 2000,
  })
  const base = r.status === 0 ? path.dirname(path.resolve(r.stdout.trim())) : path.resolve(cwd)
  return process.platform === 'win32' ? base.toLowerCase() : base
}

function load(dir) {
  try {
    const data = JSON.parse(fs.readFileSync(registryFile(dir), 'utf8'))
    if (typeof data.projects !== 'object' || typeof data.sessions !== 'object') throw new Error('corrupt')
    return data
  } catch (e) {
    if (e.code === 'ENOENT') return { projects: {}, sessions: {} }
    throw new Error(`registry unreadable (${registryFile(dir)}): ${e.message}; repair it, do not guess a number`)
  }
}

function withLock(dir, fn) {
  fs.mkdirSync(dir, { recursive: true })
  const lock = path.join(dir, 'sessions.lock')
  const deadline = Date.now() + 5000
  for (;;) {
    try { fs.closeSync(fs.openSync(lock, 'wx')); break } catch (e) {
      if (e.code !== 'EEXIST') throw e
      if (Date.now() > deadline) throw new Error(`lock busy: ${lock}; remove it only after confirming no other allocator runs`)
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50)
    }
  }
  try { return fn() } finally { fs.rmSync(lock, { force: true }) }
}

export function lookup(sessionId, dir = registryDir()) {
  if (!sessionId) return null
  const entry = load(dir).sessions[sessionId]
  return entry ? { ...entry, full_title: `${entry.number} ${entry.title}` } : null
}

export function allocate({ type, title, sessionId, cwd = process.cwd(), project, dir = registryDir() }) {
  if (!TYPES.includes(type)) throw new Error(`--type must be one of ${TYPES.join('|')}`)
  if (!sessionId) throw new Error('--session is required')
  const clean = String(title ?? '').trim()
  if (!clean) throw new Error('--title is required')
  if ([...clean].length > MAX_TITLE) throw new Error(`--title must be at most ${MAX_TITLE} characters`)
  return withLock(dir, () => {
    const data = load(dir)
    const existing = data.sessions[sessionId]
    if (existing) return { ...existing, full_title: `${existing.number} ${existing.title}`, reused: true }
    const key = project || projectKey(cwd)
    const n = (data.projects[key]?.last ?? 0) + 1
    data.projects[key] = { last: n }
    const entry = { number: format(type, n), type, title: clean, project: key, cwd, created: new Date().toISOString() }
    data.sessions[sessionId] = entry
    const tmp = `${registryFile(dir)}.tmp`
    fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`)
    fs.renameSync(tmp, registryFile(dir))
    return { ...entry, full_title: `${entry.number} ${clean}`, reused: false }
  })
}

function parseArgs(argv) {
  const out = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--json') out.json = true
    else if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[++i]
    else out._.push(argv[i])
  }
  return out
}

function main(argv) {
  const a = parseArgs(argv)
  try {
    let result
    if (a._[0] === 'new') result = allocate({ type: a.type, title: a.title, sessionId: a.session, cwd: a.cwd, project: a.project })
    else if (a._[0] === 'show') result = lookup(a.session)
    else throw new Error('usage: session-number.mjs new|show ...')
    if (!result) { console.error('no number assigned to this session'); return 1 }
    console.log(a.json ? JSON.stringify(result, null, 2) : result.full_title)
    return 0
  } catch (e) {
    console.error(`error: ${e.message}`)
    return 2
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2))
}
