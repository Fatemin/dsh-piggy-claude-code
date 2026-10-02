// Repository-scoped Claude hook; never executes a proposed command.
// Only the positively recognized complete test suite requests confirmation.
// This is an accidental-bypass guard, not a sandbox for adversarial commands.
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const CONTEXT =
  'Test consent applies to ALL clients. Request test authorization ONLY for the complete ' +
  'test suite (npm test, bare node --test, or node --test "test/**/*.test.js"). Targeted tests, ' +
  'builds, syntax/lint checks, whitespace checks, read-only queries and ordinary delegation do not ' +
  'require this prompt. Default to affected tests. Do not hide the complete suite in another runner ' +
  'to bypass approval. Skipped checks are UNVERIFIED. ' +
  `Current policy: ${path.join(ROOT, 'CLAUDE.md')} and ${path.join(ROOT, 'docs/agent/delivery.md')}.`

const MAX_DEPTH = 8
const WRAPPERS = new Set(['env', 'sudo', 'timeout', 'time', 'nohup', 'cross-env'])
const SHELLS = new Set(['bash', 'sh', 'zsh', 'pwsh', 'powershell', 'cmd'])
const TEST_SCRIPTS = new Set(['test', 't', 'tst', 'test:all', 'test:ci', 'test:unit', 'test:watch'])
const WHOLE_ROOTS = new Set(['.', 'test', 'tests'])
const TARGETED_FLAGS = ['--test-name-pattern', '--test-skip-pattern', '--test-only']
const VALUE_OPTIONS = new Set([
  '--test-reporter', '--test-reporter-destination', '--test-concurrency', '--test-timeout',
  '--test-shard', '--import', '--require', '-r', '--prefix',
])

export function gitCommonDir(cwd) {
  const r = spawnSync('git', ['-C', cwd, 'rev-parse', '--path-format=absolute', '--git-common-dir'], {
    encoding: 'utf8', timeout: 2000,
  })
  return r.status === 0 ? path.resolve(r.stdout.trim()) : null
}

export function inRepository(payload) {
  const expected = gitCommonDir(ROOT)
  if (!expected) throw new Error('Cannot resolve the repository for consent enforcement')
  const candidates = [payload.cwd, process.env.CLAUDE_PROJECT_DIR]
  return candidates.some((cwd) => typeof cwd === 'string' && cwd && gitCommonDir(cwd) === expected)
}

// Quote-aware split into command segments (; & | newline) of tokens; redirect targets are dropped.
// Returns null for unbalanced quotes: not positively recognized.
export function tokenize(command) {
  const segments = [[]]
  let tok = ''
  let has = false
  let quote = null
  let redirect = false
  const push = () => {
    if (has && !redirect) segments.at(-1).push(tok)
    if (has) redirect = false
    tok = ''
    has = false
  }
  for (let i = 0; i < command.length; i++) {
    const c = command[i]
    if (quote) {
      if (c === quote) quote = null
      else tok += c
    } else if (c === '"' || c === "'") {
      quote = c
      has = true
    } else if (/[ \t\r]/.test(c)) push()
    else if (/[;&|()\n]/.test(c)) {
      push()
      redirect = false
      if (segments.at(-1).length) segments.push([])
    } else if (c === '<' || c === '>') {
      push()
      redirect = true
    } else {
      tok += c
      has = true
    }
  }
  if (quote) return null
  push()
  return segments.filter((s) => s.length)
}

function positional(args) {
  const out = []
  let skip = false
  for (const a of args) {
    if (skip) skip = false
    else if (VALUE_OPTIONS.has(a)) skip = true
    else if (a !== '--' && !a.startsWith('-')) out.push(a)
  }
  return out
}

// A label that selects every test file: no label, the test directory, or an all-tests glob.
function isWholeLabel(label) {
  const p = label.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '')
  return WHOLE_ROOTS.has(p) || /^(test|tests)\/\*\*\/\*\.test\.[cm]?js$/.test(p) || /^\*\*\/\*\.test\.[cm]?js$/.test(p)
}

