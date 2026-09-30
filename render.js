/**
 * dsh-pig · render — every word the pig says.
 *
 * Pure string building: the command handlers, the HTTP actions, the tests and
 * the client bubble all read from here, so the pig's voice lives in exactly one
 * file.
 *
 * @module dsh-pig/render
 *
 * [dsh-piggy-claude-code mod] Every sentence goes through `tr(lang, 中文)`; the
 * Chinese literal is the key into locales/render.js. Data labels (stages, jobs,
 * items, moods…) are passed through `tr` too and translated by their own
 * locale files.
 */

import {
  ACTIONS,
  ACTION_ORDER,
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
  bar,
  courseView,
  formatWeight,
  healthPercent,
  lifeStageFor,
  mood,
  traitView,
} from './core.js'
import { illnessAt } from './data.js'
import { langOf, tr } from './i18n.js'

const RULE = '━━━━━━━━━━━━━━━━━━━━━━━━━━'

/** Which portrait face matches the mood. */
function face(currentMood) {
  switch (currentMood.key) {
    case 'sleepy': return { l: '˘', r: '˘', m: 'ω' }
    case 'hungry': return { l: '◕', r: '◕', m: 'o' }
    case 'dirty': return { l: 'ò', r: 'ó', m: '益' }
    case 'sick': return { l: '×', r: '×', m: '︿' }
    case 'dead': return { l: '×', r: '×', m: '︵' }
    case 'working': return { l: '•', r: '•', m: 'ω' }
    case 'happy': return { l: '^', r: '^', m: 'ω' }
    case 'lonely': return { l: '◕', r: '◕', m: '︵' }
    default: return { l: '◕', r: '◕', m: 'ω' }
  }
}

/** 🐖 with a face that follows the mood. */
export function portrait(stage, currentMood) {
  if (stage.key === 'box') {
    return [
      '      🥚',
      '   ╭───────╮',
      '   │  〜〜  │',
      '   ╰───────╯',
    ]
  }
  const f = face(currentMood)
  const hat = currentMood.key === 'working' ? ' 💼' : currentMood.key === 'dead' ? ' 💀' : ''
  return [
    `      ${stage.emoji}${hat}`,
    '   ╭───────╮',
    `   │ ${f.l}   ${f.r} │`,
    `   │   ${f.m}   │`,
    '   ╰───────╯',
  ]
}

/** A quoted one-liner under the portrait, 「…」 in zh/ja and "…" in en. */
const quote = (lang, text) => tr(lang, '「{line}」', { line: tr(lang, text) })

/** The pig's name, or a stand-in when there is no pig. */
const nameOf = (lang, state) => state?.name ?? tr(lang, '猪')

/** "小学语文" — the school stage and the subject, translated separately. */
function courseName(lang, stage, subject) {
  return tr(lang, '{stage}{subject}', { stage: tr(lang, stage.label), subject: tr(lang, subject.label) })
}

/** What the pig is out doing, translated; a lesson is rebuilt from its stage + subject. */
function activityLabel(lang, activity) {
  if (activity.kind === 'study') {
    const stage = SCHOOL_STAGES.find(s => s.key === activity.stage)
    const subject = SUBJECTS.find(s => s.key === activity.key)
    if (stage !== undefined && subject !== undefined) return courseName(lang, stage, subject)
  }
  return tr(lang, activity.label)
}

/** The three care bars, shared by the status, action and use cards. */
function careBars(lang, state) {
  return [
    tr(lang, '🍚 饱食  {bar}  {value}', { bar: bar(state.satiety), value: Math.round(state.satiety) }),
    tr(lang, '❤️  心情  {bar}  {value}', { bar: bar(state.happiness), value: Math.round(state.happiness) }),
    tr(lang, '🫧 清洁  {bar}  {value}', { bar: bar(state.cleanliness), value: Math.round(state.cleanliness) }),
  ]
}

function xpLine(lang, state) {
  return tr(lang, '✨ 成长  {xp}   （只喂体重，不再决定形态）', { xp: state.xp })
}

