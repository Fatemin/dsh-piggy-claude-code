// [dsh-piggy-claude-code mod] Translations for index: keys are the Chinese source strings.
// See i18n.js and locales/GLOSSARY.md.
//
// The snapshot's own words (age, durations) and the slash command's replies
// that do not go through render.js. Data labels live in locales/data.js.
// {name} is the pig's name and is never translated; {cmd} is the command name.
export default {
  ja: {
    // --- age and durations --------------------------------------------------
    '还没拆开': 'まだ箱の中',
    '活了 {span}': '{span}生きた',
    '今天刚出生': 'きょう生まれた',
    '1 天大': '生まれて1日',
    '{days} 天大': '生まれて{days}日',
    '{n} 分钟': '{n}分',
    '{n} 小时': '{n}時間',
    '{n} 天': '{n}日',
    // --- host ---------------------------------------------------------------
    '[dsh-pig] 路由注册失败，猪只能用命令访问': '[dsh-pig] ルートを登録できませんでした。コマンドからだけ使えます',
    '[hatch|feed|bathe|play|pet|study <科目>|work <job>|trip <目的地>|shop|buy|use|weigh|look <老年|原版>|lang <zh|ja|en>|about]':
      '[hatch|feed|bathe|play|pet|study <科目>|work <バイト>|trip <行き先>|shop|buy|use|weigh|look <おじいブタ|オリジナル>|lang <zh|ja|en>|about]',
    '🐖 猪摔了一跤：{error}': '🐖 ブタがころんじゃった：{error}',
    '猪': 'この子',
    // --- care ---------------------------------------------------------------
    '{name} 正在外面，回来再说。': '{name}はおでかけ中。帰ってきてからにしてね。',
    '{name} 已经走了…用 {item} 可以救回来。': '{name}はもういない…{item}で生きかえらせられます。',
    '🐖 {action} 没做成。': '🐖 {action}できなかった。',
    '这里已经住着 {name} 了 🐖': 'ここにはもう{name}が住んでいるよ 🐖',
    // --- going out ----------------------------------------------------------
    '没有「{key}」这份工作。/{cmd} work 看有哪些。': '「{key}」というバイトはないよ。/{cmd} work で確認してね。',
    '用法：/{cmd} study <科目> <{stages}>\n科目：{subjects}': '使い方：/{cmd} study <科目> <{stages}>\n科目：{subjects}',
    '没有「{key}」这个目的地。/{cmd} trip 看有哪些。': '「{key}」という行き先はないよ。/{cmd} trip で確認してね。',
    '{name} 没在外面。': '{name}はおでかけしていないよ。',
    '{name} 提前回来了，退回 {coins} 金币。': '{name}が早めに帰ってきた。{coins} コインもどってきた。',
    '{name} 提前回来了，这趟白跑。': '{name}が早めに帰ってきた。むだ足だった。',
    // --- shop and bag -------------------------------------------------------
    '{price} 金币': '{price} コイン',
    '🛒 商店（你有 {coins} 金币）\n{lines}\n\n买：/{cmd} buy <物品>': '🛒 おみせ（{coins} コイン持っています）\n{lines}\n\n買う：/{cmd} buy <アイテム>',
    '没有「{name}」这样东西。/{cmd} shop 看货架。': '「{name}」というものはないよ。/{cmd} shop で売り場を見てね。',
    '没有「{name}」这样东西。': '「{name}」というものはないよ。',
    // --- look and name ------------------------------------------------------
    '用法：/{cmd} look 老年 | 原版': '使い方：/{cmd} look おじいブタ | オリジナル',
    '要长到 80 kg、变成老年猪之后才能换样子': '80 kg になっておじいブタになってから、見た目を変えられるよ',
    '现在换不了样子': '今は見た目を変えられない',
    '🐖 换回原版小猪的样子了': '🐖 オリジナルのこブタの姿にもどした',
    '🐖 换成老年猪的样子了': '🐖 おじいブタの姿にした',
    '用法：/{cmd} name <名字>（16 字以内）': '使い方：/{cmd} name <名前>（16文字まで）',
    '从今天起，它叫「{name}」🐖': '今日から「{name}」という名前だよ 🐖',
    '不认识「{sub}」。可用：/{cmd} · {list}': '「{sub}」はわからないよ。使えるもの：/{cmd} · {list}',
    // --- refusals -----------------------------------------------------------
    '{name} 已经走了…': '{name}はもういない…',
    '{name} 已经在外面了。': '{name}はもうおでかけ中。',
    '{name} 病着，不能出门 —— 先治好它。': '{name}はびょうきで出かけられない。先に治してあげてね。',
    '{name} 太饿了，先喂点东西。': '{name}はおなかぺこぺこ。先にごはんをあげてね。',
    '钱不够，需要 {price} 金币，你只有 {coins}。': 'コインが足りない。{price} コイン必要だけど、{coins} しかない。',
    '没有这个选项。': 'そのメニューはないよ。',
    '现在没法出门。': '今は出かけられない。',
  },
  en: {
    // --- age and durations --------------------------------------------------
    '还没拆开': 'still in the box',
    '活了 {span}': 'Lived {span}',
    '今天刚出生': 'born today',
    '1 天大': '1 day old',
    '{days} 天大': '{days} days old',
    '{n} 分钟': '{n} min',
    '{n} 小时': '{n} h',
    '{n} 天': '{n} days',
    // --- host ---------------------------------------------------------------
    '[dsh-pig] 路由注册失败，猪只能用命令访问': '[dsh-pig] Could not register the routes; the pig is command-only',
    '[hatch|feed|bathe|play|pet|study <科目>|work <job>|trip <目的地>|shop|buy|use|weigh|look <老年|原版>|lang <zh|ja|en>|about]':
      '[hatch|feed|bathe|play|pet|study <subject>|work <job>|trip <place>|shop|buy|use|weigh|look <elder|original>|lang <zh|ja|en>|about]',
    '🐖 猪摔了一跤：{error}': '🐖 The pig tripped: {error}',
    '猪': 'Your pig',
    // --- care ---------------------------------------------------------------
    '{name} 正在外面，回来再说。': "{name} is out. Try again when it's back.",
    '{name} 已经走了…用 {item} 可以救回来。': '{name} is gone… A {item} can bring it back.',
    '🐖 {action} 没做成。': "🐖 {action} didn't work.",
    '这里已经住着 {name} 了 🐖': '{name} already lives here 🐖',
    // --- going out ----------------------------------------------------------
    '没有「{key}」这份工作。/{cmd} work 看有哪些。': 'No job called "{key}". See /{cmd} work.',
    '用法：/{cmd} study <科目> <{stages}>\n科目：{subjects}': 'Usage: /{cmd} study <subject> <{stages}>\nSubjects: {subjects}',
    '没有「{key}」这个目的地。/{cmd} trip 看有哪些。': 'No place called "{key}". See /{cmd} trip.',
    '{name} 没在外面。': "{name} isn't out.",
    '{name} 提前回来了，退回 {coins} 金币。': '{name} came back early; {coins} coins refunded.',
    '{name} 提前回来了，这趟白跑。': '{name} came back early, all for nothing.',
    // --- shop and bag -------------------------------------------------------
    '{price} 金币': '{price} coins',
    '🛒 商店（你有 {coins} 金币）\n{lines}\n\n买：/{cmd} buy <物品>': '🛒 Shop (you have {coins} coins)\n{lines}\n\nBuy: /{cmd} buy <item>',
    '没有「{name}」这样东西。/{cmd} shop 看货架。': 'No such thing as "{name}". See /{cmd} shop.',
    '没有「{name}」这样东西。': 'No such thing as "{name}".',
    // --- look and name ------------------------------------------------------
    '用法：/{cmd} look 老年 | 原版': 'Usage: /{cmd} look elder | original',
    '要长到 80 kg、变成老年猪之后才能换样子': 'It can change its look once it reaches 80 kg and becomes an Elder pig',
    '现在换不了样子': "Can't change its look right now",
    '🐖 换回原版小猪的样子了': '🐖 Back to the Original piglet look',
    '🐖 换成老年猪的样子了': '🐖 Switched to the Elder pig look',
    '用法：/{cmd} name <名字>（16 字以内）': 'Usage: /{cmd} name <name> (up to 16 characters)',
    '从今天起，它叫「{name}」🐖': 'From today it is called "{name}" 🐖',
    '不认识「{sub}」。可用：/{cmd} · {list}': 'Unknown command "{sub}". Try: /{cmd} · {list}',
    // --- refusals -----------------------------------------------------------
    '{name} 已经走了…': '{name} is gone…',
    '{name} 已经在外面了。': '{name} is already out.',
    '{name} 病着，不能出门 —— 先治好它。': "{name} is sick and can't go out — cure it first.",
    '{name} 太饿了，先喂点东西。': '{name} is too hungry. Feed it first.',
    '钱不够，需要 {price} 金币，你只有 {coins}。': 'Not enough coins: it costs {price}, you have {coins}.',
    '没有这个选项。': 'No such option.',
    '现在没法出门。': "Can't go out right now.",
  },
}
