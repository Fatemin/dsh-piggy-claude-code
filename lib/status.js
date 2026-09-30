/**
 * One line for Claude Code's status bar. Zero tokens: the status line is drawn
 * by the terminal UI and never reaches the model.
 *
 * Read-only by construction: the store gets a scheduler that never fires, so
 * lazily settling decay in memory can never turn into a write. Announcements
 * are left queued for the panel (`drain: false`).
 */

import { snapshot } from '../index.js'
import { createStore } from '../store.js'
import { tr } from '../i18n.js'

const never = () => null

export function readSnapshot(statePath) {
  const store = createStore(statePath, { setTimer: never, clearTimer: () => {} })
  return snapshot(store, { drain: false })
}

function formatLeft(lang, seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return tr(lang, '快好了')
  const minutes = Math.ceil(seconds / 60)
  return minutes < 60
    ? tr(lang, '{m}分', { m: minutes })
    : tr(lang, '{h}时{m}分', { h: Math.floor(minutes / 60), m: minutes % 60 })
}

export function statusLine(snap) {
  const lang = snap.lang
  if (snap.pig === null || snap.hatched !== true) {
    return `${snap.boxStage?.emoji ?? '📦'} ${tr(lang, '纸盒里有动静…（pig hatch）')}`
  }
  const pig = snap.pig
  if (snap.dead) return `${pig.stage.emoji}${pig.soul ? '👻' : ''} ${pig.name} · ${pig.ageLabel}`

  const parts = [
    `${pig.stage.emoji} ${pig.name}`,
    `🍚${pig.satiety} ❤️${pig.happiness} 🫧${pig.cleanliness} 💚${pig.health}/${snap.maxHealth}`,
    `🪙${pig.coins}`,
  ]
  if (pig.illness !== null) parts.push(`🤒${pig.illness.name}`)
  if (snap.activity !== null) {
    parts.push(`${snap.activity.emoji}${snap.activity.label} ${snap.activity.progress}% · ${tr(lang, '还剩{left}', { left: formatLeft(lang, snap.activity.secondsLeft) })}`)
  } else {
    parts.push(pig.moodEmoji)
  }
  return parts.join(' · ')
}
