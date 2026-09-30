/**
 * dsh-pig — a pig that lives in your DeepSeek Harness. 🐖
 *
 * The plugin registers no model-facing tool and injects no context, so the
 * model never learns the pig exists and the pig costs zero tokens per request.
 * Every listener body is wrapped so a pig bug can never veto or delay real work.
 *
 * Two ways the human interacts, both ending in the same core calls:
 *   - the floating pig's six icons → POST /dsh-pig/act
 *   - typing `/pig feed`           → the slash command
 * The GUI is the primary path; the command is the fallback.
 *
 * @module dsh-pig
 */

import { readFileSync } from 'node:fs'

import {
  ACTIONS,
  ACTION_ORDER,
  activityLabel,
  JOBS,
  MAX,
  REVIVE_ITEM,
  SCHOOL_STAGES,
  SHOP,
  SUBJECTS,
  TRAITS,
  TRAIT_ORDER,
  TRIPS,
  actionCooldownSeconds,
  activitySecondsLeft,
  awayBlockedReason,
  careView,
  courseView,
  currentIllness,
  formatWeight,
  healthPercent,
  inventoryView,
  ageDays,
  daysToNextStage,
  kgToNextStage,
  canChooseLook,
  langOf,
  hasSoul,
  LIFE_STAGES,
  lifeStageFor,
  mood,
  studyView,
  traitView,
} from './core.js'
import { jobByKey, traitBonus } from './data.js'
import {
  renderAbout,
  renderAction,
  renderBuy,
  renderHatch,
  renderNoPig,
  renderStatus,
  renderStudyReport,
  renderTooSoon,
  renderTripReport,
  renderUse,
  renderWeigh,
  renderWorkRefusal,
  renderWorkReport,
} from './render.js'
import { createStore } from './store.js'
import { LANGS, LANG_NAMES, tr } from './i18n.js'

export const name = 'dsh-piggy'

/**
 * No required services. The pig rides on emit-mode events, and it reaches the
 * optional web seam through the safe `ctx.get()` accessor rather than a
 * declared injection — reading an undeclared service as a property throws in
 * cordis and would take the whole plugin down.
 */
export const inject = []

const STATE_ROUTE = '/dsh-pig/state'
const ACT_ROUTE = '/dsh-pig/act'
const ART_ROUTE = '/dsh-pig/art'
const BODY_LIMIT_BYTES = 2048

const contained = fn => (...args) => {
  try { fn(...args) } catch { /* the pig absorbs its own mishaps */ }
}

function sendJson(res, status, body, extra = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...extra })
  res.end(JSON.stringify(body))
}

