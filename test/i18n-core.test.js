/**
 * [dsh-piggy-claude-code mod] The game logic speaks the pig's language.
 *
 * Plays a pig through a real store — growing up, a shift, a lesson, a trip,
 * falling ill, dying and being revived — after switching it to English or
 * Japanese, and checks that nothing the snapshot or the command replies carry
 * is still Chinese. The pig's name is user data and memories written before the
 * switch stay in the language they were written in, so both are left out.
 *
 * Run: node --test test/*.test.js
 */

import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { dispatch, snapshot } from '../index.js'
import { createStore } from '../store.js'
import { hatchEgg, mood, setLang } from '../core.js'
import { tr } from '../i18n.js'
import coreLocale from '../locales/core.js'
import dataLocale from '../locales/data.js'
import indexLocale from '../locales/index.js'

const MIN = 60_000
const HAN = /[一-鿿]/

/** Play one pig through every path and collect what a player would see. */
function playThrough(lang) {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-pig-i18n-'))
  // snapshot() reads Date.now() too, so the fake clock only ever runs ahead of it.
  let clock = Date.now()
  const store = createStore(join(dir, 'state.json'), {
    now: () => clock,
    setTimer: () => null,
    clearTimer: () => {},
  })
  const tick = minutes => { clock += minutes * MIN }
  const seen = []
  const collected = () => seen

  try {
    assert.equal(store.hatch(), true)
    assert.equal(store.setLang(lang).ok, true)
    const before = new Set(store.state.memories)
    // The name is user data and shows up inside messages, so give it one with no Han.
    assert.equal(store.rename('Bo'), 'Bo')
    const shot = () => {
      const snap = snapshot(store, { drain: false })
      // The pig's name is user data; the language list names each language in itself.
      const { langs, ...rest } = snap
      assert.ok(Array.isArray(langs))
      const pig = rest.pig === null ? null : {
        ...rest.pig,
        name: undefined,
        memories: rest.pig.memories.filter(line => !before.has(line)),
      }
      seen.push(JSON.stringify({ ...rest, pig }))
      return snap
    }
    const reply = text => { seen.push(text); return text }

    // Grow up by weight.
    store.state.weightG = 21_000
    tick(1)
    store.freshen()
    const grown = shot()
    assert.equal(grown.pig.stage.key, 'young')
    assert.ok(grown.pending.some(event => event.kind === 'stage'))

    // Bags and care.
    assert.equal(store.buy('apple').ok, true)
    assert.equal(store.act('feed', 'apple').ok, true)
    assert.equal(store.buy('soap').ok, true)
    tick(2)
    assert.equal(store.useItem('soap').ok, true)
    assert.equal(store.act('play').ok, true)
    assert.equal(store.act('pet').ok, true)

    // A shift: seen while away, then paid out.
    assert.equal(store.startWork('odd').ok, true)
    tick(3)
    const working = shot()
    assert.equal(working.activity.kind, 'work')
    assert.equal(store.act('feed').reason, 'away')
    tick(30)
    store.freshen()
    assert.ok(shot().pending.some(event => event.kind === 'work'))

    // A lesson and a trip, one of them called off.
    assert.equal(store.startStudy('chinese', 'primary').ok, true)
    tick(5)
    const studying = shot()
    assert.equal(studying.activity.key, 'chinese')
    tick(40)
    store.freshen()
    assert.equal(store.startTrip('suburb').ok, true)
    tick(90)
    store.freshen()
    assert.equal(store.startTrip('suburb').ok, true)
    assert.equal(store.callOffActivity().ok, true)

    // Neglect it until it falls ill.
    store.state.satiety = 5
    store.state.cleanliness = 5
    tick(15)
    store.freshen()
    const sick = shot()
    assert.equal(sick.pig.mood, 'sick')
    assert.notEqual(sick.pig.illness, null)

    // Death, the grave, and the revive item.
    assert.equal(store.dev({ dead: true }), true)
    const grave = shot()
    assert.equal(grave.dead, true)
    assert.ok(grave.pending.some(event => event.kind === 'death'))
    assert.equal(store.buy('soul').ok, true)
    assert.equal(store.useItem('soul').ok, true)
    const back = shot()
    assert.equal(back.dead, false)
    assert.ok(back.pending.some(event => event.kind === 'revived'))
    shot()

    // Replies the command writes itself, without render.js.
    for (const line of ['shop', 'calloff', 'work nowhere', 'trip nowhere', 'study nothing', 'buy nothing', 'use nothing', 'look sideways', 'look original', 'name', 'frobnicate', 'hatch']) {
      reply(dispatch(store, 'pig', line).text.split('\n\n')[0])
    }
    return { seen: collected(), store }
  } finally {
    store.dispose()
    rmSync(dir, { recursive: true, force: true })
  }
}

