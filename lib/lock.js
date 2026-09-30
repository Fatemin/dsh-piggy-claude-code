/**
 * One writer per save file.
 *
 * Upstream's atomic rename keeps the file from tearing, but it cannot stop two
 * processes from each loading the pig, feeding it, and saving over each other.
 * Under Claude Code that is the normal case: every hook is its own process,
 * several sessions may run at once, and the panel server keeps a copy in memory.
 *
 * The lock is a directory (mkdir is atomic) holding the owner's pid. A lock
 * whose owner is gone is stale and is taken over, so a crashed process can
 * never wedge the pig.
 */

import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

/** A pid-less lock younger than this is someone halfway through acquiring it. */
const ACQUIRING_GRACE_MS = 5000

const sleep = new Int32Array(new SharedArrayBuffer(4))
const sleepSync = ms => Atomics.wait(sleep, 0, 0, ms)

function alive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    // EPERM: it exists, it just isn't ours.
    return error?.code === 'EPERM'
  }
}

/** Who holds the lock, or null when nobody usefully does. */
export function lockOwner(lockDir) {
  let pid = NaN
  try {
    pid = Number.parseInt(readFileSync(join(lockDir, 'pid'), 'utf8'), 10)
  } catch {
    try {
      const age = Date.now() - statSync(lockDir).mtimeMs
      return age < ACQUIRING_GRACE_MS ? { pid: null } : null
    } catch {
      return null
    }
  }
  return Number.isInteger(pid) && alive(pid) ? { pid } : null
}

/**
 * Take the lock, waiting up to `waitMs`.
 * @returns a release function, or null when someone else kept it.
 */
export function acquireLock(lockDir, { waitMs = 1000 } = {}) {
  const deadline = Date.now() + waitMs
  mkdirSync(dirname(lockDir), { recursive: true })
  for (;;) {
    try {
      mkdirSync(lockDir)
      writeFileSync(join(lockDir, 'pid'), String(process.pid))
      let released = false
      return () => {
        if (released) return
        released = true
        rmSync(lockDir, { recursive: true, force: true })
      }
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error
    }
    if (lockOwner(lockDir) === null) {
      rmSync(lockDir, { recursive: true, force: true })
      continue
    }
    if (Date.now() >= deadline) return null
    sleepSync(25)
  }
}
