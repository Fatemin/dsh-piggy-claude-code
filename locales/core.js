// [dsh-piggy-claude-code mod] Translations for core: keys are the Chinese source strings.
// See i18n.js and locales/GLOSSARY.md.
//
// Care actions, moods, and every memory line and announcement core.js writes.
// Placeholders: {name} is the pig's name (never translated), {stage} {job}
// {lesson} {trip} {ill} {cure} {item} {trait} {souvenir} are already-translated
// data labels, the rest are numbers or emoji. English tags that follow a word
// directly ({tag}, {saved}) carry their own leading space.
export default {
  ja: {
    // --- the default name (only at egg time; a name is never translated after)
    '猪猪': 'ブーちゃん',
    // --- care actions -------------------------------------------------------
    '喂食': 'ごはん',
    '洗澡': 'おふろ',
    '玩耍': 'あそぶ',
    '摸摸': 'なでなで',
    '吃了一口 🍎': 'ひとくち食べた 🍎',
    '洗了个澡 🛁': 'おふろに入った 🛁',
    '玩了一会儿 🎾': 'ちょっとあそんだ 🎾',
    '被摸了摸头 ❤️': '頭をなでてもらった ❤️',
    '{emoji} {action}用了「{item}」': '{emoji} {action}：「{item}」を使った',
    // --- life and death -----------------------------------------------------
    '被开发者按死了': '開発者の手でたおれた',
    '没能撑过去': '力つきてしまった',
    '{name} {why}…用{item}可以救回来，也可以领养一只新的': '{name}は{why}…{item}で生きかえらせるか、新しい子をむかえることもできます',
    '🔧 开发者改了状态（{from} → {to}）': '🔧 開発者が状態を変えた（{from} → {to}）',
    '又领养了一只，纸盒里传来窸窸窣窣的声音 📦': '新しい子をむかえた。ダンボール箱からカサコソ音がする 📦',
    '纸盒打开了，一只小猪蹦了出来 🐷': '箱をあけたら、こブタが飛び出してきた 🐷',
    '长成了{stage} {emoji}': '{stage}になった {emoji}',
    '{name} 长成了{stage} {emoji}': '{name}は{stage}になった {emoji}',
    '被 {item} 救了回来 ✨': '{item}で生きかえった ✨',
    '{name} 回来了 ✨': '{name}が帰ってきた ✨',
    '改名叫「{name}」': '名前が「{name}」になった',
    // --- work ---------------------------------------------------------------
    '（带病上工，只有一半）': '（びょうきのまま働いたので半分だけ）',
    '（{trait} {points}）': '（{trait} {points}）',
    '{emoji} {job}回来，赚了 {coins} 金币{tag}': '{emoji} {job}から帰ってきた。{coins} コインかせいだ{tag}',
    '{name} 带病打工回来了，只赚到 {coins} 金币 🤒': '{name}はびょうきのままバイトから帰ってきた。{coins} コインしかかせげなかった 🤒',
    '{name} 打工回来了！赚到 {coins} 金币 💰': '{name}がバイトから帰ってきた！{coins} コインかせいだ 💰',
    '（{trait} {points}，省了 {minutes} 分钟）': '（{trait} {points}、{minutes} 分短縮）',
    '{emoji} 出门{job}去了{saved}': '{emoji} {job}に出かけた{saved}',
    // --- study --------------------------------------------------------------
    '{emoji} 上完{lesson}，{trait} +{gain}': '{emoji} {lesson}のじゅぎょうが終わった。{trait} +{gain}',
    '{name} 学完{lesson}，{trait} +{gain} 📚': '{name}は{lesson}を勉強した。{trait} +{gain} 📚',
    '{emoji} 去上{lesson}（学费 {tuition}）': '{emoji} {lesson}のじゅぎょうへ（授業料 {tuition}）',
    // --- trips --------------------------------------------------------------
    '{emoji} {trip}回来，带回「{souvenir}」': '{emoji} {trip}から帰ってきた。おみやげは「{souvenir}」',
    '{name} 从{trip}回来了，带回「{souvenir}」🧳': '{name}が{trip}から帰ってきた。おみやげは「{souvenir}」🧳',
    '{emoji} 出发去{trip}（花了 {cost} 金币）': '{emoji} {trip}に出発（{cost} コイン）',
    '{emoji} 从{label}提前回来了，钱退回来了': '{emoji} {label}から早めに帰ってきた。お金はもどってきた',
    '{emoji} 从{label}提前回来了，白跑一趟': '{emoji} {label}から早めに帰ってきた。むだ足だった',
    // --- illness ------------------------------------------------------------
    '得了{ill} 🤒': '{ill}になった 🤒',
    '{name} 得了{ill}，需要{cure} 🤒': '{name}は{ill}になった。{cure}が必要です 🤒',
    '自己好了，扛过去了 💚': '自分で治った。よくがんばった 💚',
    '{name} 的{ill}自己好了 💚': '{name}の{ill}が自然に治った 💚',
    '病情加重：{ill}': '病気が悪化：{ill}',
    '{name} 的病情加重了：{ill}，需要{cure}': '{name}の病気が悪くなった：{ill}。{cure}が必要です',
    // --- shop and bag -------------------------------------------------------
    '买了 {emoji} {item}（-{price} 金币）': '{emoji} {item}を買った（-{price} コイン）',
    '吃了 {emoji} {item}，病好了': '{emoji} {item}を飲んで、病気が治った',
    '{name} 吃了 {item}，痊愈了 💚': '{name}は{item}を飲んで元気になった 💚',
    '用了 {emoji} {item}': '{emoji} {item}を使った',
    // --- moods --------------------------------------------------------------
    '在打工': 'バイト中',
    '在上课': 'じゅぎょう中',
    '在旅行': '旅行中',
    '已经走了': '天国へいった',
    '生病了': 'びょうき',
    '得了{ill}': '{ill}にかかった',
    '饿了': 'おなかぺこぺこ',
    '该洗澡了': 'おふろに入りたい',
    '睡着了': 'ねむっている',
    '很开心': 'ごきげん',
    '有点孤单': 'ちょっとさみしい',
    '还不错': 'まあまあ',
  },
  en: {
    // --- the default name (only at egg time; a name is never translated after)
    '猪猪': 'Piggy',
    // --- care actions -------------------------------------------------------
    '喂食': 'Feed',
    '洗澡': 'Bathe',
    '玩耍': 'Play',
    '摸摸': 'Pat',
    '吃了一口 🍎': 'Had a bite 🍎',
    '洗了个澡 🛁': 'Had a bath 🛁',
    '玩了一会儿 🎾': 'Played for a while 🎾',
    '被摸了摸头 ❤️': 'Got a pat on the head ❤️',
    '{emoji} {action}用了「{item}」': '{emoji} {action}: used {item}',
    // --- life and death -----------------------------------------------------
    '被开发者按死了': 'was put down by the developer',
    '没能撑过去': "didn't make it",
    '{name} {why}…用{item}可以救回来，也可以领养一只新的': '{name} {why}… A {item} can bring it back, or you can adopt a new one',
    '🔧 开发者改了状态（{from} → {to}）': '🔧 Developer changed the state ({from} → {to})',
    '又领养了一只，纸盒里传来窸窸窣窣的声音 📦': 'Adopted another one — something is rustling in the box 📦',
    '纸盒打开了，一只小猪蹦了出来 🐷': 'The box opened and a piglet hopped out 🐷',
    '长成了{stage} {emoji}': 'Grew up: {stage} {emoji}',
    '{name} 长成了{stage} {emoji}': '{name} has grown up: {stage} {emoji}',
    '被 {item} 救了回来 ✨': 'Brought back by a {item} ✨',
    '{name} 回来了 ✨': '{name} is back ✨',
    '改名叫「{name}」': 'Renamed to "{name}"',
    // --- work ---------------------------------------------------------------
    '（带病上工，只有一半）': ' (worked sick, half pay)',
    '（{trait} {points}）': ' ({trait} {points})',
    '{emoji} {job}回来，赚了 {coins} 金币{tag}': '{emoji} {job} done, earned {coins} coins{tag}',
    '{name} 带病打工回来了，只赚到 {coins} 金币 🤒': '{name} worked while sick and only earned {coins} coins 🤒',
    '{name} 打工回来了！赚到 {coins} 金币 💰': '{name} is back from work! Earned {coins} coins 💰',
    '（{trait} {points}，省了 {minutes} 分钟）': ' ({trait} {points}, {minutes} min saved)',
    '{emoji} 出门{job}去了{saved}': '{emoji} Off to work: {job}{saved}',
    // --- study --------------------------------------------------------------
    '{emoji} 上完{lesson}，{trait} +{gain}': '{emoji} Finished {lesson}, {trait} +{gain}',
    '{name} 学完{lesson}，{trait} +{gain} 📚': '{name} finished {lesson}: {trait} +{gain} 📚',
    '{emoji} 去上{lesson}（学费 {tuition}）': '{emoji} Off to class: {lesson} (tuition {tuition})',
    // --- trips --------------------------------------------------------------
    '{emoji} {trip}回来，带回「{souvenir}」': '{emoji} Home from the trip ({trip}) with: {souvenir}',
    '{name} 从{trip}回来了，带回「{souvenir}」🧳': '{name} is home from the trip ({trip}) with: {souvenir} 🧳',
    '{emoji} 出发去{trip}（花了 {cost} 金币）': '{emoji} Off on a trip: {trip} ({cost} coins)',
    '{emoji} 从{label}提前回来了，钱退回来了': '{emoji} Came back early ({label}), money refunded',
    '{emoji} 从{label}提前回来了，白跑一趟': '{emoji} Came back early ({label}), all for nothing',
    // --- illness ------------------------------------------------------------
    '得了{ill} 🤒': 'Got sick: {ill} 🤒',
    '{name} 得了{ill}，需要{cure} 🤒': '{name} is sick: {ill}. Needs {cure} 🤒',
    '自己好了，扛过去了 💚': 'Got better on its own 💚',
    '{name} 的{ill}自己好了 💚': '{name} got over it on its own: {ill} 💚',
    '病情加重：{ill}': 'Got worse: {ill}',
    '{name} 的病情加重了：{ill}，需要{cure}': '{name} got worse: {ill}. Needs {cure}',
    // --- shop and bag -------------------------------------------------------
    '买了 {emoji} {item}（-{price} 金币）': 'Bought {emoji} {item} (-{price} coins)',
    '吃了 {emoji} {item}，病好了': 'Took {emoji} {item}, all better',
    '{name} 吃了 {item}，痊愈了 💚': '{name} took {item} and is all better 💚',
    '用了 {emoji} {item}': 'Used {emoji} {item}',
    // --- moods --------------------------------------------------------------
    '在打工': 'At work',
    '在上课': 'In class',
    '在旅行': 'Traveling',
    '已经走了': 'Gone',
    '生病了': 'Sick',
    '得了{ill}': 'Sick: {ill}',
    '饿了': 'Hungry',
    '该洗澡了': 'Needs a bath',
    '睡着了': 'Asleep',
    '很开心': 'Happy',
    '有点孤单': 'A bit lonely',
    '还不错': 'Doing fine',
  },
}