function statusLine(lang, state, nowMs) {
  if (state.dead) return tr(lang, '💀 状态  已经走了 · 用 {item} 可以救回来', { item: tr(lang, REVIVE_ITEM.label) })
  if (state.activity !== null) {
    const params = {
      emoji: state.activity.emoji,
      label: activityLabel(lang, state.activity),
      left: activitySecondsLeft(state, nowMs),
    }
    if (state.activity.kind === 'study') return tr(lang, '{emoji} 上课  {label}中 · 还有 {left} 秒', params)
    if (state.activity.kind === 'trip') return tr(lang, '{emoji} 旅行  {label}中 · 还有 {left} 秒', params)
    return tr(lang, '{emoji} 打工  {label}中 · 还有 {left} 秒', params)
  }
  const ill = state.illness === null ? null : illnessAt(state.illness.chain, state.illness.stage)
  if (ill !== null) {
    return tr(lang, '🤒 生病  {name}（第 {stage}/4 期）· 需要「{cure}」', {
      name: tr(lang, ill.name), stage: ill.stage, cure: tr(lang, ill.cure),
    })
  }
  return null
}

/** The three QQ Pet traits, as one line. */
function traitsLine(lang, state) {
  const traits = traitView(state)
  return TRAIT_ORDER
    .map(key => `${TRAITS[key].emoji} ${tr(lang, TRAITS[key].label)} ${traits[key]}`)
    .join('   ')
}

function memoriesBlock(lang, state) {
  if (state.memories.length === 0) return []
  return ['', tr(lang, '🕘 最近'), ...state.memories.slice(-4).map(line => `   ${tr(lang, line)}`)]
}

/** "今天刚出生" / "3 天大" / "还没拆开". */
function ageText(lang, state, nowMs) {
  if (state.hatched !== true) return tr(lang, '还没拆开')
  const days = (nowMs - state.bornAt) / 86_400_000
  if (days < 1) return tr(lang, '今天刚出生')
  const whole = Math.floor(days)
  return whole === 1 ? tr(lang, '1 天大') : tr(lang, '{days} 天大', { days: whole })
}

/** The full `/pig` card. */
export function renderStatus(state, nowMs) {
  const lang = langOf(state)
  const stage = lifeStageFor(state, nowMs)
  const current = mood(state, nowMs)
  const special = statusLine(lang, state, nowMs)
  const age = ageText(lang, state, nowMs)
  const lines = [
    `${stage.emoji} ${state.name}  ${tr(lang, stage.label)} · ${age}   ${current.emoji} ${tr(lang, current.label)}`,
    RULE,
    ...careBars(lang, state),
    tr(lang, '💚 健康  {bar}  {health}/{max}', { bar: bar(healthPercent(state)), health: state.health, max: MAX.health }),
    tr(lang, '🪙 金币  {coins}', { coins: state.coins }),
    tr(lang, '⚖️  体重  {weight}', { weight: formatWeight(state.weightG) }),
    xpLine(lang, state),
    traitsLine(lang, state),
  ]
  if (special !== null) lines.push(RULE, special)
  lines.push(
    RULE,
    ...portrait(stage, current),
    `    ${quote(lang, stage.line)}`,
    RULE,
    tr(lang, '🍽  完成回合 +5 · 发消息 +2 · 工具调用 +3 · 报错也长肉'),
    tr(lang, '👆  右下角的猪点着就能养：喂食 · 洗澡 · 玩耍 · 打工 · 商店'),
  )
  return [...lines, ...memoriesBlock(lang, state)].join('\n')
}

/** The hatching ceremony. */
export function renderHatch(state, nowMs) {
  const lang = langOf(state)
  const stage = lifeStageFor(state, nowMs)
  return [
    tr(lang, '   纸盒打开了 ——'),
    '',
    ...portrait(stage, mood(state, nowMs)),
    '',
    tr(lang, '✨ {emoji} {name} 蹦了出来（{stage}）', { emoji: stage.emoji, name: state.name, stage: tr(lang, stage.label) }),
    `   ${quote(lang, stage.line)}`,
    '',
    tr(lang, '初始盘缠：🪙 {coins} 金币。', { coins: state.coins }),
    tr(lang, '正常干活就能养活它；右下角的猪点一下就能喂食、洗澡、送去打工。'),
  ].join('\n')
}

