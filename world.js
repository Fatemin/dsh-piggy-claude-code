/**
 * [dsh-piggy-claude-code mod] The travel world: regions, destinations,
 * souvenirs, travel-only specialties and the set bonuses.
 *
 * Upstream had four flat trips (郊游 / 名山大川 / 看海 / 出国) and souvenirs that
 * did nothing. Here the pig travels from wherever the player's computer is:
 *
 *   price   = 100 coins + 200 per time zone crossed
 *   length  = 1 hour    + 1 hour per time zone crossed
 *
 * Every trip brings back one souvenir (two per destination: six per region,
 * eight for China's four cities). Completing a region's set pays out a one-off
 * boost plus a small passive perk;
 * completing all seven makes the pig a 环球旅行家. A trip may also bring back a
 * consumable — sometimes an ordinary one, sometimes a local specialty that the
 * shop never sells.
 *
 * Labels are the Chinese source text (see i18n.js); keys are stable and are
 * what the save stores.
 */

// ---------------------------------------------------------------------------
// Travel-only specialties: real items (food / bath / toy) that never appear on
// the shop shelves. `exclusive` keeps them off the shop and tags them in the bag.
// ---------------------------------------------------------------------------

const SPECIAL = (key, label, emoji, kind, effects) => Object.freeze({ key, label, emoji, kind, price: 0, exclusive: true, ...effects })

export const SPECIALTIES = Object.freeze([
  SPECIAL('duck', '北京烤鸭', '🦆', 'food', { satiety: 70, happiness: 20 }),
  SPECIAL('hotpot', '九宫格火锅', '🍲', 'food', { satiety: 90, happiness: 28, cleanliness: -15 }),
  SPECIAL('biang', 'biangbiang面', '🍜', 'food', { satiety: 80, happiness: 18 }),
  SPECIAL('xiaolongbao', '蟹粉小笼包', '🥟', 'food', { satiety: 60, happiness: 25 }),
  SPECIAL('onsen', '草津温泉入浴剂', '♨️', 'bath', { cleanliness: 100, happiness: 30 }),
  SPECIAL('chimaek', '初雪炸鸡', '🍗', 'food', { satiety: 65, happiness: 25 }),
  SPECIAL('khorkhog', '手把肉', '🍖', 'food', { satiety: 95, happiness: 15 }),
  SPECIAL('mango', '芒果糯米饭', '🥭', 'food', { satiety: 50, happiness: 25 }),
  SPECIAL('durian', '猫山王榴莲', '🍈', 'food', { satiety: 60, happiness: 30, cleanliness: -25 }),
  SPECIAL('chai', '玛莎拉奶茶', '☕', 'food', { satiety: 25, happiness: 22 }),
  SPECIAL('macaron', '马卡龙礼盒', '🍬', 'food', { satiety: 35, happiness: 35 }),
  SPECIAL('pizza', '正宗罗马披萨', '🍕', 'food', { satiety: 75, happiness: 22 }),
  SPECIAL('tea', '英式下午茶', '🫖', 'food', { satiety: 40, happiness: 30 }),
  SPECIAL('burger', '超大号汉堡', '🍔', 'food', { satiety: 100, happiness: 20, cleanliness: -10 }),
  SPECIAL('burrito', '墨西哥卷饼', '🌯', 'food', { satiety: 70, happiness: 18 }),
  SPECIAL('surfboard', '冲浪板', '🏄', 'toy', { happiness: 60, satiety: -10, cleanliness: -5 }),
  SPECIAL('goldcone', '金箔冰淇淋', '🍦', 'food', { satiety: 30, happiness: 45 }),
  SPECIAL('nilemud', '尼罗河泥浴', '🏺', 'bath', { cleanliness: 90, happiness: 15 }),
  SPECIAL('lionplush', '狮子王玩偶', '🦁', 'toy', { happiness: 55, satiety: -6 }),
  SPECIAL('koala', '考拉抱枕', '🐨', 'toy', { happiness: 50, satiety: -4 }),
  SPECIAL('kiwi', '奇异果冰沙', '🥝', 'food', { satiety: 30, happiness: 20 }),
  SPECIAL('glacier', '冰川泡泡浴', '🧊', 'bath', { cleanliness: 100, happiness: 20, satiety: -5 }),
])

export const specialtyByKey = key => SPECIALTIES.find(item => item.key === key) ?? null

// ---------------------------------------------------------------------------
// Destinations: standard UTC offsets (no daylight saving), two souvenirs each.
// ---------------------------------------------------------------------------

const PLACE = (key, label, emoji, utc, souvenirs, specialty) => Object.freeze({
  key, label, emoji, utc,
  souvenirs: Object.freeze(souvenirs.map(([k, l, e]) => Object.freeze({ key: k, label: l, emoji: e }))),
  specialty,
})