async function readJsonBody(req) {
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

/**
 * Every operation the panel can invoke. One table means the HTTP route and the
 * slash command cannot drift apart.
 */
const OPERATIONS = {
  hatch: store => ({ ok: true, hatched: store.hatch() }),
  adopt: store => ({ ok: store.adopt(), adopted: true }),
  reset: store => ({ ok: store.reset(), reset: true }),
  dev: (store, body) => ({ ok: store.dev(body.patch ?? {}), dev: true }),
  // The three care actions spend an item; `item` says which one.
  feed: (store, body) => store.act('feed', str(body.item)),
  bathe: (store, body) => store.act('bathe', str(body.item)),
  play: (store, body) => store.act('play', str(body.item)),
  pet: store => store.act('pet'),
  work: (store, body) => store.startWork(str(body.job)),
  study: (store, body) => store.startStudy(str(body.subject), str(body.stage)),
  trip: (store, body) => store.startTrip(str(body.trip)),
  calloff: store => store.callOffActivity(),
  // [dsh-piggy-claude-code mod] switch an elder pig's drawing.
  look: (store, body) => store.setLook(str(body.look)),
  lang: (store, body) => store.setLang(str(body.lang)),
  buy: (store, body) => store.buy(str(body.item)),
  use: (store, body) => store.useItem(str(body.item)),
}

const str = value => (typeof value === 'string' ? value : '')

export function apply(ctx, config = {}) {
  const commandName = typeof config.command === 'string' && /^[a-z][a-z0-9-]{0,23}$/.test(config.command)
    ? config.command
    : 'pig'
  const store = createStore(typeof config.statePath === 'string' && config.statePath.trim() !== ''
    ? config.statePath
    : undefined)

  ctx.on('agent/inbox/claimed', contained(() => store.feed('message')))
  ctx.on('agent/turn-stopping', contained(() => store.feed('turn')))
  ctx.on('agent/error', contained(() => store.feed('agentError')))
  ctx.on('tools/result', contained((exec, result) => {
    store.feed(result?.isError === true ? 'toolError' : 'tool')
  }))

  // ---- the routes the floating pig drives ----
  //
  // `ctx.inject` waits for the service instead of sampling it. The previous
  // version read `ctx.get('webServer')` at apply time and bailed out when it was
  // undefined — which is exactly what happened during profile activation, so
  // the routes were never registered and the panel polled a 404 forever. A
  // silent optionality guard is not the same thing as a tolerant one: this one
  // still degrades on a host with no web seam, but only *after* the service has
  // actually been waited for.
  ctx.inject(['webServer'], (webCtx) => {
    const webServer = webCtx.webServer
    if (webServer === undefined) return () => {}
    const disposers = []
    try {
      disposers.push(webServer.register({
        kind: 'exact',
        path: STATE_ROUTE,
        handler: async (req, res) => {
          if (req.method !== 'GET') return sendJson(res, 405, { error: 'method not allowed; use GET' }, { allow: 'GET' })
          try {
            sendJson(res, 200, snapshot(store), { 'cache-control': 'no-store' })
          } catch (error) {
            sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) })
          }
        },
      }))
      // The hand-drawn sprites for the piglet and the elder pig. Serving them
      // from the package keeps the art as real .svg files in the repository
      // rather than a blob embedded in the client bundle.
      disposers.push(webServer.register({
        kind: 'prefix',
        path: ART_ROUTE,
        handler: (req, res) => {
          if (req.method !== 'GET') return sendJson(res, 405, { error: 'method not allowed; use GET' }, { allow: 'GET' })
          const raw = String(req.url ?? '').split('?')[0]
          const name = raw.startsWith(ART_ROUTE + '/') ? raw.slice(ART_ROUTE.length + 1) : ''
          // Only the files this package ships: a fixed, boring name pattern, so
          // nothing from the request can ever walk out of ./assets.
          if (!/^[a-z][a-z0-9-]{0,31}\.svg$/.test(name)) return sendJson(res, 404, { error: 'not found' })
          try {
            const svg = readFileSync(new URL('./assets/' + name, import.meta.url))
            res.writeHead(200, { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'no-cache' })
            res.end(svg)
          } catch {
            sendJson(res, 404, { error: 'not found' })
          }
        },
      }))

      disposers.push(webServer.register({
        kind: 'exact',
        path: ACT_ROUTE,
        handler: async (req, res) => {
          if (req.method !== 'POST') return sendJson(res, 405, { error: 'method not allowed; use POST' }, { allow: 'POST' })
          const body = await readJsonBody(req)
          if (body === null) return sendJson(res, 413, { error: 'body too large or not JSON' })
          const operation = typeof body.action === 'string' ? body.action : ''
          const run = Object.hasOwn(OPERATIONS, operation) ? OPERATIONS[operation] : null
          if (run === null) {
            return sendJson(res, 400, { error: `unknown action "${operation}"`, allowed: Object.keys(OPERATIONS) })
          }
          const result = run(store, body)
          const snap = snapshot(store)
          // The operation's verdict must win over the snapshot's always-true
          // `ok`: spreading the snapshot last silently swallowed every refusal.
          sendJson(res, 200, {
            ...snap,
            ok: result.ok !== false,
            reason: result.reason,
            wait: result.wait,
            price: result.price,
          }, { 'cache-control': 'no-store' })
        },
      }))
    } catch {
      // A route already taken: the pig stays command-only rather than breaking
      // activation, but this is a real failure and should be visible.
      console.warn(tr(langOf(store.state), '[dsh-pig] 路由注册失败，猪只能用命令访问'))
    }
    return () => { for (const dispose of disposers) { try { dispose() } catch { /* best effort */ } } }
  })

  ctx.effect(() => () => store.dispose())

  ctx.inject(['commands'], (commandCtx) => {
    commandCtx.commands.register({
      name: commandName,
      description: 'your pig 🐖: status · study · work · shop · travel · bag',
      input: { hint: tr(langOf(store.state), '[hatch|feed|bathe|play|pet|study <科目>|work <job>|trip <目的地>|shop|buy|use|weigh|look <老年|原版>|lang <zh|ja|en>|about]') },
      handler: invocation => {
        try {
          return dispatch(store, commandName, String(invocation.rawInput ?? ''))
        } catch (error) {
          return { kind: 'error', text: tr(langOf(store.state), '🐖 猪摔了一跤：{error}', { error: error?.message ?? error }) }
        }
      },
    })
  })
}

