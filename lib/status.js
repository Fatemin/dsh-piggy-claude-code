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

const never = () => null

export function readSnapshot(statePath) {
  const store = createStore(statePath, { setTimer: never, clearTimer: () => {} })
  return snapshot(store, { drain: false })
}

function formatLeft(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '快好了'
  const minutes = Math.ceil(seconds / 60)
  return minutes < 60 ? `${minutes}分` : `${Math.floor(minutes / 60)}时${minutes % 60}分`
}

export function statusLine(snap) {
  if (snap.pig === null || snap.hatched !== true) {
    return `${snap.boxStage?.emoji ?? '📦'} 纸盒里有动静…（pig hatch）`
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
    parts.push(`${snap.activity.emoji}${snap.activity.label} ${snap.activity.progress}% · 还剩${formatLeft(snap.activity.secondsLeft)}`)
  } else {
    parts.push(pig.moodEmoji)
  }
  return parts.join(' · ')
}
