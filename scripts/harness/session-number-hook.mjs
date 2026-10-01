// SessionStart / UserPromptSubmit reminder: an interactive main session must get a number before
// its first task. Silent once the session has one. Never allocates; never blocks (always exit 0).
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { lookup } from './session-number.mjs'

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'session-number.mjs')

export function response(payload, find = lookup) {
  const event = payload.hook_event_name
  if (event !== 'SessionStart' && event !== 'UserPromptSubmit') return {}
  const id = payload.session_id
  if (!id) return {}
  const have = find(id)
  const text = have
    ? `This session is ${have.number}. Branches: feature/${have.number}-<name>; commits start with [${have.number}]. Do not allocate a second number for the same task.`
    : 'Session numbering: before the first task, classify it (ST=development, AC=operation, Q=query) and run ' +
      `node "${SCRIPT}" new --type <ST|AC|Q> --title "<one-line need, <=30 chars>" --session ${id} --cwd ${payload.cwd || '<cwd>'}, ` +
      'then rename the session to the returned full_title (mcp__ccd_session_mgmt__set_session_title, session_id="self", ' +
      'load via ToolSearch if deferred) or, without that tool or if it is declined, just report the number in the first reply. ' +
      'Numbers come only from that script. If this resumes an already-numbered task, reuse the old number instead. ' +
      'Non-interactive sessions (claude -p, bridge, subagents, scheduled tasks) ignore this reminder.'
  if (have && event === 'UserPromptSubmit') return {} // already numbered: stay quiet after the start
  return { hookSpecificOutput: { hookEventName: event, additionalContext: text } }
}

async function main() {
  try {
    let raw = ''
    for await (const chunk of process.stdin) raw += chunk
    const out = response(JSON.parse(raw))
    if (Object.keys(out).length) process.stdout.write(`${JSON.stringify(out)}\n`)
  } catch {
    // reminder only: a failure here must never block the session
  }
  return 0
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main()
}