test('an English pig: no Chinese anywhere in the snapshot or the command replies', () => {
  const { seen } = playThrough('en')
  for (const text of seen) {
    const at = text.search(HAN)
    assert.equal(at, -1, `Chinese left in: …${text.slice(Math.max(0, at - 80), at + 40)}…`)
  }
  const all = seen.join('\n')
  for (const phrase of ['Young pig', 'Odd jobs', 'Reading (Primary school)', 'Picnic', 'Cold', 'Revival pill', 'Grave', 'coins']) {
    assert.ok(all.includes(phrase), `${phrase} missing`)
  }
})

test('a Japanese pig: the Chinese-only phrases are gone', () => {
  const { seen } = playThrough('ja')
  const all = seen.join('\n')
  for (const zh of ['金币', '打零工', '青年猪', '长成了', '得了', '还魂丹', '墓碑', '纸盒', '郊游', '小学语文', '提前回来', '已经走了', '没有「']) {
    assert.ok(!all.includes(zh), `${zh} is still there`)
  }
  for (const ja of ['わかブタ', 'ちょいバイト', 'コイン', 'よみがえりの薬', 'かぜ', '小学校のこくご']) {
    assert.ok(all.includes(ja), `${ja} missing`)
  }
})

test('Chinese stays the default and reads as before', () => {
  const pig = hatchEgg(Date.now())
  assert.equal(pig.lang, 'zh')
  assert.equal(pig.name, '猪猪')
  assert.equal(mood(pig, Date.now()).label, '还不错')
  setLang(pig, 'en', Date.now())
  assert.equal(mood(pig, Date.now()).label, 'Doing fine')
  assert.equal(pig.name, 'Piggy', 'a default name follows the language (chosen names never do)')
  assert.equal(tr('en', '小学语文'), 'Reading (Primary school)')
})

test('the three game-logic dictionaries have the same keys in ja and en', () => {
  for (const [file, locale] of Object.entries({ data: dataLocale, core: coreLocale, index: indexLocale })) {
    const ja = Object.keys(locale.ja).sort()
    const en = Object.keys(locale.en).sort()
    assert.deepEqual(ja, en, `locales/${file}.js`)
    assert.ok(ja.length > 0, `locales/${file}.js is empty`)
    for (const lang of ['ja', 'en']) {
      for (const [zh, text] of Object.entries(locale[lang])) {
        assert.equal(typeof text, 'string', `${file} ${lang} ${zh}`)
        assert.notEqual(text.trim(), '', `${file} ${lang} ${zh}`)
        // Every placeholder in the key survives the translation.
        const wanted = (zh.match(/\{\w+\}/g) ?? []).sort()
        const got = (text.match(/\{\w+\}/g) ?? []).sort()
        assert.deepEqual(got, wanted, `${file} ${lang} ${zh}`)
        if (lang === 'en') assert.equal(text.match(HAN), null, `${file} en ${zh} → ${text}`)
      }
    }
  }
})