// ---------------------------------------------------------------------------
// Snapshot — the single shape both routes and the panel read
// ---------------------------------------------------------------------------

/** The stage the panel shows before there is a pig: the cardboard box. */
function boxStageView(lang) {
  const box = LIFE_STAGES.find(stage => stage.key === 'box') ?? LIFE_STAGES[0]
  return { key: box.key, label: tr(lang, box.label), emoji: box.emoji, size: box.size, line: tr(lang, box.line) }
}

/** "今天刚出生" / "3 天大" / "刚拆开纸盒" — the pig's age in words. */
function formatAge(days, state, nowMs) {
  const lang = langOf(state)
  if (state.hatched !== true) return tr(lang, '还没拆开')
  // A tombstone is not "newborn today". Once the pig is gone its clock stops,
  // and what matters is how long it had — not how long ago it hatched.
  if (state.dead === true) {
    const lived = Math.max(0, (state.diedAt ?? nowMs) - state.bornAt)
    return tr(lang, '活了 {span}', { span: formatSpan(lived, lang) })
  }
  if (days < 1) return tr(lang, '今天刚出生')
  const whole = Math.floor(days)
  return whole === 1 ? tr(lang, '1 天大') : tr(lang, '{days} 天大', { days: whole })
}

/** "18 小时" / "3 天" / "2 小时" — a duration in the largest sensible unit. */
function formatSpan(ms, lang) {
  const hours = ms / 3_600_000
  if (hours < 1) return tr(lang, '{n} 分钟', { n: Math.max(1, Math.round(ms / 60000)) })
  if (hours < 48) return tr(lang, '{n} 小时', { n: Math.round(hours) })
  return tr(lang, '{n} 天', { n: Math.round(hours / 24) })
}

/** 0-100 through the current activity, for the scene's progress line. */
function activityProgress(activity, nowMs) {
  const span = activity.endsAt - activity.startedAt
  if (!Number.isFinite(span) || span <= 0) return 0
  return Math.max(0, Math.min(100, Math.round(((nowMs - activity.startedAt) / span) * 100)))
}

/** [dsh-piggy-claude-code mod] Languages the panel offers, each named in itself. */
const langChoices = () => LANGS.map(key => ({ key, label: LANG_NAMES[key] }))

