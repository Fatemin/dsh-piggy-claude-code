/**
 * Feed the pig one Claude Code event: through the panel server when it runs,
 * otherwise straight into the save under its lock.
 * @returns how it went: server · local · rejected · dropped · ignored.
 */

import { port, statePath } from './config.js'
import { EVENTS } from './host.js'
import { callServer, withLocalHost } from './reach.js'

export async function feed(kind, env = process.env) {
  if (!Object.hasOwn(EVENTS, kind)) return 'ignored'
  const remote = await callServer(port(env), '/pig/feed', { event: kind })
  if (remote.reached) return remote.ok ? 'server' : 'rejected'
  const local = withLocalHost(statePath(env), host => host.emit(kind))
  return local.locked ? 'dropped' : 'local'
}
