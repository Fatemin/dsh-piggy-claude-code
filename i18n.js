/**
 * [dsh-piggy-claude-code mod] Chinese · Japanese · English.
 *
 * gettext-style: the Chinese text already in the code IS the key, so upstream
 * strings stay readable and a missing translation falls back to Chinese rather
 * than to a blank. Placeholders are `{name}` and filled from `params`.
 *
 *   tr('ja', '{name} 长成了{stage}', { name: '猪猪', stage: tr('ja', '青年猪') })
 *
 * Dictionaries live in `locales/<module>.js`, one per source module, each
 * exporting `{ ja: { 中文: '日本語' }, en: { 中文: 'English' } }`.
 *
 * The browser panel (client.js) cannot import this; it carries its own copy of
 * the same idea and gets the language from the snapshot's `lang`.
 */

import adapter from './locales/adapter.js'
import core from './locales/core.js'
import data from './locales/data.js'
import index from './locales/index.js'
import render from './locales/render.js'

export const LANGS = Object.freeze(['zh', 'ja', 'en'])
export const LANG_NAMES = Object.freeze({ zh: '中文', ja: '日本語', en: 'English' })

/** 'ja-JP' / 'ja_JP.UTF-8' / 'zh-Hans' / 'en' → 'ja' / 'zh' / 'en'; anything else → null. */
export function normalizeLang(value) {
  if (typeof value !== 'string') return null
  const head = value.trim().toLowerCase().slice(0, 2)
  return LANGS.includes(head) ? head : null
}

/**
 * The language a brand-new pig starts in: `PIG_LANG` when a host set it (the
 * desktop apps pass the system language), otherwise Chinese like upstream.
 */
export function defaultLang(env = typeof process === 'undefined' ? {} : process.env) {
  return normalizeLang(env.PIG_LANG) ?? 'zh'
}

/** The pig's language, falling back to the default for "no pig yet". */
export const langOf = state => normalizeLang(state?.lang) ?? defaultLang()

const DICTS = { ja: {}, en: {} }
for (const module of [data, core, index, render, adapter]) {
  for (const lang of ['ja', 'en']) Object.assign(DICTS[lang], module?.[lang] ?? {})
}

/** Every translation, for tests and tooling. */
export const dictionaries = DICTS

const fill = (text, params) => (params === undefined || params === null
  ? text
  : text.replace(/\{(\w+)\}/g, (whole, key) => (Object.hasOwn(params, key) ? String(params[key]) : whole)))

/** Translate one Chinese source string into `lang`. */
export function tr(lang, zh, params) {
  if (typeof zh !== 'string') return zh
  const target = normalizeLang(lang) ?? 'zh'
  const text = target === 'zh' ? zh : (DICTS[target][zh] ?? zh)
  return fill(text, params)
}