export function snapshot(store, options = {}) {
  const drain = options.drain !== false
  const state = store.freshen()
  const nowMs = Date.now()

  if (state === null) {
    const lang = langOf(null)
    return {
      ok: true, hatched: false, dead: false, pig: null,
      lang, langs: langChoices(),
      actions: actionsFor(null, nowMs),
      jobs: jobsFor(null),
      subjects: subjectsFor(null),
      stages: SCHOOL_STAGES.map(stage => ({
        ...stage,
        label: tr(lang, stage.label),
        requires: stage.requires === null ? null : { ...stage.requires, label: tr(lang, stage.requires.label) },
      })),
      trips: tripsFor(null),
      shop: shopFor(null),
      inventory: inventoryView({ inventory: {} }),
      activity: null, canGoOut: false, awayBlocked: 'absent',
      // The box has a size of its own; the client must not hard-code it.
      boxStage: boxStageView(lang),
      pending: [],
      reviveItem: REVIVE_ITEM.key, maxHealth: MAX.health,
    }
  }

  const lang = langOf(state)
  const life = lifeStageFor(state, nowMs)
  const current = mood(state, nowMs)
  const illness = currentIllness(state)
  const activity = state.activity
  const pending = Array.isArray(state.pending) ? state.pending.slice() : []
  if (drain && pending.length > 0) store.drainPending()

  return {
    ok: true,
    // [dsh-piggy-claude-code mod] the pig's language, and what it can switch to.
    lang: langOf(state), langs: langChoices(),
    // The REAL flag, not "a save exists". A box produced by reset/adopt has a
    // save but is not hatched, and conflating the two made the box un-pokeable.
    hatched: state.hatched === true,
    dead: state.dead === true,
    boxStage: boxStageView(lang),
    pig: {
      name: state.name,
      // Age is the progression now, not a level.
      stage: { key: life.key, label: tr(lang, life.label), emoji: life.emoji, size: life.size, line: tr(lang, life.line), art: life.art ?? null, faded: life.faded === true },
      ageDays: Number(ageDays(state, nowMs).toFixed(2)),
      ageLabel: formatAge(ageDays(state, nowMs), state, nowMs),
      daysToNextStage: daysToNextStage(state, nowMs) === null ? null : Number(daysToNextStage(state, nowMs).toFixed(2)),
      // [dsh-piggy-claude-code mod] growth follows weight; elder look is switchable.
      kgToNextStage: kgToNextStage(state, nowMs) === null ? null : Number(kgToNextStage(state, nowMs).toFixed(1)),
      canChooseLook: canChooseLook(state),
      look: state.look === 'original' ? 'original' : 'elder',
      soul: hasSoul(state, nowMs),
      mood: current.key,
      moodEmoji: current.emoji,
      moodLabel: current.label,
      satiety: Math.round(state.satiety),
      happiness: Math.round(state.happiness),
      cleanliness: Math.round(state.cleanliness),
      health: state.health,
      healthPercent: healthPercent(state),
      weight: formatWeight(state.weightG),
      xp: state.xp,
      coins: state.coins,
      traits: traitView(state),
      courses: courseView(state),
      souvenirs: (state.souvenirs ?? []).slice(-30).map(souvenir => tr(lang, souvenir)),
      stageLine: tr(lang, life.line),
      illness: illness === null ? null : { name: tr(lang, illness.name), cure: tr(lang, illness.cure), stage: illness.stage, chain: tr(lang, illness.chain) },
      memories: state.memories.slice(-3),
    },
    actions: actionsFor(state, nowMs),
    jobs: jobsFor(state),
    subjects: subjectsFor(state),
    stages: studyView(state).map(stage => ({
      ...stage,
      label: tr(lang, stage.label),
      progress: stage.progress === null ? null : { ...stage.progress, label: tr(lang, stage.progress.label) },
    })),
    trips: tripsFor(state),
    shop: shopFor(state),
    inventory: inventoryView(state),
    care: Object.fromEntries(Object.entries(careView(state))
      .map(([action, items]) => [action, items.map(item => ({ ...item, label: tr(lang, item.label) }))])),
    activity: activity === null ? null : {
      kind: activity.kind,
      key: activity.key,
      label: activityLabel(activity, lang),
      emoji: activity.emoji,
      cost: activity.cost ?? 0,
      secondsLeft: activitySecondsLeft(state, nowMs),
      // How far along, so the panel can draw the pig actually getting on with it.
      progress: activityProgress(activity, nowMs),
    },
    canGoOut: awayBlockedReason(state) === null,
    awayBlocked: awayBlockedReason(state),
    pending,
    reviveItem: REVIVE_ITEM.key,
    maxHealth: MAX.health,
  }
}

function actionsFor(state, nowMs) {
  const lang = langOf(state)
  const out = {}
  for (const key of ACTION_ORDER) {
    const spec = ACTIONS[key]
    const wait = state === null ? 0 : actionCooldownSeconds(state, key, nowMs)
    const away = state !== null && !state.dead && state.activity !== null && key !== 'pet'
    out[key] = {
      label: tr(lang, spec.label),
      emoji: spec.emoji,
      ready: wait === 0 && !away && !(state?.dead === true),
      waitSeconds: wait,
      blocked: away ? 'away' : null,
    }
  }
  return out
}