export const REGIONS = Object.freeze([
  Object.freeze({
    key: 'china', label: '中国', emoji: '🐉',
    places: Object.freeze([
      PLACE('beijing', '北京', '🏯', 8, [['wallbrick', '长城砖（复刻版）', '🧱'], ['tanghulu', '冰糖葫芦签', '🍡']], 'duck'),
      PLACE('chengdu', '成都', '🐼', 8, [['pandabutt', '熊猫屁屁抱枕', '🐼'], ['facemask', '变脸面具', '🎭']], 'hotpot'),
      PLACE('xian', '西安', '🗿', 8, [['terracotta', '兵马俑手办', '🗿'], ['biangcard', '写着「Biáng」的字帖', '📜']], 'biang'),
      PLACE('shanghai', '上海', '🌃', 8, [['pearltower', '东方明珠水晶球', '🔮'], ['whiterabbit', '大白兔奶糖铁盒', '🐰']], 'xiaolongbao'),
    ]),
    bonus: Object.freeze({ traits: { strong: 3 }, weightG: 5000 }),
    perk: Object.freeze({ key: 'foodie', label: '干饭王', emoji: '🍚', text: '吃东西长肉 +10%' }),
  }),
  Object.freeze({
    key: 'eastasia', label: '东亚', emoji: '🗾',
    places: Object.freeze([
      PLACE('tokyo', '东京', '🗼', 9, [['luckycat', '招财猫', '🐱'], ['fujicard', '富士山明信片', '🗻']], 'onsen'),
      PLACE('seoul', '首尔', '🏙', 9, [['lightstick', '爱豆应援手灯', '💡'], ['kimchijar', '泡菜坛子', '🏺']], 'chimaek'),
      PLACE('ulaanbaatar', '乌兰巴托', '⛺', 8, [['minger', '迷你蒙古包', '⛺'], ['horsefiddle', '马头琴书签', '🎻']], 'khorkhog'),
    ]),
    bonus: Object.freeze({ traits: { intel: 2, charm: 2 } }),
    perk: Object.freeze({ key: 'grinder', label: '卷王', emoji: '📚', text: '上课时间 -20%' }),
  }),
  Object.freeze({
    key: 'southasia', label: '南亚·东南亚', emoji: '🛺',
    places: Object.freeze([
      PLACE('bangkok', '曼谷', '🛕', 7, [['elephantpants', '大象裤', '🐘'], ['tuktuk', '嘟嘟车模型', '🛺']], 'mango'),
      PLACE('singapore', '新加坡', '🦁', 8, [['merlion', '鱼尾狮钥匙扣', '🦁'], ['gumfine', '「禁止嚼口香糖」罚单', '🚫']], 'durian'),
      PLACE('newdelhi', '新德里', '🕌', 5.5, [['spices', '咖喱香料包', '🌶'], ['bollywood', '宝莱坞电影海报', '🎬']], 'chai'),
    ]),
    bonus: Object.freeze({ traits: { charm: 2 } }),
    perk: Object.freeze({ key: 'zen', label: '佛系', emoji: '🧘', text: '心情掉得慢 25%' }),
  }),
  Object.freeze({
    key: 'europe', label: '欧洲', emoji: '🏰',
    places: Object.freeze([
      PLACE('paris', '巴黎', '🗼', 1, [['eiffel', '埃菲尔铁塔钥匙扣', '🗼'], ['baguette', '一根可以当剑的法棍', '🥖']], 'macaron'),
      PLACE('rome', '罗马', '🏛', 1, [['colosseum', '斗兽场门票', '🎫'], ['trevicoin', '许愿池硬币', '🪙']], 'pizza'),
      PLACE('london', '伦敦', '💂', 0, [['phonebox', '红色电话亭模型', '☎️'], ['umbrella', '一把伞（因为一直在下雨）', '☂️']], 'tea'),
    ]),
    bonus: Object.freeze({ traits: { intel: 4 } }),
    perk: Object.freeze({ key: 'museum', label: '博物馆通票', emoji: '🖼', text: '旅行回来心情 +50%' }),
  }),
  Object.freeze({
    key: 'americas', label: '美洲', emoji: '🗽',
    places: Object.freeze([
      PLACE('newyork', '纽约', '🗽', -5, [['torch', '自由女神火炬', '🔦'], ['iloveny', '「I ❤ NY」T恤', '👕']], 'burger'),
      PLACE('mexicocity', '墨西哥城', '🌮', -6, [['cactus', '仙人掌盆栽', '🌵'], ['sombrero', '墨西哥大草帽', '👒']], 'burrito'),
      PLACE('rio', '里约热内卢', '🏖', -3, [['sambafeather', '桑巴羽毛头饰', '🪶'], ['football', '签名足球', '⚽']], 'surfboard'),
    ]),
    bonus: Object.freeze({ traits: { strong: 2, charm: 2 } }),
    perk: Object.freeze({ key: 'flyer', label: '常旅客', emoji: '✈️', text: '旅费 -20%' }),
  }),
  Object.freeze({
    key: 'mideast', label: '中东·非洲', emoji: '🐫',
    places: Object.freeze([
      PLACE('dubai', '迪拜', '🏙', 4, [['goldcamel', '金色骆驼摆件', '🐪'], ['burjmodel', '哈利法塔模型', '🏙']], 'goldcone'),
      PLACE('cairo', '开罗', '🐫', 2, [['hourglass', '金字塔沙漏', '⏳'], ['mummy', '迷你木乃伊（绷带有点松）', '🧻']], 'nilemud'),
      PLACE('nairobi', '内罗毕', '🦒', 3, [['lionking', '狮子王纪念画', '🖼'], ['beads', '马赛珠串', '📿']], 'lionplush'),
    ]),
    bonus: Object.freeze({ traits: { charm: 1, strong: 1 } }),
    perk: Object.freeze({ key: 'tycoon', label: '土豪', emoji: '💰', text: '打工收入 +15%' }),
  }),
  Object.freeze({
    key: 'oceania', label: '大洋洲·南极', emoji: '🐧',
    places: Object.freeze([
      PLACE('sydney', '悉尼', '🦘', 10, [['operashell', '歌剧院贝壳', '🐚'], ['boxinggloves', '袋鼠拳击手套', '🥊']], 'koala'),
      PLACE('auckland', '奥克兰', '🥝', 12, [['hobbitmap', '霍比特人地图', '🗺'], ['kiwibird', '奇异果（是鸟不是水果）', '🐦']], 'kiwi'),
      PLACE('antarctica', '南极科考站', '🐧', 12, [['iceberg', '一块会化的冰山', '🧊'], ['penguinpic', '和企鹅的合照', '🐧']], 'glacier'),
    ]),
    bonus: Object.freeze({ traits: { strong: 2 } }),
    perk: Object.freeze({ key: 'hardy', label: '抗寒体质', emoji: '🧣', text: '更不容易生病' }),
  }),
])

