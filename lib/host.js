/**
 * A pocket-sized DSH host for the unmodified upstream plugin.
 *
 * Upstream's `apply(ctx, config)` only touches four things on its context:
 * `on`, `inject(['webServer'])`, `inject(['commands'])` and `effect`. Faking
 * exactly those lets the real plugin run untouched — its routes, its command
 * table and its save logic — while Claude Code supplies the events.
 */

import { apply } from '../index.js'

/** Claude Code hook kinds → the DSH events upstream listens for. */
export const EVENTS = Object.freeze({
  message: ['agent/inbox/claimed'],
  turn: ['agent/turn-stopping'],
  tool: ['tools/result', {}, { isError: false }],
  toolError: ['tools/result', {}, { isError: true }],
  agentError: ['agent/error'],
})

export function createHost({ statePath, command = 'pig' }) {
  const listeners = new Map()
  const routes = []
  const disposers = []
  let commandHandler = null

  const services = {
    webServer: {
      register(route) {
        routes.push(route)
        return () => {
          const index = routes.indexOf(route)
          if (index !== -1) routes.splice(index, 1)
        }
      },
    },
    commands: {
      register(definition) {
        commandHandler = definition.handler
      },
    },
  }

  const ctx = {
    on(name, fn) {
      if (!listeners.has(name)) listeners.set(name, [])
      listeners.get(name).push(fn)
    },
    inject(names, callback) {
      const provided = {}
      for (const name of names) provided[name] = services[name]
      const dispose = callback(provided)
      if (typeof dispose === 'function') disposers.push(dispose)
    },
    effect(fn) {
      const dispose = fn()
      if (typeof dispose === 'function') disposers.push(dispose)
    },
  }

  apply(ctx, { statePath, command })

  function findRoute(path) {
    return routes.find(route => route.kind === 'exact' ? route.path === path : path === route.path || path.startsWith(route.path + '/')) ?? null
  }

  return {
    /** Feed the pig one Claude Code event (`message` / `turn` / `tool` / …). */
    emit(kind) {
      const event = EVENTS[kind]
      if (event === undefined) return false
      const [name, ...args] = event
      for (const fn of listeners.get(name) ?? []) fn(...args)
      return true
    },

    /** Upstream's route for this path, or null. */
    route: findRoute,

    /** Run the `/pig …` command table; returns `{ kind, text }`. */
    command(rawInput) {
      if (commandHandler === null) return { kind: 'error', text: 'pig command not registered' }
      return commandHandler({ rawInput })
    },

    /** Unregister routes and flush the save to disk. */
    dispose() {
      while (disposers.length > 0) {
        try { disposers.pop()() } catch { /* best effort */ }
      }
    },
  }
}