function jobsFor(state) {
  const lang = langOf(state)
  const open = state !== null && awayBlockedReason(state) === null
  return JOBS.map(job => {
    // Jobs lean on a trait and lessons raise it, so the panel has to show what
    // the pig's schooling is actually buying it.
    const points = state === null ? 0 : (state.traits?.[job.trait] ?? 0)
    const bonus = traitBonus(job.trait, points)
    return {
      key: job.key, label: tr(lang, job.label), emoji: job.emoji,
      trait: job.trait,
      traitLabel: tr(lang, TRAITS[job.trait].label),
      traitEmoji: TRAITS[job.trait].emoji,
      traitPoints: points,
      minutes: Math.max(1, Math.round(job.minutes * bonus.minutes)),
      baseMinutes: job.minutes,
      coins: Math.round(job.coins * bonus.pay),
      baseCoins: job.coins,
      payPercent: Math.round((bonus.pay - 1) * 100),
      speedPercent: Math.round((1 - bonus.minutes) * 100),
      satiety: job.satiety,
      available: open,
    }
  })
}

function subjectsFor(state) {
  const lang = langOf(state)
  const open = state !== null && awayBlockedReason(state) === null
  const levels = state === null ? {} : courseView(state)
  return SUBJECTS.map(subject => ({
    key: subject.key, label: tr(lang, subject.label), emoji: subject.emoji,
    trait: subject.trait, traitLabel: tr(lang, TRAITS[subject.trait].label),
    level: levels[subject.key] ?? 0,
    available: open,
  }))
}

function tripsFor(state) {
  const lang = langOf(state)
  const open = state !== null && awayBlockedReason(state) === null
  return TRIPS.map(trip => ({
    key: trip.key, label: tr(lang, trip.label), emoji: trip.emoji,
    minutes: trip.minutes, cost: trip.cost, happiness: trip.happiness,
    available: open,
    affordable: state === null ? false : state.coins >= trip.cost,
  }))
}

function shopFor(state) {
  const lang = langOf(state)
  return SHOP.map(item => ({
    key: item.key, label: tr(lang, item.label), emoji: item.emoji,
    price: item.price, kind: item.kind, tier: item.tier ?? null,
    affordable: state === null ? false : state.coins >= item.price,
    needed: state?.illness != null && item.kind === 'medicine' && item.tier === state.illness.stage,
  }))
}

// ---------------------------------------------------------------------------
// Slash command (the fallback path)
// ---------------------------------------------------------------------------

/**
 * [dsh-piggy-claude-code mod] What a player may type for a table entry: its key
 * or its label in any language, ignoring case and spaces ("martial arts").
 */
const squash = text => String(text ?? '').toLowerCase().replace(/\s+/g, '')
const namesOf = entry => [entry.key, ...LANGS.map(lang => tr(lang, entry.label))].map(squash)
function findByName(entries, input) {
  const wanted = squash(input)
  return wanted === '' ? undefined : entries.find(entry => namesOf(entry).includes(wanted))
}

/** `<subject> [stage]` — split on the names rather than on spaces, which English labels contain. */
function parseLesson(input) {
  const wanted = squash(input)
  for (const subject of SUBJECTS) {
    for (const name of namesOf(subject)) {
      if (name === '' || !wanted.startsWith(name)) continue
      const rest = wanted.slice(name.length)
      const stage = rest === '' ? SCHOOL_STAGES.find(s => s.key === 'primary') : findByName(SCHOOL_STAGES, rest)
      if (stage !== undefined) return { subject, stage }
    }
  }
  return { subject: undefined, stage: undefined }
}

export function performAction(store, action) {
  const state = store.freshen()
  if (state === null) return { kind: 'error', text: renderNoPig('pig') }
  const lang = langOf(state)
  const result = store.act(action)
  if (!result.ok) {
    if (result.reason === 'cooldown') return { kind: 'success', text: renderTooSoon(state, Date.now(), action) }
    if (result.reason === 'away') return { kind: 'success', text: renderWorkRefusal(state, tr(lang, '{name} 正在外面，回来再说。', { name: state.name })) }
    if (result.reason === 'dead') return { kind: 'error', text: tr(lang, '{name} 已经走了…用 {item} 可以救回来。', { name: state.name, item: tr(lang, REVIVE_ITEM.label) }) }
    if (result.reason === 'absent') return { kind: 'error', text: renderNoPig('pig') }
    return { kind: 'error', text: tr(lang, '🐖 {action} 没做成。', { action: ACTIONS[action] ? tr(lang, ACTIONS[action].label) : action }) }
  }
  return { kind: 'success', text: renderAction(store.freshen(), Date.now(), action, result.crossed) }
}

