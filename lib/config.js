/**
 * Where the pig lives under Claude Code, and how to reach its panel server.
 *
 * Both are overridable through the environment so tests (and a second pig)
 * never touch the real save.
 */

import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

export const DEFAULT_PORT = 41717

export function statePath(env = process.env) {
  const configured = env.PIG_STATE
  if (typeof configured === 'string' && configured.trim() !== '') return resolve(configured.trim())
  return join(homedir(), '.claude', 'pig', 'state.json')
}

export function port(env = process.env) {
  const parsed = Number.parseInt(env.PIG_PORT ?? '', 10)
  return Number.isInteger(parsed) && parsed > 0 && parsed < 65536 ? parsed : DEFAULT_PORT
}

export const lockPath = file => `${file}.lock`
