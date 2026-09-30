import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import adapter from '../locales/adapter.js'
import { hatchEgg, layEgg, migrate } from '../core.js'
import { defaultLang, dictionaries, LANGS, normalizeLang, tr } from '../i18n.js'
import { createHost } from '../lib/host.js'
import { readSnapshot, statusLine } from '../lib/status.js'

const HAN = /[一-鿿]/
const tempState = () => join(mkdtempSync(join(tmpdir(), 'pig-i18n-')), 'state.json')

test('language codes from locales and env are normalised', () => {
  assert.equal(normalizeLang('ja_JP.UTF-8'), 'ja')
  assert.equal(normalizeLang('zh-Hans-CN'), 'zh')
  assert.equal(normalizeLang('en-US'), 'en')
  assert.equal(normalizeLang('fr-FR'), null)
  assert.equal(defaultLang({}), 'zh', 'Chinese like upstream when nothing is set')
  assert.equal(defaultLang({ PIG_LANG: 'ja-JP' }), 'ja')
  assert.deepEqual([...LANGS], ['zh', 'ja', 'en'])
})

test('tr falls back to Chinese and fills placeholders', () => {
  assert.equal(tr('en', '还剩{left}', { left: '5 min' }), '5 min left')
  assert.equal(tr('zh', '还剩{left}', { left: '5 分' }), '还剩5 分')
  assert.equal(tr('en', '一句没有翻译的话'), '一句没有翻译的话')
  assert.equal(tr('xx', '退出'), '退出', 'unknown language → Chinese')
})

test('every dictionary has the same keys in ja and en', () => {
  assert.deepEqual(Object.keys(adapter.ja).sort(), Object.keys(adapter.en).sort())
  assert.deepEqual(Object.keys(dictionaries.ja).sort(), Object.keys(dictionaries.en).sort())
})

test('the language is saved with the pig; old saves stay Chinese', () => {
  const previous = process.env.PIG_LANG
  try {
    process.env.PIG_LANG = 'en'
    assert.equal(layEgg(0).lang, 'en', 'a new pig takes the host default')
    delete process.env.PIG_LANG
    assert.equal(layEgg(0).lang, 'zh')
  } finally {
    if (previous === undefined) delete process.env.PIG_LANG
    else process.env.PIG_LANG = previous
  }
  const old = hatchEgg(0)
  delete old.lang
  assert.equal(migrate(JSON.parse(JSON.stringify(old))).lang, 'zh')
})

test('switching language works before hatching and is kept in the save', () => {
  const file = tempState()
  const host = createHost({ statePath: file })
  const route = host.route('/dsh-pig/act')
  assert.ok(route)
  // No save yet: switching must leave an unopened box that remembers it.
  host.command('lang ja')
  host.dispose()
  const saved = JSON.parse(readFileSync(file, 'utf8'))
  assert.equal(saved.lang, 'ja')
  assert.equal(saved.hatched, false)
  assert.equal(readSnapshot(file).lang, 'ja')
})

test('the status line speaks the pig\'s language', () => {
  const file = tempState()
  const host = createHost({ statePath: file })
  host.command('lang en')
  host.dispose()
  assert.equal(HAN.test(statusLine(readSnapshot(file))), false, 'box line in English')

  const snap = {
    lang: 'en', hatched: true, dead: false, maxHealth: 5,
    pig: { name: 'Piggy', stage: { emoji: '🐖' }, satiety: 50, happiness: 50, cleanliness: 50, health: 5, coins: 10, illness: null, moodEmoji: '😊' },
    activity: { emoji: '🧱', label: 'Bricks', progress: 40, secondsLeft: 3900 },
  }
  assert.match(statusLine(snap), /1 h 5 min left/)
  assert.match(statusLine({ ...snap, lang: 'ja' }), /あと1時間5分/)
  assert.match(statusLine({ ...snap, lang: 'zh' }), /还剩1时5分/)
})

test('switching language renames a default-named pig, never a chosen name', async () => {
  const { setLang } = await import('../core.js')
  const pig = hatchEgg(0)
  assert.equal(pig.name, '猪猪')
  setLang(pig, 'en', 0)
  assert.equal(pig.name, 'Piggy')
  setLang(pig, 'ja', 0)
  assert.equal(pig.name, 'ブーちゃん')
  pig.name = '大花'
  setLang(pig, 'en', 0)
  assert.equal(pig.name, '大花')
})