/** One care action's outcome card. */
export function renderAction(state, nowMs, action, crossed) {
  const lang = langOf(state)
  const spec = ACTIONS[action]
  if (spec === undefined) return tr(lang, '🐖 不认识这个动作。')
  const current = mood(state, nowMs)
  const lines = [
    tr(lang, '{name} {verb}', { name: state.name, verb: tr(lang, spec.verb) }),
    '',
    ...portrait(lifeStageFor(state, nowMs), current),
    '',
    ...careBars(lang, state),
  ]
  const wait = actionCooldownSeconds(state, action, nowMs)
  if (wait > 0) lines.push('', tr(lang, '（{wait} 秒后还能再来一次）', { wait }))
  return lines.join('\n')
}

/** The refusal card when a care action is still cooling down. */
export function renderTooSoon(state, nowMs, action) {
  const lang = langOf(state)
  const spec = ACTIONS[action]
  if (spec === undefined) return tr(lang, '🐖 不认识这个动作。')
  const wait = actionCooldownSeconds(state, action, nowMs)
  const name = state.name
  const hints = {
    feed: () => tr(lang, '{name} 摆摆手：刚吃过，肚子还圆着呢。', { name }),
    bathe: () => tr(lang, '{name} 缩了缩：刚洗完，香着呢，别再冲水了。', { name }),
    play: () => tr(lang, '{name} 喘着气：让我歇会儿，刚玩过。', { name }),
    pet: () => tr(lang, '{name} 还没缓过来。', { name }),
  }
  const hint = hints[action]?.() ?? tr(lang, '{name} 现在不想动。', { name })
  return [hint, '', tr(lang, '{wait} 秒后可以再{action}。', { wait, action: tr(lang, spec.label) })].join('\n')
}

/** Sent the pig out to work. */
export function renderWorkReport(state, nowMs, job) {
  const lang = langOf(state)
  return [
    tr(lang, '{name} 背上小包出门了 {emoji}', { name: state.name, emoji: job.emoji }),
    '',
    tr(lang, '💼 工作    {job}', { job: tr(lang, job.label) }),
    tr(lang, '⏱  时长    {minutes} 分钟', { minutes: job.minutes }),
    tr(lang, '🪙 报酬    {coins} 金币', { coins: job.coins }),
    tr(lang, '🍚 消耗    饱食 {satiety} · 清洁 {cleanliness}', { satiety: job.satiety, cleanliness: job.cleanliness }),
    '',
    tr(lang, '预计 {seconds} 秒后回来。这期间不能喂食洗澡 —— 它在外面忙着。', { seconds: activitySecondsLeft(state, nowMs) }),
  ].join('\n')
}

/** Sent the pig to class. */
export function renderStudyReport(state, nowMs, subject, stage) {
  const lang = langOf(state)
  const level = courseView(state)[subject.key] ?? 0
  return [
    tr(lang, '{name} 背上书包去上课了 {emoji}', { name: state.name, emoji: subject.emoji }),
    '',
    tr(lang, '📚 课程    {course}', { course: courseName(lang, stage, subject) }),
    tr(lang, '⏱  时长    {minutes} 分钟', { minutes: stage.minutes }),
    tr(lang, '🪙 学费    {tuition} 金币', { tuition: stage.tuition }),
    tr(lang, '📈 收获    {trait} +{gain} · 经验 +{xp}', { trait: tr(lang, TRAITS[subject.trait].label), gain: stage.gain, xp: stage.xp }),
    tr(lang, '🍚 消耗    饱食 {satiety} · 心情 {happiness}', { satiety: stage.satiety, happiness: stage.happiness }),
    '',
    tr(lang, '这门课已经上了 {level} 次。预计 {seconds} 秒后下课。', { level, seconds: activitySecondsLeft(state, nowMs) }),
  ].join('\n')
}

