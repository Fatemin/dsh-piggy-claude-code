#!/usr/bin/env node
/**
 * Claude Code hook entry: `pig-hook.js <message|turn|tool|toolError|agentError>`.
 *
 * Prints nothing, ever: stdout from some hooks (UserPromptSubmit) is added to
 * the model's context, and the pig must stay invisible to the model. Always
 * exits 0, so a pig problem can never block or fail real work.
 */

import { feed } from '../lib/feed.js'

// Drain stdin so Claude Code never sees a broken pipe; the payload itself is
// not needed — the hook kind comes from argv.
process.stdin.on('error', () => {})
process.stdin.resume()

try { await feed(process.argv[2] ?? '') } catch { /* the pig absorbs its own mishaps */ }
process.exit(0)
