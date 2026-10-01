/**
 * [dsh-piggy-claude-code mod] The three new features through the slash command:
 * world trips, several subjects at once (and the doctorate), and the rename
 * card — played on a real store, in Chinese and in English.
 *
 * Fares depend on the computer's time zone, so the numbers are checked against
 * core's own quote for the same zone rather than hard-coded.
 *
 * Run: node --test test/*.test.js
 */

import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { dispatch } from '../index.js'
import { createStore } from '../store.js'
import { tripQuote } from '../core.js'
import { RENAME_CARD } from '../data.js'
import { tr } from '../i18n.js'
import { PLACES, SOUVENIRS, placeByKey, systemUtcOffset } from '../world.js'

const MIN = 60_000

/** A hatched pig on a real store with a fake clock, in `lang`, with money to spend. */
function withPig(lang, fn) {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-pig-cli-'))
  let clock = Date.now()
  const store = createStore(join(dir, 'state.json'), { now: () => clock, setTimer: () => null, clearTimer: () => {} })
  try {
    assert.equal(store.hatch(), true)
    assert.equal(store.setLang(lang).ok, true)
    store.state.coins = 100_000
    const run = line => dispatch(store, 'pig', line)
    const tick = minutes => { clock += minutes * MIN; store.freshen() }
    return fn({ store, run, tick, t: (zh, params) => tr(lang, zh, params) })
  } finally {
    store.dispose()
    rmSync(dir, { recursive: true, force: true })
  }
}