/** Sent the pig travelling. */
export function renderTripReport(state, nowMs, trip) {
  const lang = langOf(state)
  return [
    tr(lang, '{name} 拖着小行李箱出发了 {emoji}', { name: state.name, emoji: trip.emoji }),
    '',
    tr(lang, '🧳 目的地  {trip}', { trip: tr(lang, trip.label) }),
    tr(lang, '⏱  时长    {minutes} 分钟', { minutes: trip.minutes }),
    tr(lang, '🪙 花费    {cost} 金币', { cost: trip.cost }),
    tr(lang, '❤️  心情    +{happiness} · 经验 +{xp}', { happiness: trip.happiness, xp: trip.xp }),
    tr(lang, '🍚 消耗    饱食 {satiety}', { satiety: trip.satiety }),
    '',
    tr(lang, '会带回一件纪念品。预计 {seconds} 秒后回来。', { seconds: activitySecondsLeft(state, nowMs) }),
  ].join('\n')
}

/** A refusal from the work path, with the reason spelled out. */
export function renderWorkRefusal(state, text) {
  const lang = langOf(state)
  const current = mood(state, Date.now())
  return [
    tr(lang, '💼 出不了门'),
    '',
    text,
    '',
    tr(lang, '现在：{emoji} {mood} · 🍚 {satiety} · 🪙 {coins}', {
      emoji: current.emoji, mood: tr(lang, current.label), satiety: Math.round(state.satiety), coins: state.coins,
    }),
  ].join('\n')
}

/** Bought something. */
export function renderBuy(state, result, item) {
  const lang = langOf(state)
  const label = tr(lang, item.label)
  if (result?.ok !== true) {
    if (result?.reason === 'poor') {
      return tr(lang, '🪙 钱不够：{emoji} {item} 要 {price} 金币，你只有 {coins}。', {
        emoji: item.emoji, item: label, price: item.price, coins: state?.coins ?? 0,
      })
    }
    if (result?.reason === 'dead') return tr(lang, '{name} 已经走了…先救回来再买东西。', { name: nameOf(lang, state) })
    return tr(lang, '🐖 没能买下 {item}。', { item: label })
  }
  return [
    tr(lang, '🛒 买到了 {emoji} {item}（-{price} 金币）', { emoji: item.emoji, item: label, price: item.price }),
    '',
    tr(lang, '🪙 余额    {coins}', { coins: state.coins }),
    tr(lang, '🎒 背包    {item} ×{count}', { item: label, count: state.inventory?.[item.key] ?? 0 }),
    '',
    tr(lang, '用起来：/pig use {key}', { key: item.key }),
  ].join('\n')
}

/** Used something from the backpack. */
export function renderUse(state, result, item) {
  const lang = langOf(state)
  const label = tr(lang, item.label)
  if (result?.ok !== true) {
    const name = nameOf(lang, state)
    const revive = tr(lang, REVIVE_ITEM.label)
    switch (result?.reason) {
      case 'empty': return tr(lang, '🎒 背包里没有 {emoji} {item}。先去 /pig shop 买。', { emoji: item.emoji, item: label })
      case 'not-sick': return tr(lang, '{name} 现在没生病，吃药没用。', { name })
      case 'not-dead': return tr(lang, '{name} 活得好好的，用不上 {item}。', { name, item: revive })
      case 'dead': return tr(lang, '{name} 已经走了…只有 {item} 能救回来。', { name, item: revive })
      case 'wrong-medicine': {
        const need = result.needs
        const needLabel = need?.label === undefined ? tr(lang, '别的药') : tr(lang, need.label)
        return tr(lang, '💊 药不对症。{name} 现在需要的是「{need}」。', { name, need: needLabel })
      }
      case 'working': return tr(lang, '{name} 在外面打工，回来再吃。', { name })
      default: return tr(lang, '🐖 没能用上 {item}。', { item: label })
    }
  }
  const lines = [tr(lang, '{name} 用了 {emoji} {item}', { name: state.name, emoji: item.emoji, item: label })]
  if (item.kind === 'medicine') lines.push('', tr(lang, '💚 病好了！健康恢复满值。'))
  else if (item.kind === 'revive') lines.push('', tr(lang, '✨ 回来了！等级、经验和金币都还在。'))
  else lines.push('', ...careBars(lang, state))
  return lines.join('\n')
}

