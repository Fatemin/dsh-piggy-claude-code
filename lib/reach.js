/**
 * Two ways to reach the pig, tried in order:
 *
 *   1. the panel server, when it is running — it owns the save, so talking to
 *      it keeps a single writer;
 *   2. the save file directly, under the lock — only when no server answers.
 *
 * If the server is up but slow, or another process holds the lock, the event
 * is dropped. A pig that misses one snack is fine; a hook that stalls Claude
 * Code is not.
 */

import { createHost } from './host.js'
import { lockPath } from './config.js'
import { acquireLock } from './lock.js'

export async function callServer(port, path, body, { timeoutMs = 800 } = {}) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) return { reached: true, ok: false, status: res.status }
    const text = await res.text()
    return { reached: true, ok: true, value: text === '' ? null : JSON.parse(text) }
  } catch {
    return { reached: false }
  }
}

/** Run `fn(host)` against the save file while holding its lock. */
export function withLocalHost(statePath, fn, { waitMs = 1000 } = {}) {
  const release = acquireLock(lockPath(statePath), { waitMs })
  if (release === null) return { locked: true }
  try {
    const host = createHost({ statePath })
    try {
      return { locked: false, value: fn(host) }
    } finally {
      host.dispose()
    }
  } finally {
    release()
  }
}