/** Every region done: the grand title. */
export const WORLD_BONUS = Object.freeze({
  label: '环球旅行家', emoji: '🌍', traits: Object.freeze({ intel: 3, charm: 3, strong: 3 }),
})

export const PLACES = Object.freeze(REGIONS.flatMap(region => region.places.map(place => Object.freeze({ ...place, region: region.key }))))
export const placeByKey = key => PLACES.find(place => place.key === key) ?? null
export const regionByKey = key => REGIONS.find(region => region.key === key) ?? null

export const SOUVENIRS = Object.freeze(PLACES.flatMap(place => place.souvenirs.map(s => Object.freeze({ ...s, place: place.key, region: place.region }))))
export const souvenirByKey = key => SOUVENIRS.find(s => s.key === key) ?? null
export const regionSouvenirs = regionKey => SOUVENIRS.filter(s => s.region === regionKey)

// ---------------------------------------------------------------------------
// Prices: 100 coins + 200 per time zone, 1 h + 1 h per time zone.
// ---------------------------------------------------------------------------

export const FARE = Object.freeze({
  baseCost: 100, costPerZone: 200,
  baseMinutes: 60, minutesPerZone: 60,
  /** Mood on return grows with distance, capped. */
  baseHappiness: 10, happinessPerZone: 3, maxHappiness: 50,
  baseXp: 100, xpPerZone: 150,
  /** Satiety the journey costs on top of being away. */
  baseSatiety: 6, satietyPerZone: 4,
  /** Chance of bringing back a consumable; far trips roll twice. */
  lootChance: 0.6, secondRollFromZones: 6,
  /** Of the loot, the share that is the place's specialty (the rest is a shop item). */
  specialtyShare: 0.5,
  /** Chance a souvenir the pig does not have yet is picked over a duplicate. */
  newSouvenirBias: 0.7,
})

/** Time zones between two UTC offsets, the short way round the globe, whole hours. */
export function zonesBetween(fromUtc, toUtc) {
  const raw = Math.abs(Number(toUtc) - Number(fromUtc)) % 24
  return Math.round(Math.min(raw, 24 - raw))
}

/** The host's current UTC offset in hours (daylight saving included). */
export function systemUtcOffset(now = new Date()) {
  return -now.getTimezoneOffset() / 60
}

/** The host's IANA zone, e.g. "Asia/Tokyo", or null. */
export function systemTimeZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null } catch { return null }
}

/**
 * What going to `place` costs from `homeUtc`, before perks.
 * @returns {{zones:number, cost:number, minutes:number, happiness:number, xp:number, satiety:number}}
 */
export function fareFor(place, homeUtc) {
  const zones = zonesBetween(homeUtc, place.utc)
  return {
    zones,
    cost: FARE.baseCost + FARE.costPerZone * zones,
    minutes: FARE.baseMinutes + FARE.minutesPerZone * zones,
    happiness: Math.min(FARE.maxHappiness, FARE.baseHappiness + FARE.happinessPerZone * zones),
    xp: FARE.baseXp + FARE.xpPerZone * zones,
    satiety: -(FARE.baseSatiety + FARE.satietyPerZone * zones),
  }
}

/** Upstream's four trips, retired; their souvenirs are kept as old keepsakes. */
export const LEGACY_TRIPS = Object.freeze(['suburb', 'mountain', 'sea', 'abroad'])
