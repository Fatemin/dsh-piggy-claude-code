/**
 * Contract tests: the machine-readable blocks in docs/contracts/*.md against
 * the running code. A failure here means code and contract drifted apart: fix
 * the code, or update the contract document in the same branch (see
 * docs/agent/contracts.md). Never edit a block just to make this pass without
 * reading what changed.
 *
 * Run: node --test test/contracts.test.js
 */
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { apply, snapshot } from '../index.js'
import { STATE_VERSION, migrate } from '../core.js'
import {
  ALL_ITEMS, ILLNESS_CHAINS, ILLNESS_STAGE_HOURS, JOBS, KIND_ORDER, SCHOOL_STAGES, SELF_HEAL_CHANCE,
  SHOP, STAGE_HEALTH, SUBJECTS, TRAITS, TRAIT_ORDER, medicineForStage,
} from '../data.js'
import { PLACES, REGIONS } from '../world.js'
import { createStore } from '../store.js'
import { extractBlocks } from '../scripts/harness/contracts.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const blocks = doc => extractBlocks(readFileSync(join(ROOT, 'docs', 'contracts', doc), 'utf8'))
const sorted = list => [...list].sort()

function withStore(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-pig-contract-'))
  const store = createStore(join(dir, 'state.json'))
  try { return fn(store, dir) } finally { store.dispose?.(); rmSync(dir, { recursive: true, force: true }) }
}

// ---------------------------------------------------------------------------
// HOST.SNAPSHOT.V1
// ---------------------------------------------------------------------------

const host = blocks('host-snapshot.md')

test('HOST.SNAPSHOT.V1: top-level keys without a pig', () => {
  withStore(store => assert.deepEqual(sorted(Object.keys(snapshot(store))), sorted(host['snapshot-keys-empty'])))
})

test('HOST.SNAPSHOT.V1: top-level and pig keys with a pig', () => {
  withStore(store => {
    store.hatch()
    const snap = snapshot(store)
    assert.deepEqual(sorted(Object.keys(snap)), sorted(host['snapshot-keys']))
    assert.deepEqual(sorted(Object.keys(snap.pig)), sorted(host['pig-keys']))
  })
})

/** Boot the plugin with a fake host and return its registered routes. */
function routesOf(statePath) {
  const routes = {}
  const ctx = {
    on: () => {},
    effect: () => () => {},
    get: () => undefined,
    inject: (deps, fn) => {
      if (deps.includes('webServer')) fn({ webServer: { register: route => { routes[route.path] = route; return () => {} } } })
    },
  }
  apply(ctx, { statePath })
  return routes
}

async function post(route, body) {
  const req = { method: 'POST', url: route.path, async *[Symbol.asyncIterator]() { yield JSON.stringify(body) } }
  let status = 0
  let payload = ''
  const res = { writeHead: code => { status = code }, end: text => { payload = String(text) } }
  await route.handler(req, res)
  return { status, json: JSON.parse(payload) }
}