function isWholeSuite(args) {
  if (args.some((a) => TARGETED_FLAGS.some((f) => a === f || a.startsWith(`${f}=`)))) return false
  const labels = positional(args)
  return !labels.length || labels.some(isWholeLabel)
}

function isSuite(args, depth = 0) {
  if (!args.length || depth > MAX_DEPTH) return false
  const exe = path.basename(args[0]).toLowerCase().replace(/\.(exe|cmd)$/, '')
  let tail = args.slice(1)
  if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(args[0])) return isSuite(tail, depth + 1)
  if (WRAPPERS.has(exe)) return tail.some((_, i) => isSuite(tail.slice(i), depth + 1))
  if (SHELLS.has(exe)) {
    const i = tail.findIndex((a) => ['-c', '-lc', '-command', '/c'].includes(a.toLowerCase()))
    return i >= 0 && i + 1 < tail.length ? needsConfirmation(tail[i + 1], depth + 1) : false
  }
  if (['npm', 'pnpm', 'yarn', 'bun', 'npx'].includes(exe)) {
    while (tail.length && tail[0].startsWith('-')) {
      const o = tail.shift()
      if (['--prefix', '-C', '--cwd', '--dir'].includes(o) && tail.length) tail.shift()
    }
    if (['run', 'run-script', 'exec', 'x'].includes(tail[0])) tail = tail.slice(1)
    if (!tail.length) return false
    if (TEST_SCRIPTS.has(tail[0])) return isWholeSuite(tail.slice(1))
    return isSuite(tail, depth + 1)
  }
  if (exe === 'node') {
    if (harnessRunsSuite(tail)) return true
    if (!tail.includes('--test')) return false
    return isWholeSuite(tail.filter((a) => a !== '--test'))
  }
  return false
}

// The harness's own entry points that run the complete suite inside them:
// `verify.mjs --scope full` and `release.mjs publish` (which verifies the frozen tree).
function harnessRunsSuite(tail) {
  const script = tail.find((a) => !a.startsWith('-'))
  if (!script) return false
  const name = path.basename(script.replace(/\\/g, '/')).toLowerCase()
  const rest = tail.slice(tail.indexOf(script) + 1)
  if (name === 'verify.mjs') {
    const i = rest.indexOf('--scope')
    const scope = i >= 0 ? rest[i + 1] : rest.find((a) => a.startsWith('--scope='))?.slice(8)
    return scope === 'full'
  }
  if (name === 'release.mjs') return rest[0] === 'publish'
  return false
}

export function needsConfirmation(command, depth = 0) {
  if (!command || !command.trim() || depth > MAX_DEPTH) return false
  const segments = tokenize(command)
  return !!segments && segments.some((s) => isSuite(s, depth))
}

export function response(payload) {
  const event = payload.hook_event_name
  if (event === 'SessionStart' || event === 'UserPromptSubmit') {
    return { hookSpecificOutput: { hookEventName: event, additionalContext: CONTEXT } }
  }
  if (event !== 'PreToolUse') return {}
  if (!['Bash', 'PowerShell'].includes(payload.tool_name)) return {}
  if (!needsConfirmation(String((payload.tool_input || {}).command ?? ''))) return {}
  // Never silently approve or cache consent; the native permission host asks per call.
  const bypass = ['bypassPermissions', 'dontAsk'].includes(payload.permission_mode)
  let reason = '完整测试授权：此命令将运行完整测试套件。请确认本次完整测试范围；定向测试、构建和普通查询不触发此提示。'
  if (bypass) reason += ' 当前模式无法可靠询问，请切回交互确认模式后重试。'
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: bypass ? 'deny' : 'ask',
      permissionDecisionReason: reason,
      additionalContext: CONTEXT,
    },
  }
}

async function main() {
  try {
    let raw = ''
    for await (const chunk of process.stdin) raw += chunk
    const payload = JSON.parse(raw)
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Hook input must be an object')
    if (inRepository(payload)) {
      const out = response(payload)
      if (Object.keys(out).length) process.stdout.write(`${JSON.stringify(out)}\n`)
    }
    return 0
  } catch (e) {
    process.stderr.write(`test-consent hook could not decide: ${e.name}; stop and repair the hook.\n`)
    return 2
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main()
}
