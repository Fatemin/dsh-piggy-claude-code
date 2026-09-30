/**
 * The panel server: the one long-lived owner of the save file.
 *
 * It serves upstream's own routes (`/dsh-pig/state|act|art`) plus a tiny shell
 * page that loads the unmodified `client.js`, and it accepts Claude Code events
 * from the hooks on `/pig/feed`. While it runs it holds the save lock, so hooks
 * never write behind its back.
 *
 * Bound to 127.0.0.1 only. Requests must name this server in `Host` (blocks DNS
 * rebinding) and, when a browser sends an `Origin`, it must be this server too
 * (blocks other pages from poking the pig).
 */

import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'

import { lockPath } from './config.js'
import { createHost } from './host.js'
import { acquireLock, lockOwner } from './lock.js'
import { readSnapshot, statusLine } from './status.js'

const BODY_LIMIT_BYTES = 2048
const PAGE = new URL('../web/index.html', import.meta.url)
const DESK = new URL('../web/desk.html', import.meta.url)
const CLIENT = new URL('../client.js', import.meta.url)

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' })
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body))
}

async function readJson(req) {
  let text = ''
  for await (const chunk of req) {
    text += chunk
    if (text.length > BODY_LIMIT_BYTES) return null
  }
  if (text.trim() === '') return {}
  try {
    const parsed = JSON.parse(text)
    return typeof parsed === 'object' && parsed !== null ? parsed : null
  } catch {
    return null
  }
}

export function startServer({ port, statePath }) {
  const release = acquireLock(lockPath(statePath), { waitMs: 2000 })
  if (release === null) {
    const owner = lockOwner(lockPath(statePath))
    return Promise.reject(new Error(`save is locked by pid ${owner?.pid ?? '?'} — another pig server is probably running`))
  }

  const host = createHost({ statePath })
  let allowedHosts = new Set()

  const server = createServer(async (req, res) => {
    try {
      if (!allowedHosts.has(req.headers.host ?? '')) return send(res, 403, { error: 'bad host' })
      const origin = req.headers.origin
      if (origin !== undefined && !allowedHosts.has(origin.replace(/^http:\/\//, ''))) {
        return send(res, 403, { error: 'bad origin' })
      }
      if (req.method === 'POST' && !String(req.headers['content-type'] ?? '').startsWith('application/json')) {
        return send(res, 415, { error: 'use application/json' })
      }

      const path = String(req.url ?? '/').split('?')[0]

      if (path === '/' && req.method === 'GET') return send(res, 200, readFileSync(PAGE), 'text/html; charset=utf-8')
      if (path === '/desk' && req.method === 'GET') return send(res, 200, readFileSync(DESK), 'text/html; charset=utf-8')
      // Read-only one-liner for the menu bar; unlike /dsh-pig/state it never
      // drains the announcements the panel is waiting to show.
      if (path === '/pig/peek' && req.method === 'GET') {
        const snap = readSnapshot(statePath)
        return send(res, 200, { line: statusLine(snap), lang: snap.lang })
      }
      if (path === '/client.js' && req.method === 'GET') return send(res, 200, readFileSync(CLIENT), 'text/javascript; charset=utf-8')
      if (path === '/pig/health') return send(res, 200, { ok: true, pid: process.pid })

      if (path === '/pig/feed' && req.method === 'POST') {
        const body = await readJson(req)
        if (body === null || host.emit(String(body.event ?? '')) === false) return send(res, 400, { error: 'unknown event' })
        res.writeHead(204).end()
        return
      }
      if (path === '/pig/cmd' && req.method === 'POST') {
        const body = await readJson(req)
        if (body === null) return send(res, 400, { error: 'bad body' })
        return send(res, 200, host.command(String(body.input ?? '')))
      }

      const route = host.route(path)
      if (route !== null) return await route.handler(req, res)
      send(res, 404, { error: 'not found' })
    } catch (error) {
      if (!res.headersSent) send(res, 500, { error: error instanceof Error ? error.message : String(error) })
    }
  })

  let closed = false
  const close = () => new Promise(resolve => {
    if (closed) return resolve()
    closed = true
    server.close(() => resolve())
    server.closeAllConnections?.()
    host.dispose()
    release()
  })

  return new Promise((resolve, reject) => {
    server.once('error', error => {
      host.dispose()
      release()
      reject(error)
    })
    server.listen(port, '127.0.0.1', () => {
      const bound = server.address().port
      allowedHosts = new Set([`127.0.0.1:${bound}`, `localhost:${bound}`])
      resolve({ port: bound, url: `http://127.0.0.1:${bound}/`, close })
    })
  })
}