/** The scales. */
export function renderWeigh(state, nowMs) {
  const lang = langOf(state)
  const stage = lifeStageFor(state, nowMs)
  const kilos = state.weightG / 1000
  let verdict = '还算苗条，继续保持'
  if (kilos >= 40) verdict = '这已经是一头正经的猪了'
  else if (kilos >= 15) verdict = '抱起来有点费劲'
  else if (kilos >= 6) verdict = '手感很好，沉甸甸的'
  else if (kilos >= 3) verdict = '圆润，但还能抱得动'
  return [
    tr(lang, '⚖️  {name} 站上了秤', { name: state.name }),
    '',
    `        ${stage.emoji}`,
    `     ${formatWeight(state.weightG)}`,
    '',
    `   ${quote(lang, verdict)}`,
  ].join('\n')
}

/**
 * `/pig about`. There may be no pig yet, so the language is the default unless
 * the caller passes the pig (or its state) as the optional second argument.
 */
export function renderAbout(commandName, state = null) {
  const lang = langOf(state)
  const cmd = commandName
  const actions = ACTION_ORDER.map(key => `  ${ACTIONS[key].emoji} ${tr(lang, ACTIONS[key].label)}`).join(' · ')
  const outing = (emoji, label, minutes, coins) => tr(lang, '  {emoji} {label}（{minutes} 分钟 · {coins} 金币）', {
    emoji, label: tr(lang, label), minutes, coins,
  })
  const jobs = JOBS.map(job => outing(job.emoji, job.label, job.minutes, job.coins)).join('\n')
  const courses = SUBJECTS.map(s => `${s.emoji}${tr(lang, s.label)}`).join(' ')
  const stages = SCHOOL_STAGES.map(s => tr(lang, '{stage}（{minutes} 分钟 · 学费 {tuition} · +{gain}）', {
    stage: tr(lang, s.label), minutes: s.minutes, tuition: s.tuition, gain: s.gain,
  })).join('\n')
  const trips = TRIPS.map(t => outing(t.emoji, t.label, t.minutes, t.cost)).join('\n')
  const shop = SHOP.map(item => tr(lang, '  {emoji} {item}  {price} 金币', {
    emoji: item.emoji, item: tr(lang, item.label), price: String(item.price).padStart(3),
  })).join('\n')
  return [
    tr(lang, '🐖 dsh-pig —— 一只住在 DSH 里的猪'),
    RULE,
    tr(lang, '最省事的用法：点右下角的 🐖，面板上六个图标点着用。'),
    tr(lang, '  ① 状态  ② 学习  ③ 打工  ④ 商店  ⑤ 旅行  ⑥ 背包'),
    RULE,
    tr(lang, '照顾：{actions}', { actions }),
    '',
    tr(lang, '📚 学习（涨智力 / 魅力 / 武力）：'),
    `  ${courses}`,
    stages,
    '',
    tr(lang, '💼 打工（出门赚钱）：'),
    jobs,
    '',
    tr(lang, '🧳 旅行（带回纪念品）：'),
    trips,
    '',
    tr(lang, '🛒 商店：'),
    shop,
    '',
    tr(lang, '🤒 生病：饿着或脏着太久会得病，健康上限 5。必须对症下药；'),
    tr(lang, '      健康归零就没了，用 {item} 救回来（保留等级、金币和收藏）。', { item: tr(lang, REVIVE_ITEM.label) }),
    RULE,
    tr(lang, '命令（不想点鼠标时才用）：'),
    `/${cmd} · hatch · feed · bathe · play · pet`,
    tr(lang, '/{cmd} study <科目> <小学|大学|研究生>', { cmd }),
    `/${cmd} work <odd|site|office> · trip <suburb|mountain|sea|abroad> · calloff`,
    tr(lang, '/{cmd} shop · buy <物品> · use <物品>', { cmd }),
    tr(lang, '/{cmd} weigh · name <名字> · about', { cmd }),
    RULE,
    tr(lang, '它不调用模型、不注入上下文、不花一个 token。'),
    tr(lang, '存档在 $DSH_HOME/dsh-pig/state.json。'),
  ].join('\n')
}

/** The empty-house prompt. */
export function renderNoPig(commandName) {
  return tr(langOf(null), '这里还没有猪。/{cmd} hatch 孵一只 🥚 —— 它会吃你之后的真实工作长大。', { cmd: commandName })
}
