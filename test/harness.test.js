import { test } from 'node:test'
import assert from 'node:assert/strict'
import { needsConfirmation, response, tokenize } from '../scripts/harness/claude-test-consent.mjs'
import { parseWorktrees } from '../scripts/harness/doctor.mjs'

test('complete suite needs confirmation', () => {
  for (const cmd of [
    'npm test',
    'npm run test',
    'npm --prefix . test',
    'node --test',
    'node --test test/',
    'node --test "test/**/*.test.js"',
    'cd x && npm test',
    'bash -c "npm test"',
    'FOO=1 npm test',
    'npx node --test',
  ]) assert.equal(needsConfirmation(cmd), true, cmd)
})

test('targeted runs and ordinary commands pass through', () => {
  for (const cmd of [
    'node --test test/core.test.js',
    'node --test --test-name-pattern "feed" test/core.test.js',
    'npm test -- --test-name-pattern=feed',
    'npm test -- test/core.test.js',
    'npm run build',
    'git status',
    'echo npm test',
    'node tools/build-sprites.mjs',
    'node scripts/harness/doctor.mjs --json',
    'npm test > out.log "unbalanced',
    '',
  ]) assert.equal(needsConfirmation(cmd), false, cmd)
})

test('tokenize drops redirect targets and splits chains', () => {
  assert.deepEqual(tokenize('a b > out.txt; c "d e"'), [['a', 'b'], ['c', 'd e']])
  assert.equal(tokenize('echo "oops'), null)
})

test('hook response asks, or denies where asking is impossible', () => {
  const base = { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'npm test' } }
  assert.equal(response(base).hookSpecificOutput.permissionDecision, 'ask')
  assert.equal(response({ ...base, permission_mode: 'bypassPermissions' }).hookSpecificOutput.permissionDecision, 'deny')
  assert.deepEqual(response({ ...base, tool_input: { command: 'git status' } }), {})
  assert.deepEqual(response({ ...base, tool_name: 'Read' }), {})
  assert.ok(response({ hook_event_name: 'SessionStart' }).hookSpecificOutput.additionalContext)
})

test('doctor parses worktree porcelain', () => {
  const w = parseWorktrees('worktree /a\nHEAD abc\nbranch refs/heads/main\n\nworktree /b\nHEAD def\ndetached\nlocked')
  assert.equal(w.length, 2)
  assert.equal(w[0].branch, 'main')
  assert.equal(w[1].detached && w[1].locked, true)
})