export function dispatch(store, commandName, rawInput) {
  const trimmed = rawInput.trim()
  const [sub, ...rest] = trimmed === '' ? [''] : trimmed.split(/\s+/)
  const argument = rest.join(' ')
  const state = store.freshen()
  const nowMs = Date.now()
  const verb = sub.toLowerCase()
  const lang = langOf(state)
  const cmd = commandName

  switch (verb) {
    case '':
    case 'status': {
      if (state === null) return { kind: 'success', text: renderNoPig(commandName) }
      return { kind: 'success', text: renderStatus(state, nowMs) }
    }
    case 'hatch': {
      if (store.hatch()) return { kind: 'success', text: renderHatch(store.state, nowMs) }
      const existing = store.freshen()
      return { kind: 'success', text: `${tr(langOf(existing), '这里已经住着 {name} 了 🐖', { name: existing.name })}\n\n${renderStatus(existing, nowMs)}` }
    }
    case 'feed':
    case 'bathe':
    case 'play':
    case 'pet':
    case 'mo':
      return performAction(store, verb === 'mo' ? 'pet' : verb)

    case 'work': {
      if (state === null) return { kind: 'error', text: renderNoPig(commandName) }
      const key = argument.trim() === '' ? 'odd' : argument.trim()
      const job = findByName(JOBS, key)
      if (job === undefined) return { kind: 'error', text: tr(lang, '没有「{key}」这份工作。/{cmd} work 看有哪些。', { key, cmd }) }
      const result = store.startWork(job.key)
      if (!result.ok) return { kind: 'success', text: renderWorkRefusal(state, refusalText(result, state)) }
      return { kind: 'success', text: renderWorkReport(store.freshen(), Date.now(), job) }
    }

    case 'study': {
      if (state === null) return { kind: 'error', text: renderNoPig(commandName) }
      const { subject, stage } = parseLesson(argument)
      if (subject === undefined || stage === undefined) {
        return {
          kind: 'error',
          text: tr(lang, '用法：/{cmd} study <科目> <{stages}>\n科目：{subjects}', {
            cmd,
            stages: SCHOOL_STAGES.map(s => tr(lang, s.label)).join('|'),
            subjects: SUBJECTS.map(s => tr(lang, s.label)).join(' · '),
          }),
        }
      }
      const result = store.startStudy(subject.key, stage.key)
      if (!result.ok) return { kind: 'success', text: renderWorkRefusal(state, refusalText(result, state)) }
      return { kind: 'success', text: renderStudyReport(store.freshen(), Date.now(), subject, stage) }
    }

    case 'trip':
    case 'travel': {
      if (state === null) return { kind: 'error', text: renderNoPig(commandName) }
      const key = argument.trim() === '' ? 'suburb' : argument.trim()
      const trip = findByName(TRIPS, key)
      if (trip === undefined) return { kind: 'error', text: tr(lang, '没有「{key}」这个目的地。/{cmd} trip 看有哪些。', { key, cmd }) }
      const result = store.startTrip(trip.key)
      if (!result.ok) return { kind: 'success', text: renderWorkRefusal(state, refusalText(result, state)) }
      return { kind: 'success', text: renderTripReport(store.freshen(), Date.now(), trip) }
    }

    case 'calloff': {
      const result = store.callOffActivity()
      if (!result.ok) return { kind: 'success', text: tr(lang, '{name} 没在外面。', { name: state?.name ?? tr(lang, '猪') }) }
      return {
        kind: 'success',
        text: result.refunded > 0
          ? tr(lang, '{name} 提前回来了，退回 {coins} 金币。', { name: state.name, coins: result.refunded })
          : tr(lang, '{name} 提前回来了，这趟白跑。', { name: state.name }),
      }
    }

    case 'shop': {
      const lines = SHOP.map(item => `  ${item.emoji} ${tr(lang, item.label)}  ${tr(lang, '{price} 金币', { price: item.price })}`).join('\n')
      return { kind: 'success', text: tr(lang, '🛒 商店（你有 {coins} 金币）\n{lines}\n\n买：/{cmd} buy <物品>', { coins: state?.coins ?? 0, lines, cmd }) }
    }
    case 'buy': {
      if (state === null) return { kind: 'error', text: renderNoPig(commandName) }
      const item = findByName(SHOP, argument)
      if (item === undefined) return { kind: 'error', text: tr(lang, '没有「{name}」这样东西。/{cmd} shop 看货架。', { name: argument, cmd }) }
      return { kind: 'success', text: renderBuy(store.freshen(), store.buy(item.key), item) }
    }
    case 'use': {
      if (state === null) return { kind: 'error', text: renderNoPig(commandName) }
      const item = findByName(SHOP, argument)
      if (item === undefined) return { kind: 'error', text: tr(lang, '没有「{name}」这样东西。', { name: argument }) }
      return { kind: 'success', text: renderUse(store.freshen(), store.useItem(item.key), item) }
    }
    case 'weigh': {
      if (state === null) return { kind: 'error', text: renderNoPig(commandName) }
      return { kind: 'success', text: renderWeigh(state, nowMs) }
    }
    case 'lang': {
      const result = store.setLang(argument.trim())
      if (!result.ok) return { kind: 'error', text: `/${commandName} lang zh | ja | en` }
      return { kind: 'success', text: `🐖 ${LANG_NAMES[result.lang]}` }
    }
    case 'look': {
      if (state === null) return { kind: 'error', text: renderNoPig(commandName) }
      const wanted = /^(原版|原来|original|piglet|オリジナル)$/i.test(argument.trim()) ? 'original'
        : /^(老年|老|elder|おじいブタ|おじい)$/i.test(argument.trim()) ? 'elder' : ''
      if (wanted === '') return { kind: 'error', text: tr(lang, '用法：/{cmd} look 老年 | 原版', { cmd }) }
      const result = store.setLook(wanted)
      if (!result.ok) {
        const why = result.reason === 'too-light' ? tr(lang, '要长到 80 kg、变成老年猪之后才能换样子') : tr(lang, '现在换不了样子')
        return { kind: 'success', text: `🐖 ${why}` }
      }
      return { kind: 'success', text: wanted === 'original' ? tr(lang, '🐖 换回原版小猪的样子了') : tr(lang, '🐖 换成老年猪的样子了') }
    }
    case 'name': {
      if (state === null) return { kind: 'error', text: renderNoPig(commandName) }
      const cleaned = store.rename(argument)
      if (cleaned === null) return { kind: 'error', text: tr(lang, '用法：/{cmd} name <名字>（16 字以内）', { cmd }) }
      return { kind: 'success', text: tr(lang, '从今天起，它叫「{name}」🐖', { name: cleaned }) }
    }
    case 'about':
    case 'help':
      return { kind: 'success', text: renderAbout(commandName, state) }
    default:
      return {
        kind: 'error',
        text: tr(lang, '不认识「{sub}」。可用：/{cmd} · {list}', {
          sub, cmd, list: 'hatch · feed · bathe · play · pet · study · work · trip · shop · buy · use · weigh · name · about',
        }),
      }
  }
}

function refusalText(result, state) {
  const lang = langOf(state)
  const name = state.name
  switch (result.reason) {
    case 'dead': return tr(lang, '{name} 已经走了…', { name })
    case 'away': return tr(lang, '{name} 已经在外面了。', { name })
    case 'sick': return tr(lang, '{name} 病着，不能出门 —— 先治好它。', { name })
    case 'hungry': return tr(lang, '{name} 太饿了，先喂点东西。', { name })
    case 'poor': return tr(lang, '钱不够，需要 {price} 金币，你只有 {coins}。', { price: result.price, coins: state.coins })
    case 'unknown': return tr(lang, '没有这个选项。')
    default: return tr(lang, '现在没法出门。')
  }
}

export { jobByKey, MAX, SHOP, JOBS, SUBJECTS, SCHOOL_STAGES, TRIPS, TRAITS, TRAIT_ORDER }