for (const lang of ['zh', 'en']) {
  test(`${lang}: /pig trip lists every region and place, priced from this computer's time zone`, () => {
    withPig(lang, ({ store, run, t }) => {
      const reply = run('trip')
      assert.equal(reply.kind, 'success')
      const home = systemUtcOffset()
      for (const place of PLACES) {
        const quote = tripQuote(store.state, place.key, home)
        const line = reply.text.split('\n').find(l => l.includes(`(${place.key})`))
        assert.ok(line !== undefined, `${place.key} missing from /pig trip`)
        assert.ok(line.includes(t(place.label)), `${place.key} is not labelled in ${lang}: ${line}`)
        assert.ok(line.includes(t('{price} 金币', { price: quote.cost })) || line.includes(`${quote.cost} `), `${place.key} fare: ${line}`)
        assert.equal(quote.cost, 100 + 200 * quote.zones)
        assert.equal(quote.minutes, 60 + 60 * quote.zones)
      }
      assert.match(reply.text, new RegExp(`0/${SOUVENIRS.length}`))
      assert.ok(reply.text.includes(t('环球旅行家')), 'the grand title is named')
    })
  })

  test(`${lang}: /pig trip <place> takes a key or a label in any language and starts the trip`, () => {
    withPig(lang, ({ store, run, tick, t }) => {
      // A label in the pig's own language…
      const coins = store.state.coins
      const quote = tripQuote(store.state, 'tokyo', systemUtcOffset())
      const reply = run(`trip ${t('东京')}`)
      assert.equal(reply.kind, 'success')
      assert.equal(store.state.activity?.kind, 'trip')
      assert.equal(store.state.activity.key, 'tokyo')
      assert.equal(store.state.coins, coins - quote.cost)
      assert.ok(reply.text.includes(t('东京')), reply.text)
      assert.ok(reply.text.includes(String(quote.cost)), reply.text)
      // Already away: a refusal, not a second trip.
      assert.match(run('trip beijing').text, new RegExp(t('{name} 已经在外面了。', { name: store.state.name })))
      tick(24 * 60)
      assert.equal(store.state.activity, null)
      assert.equal(Object.keys(store.state.collected).length, 1, 'one souvenir came home')

      // …a label in another language, the key, and a spaced English name.
      for (const [input, key] of [['ソウル', 'seoul'], ['首尔', 'seoul'], ['Rio de Janeiro', 'rio'], ['newyork', 'newyork'], ['new york', 'newyork']]) {
        assert.equal(run(`trip ${input}`).kind, 'success', input)
        assert.equal(store.state.activity?.key, key, input)
        assert.equal(store.callOffActivity().ok, true)
      }

      // The old four trips are gone, and nonsense is refused.
      assert.equal(run('trip suburb').kind, 'error')
      assert.equal(run('trip mars').kind, 'error')
      assert.equal(store.state.activity, null)

      // Too poor for the fare.
      store.state.coins = 50
      const refused = run(`trip ${t(placeByKey('london').label)}`)
      assert.equal(store.state.activity, null)
      assert.match(refused.text, new RegExp(`${tripQuote(store.state, 'london', systemUtcOffset()).cost}`))
    })
  })

  test(`${lang}: /pig study takes several subjects up to the stage's limit, and the doctorate`, () => {
    withPig(lang, ({ store, run, t }) => {
      // No stage: 小学, one subject.
      assert.equal(run(`study ${t('语文')}`).kind, 'success')
      assert.deepEqual(store.state.activity.keys, ['chinese'])
      assert.equal(store.state.activity.stage, 'primary')
      assert.equal(store.callOffActivity().ok, true)

      // University is locked until every primary lesson is done.
      const locked = run(`study ${t('数学')} ${t('美术')} ${t('大学')}`)
      assert.equal(store.state.activity, null)
      assert.ok(locked.text.includes(t('小学九门课各上一次')), locked.text)

      store.state.lessonsByStage = { primary: 9, college: 9, graduate: 9, doctor: 0 }
      const coins = store.state.coins
      const pair = run(`study ${t('数学')}, ${t('美术')} ${t('大学')}`)
      assert.equal(pair.kind, 'success')
      assert.deepEqual(store.state.activity.keys, ['mathematics', 'art'])
      assert.equal(store.state.activity.stage, 'college')
      assert.equal(store.state.coins, coins - 2 * 220)
      assert.ok(pair.text.includes(t('{stage}{subjects}', { stage: t('大学'), subjects: [t('数学'), t('美术')].join(t('+')) })), pair.text)
      assert.equal(store.callOffActivity().ok, true)

      // Three at university is one too many; the refusal says how many fit.
      const many = run(`study ${t('数学')}、${t('美术')}、${t('音乐')} ${t('大学')}`)
      assert.equal(store.state.activity, null)
      assert.ok(many.text.includes(t('{stage}一次最多上 {max} 门课。', { stage: t('大学'), max: 2 })), many.text)

      // Stage first, keys instead of labels, the doctorate takes three.
      assert.equal(run('study doctor chinese music wushu').kind, 'success')
      assert.deepEqual(store.state.activity.keys, ['chinese', 'music', 'wushu'])
      assert.equal(store.state.activity.stage, 'doctor')
      assert.equal(store.callOffActivity().ok, true)
      assert.equal(run(`study ${t('语文')} ${t('音乐')} ${t('武术')} ${t('博士')}`).kind, 'success')
      assert.equal(store.state.activity.stage, 'doctor')
      assert.equal(store.callOffActivity().ok, true)

      // Gibberish gets the usage, which names the new stage.
      const usage = run('study quantum basketweaving')
      assert.equal(usage.kind, 'error')
      assert.ok(usage.text.includes(t('博士')), usage.text)
    })
  })

  test(`${lang}: /pig name is free once, then costs a rename card`, () => {
    withPig(lang, ({ store, run, t }) => {
      const card = t(RENAME_CARD.label)
      // The default name may be swapped for free.
      const first = run('name Bao')
      assert.equal(first.kind, 'success')
      assert.equal(store.state.name, 'Bao')
      assert.ok(first.text.includes(card), 'says that the next rename needs a card')

      // Now it takes a card: the reply says what it costs and where to get it.
      const refused = run('name Mochi')
      assert.equal(store.state.name, 'Bao')
      assert.ok(refused.text.includes(card) && refused.text.includes(String(RENAME_CARD.price)) && refused.text.includes(`buy ${RENAME_CARD.key}`), refused.text)

      // The shop has a shelf for it; /pig use explains it is spent by renaming.
      const shop = run('shop').text
      assert.ok(shop.includes(t('道具')) && shop.includes(card), shop)
      assert.equal(run(`buy ${card}`).kind, 'success')
      assert.equal(store.state.inventory[RENAME_CARD.key], 1)
      assert.ok(run(`use ${RENAME_CARD.key}`).text.includes('/pig name'))
      assert.equal(store.state.inventory[RENAME_CARD.key], 1)

      const renamed = run('name Mochi')
      assert.equal(store.state.name, 'Mochi')
      assert.equal(store.state.inventory[RENAME_CARD.key], 0)
      assert.ok(renamed.text.includes(card), renamed.text)

      // Same name and an overlong one change nothing and spend nothing.
      assert.ok(run('name Mochi').text.includes('Mochi'))
      assert.equal(run(`name ${'x'.repeat(17)}`).kind, 'error')
      assert.equal(store.state.name, 'Mochi')

      // Travel-only specialties are never for sale.
      const coins = store.state.coins
      assert.ok(run(`buy ${t('北京烤鸭')}`).text.includes(t('北京烤鸭')))
      assert.equal(store.state.coins, coins)
      assert.equal(store.state.inventory.duck ?? 0, 0)
    })
  })
}
