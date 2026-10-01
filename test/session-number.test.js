import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { allocate, lookup, projectKey } from '../scripts/harness/session-number.mjs'
import { response } from '../scripts/harness/session-number-hook.mjs'

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'sessnum-'))

test('numbers continue within a project across types, starting at 0001', () => {
  const dir = tmp()
  const a = allocate({ type: 'ST', title: 'first', sessionId: 's1', project: 'p', dir })
  const b = allocate({ type: 'Q', title: 'second', sessionId: 's2', project: 'p', dir })
  assert.equal(a.number, 'ST0001')
  assert.equal(b.number, 'Q0002')
})

test('a different project starts again at 0001', () => {
  const dir = tmp()
  allocate({ type: 'ST', title: 'a', sessionId: 's1', project: 'p1', dir })
  allocate({ type: 'ST', title: 'b', sessionId: 's2', project: 'p1', dir })
  assert.equal(allocate({ type: 'AC', title: 'c', sessionId: 's3', project: 'p2', dir }).number, 'AC0001')
  assert.equal(allocate({ type: 'Q', title: 'd', sessionId: 's4', project: 'p1', dir }).number, 'Q0003')
})

test('project key is the repository root, shared by subdirectories', () => {
  const root = projectKey(process.cwd())
  assert.equal(projectKey(path.join(process.cwd(), 'test')), root)
  assert.notEqual(projectKey(os.tmpdir()), root)
})

test('the same session id reuses its number', () => {
  const dir = tmp()
  const a = allocate({ type: 'AC', title: 'ops', sessionId: 'same', project: 'p', dir })
  const b = allocate({ type: 'ST', title: 'ignored', sessionId: 'same', project: 'other', dir })
  assert.equal(b.number, a.number)
  assert.equal(b.reused, true)
  assert.equal(lookup('same', dir).full_title, `${a.number} ops`)
  assert.equal(lookup('other', dir), null)
})

test('invalid input and corrupt registry fail closed', () => {
  const dir = tmp()
  assert.throws(() => allocate({ type: 'XX', title: 't', sessionId: 's', dir }), /--type/)
  assert.throws(() => allocate({ type: 'Q', title: '', sessionId: 's', dir }), /--title/)
  assert.throws(() => allocate({ type: 'Q', title: 'x'.repeat(31), sessionId: 's', dir }), /30/)
  assert.throws(() => allocate({ type: 'Q', title: 't', sessionId: '', dir }), /--session/)
  fs.writeFileSync(path.join(dir, 'sessions.json'), '{bad')
  assert.throws(() => allocate({ type: 'Q', title: 't', sessionId: 's', dir }), /unreadable/)
})

test('hook reminds only unnumbered sessions', () => {
  const none = () => null
  const has = () => ({ number: 'ST0200', title: 't', full_title: 'ST0200 t' })
  const start = { hook_event_name: 'SessionStart', session_id: 'abc', cwd: '/x' }
  assert.match(response(start, none).hookSpecificOutput.additionalContext, /new --type/)
  assert.match(response({ ...start, hook_event_name: 'UserPromptSubmit' }, none).hookSpecificOutput.additionalContext, /--session abc --cwd \/x/)
  assert.match(response(start, has).hookSpecificOutput.additionalContext, /ST0200/)
  assert.deepEqual(response({ ...start, hook_event_name: 'UserPromptSubmit' }, has), {})
  assert.deepEqual(response({ hook_event_name: 'SessionStart' }, none), {})
  assert.deepEqual(response({ hook_event_name: 'PreToolUse', session_id: 'abc' }, none), {})
})
