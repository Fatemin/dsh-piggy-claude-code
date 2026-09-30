#!/usr/bin/env node
/**
 * Terminal command, same verbs as upstream's `/pig`:
 *
 *   pig                      状态卡
 *   pig hatch | feed | bathe | play | pet
 *   pig work odd | study 数学 小学 | trip suburb | shop | buy 苹果 | use 苹果 …
 *   pig serve                启动面板服务（http://127.0.0.1:41717/）
 *   pig status-line          只打印一行（给 statusLine 用）
 *
 * Runs outside the model on purpose — a Claude Code slash command would cost
 * tokens and tell the model the pig exists.
 */

import { port, statePath } from '../lib/config.js'
import { callServer, withLocalHost } from '../lib/reach.js'
import { startServer } from '../lib/server.js'
import { readSnapshot, statusLine } from '../lib/status.js'
import { defaultLang, tr } from '../i18n.js'

async function main(argv) {
  const [verb = ''] = argv

  if (verb === 'serve') {
    const server = await startServer({ port: port(), statePath: statePath() })
    console.log(`🐖 ${tr(defaultLang(), '面板：{url}（Ctrl+C 退出）', { url: server.url })}`)
    const stop = () => server.close().then(() => process.exit(0))
    process.on('SIGINT', stop)
    process.on('SIGTERM', stop)
    // Started by the desktop app: leave (and flush) when it is gone.
    const parent = Number.parseInt(process.env.PIG_PARENT_PID ?? '', 10)
    if (Number.isInteger(parent) && parent > 1) {
      setInterval(() => {
        try { process.kill(parent, 0) } catch (error) { if (error?.code === 'ESRCH') stop() }
      }, 2000).unref()
    }
    return
  }

  if (verb === 'status-line') {
    try { console.log(statusLine(readSnapshot(statePath()))) } catch { console.log('🐖 ?') }
    return
  }

  const input = argv.join(' ')
  const remote = await callServer(port(), '/pig/cmd', { input }, { timeoutMs: 3000 })
  let result
  if (remote.reached) {
    result = remote.ok ? remote.value : { kind: 'error', text: tr(defaultLang(), '面板服务返回 {status}', { status: remote.status }) }
  } else {
    const local = withLocalHost(statePath(), host => host.command(input), { waitMs: 3000 })
    result = local.locked ? { kind: 'error', text: tr(defaultLang(), '存档被别的进程占着，稍后再试') } : local.value
  }
  const text = typeof result?.text === 'string' ? result.text : JSON.stringify(result)
  if (result?.kind === 'error') {
    console.error(text)
    process.exitCode = 1
  } else {
    console.log(text)
  }
}

main(process.argv.slice(2)).catch(error => {
  console.error(`🐖 ${error instanceof Error ? error.message : error}`)
  process.exitCode = 1
})
