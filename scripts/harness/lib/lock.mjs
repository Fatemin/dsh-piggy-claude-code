// Repository-wide exclusive locks in the shared git directory, so every
// worktree and every concurrent session sees the same lock. Acquisition is an
// atomic exclusive create. A lock left by a crashed process is reported, never
// deleted automatically: whoever removes it must first confirm its owner is gone.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const lockFile = (dir, name) => path.join(dir, `harness-${name}.lock`)

export function readLock(dir, name) {
  const file = lockFile(dir, name)
  let text
  try { text = fs.readFileSync(file, 'utf8') } catch (e) {
    if (e.code === 'ENOENT') return null
    return { file, unreadable: e.message }
  }
  try { return { file, ...JSON.parse(text) } } catch { return { file, unreadable: 'owner record is not JSON' } }
}

/** Take the lock or throw with the current owner. Returns a release function. */
export function acquire(dir, name, purpose) {
  const file = lockFile(dir, name)
  const owner = { purpose, pid: process.pid, host: os.hostname(), acquired_at: new Date().toISOString() }
  let fd
  try {
    fd = fs.openSync(file, 'wx')
  } catch (e) {
    if (e.code !== 'EEXIST') throw e
    const current = readLock(dir, name)
    const err = new Error(
      `lock ${name} is held (${JSON.stringify(current)}). Wait for its owner; if the owner process is ` +
      `confirmed gone, remove ${file} by hand. Never delete it to force concurrency.`,
    )
    err.code = 'ELOCKED'
    err.owner = current
    throw err
  }
  fs.writeSync(fd, JSON.stringify(owner))
  fs.closeSync(fd)
  let released = false
  return () => {
    if (released) return
    released = true
    // Release only our own lock: a hand-removed and re-taken lock is someone else's.
    const current = readLock(dir, name)
    if (current && current.pid === owner.pid && current.acquired_at === owner.acquired_at) fs.rmSync(file, { force: true })
  }
}