test('HOST.SNAPSHOT.V1: /act operations and receipt fields', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-pig-contract-'))
  try {
    const act = routesOf(join(dir, 'state.json'))['/dsh-pig/act']
    assert.ok(act, '/dsh-pig/act registered')
    const unknown = await post(act, { action: 'no-such-action' })
    assert.equal(unknown.status, 400)
    assert.deepEqual(sorted(unknown.json.allowed), sorted(host['act-operations']))
    // A refused operation: the receipt is snapshot + verdict, and the verdict wins.
    const refused = await post(act, { action: 'work', job: 'no-such-job' })
    assert.equal(refused.json.ok, false)
    // JSON drops undefined verdict fields, so only fields actually sent are checked.
    const extra = Object.keys(refused.json).filter(key => !host['snapshot-keys-empty'].includes(key) && !host['snapshot-keys'].includes(key))
    for (const key of extra) assert.ok(host['act-receipt-keys'].includes(key), `unregistered receipt field ${key}`)
    assert.ok(Object.hasOwn(refused.json, 'reason'), 'a refusal carries its reason')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------------------
// GAME.RULES.V1
// ---------------------------------------------------------------------------

const rules = blocks('game-rules.md')

test('GAME.RULES.V1: table keys match the registry', () => {
  assert.deepEqual(JOBS.map(j => j.key), rules['job-keys'])
  assert.deepEqual(SUBJECTS.map(s => s.key), rules['subject-keys'])
  assert.deepEqual(SCHOOL_STAGES.map(s => s.key), rules['school-stage-keys'])
  assert.deepEqual(SHOP.map(i => i.key), rules['shop-keys'])
  assert.deepEqual([...KIND_ORDER], rules['item-kinds'])
  assert.deepEqual(ILLNESS_CHAINS.map(c => c.stages.map(s => s.name)), rules['illness-chains'])
  assert.deepEqual(REGIONS.map(r => r.key), rules['region-keys'])
  assert.deepEqual(PLACES.map(p => p.key), rules['place-keys'])
})

test('GAME.RULES.V1: every job has exactly the registered fields', () => {
  for (const job of JOBS) assert.deepEqual(sorted(Object.keys(job)), sorted(rules['job-fields']), job.key)
})

test('GAME.RULES.V1: job invariants', () => {
  for (const job of JOBS) {
    assert.ok(TRAIT_ORDER.includes(job.trait), `${job.key}: trait ${job.trait}`)
    assert.ok(job.minutes > 0, `${job.key}: minutes`)
    if (job.tier === 'pro') assert.ok(job.requires && Object.keys(job.requires).length > 0, `${job.key}: pro needs requires`)
    for (const trait of Object.keys(job.requires ?? {})) assert.ok(Object.hasOwn(TRAITS, trait), `${job.key}: requires ${trait}`)
    if (job.random !== null) assert.ok(job.random[0] < job.random[1], `${job.key}: random range`)
  }
})

test('GAME.RULES.V1: illness invariants', () => {
  for (const chain of ILLNESS_CHAINS) assert.equal(chain.stages.length, 4, chain.name)
  for (const table of [ILLNESS_STAGE_HOURS, STAGE_HEALTH, SELF_HEAL_CHANCE]) assert.equal(table.length, 4)
  for (const stage of [1, 2, 3, 4]) assert.ok(medicineForStage(stage), `medicine for stage ${stage}`)
})

test('GAME.RULES.V1: items and places invariants', () => {
  for (const item of SHOP) assert.ok(KIND_ORDER.includes(item.kind), `${item.key}: kind ${item.kind}`)
  const keys = ALL_ITEMS.map(item => item.key)
  assert.equal(new Set(keys).size, keys.length, 'item keys unique')
  const regions = REGIONS.map(r => r.key)
  for (const place of PLACES) assert.ok(regions.includes(place.region), `${place.key}: region ${place.region}`)
})

// ---------------------------------------------------------------------------
// STORE.SAVE.V5
// ---------------------------------------------------------------------------

const save = blocks('save-format.md')

test('STORE.SAVE.V5: version and state keys', () => {
  assert.equal(STATE_VERSION, save['state-version'])
  assert.deepEqual(sorted(Object.keys(migrate({}))), sorted(save['state-keys']))
})

test('STORE.SAVE.V5: migrate is total and idempotent', () => {
  for (const notASave of [null, undefined, [], 'pig', 42]) assert.equal(migrate(notASave), null)
  for (const raw of [{}, { coins: 10, version: 1 }, { dead: true }, { hatched: true, xp: 300, traits: { intel: 4 } }]) {
    const once = migrate(raw)
    assert.deepEqual(migrate(JSON.parse(JSON.stringify(once))), once)
  }
})

// ---------------------------------------------------------------------------
// I18N.TERMS.V1
// ---------------------------------------------------------------------------

const i18n = blocks('i18n.md')
const placeholders = text => [...String(text).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort()

test('I18N.TERMS.V1: every module has ja and en with the same keys and placeholders', async () => {
  for (const name of i18n['locale-modules']) {
    const table = (await import(`../locales/${name}.js`)).default
    const langs = i18n.languages.filter(lang => lang !== 'zh')
    assert.deepEqual(sorted(Object.keys(table)), sorted(langs), name)
    assert.deepEqual(sorted(Object.keys(table.ja)), sorted(Object.keys(table.en)), `${name}: ja/en key sets`)
    for (const lang of langs) {
      for (const [source, text] of Object.entries(table[lang])) {
        assert.deepEqual(placeholders(text), placeholders(source), `${name}.${lang}: ${source}`)
      }
    }
  }
})

test('I18N.TERMS.V1: every player-facing table label is translated', async () => {
  const data = (await import('../locales/data.js')).default
  const labels = [...JOBS, ...SUBJECTS, ...SCHOOL_STAGES, ...SHOP, ...PLACES, ...REGIONS].map(entry => entry.label)
  for (const lang of ['ja', 'en']) {
    assert.deepEqual(labels.filter(label => !Object.hasOwn(data[lang], label)), [], `untranslated in ${lang}`)
  }
})
