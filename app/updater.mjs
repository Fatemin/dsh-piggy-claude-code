/**
 * Update prompt and one-click install for the desktop pig.
 *
 * Looks at the latest GitHub release shortly after launch and every few hours.
 * A newer version gets one dialog per launch (立即更新 / 稍后) and stays in the
 * tray menu until installed. Updating downloads the installer and replaces the
 * app in place:
 *
 * - Windows: run the NSIS installer silently (`/S --force-run` restarts the pig)
 *   and quit so it can overwrite the files.
 * - macOS: copy the app out of the dmg next to the installed one, then quit and
 *   let a small detached script swap the bundles and reopen the pig.
 *
 * Where that cannot work (a development run, an app started from the dmg or
 * from a folder we may not write to) the dialog offers the download page.
 */

import { app, dialog, shell } from 'electron'
import { spawn } from 'node:child_process'
import { accessSync, constants, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { bundleOf, download, fetchLatest, MAC_SWAP_SCRIPT, stageMacApp } from './update-core.mjs'

const FIRST_CHECK_MS = 20 * 1000
const CHECK_EVERY_MS = 6 * 60 * 60 * 1000

/**
 * `translate(zh, params)` speaks the pig's current language; `onChange` is
 * called whenever the tray menu should be rebuilt.
 */
export function createUpdater({ translate, onChange }) {
  let available = null
  let busy = null // 'checking' | 'downloading' | 'installing'
  let progress = 0
  const prompted = new Set()
  const t = (zh, params) => translate(zh, params)
  const changed = () => { try { onChange() } catch { /* menu refresh is best effort */ } }

  /** Why this copy cannot replace itself, or null when it can. */
  function blocker() {
    if (!app.isPackaged) return 'dev'
    if (process.platform === 'win32') return null
    if (process.platform !== 'darwin') return 'platform'
    const bundle = bundleOf(app.getPath('exe'))
    if (bundle === null || bundle.startsWith('/Volumes/') || bundle.includes('/AppTranslocation/')) return 'location'
    try { accessSync(dirname(bundle), constants.W_OK) } catch { return 'location' }
    return null
  }

  async function ask(options) {
    if (process.platform === 'darwin') app.focus({ steal: true })
    return (await dialog.showMessageBox({ title: 'DSH Piggy', noLink: true, ...options })).response
  }

  async function check({ manual = false } = {}) {
    if (busy !== null) return
    busy = 'checking'
    changed()
    try {
      available = await fetchLatest({
        current: app.getVersion(),
        repo: process.env.PIGGY_UPDATE_REPO || undefined,
        feed: process.env.PIGGY_UPDATE_FEED || undefined,
      })
    } catch (error) {
      if (manual) await ask({ type: 'warning', message: t('检查更新失败'), detail: String(error?.message ?? error), buttons: [t('好')] })
      return
    } finally {
      busy = null
      changed()
    }
    if (available === null) {
      if (manual) await ask({ type: 'info', message: t('已经是最新版本 v{version}', { version: app.getVersion() }), buttons: [t('好')] })
      return
    }
    if (manual || !prompted.has(available.version)) {
      prompted.add(available.version)
      await offer()
    }
  }

  /** The prompt: what is new and an update button. */
  async function offer() {
    if (available === null || busy !== null) return
    const direct = blocker() === null && available.asset !== null
    const detail = [
      t('当前版本 v{current}，最新版本 v{version}', { current: app.getVersion(), version: available.version }),
      available.notes,
      direct ? '' : t('这份猪猪不能自己更新，请从下载页面下载新版本安装。'),
    ].filter(Boolean).join('\n\n')
    const response = await ask({
      type: 'info',
      message: t('猪猪有新版本 v{version}', { version: available.version }),
      detail,
      buttons: [direct ? t('立即更新') : t('打开下载页面'), t('稍后')],
      defaultId: 0,
      cancelId: 1,
    })
    if (response !== 0) return
    if (direct) await install()
    else shell.openExternal(available.url)
  }

  async function install() {
    const release = available
    busy = 'downloading'
    progress = 0
    changed()
    const dir = join(app.getPath('temp'), 'dsh-piggy-update')
    // Leftovers from an earlier attempt.
    rmSync(dir, { recursive: true, force: true })
    let lastShown = 0
    try {
      const file = await download(release.asset, dir, {
        onProgress: fraction => {
          progress = fraction
          // Rebuilding the menu on every chunk is wasteful; every 5% is plenty.
          if (fraction - lastShown >= 0.05 || fraction === 1) { lastShown = fraction; changed() }
        },
      })
      busy = 'installing'
      changed()
      if (process.platform === 'win32') {
        spawn(file, ['--updated', '/S', '--force-run'], { detached: true, stdio: 'ignore' }).unref()
      } else {
        const bundle = bundleOf(app.getPath('exe'))
        const staged = `${bundle}.update`
        await stageMacApp(file, staged)
        const script = join(dir, 'swap.sh')
        writeFileSync(script, MAC_SWAP_SCRIPT, { mode: 0o755 })
        spawn('/bin/sh', [script, String(process.pid), bundle, staged, file], { detached: true, stdio: 'ignore' }).unref()
      }
      // before-quit saves the pig as on any other quit.
      app.quit()
    } catch (error) {
      busy = null
      changed()
      rmSync(dir, { recursive: true, force: true })
      const response = await ask({
        type: 'warning',
        message: t('更新失败'),
        detail: String(error?.message ?? error),
        buttons: [t('打开下载页面'), t('好')],
        defaultId: 0,
        cancelId: 1,
      })
      if (response === 0) shell.openExternal(release.url)
    }
  }

  /** Tray menu entries for the current state. */
  function menuItems() {
    if (busy === 'downloading') return [{ label: t('正在下载更新… {percent}%', { percent: Math.round(progress * 100) }), enabled: false }]
    if (busy === 'installing') return [{ label: t('正在安装更新…'), enabled: false }]
    if (available !== null) return [{ label: '⬆️ ' + t('更新到 v{version}', { version: available.version }), click: () => offer() }]
    return [{ label: t('检查更新'), enabled: busy === null, click: () => check({ manual: true }) }]
  }

  function start() {
    setTimeout(() => check(), FIRST_CHECK_MS).unref?.()
    setInterval(() => check(), CHECK_EVERY_MS).unref?.()
  }

  return { check, menuItems, start }
}
