/**
 * dsh-pig · client — the floating pig. 🐖
 *
 * Hand-written browser bundle: DSH loads it through `window.__ModuleLoader__`,
 * so no bundler is involved. Raw DOM and `fetch` only — no React, no imports.
 *
 * Layout follows the original QQ 宠物: the pet sits at the top, and a cream icon
 * bar sits directly beneath it. Six icons — 状态 · 学习 · 打工 · 商店 · 旅行 ·
 * 背包 — switch what the area below the bar shows, so nothing ever needs typing.
 *
 * Every value the host sends goes through `normalize()` first. A host/client
 * version mismatch must degrade to sane defaults and an explanation, never to a
 * screen full of `undefined`.
 */

window.__ModuleLoader__.load({
  id: 'dsh-piggy',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports

    var STATE_URL = '/dsh-pig/state'
    // Hand-drawn stages are served from the plugin's own /art route.
    var ART_URL = '/dsh-pig/art/'
    var ACT_URL = '/dsh-pig/act'
    var POLL_MS = 4000
    var MOUNTED = 'data-dsh-pig'
    var OPEN_KEY = 'dsh-pig:open'
    var POSITION_KEY = 'dsh-pig:position'
    var devMode = false
    // Must match `.dp-card{width}` — used to keep the panel inside the window.
    var PANEL_WIDTH = 292
    var PANEL_GAP = 8
    var PANEL_MARGIN = 10
    var PANEL_MIN_HEIGHT = 120
    // Must match `--scene-open` in the CSS (a test keeps them honest). The pig
    // is clamped against this rather than its collapsed height, so opening the
    // panel can never shove the hud off the top of the window.
    var SCENE_RESERVE = 132
    // Must match `.dp-scene{padding-inline}`. The pig's on-screen footprint is
    // the glyph plus this padding; clamping by the glyph alone leaves it a few
    // pixels over the edge.
    var PIG_PADDING_X = 6

    var TABS = [
      { key: 'status', label: '状态', emoji: '📋' },
      { key: 'study', label: '学习', emoji: '📚' },
      { key: 'work', label: '打工', emoji: '💼' },
      { key: 'shop', label: '商店', emoji: '🛒' },
      { key: 'travel', label: '旅行', emoji: '🧳' },
      { key: 'bag', label: '背包', emoji: '🎒' },
    ]

    /** Developer mode: off unless asked for, and remembered across reloads. */
    var DEV_KEY = 'dsh-pig:dev'
    var DEV_TAB = { key: 'dev', label: '调试', emoji: '🔧' }

    // -------------------------------------------------------------------
    // [dsh-piggy-claude-code mod] Chinese · Japanese · English.
    //
    // Same idea as the host's i18n.js, which this bundle cannot import:
    // gettext style, the Chinese text in the code IS the key, a missing key
    // falls back to Chinese, and `{name}` placeholders are filled from params
    // so word order can differ per language. Terms follow locales/GLOSSARY.md.
    // Only text the client itself owns goes through here; every label the host
    // sends (items, jobs, stages, illnesses, announcements…) arrives already
    // translated and must not be translated twice.
    // -------------------------------------------------------------------
    var LANG_KEYS = ['zh', 'ja', 'en']
    var LANG_NAMES = { zh: '中文', ja: '日本語', en: 'English' }
    var I18N = {
      ja: {
        // tabs
        '状态': 'ようす', '学习': '勉強', '打工': 'バイト', '商店': 'おみせ',
        '旅行': '旅行', '背包': 'バッグ', '调试': 'デバッグ',
        // care
        '喂食': 'ごはん', '洗澡': 'おふろ', '玩耍': 'あそぶ', '摸摸': 'なでなで',
        // the box
        '里面好像有东西…': 'なにか入ってるみたい…',
        '动了！再戳一下！': 'うごいた！もう一回つついて！',
        '戳三下': '3回つついて', '哇——！': 'わあ——！',
        '一个{box}': '{box}がひとつ',
        '点开拆开它': 'つついてあけよう',
        '门口放着一个纸盒，里面窸窸窣窣 📦': '玄関にダンボール箱がひとつ。中でごそごそ音がする 📦',
        '拆开纸盒': '箱をあける',
        '拆开就会蹦出一只小猪 —— 不用敲命令': 'あけるとこブタが飛び出すよ —— コマンドはいらないよ',
        // empty shelves
        '没有吃的啦，快去买一点 🍎': 'たべものがないよ、買いに行こう 🍎',
        '没有洗浴用品了，去买点吧 🧼': 'おふろ用品がないよ、買いに行こう 🧼',
        '没有玩具了，去商店看看 🪀': 'おもちゃがないよ、おみせを見てみて 🪀',
        // shop shelves and item kinds
        '食物': 'たべもの', '洗浴': 'おふろ用品', '玩具': 'おもちゃ', '药品': 'くすり', '复活': 'よみがえり',
        '对症！': 'これが効く！', '药': 'くすり', '复活用': 'よみがえり用',
        // school
        '小学': '小学校', '大学': '大学', '研究生': '大学院',
        // fallbacks for fields an older host did not send
        '猪猪': 'ブーちゃん', '小猪': 'こブタ', '还不错': 'まあまあ', '生病': 'びょうき',
        '工作': 'しごと', '课': 'じゅぎょう', '学段': '学校', '目的地': '行き先',
        '物品': 'アイテム', '外面': 'おでかけ先', '纸盒': 'ダンボール箱',
        // the pig itself
        '左键摸摸 · 右键打开面板 · 拖动可移动': '左クリックでなでなで · 右クリックでパネル · ドラッグで移動',
        '孵出来啦！': '出てきた！', '吃掉了！': 'たべた！', '洗干净啦～': 'きれいになった～',
        '好开心！': 'たのしい！', '好舒服…': 'きもちいい…', '出门打工！': 'バイトに行ってくる！',
        '上学去！': '学校に行ってくる！', '出发旅行！': '旅行に出発！', '提前回来了…': '早めに帰ってきた…',
        '买到了！': '買えた！', '用掉了。': '使った。', '我长大啦！': '大きくなったよ！',
        '在忙': 'はたらき中', '在念书': '勉強中', '在路上': '旅行中', '在外面': 'おでかけ中',
        '{what}：{label}': '{what}：{label}',
        // status tab
        '饱食': 'おなか', '心情': 'きげん', '清洁': 'きれいさ', '健康': '健康',
        '智力': 'かしこさ', '魅力': 'みりょく', '武力': 'ちから', '体重': '体重', '年龄': '年齢',
        '再长 {kg} kg 就长成下一阶段了': 'あと {kg} kg で次の姿に育つよ',
        '老年猪': 'おじいブタ', '原版': 'オリジナル',
        '不在家': 'おでかけ中', '{n}s': '{n}秒', '语言': '言語',
        // care item picker
        '喂点什么？': 'なにを食べさせる？', '用哪个洗澡？': 'どれでおふろにする？',
        '拿哪个玩具？': 'どのおもちゃにする？', '用哪个？': 'どれを使う？',
        '{label}（自带）': '{label}（いつでもある）', '用': '使う', '算了': 'やめる',
        // study tab
        '宿主还没提供课程表。': 'ホストからまだ時間割が届いていないよ。',
        '{time} · 学费 {tuition} 🪙 · 属性 +{gain}': '{time} · 授業料 {tuition} 🪙 · 能力 +{gain}',
        '要先念完{label}（{done}/{need}）': '先に{label}を卒業してね（{done}/{need}）',
        '已上 {n} 次': 'じゅぎょう {n} 回',
        // work tab
        '宿主还没提供工作列表。': 'ホストからまだバイトのリストが届いていないよ。',
        '赚 {coins} 🪙': '{coins} 🪙 もらえる', '省 {pct}% 时间': '時間 {pct}% 短縮',
        '报酬 +{pct}%': '報酬 +{pct}%', '去上课就能涨': 'じゅぎょうで上がるよ', '出发': '出発',
        // shop tab
        '宿主还没提供货架。': 'ホストからまだ商品が届いていないよ。',
        '现在需要': 'いま必要', '买': '買う',
        // travel and bag tabs
        '宿主还没提供目的地。': 'ホストからまだ行き先が届いていないよ。',
        '纪念品': 'おみやげ', '还没出过远门。': 'まだ遠くへ行ったことがないよ。',
        '背包空空的 —— 去「商店」买点东西。': 'バッグはからっぽ —— 「おみせ」でなにか買おう。',
        '使用': '使う', '收藏册还空着。': 'コレクションはまだからっぽ。',
        // durations
        '{n} 天': '{n}日', '{n} 小时': '{n}時間', '{n} 分钟': '{n}分',
        // banners
        '宿主是旧版本': 'ホストが古いバージョンです',
        '金币、健康、打工、商店这些是新增的，重启 dsh（不是刷新页面）之后才会出现。':
          'コイン・健康・バイト・おみせは新しい機能です。dsh を再起動すると出てきます（ページの再読み込みではなく）。',
        '{name} 走了': '{name} はいってしまった',
        '{name} 走了，灵魂还留在墓碑上 👻': '{name} はいってしまった。たましいがまだおはかにいるよ 👻',
        '用还魂丹可以把它叫回来，或者领养一只新的小猪': 'よみがえりの薬で呼びもどせるよ。新しい子をむかえることもできるよ',
        '在「背包」里用还魂丹就能救回来（金币、收藏、上过的课都保留）':
          '「バッグ」でよみがえりの薬を使えば助かるよ（コイン・コレクション・じゅぎょうはそのまま）',
        '领养新猪': '新しい子をむかえる',
        '{name}（第 {stage}/4 期）': '{name}（{stage}/4 期）',
        '需要「{cure}」—— 去商店买对应的药': '「{cure}」が必要 —— おみせで病気に合ったくすりを買おう',
        '带病也能出门，但报酬只有一半；在外面病情会走得更快，躺着养最省':
          'びょうきでもおでかけできるけど報酬は半分。外ではびょうきが早く進むから、休むのがいちばん',
        '钱不够也没关系 —— 先去打工，赚够 {price} 🪙 买「{item}」':
          'お金が足りなくても大丈夫 —— バイトで {price} 🪙 かせいで「{item}」を買おう',
        '在外面：{label}': 'おでかけ中：{label}', '还有 {n} 秒': 'あと {n} 秒', '叫它回来': '呼びもどす',
        // messages
        '猪有新消息': 'ブタからお知らせ', '连接不上宿主': 'ホストにつながらない',
        '背包里没有能用的东西': 'バッグに使えるものがないよ',
        '还要等 {n} 秒': 'あと {n} 秒まってね', '钱不够': 'お金が足りない', '它在外面': 'おでかけ中だよ',
        '太虚弱了，先养好再出门': '弱ってるよ。元気になってからおでかけしよう', '太饿了': 'おなかぺこぺこ',
        '药不对症': 'くすりが合ってない', '背包里没有': 'バッグにないよ', '它没生病': 'びょうきじゃないよ',
        '它已经走了…': 'もういってしまった…', '它没在外面': 'おでかけしてないよ',
        '不认识这种语言': 'その言語はわからないよ',
        '这个操作没成': 'うまくいかなかった', '操作没送到宿主': 'ホストに届かなかった',
        // developer mode
        '开发者模式 · Ctrl+Shift+D 关闭': '開発者モード · Ctrl+Shift+D でオフ',
        '还没有猪。先「拆开纸盒」再调。': 'まだブタがいないよ。先に「箱をあける」してね。',
        '开发者模式已开': '開発者モード オン', '开发者模式已关': '開発者モード オフ',
        '资源': 'リソース', '生死': '生と死', '面板': 'パネル',
        '满状态': '全回復', '饿': 'はらぺこ', '脏': 'よごれ', '孤单': 'さみしい', '困': 'ねむい',
        '感冒一期': 'かぜ（1期）', '肺炎': '肺炎', '肺结核': '結核', '胃癌': '胃がん', '治好': '治す',
        '青年': 'わかブタ', '中年': 'おとなブタ', '老年': 'おじいブタ', '老死': '寿命',
        '全套药': 'くすりセット', '弄死': '死なせる', '领养': '新しい子をむかえる', '重置': 'リセット',
        '展开/收起': '開く/閉じる', '+1 小时': '+1 時間', '+1 天': '+1 日',
        '当前：{stage} · 健康 {health} · 🪙 {coins}': '今：{stage} · 健康 {health} · 🪙 {coins}',
      },
      en: {
        // tabs
        '状态': 'Status', '学习': 'Study', '打工': 'Work', '商店': 'Shop',
        '旅行': 'Travel', '背包': 'Bag', '调试': 'Debug',
        // care
        '喂食': 'Feed', '洗澡': 'Bathe', '玩耍': 'Play', '摸摸': 'Pat',
        // the box
        '里面好像有东西…': 'Something is in there…',
        '动了！再戳一下！': 'It moved! Poke it again!',
        '戳三下': 'Poke 3 times', '哇——！': 'Whoa—!',
        '一个{box}': 'A {box}',
        '点开拆开它': 'Poke it open',
        '门口放着一个纸盒，里面窸窸窣窣 📦': 'There is a box at the door, and something is rustling inside 📦',
        '拆开纸盒': 'Open the box',
        '拆开就会蹦出一只小猪 —— 不用敲命令': 'Open it and a piglet pops out — no commands needed',
        // empty shelves
        '没有吃的啦，快去买一点 🍎': 'No food left, go buy some 🍎',
        '没有洗浴用品了，去买点吧 🧼': 'No bath things left, go buy some 🧼',
        '没有玩具了，去商店看看 🪀': 'No toys left, have a look in the shop 🪀',
        // shop shelves and item kinds
        '食物': 'Food', '洗浴': 'Bath', '玩具': 'Toys', '药品': 'Medicine', '复活': 'Revival',
        '对症！': 'The right medicine!', '药': 'medicine', '复活用': 'for revival',
        // school
        '小学': 'Primary school', '大学': 'University', '研究生': 'Graduate school',
        // fallbacks for fields an older host did not send
        '猪猪': 'Piggy', '小猪': 'Piglet', '还不错': 'Doing fine', '生病': 'Sick',
        '工作': 'Job', '课': 'Lesson', '学段': 'School', '目的地': 'Destination',
        '物品': 'Item', '外面': 'somewhere', '纸盒': 'box',
        // the pig itself
        '左键摸摸 · 右键打开面板 · 拖动可移动': 'Left-click to pat · right-click for the panel · drag to move',
        '孵出来啦！': 'Out it comes!', '吃掉了！': 'Yum, all gone!', '洗干净啦～': 'Squeaky clean～',
        '好开心！': 'So much fun!', '好舒服…': 'That feels nice…', '出门打工！': 'Off to work!',
        '上学去！': 'Off to school!', '出发旅行！': 'Off on a trip!', '提前回来了…': 'Back early…',
        '买到了！': 'Got it!', '用掉了。': 'Used it.', '我长大啦！': 'I grew up!',
        '在忙': 'Working', '在念书': 'Studying', '在路上': 'Traveling', '在外面': 'Out',
        '{what}：{label}': '{what}: {label}',
        // status tab
        '饱食': 'Fullness', '心情': 'Mood', '清洁': 'Cleanliness', '健康': 'Health',
        '智力': 'Smarts', '魅力': 'Charm', '武力': 'Strength', '体重': 'Weight', '年龄': 'Age',
        '再长 {kg} kg 就长成下一阶段了': '{kg} kg more to grow into the next stage',
        '老年猪': 'Elder pig', '原版': 'Original',
        '不在家': 'out', '{n}s': '{n}s', '语言': 'Language',
        // care item picker
        '喂点什么？': 'What should it eat?', '用哪个洗澡？': 'Bathe with what?',
        '拿哪个玩具？': 'Which toy?', '用哪个？': 'Use which one?',
        '{label}（自带）': '{label} (always there)', '用': 'Use', '算了': 'Never mind',
        // study tab
        '宿主还没提供课程表。': 'The host has not sent a timetable yet.',
        '{time} · 学费 {tuition} 🪙 · 属性 +{gain}': '{time} · tuition {tuition} 🪙 · stats +{gain}',
        '要先念完{label}（{done}/{need}）': 'Finish {label} first ({done}/{need})',
        '已上 {n} 次': '{n} lessons so far',
        // work tab
        '宿主还没提供工作列表。': 'The host has not sent any jobs yet.',
        '赚 {coins} 🪙': 'earns {coins} 🪙', '省 {pct}% 时间': '{pct}% faster',
        '报酬 +{pct}%': 'pay +{pct}%', '去上课就能涨': 'lessons raise this', '出发': 'Go',
        // shop tab
        '宿主还没提供货架。': 'The host has not stocked the shop yet.',
        '现在需要': 'needed now', '买': 'Buy',
        // travel and bag tabs
        '宿主还没提供目的地。': 'The host has not sent any destinations yet.',
        '纪念品': 'Souvenirs', '还没出过远门。': 'No trips yet.',
        '背包空空的 —— 去「商店」买点东西。': 'The bag is empty — buy something in the Shop.',
        '使用': 'Use', '收藏册还空着。': 'The collection is still empty.',
        // durations
        '{n} 天': '{n} days', '{n} 小时': '{n} h', '{n} 分钟': '{n} min',
        // banners
        '宿主是旧版本': 'The host is out of date',
        '金币、健康、打工、商店这些是新增的，重启 dsh（不是刷新页面）之后才会出现。':
          'Coins, health, work and the shop are new. They appear after restarting dsh (not just reloading the page).',
        '{name} 走了': '{name} has passed away',
        '{name} 走了，灵魂还留在墓碑上 👻': '{name} has passed away; its soul still lingers at the grave 👻',
        '用还魂丹可以把它叫回来，或者领养一只新的小猪': 'A revival pill can call it back, or you can adopt a new piglet',
        '在「背包」里用还魂丹就能救回来（金币、收藏、上过的课都保留）':
          'Use a revival pill from the Bag to bring it back (coins, collection and lessons are kept)',
        '领养新猪': 'Adopt a new pig',
        '{name}（第 {stage}/4 期）': '{name} (stage {stage}/4)',
        '需要「{cure}」—— 去商店买对应的药': 'Needs "{cure}" — buy the right medicine in the Shop',
        '带病也能出门，但报酬只有一半；在外面病情会走得更快，躺着养最省':
          'It can still go out while sick, but for half pay, and the illness gets worse faster outside. Resting is best.',
        '钱不够也没关系 —— 先去打工，赚够 {price} 🪙 买「{item}」':
          'Short of coins? Go to work first and earn {price} 🪙 for "{item}"',
        '在外面：{label}': 'Out: {label}', '还有 {n} 秒': '{n}s left', '叫它回来': 'Call back',
        // messages
        '猪有新消息': 'News from your pig', '连接不上宿主': "Can't reach the host",
        '背包里没有能用的东西': 'Nothing usable in the bag',
        '还要等 {n} 秒': 'Wait {n}s more', '钱不够': 'Not enough coins', '它在外面': "It's out",
        '太虚弱了，先养好再出门': 'Too weak. Rest up before going out', '太饿了': 'Too hungry',
        '药不对症': 'Wrong medicine', '背包里没有': 'Not in the bag', '它没生病': "It isn't sick",
        '它已经走了…': "It's gone…", '它没在外面': "It isn't out",
        '不认识这种语言': 'Unknown language',
        '这个操作没成': "That didn't work", '操作没送到宿主': "Couldn't reach the host",
        // developer mode
        '开发者模式 · Ctrl+Shift+D 关闭': 'Developer mode · Ctrl+Shift+D to turn off',
        '还没有猪。先「拆开纸盒」再调。': 'No pig yet. Open the box first.',
        '开发者模式已开': 'Developer mode on', '开发者模式已关': 'Developer mode off',
        '资源': 'Resources', '生死': 'Life and death', '面板': 'Panel',
        '满状态': 'Max all', '饿': 'Hungry', '脏': 'Dirty', '孤单': 'Lonely', '困': 'Sleepy',
        '感冒一期': 'Cold, stage 1', '肺炎': 'Pneumonia', '肺结核': 'Tuberculosis', '胃癌': 'Stomach cancer', '治好': 'Cure',
        '青年': 'Young pig', '中年': 'Grown pig', '老年': 'Elder pig', '老死': 'Old age',
        '全套药': 'All medicines', '弄死': 'Kill', '领养': 'Adopt', '重置': 'Reset',
        '展开/收起': 'Open/close', '+1 小时': '+1 h', '+1 天': '+1 day',
        '当前：{stage} · 健康 {health} · 🪙 {coins}': 'Now: {stage} · Health {health} · 🪙 {coins}',
      },
    }
    // English singulars, picked when `params.n === 1`. Japanese and Chinese
    // have no plural, so this is the only language that needs them.
    var I18N_EN_ONE = {
      '{n} 天': '{n} day',
      '已上 {n} 次': '{n} lesson so far',
    }

    var normalizeLang = v => (typeof v === 'string' && LANG_KEYS.indexOf(v) >= 0 ? v : 'zh')

    function fillParams(text, params) {
      if (params === undefined || params === null) return text
      return text.replace(/\{(\w+)\}/g, function (whole, key) {
        return Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : whole
      })
    }

    /** Translate one Chinese source string into `lang`, falling back to the Chinese. */
    function tr(lang, zh, params) {
      if (typeof zh !== 'string') return zh
      var target = normalizeLang(lang)
      var text = zh
      if (target === 'en' && params && params.n === 1 && I18N_EN_ONE[zh] !== undefined) {
        text = I18N_EN_ONE[zh]
      } else if (target !== 'zh' && Object.prototype.hasOwnProperty.call(I18N[target], zh)) {
        text = I18N[target][zh]
      }
      return fillParams(text, params)
    }

    // The language of the last rendered snapshot (`view.lang`). Text is built
    // on every render, so a switch shows up on the next one without a reload.
    var currentLang = 'zh'
    function T(zh, params) { return tr(currentLang, zh, params) }

    var MODES = ['feed', 'bathe', 'play', 'pet']
    var CARE_LABEL = { feed: ['喂食', '🍎'], bathe: ['洗澡', '🛁'], play: ['玩耍', '🎾'], pet: ['摸摸', '❤️'] }
    // What the pig says when the shelf it needs is bare. Being told plainly
    // beats a generic "that did not work".
    /** A new pig arrives in a box and has to be poked out of it. */
    var BOX_POKES_TO_OPEN = 3
    var BOX_POKE_LINES = [
      '里面好像有东西…',
      '动了！再戳一下！',
    ]

    var NO_ITEM_LINE = {
      food: '没有吃的啦，快去买一点 🍎',
      bath: '没有洗浴用品了，去买点吧 🧼',
      toy: '没有玩具了，去商店看看 🪀',
    }
    var KIND_TITLE = { food: ['🍎', '食物'], bath: ['🧼', '洗浴'], toy: ['🪀', '玩具'], medicine: ['💊', '药品'], revive: ['✨', '复活'] }
    var KIND_ORDER = ['food', 'bath', 'toy', 'medicine', 'revive']
    var STAGES = [
      { key: 'primary', label: '小学' },
      { key: 'college', label: '大学' },
      { key: 'graduate', label: '研究生' },
    ]

    // ---------------------------------------------------------------------
    // Defensive readers — the whole point of this file's first hundred lines.
    // ---------------------------------------------------------------------

    var isObj = v => typeof v === 'object' && v !== null && !Array.isArray(v)
    var obj = v => (isObj(v) ? v : {})
    var arr = v => (Array.isArray(v) ? v : [])
    var num = (v, dflt) => (typeof v === 'number' && isFinite(v) ? v : dflt)
    var str = (v, dflt) => (typeof v === 'string' && v !== '' ? v : dflt)

    /**
     * Map any host payload — current, older, or truncated — onto the exact
     * shape the panel draws. Missing fields become defaults, never `undefined`.
     * @returns {object} a fully populated view model.
     */
    function normalize(raw) {
      var d = obj(raw)
      var pig = isObj(d.pig) ? d.pig : null
      var legacy = pig !== null && !('coins' in pig) && !('health' in pig)
      // [dsh-piggy-claude-code mod] the pig's language; the fallbacks below
      // speak it too, since the host never sent them.
      var lang = normalizeLang(d.lang)
      var L = zh => tr(lang, zh)

      return {
        lang: lang,
        langs: normalizeLangs(d.langs),
        legacy: legacy,
        // Trust the flag when the host sends one. Older hosts did not, and for
        // those "a pig exists" is still the right answer.
        hatched: d.hatched === true || (d.hatched === undefined && pig !== null),
        dead: d.dead === true || (pig !== null && num(pig.health, 5) <= 0),
        pig: pig === null ? null : {
          name: str(pig.name, L('猪猪')),
          // The pig is measured in days now; `stage` carries how big it is and
          // what it looks like.
          stage: {
            key: str(obj(pig.stage).key, 'piglet'),
            label: str(obj(pig.stage).label, L('小猪')),
            emoji: str(obj(pig.stage).emoji, '🐖'),
            size: num(obj(pig.stage).size, 56),
            line: str(obj(pig.stage).line, ''),
            art: typeof obj(pig.stage).art === 'string' && obj(pig.stage).art !== '' ? obj(pig.stage).art : null,
            faded: obj(pig.stage).faded === true,
          },
          ageLabel: str(pig.ageLabel, ''),
          daysToNextStage: typeof pig.daysToNextStage === 'number' ? pig.daysToNextStage : null,
          // [dsh-piggy-claude-code mod] growth by weight, switchable elder look.
          kgToNextStage: typeof pig.kgToNextStage === 'number' ? pig.kgToNextStage : null,
          canChooseLook: pig.canChooseLook === true,
          look: pig.look === 'original' ? 'original' : 'elder',
          soul: pig.soul === true,
          mood: str(pig.mood, 'fine'),
          moodEmoji: str(pig.moodEmoji, '😊'),
          moodLabel: str(pig.moodLabel, L('还不错')),
          satiety: Math.round(num(pig.satiety, 0)),
          happiness: Math.round(num(pig.happiness, 0)),
          cleanliness: Math.round(num(pig.cleanliness, 0)),
          health: num(pig.health, 5),
          healthPercent: num(pig.healthPercent, 100),
          coins: num(pig.coins, 0),
          weight: str(pig.weight, '—'),
          xp: num(pig.xp, 0),
          stageLine: str(pig.stageLine, ''),
          illness: isObj(pig.illness) ? {
            name: str(pig.illness.name, L('生病')),
            cure: str(pig.illness.cure, L('药')),
            stage: num(pig.illness.stage, 1),
          } : null,
          traits: {
            intel: num(obj(pig.traits).intel, 0),
            charm: num(obj(pig.traits).charm, 0),
            strong: num(obj(pig.traits).strong, 0),
          },
          courses: obj(pig.courses),
          souvenirs: arr(pig.souvenirs),
          memories: arr(pig.memories).filter(m => typeof m === 'string'),
        },
        actions: normalizeActions(d.actions),
        jobs: arr(d.jobs).map(job => ({
          key: str(obj(job).key, ''),
          label: str(obj(job).label, L('工作')),
          emoji: str(obj(job).emoji, '💼'),
          minutes: num(obj(job).minutes, 0),
          coins: num(obj(job).coins, 0),
          available: obj(job).available === true,
          // What schooling has bought this job.
          traitLabel: str(obj(job).traitLabel, ''),
          traitEmoji: str(obj(job).traitEmoji, ''),
          traitPoints: num(obj(job).traitPoints, 0),
          baseMinutes: num(obj(job).baseMinutes, 0),
          baseCoins: num(obj(job).baseCoins, 0),
          payPercent: num(obj(job).payPercent, 0),
          speedPercent: num(obj(job).speedPercent, 0),
        })).filter(job => job.key !== ''),
        subjects: arr(d.subjects).map(sub => ({
          key: str(obj(sub).key, ''),
          label: str(obj(sub).label, L('课')),
          emoji: str(obj(sub).emoji, '📘'),
          traitLabel: str(obj(sub).traitLabel, ''),
          level: num(obj(sub).level, 0),
          available: obj(sub).available === true,
        })).filter(sub => sub.key !== ''),
        stages: arr(d.stages).map(stage => ({
          key: str(obj(stage).key, ''),
          label: str(obj(stage).label, L('学段')),
          minutes: num(obj(stage).minutes, 0),
          tuition: num(obj(stage).tuition, 0),
          gain: num(obj(stage).gain, 0),
          // The school ladder: a stage with `unlocked === false` is gated behind
          // finishing the previous one, and says by how much.
          unlocked: obj(stage).unlocked !== false,
          progress: isObj(obj(stage).progress) ? {
            done: num(obj(stage).progress.done, 0),
            need: num(obj(stage).progress.need, 0),
            label: str(obj(stage).progress.label, ''),
          } : null,
        })).filter(stage => stage.key !== ''),
        trips: arr(d.trips).map(trip => ({
          key: str(obj(trip).key, ''),
          label: str(obj(trip).label, L('目的地')),
          emoji: str(obj(trip).emoji, '🧳'),
          minutes: num(obj(trip).minutes, 0),
          cost: num(obj(trip).cost, 0),
          affordable: obj(trip).affordable === true,
          available: obj(trip).available === true,
        })).filter(trip => trip.key !== ''),
        shop: arr(d.shop).map(item => ({
          key: str(obj(item).key, ''),
          label: str(obj(item).label, L('物品')),
          emoji: str(obj(item).emoji, '📦'),
          price: num(obj(item).price, 0),
          kind: str(obj(item).kind, 'food'),
          tier: typeof obj(item).tier === 'number' ? obj(item).tier : null,
          affordable: obj(item).affordable === true,
          needed: obj(item).needed === true,
        })).filter(item => item.key !== ''),
        inventory: obj(d.inventory),
        // Which items each care action could spend right now.
        care: (() => {
          const out = {}
          const source = obj(d.care)
          for (const action of ['feed', 'bathe', 'play']) {
            out[action] = arr(source[action]).map(entry => ({
              key: str(obj(entry).key, ''),
              label: str(obj(entry).label, L('物品')),
              emoji: str(obj(entry).emoji, '📦'),
              default: obj(entry).default === true,
              count: typeof obj(entry).count === 'number' ? obj(entry).count : null,
              satiety: num(obj(entry).satiety, 0),
              happiness: num(obj(entry).happiness, 0),
              cleanliness: num(obj(entry).cleanliness, 0),
            })).filter(entry => entry.key !== '')
          }
          return out
        })(),
        activity: isObj(d.activity) ? {
          kind: str(d.activity.kind, 'work'),
          key: str(d.activity.key, ''),
          label: str(d.activity.label, L('外面')),
          emoji: str(d.activity.emoji, '💼'),
          secondsLeft: num(d.activity.secondsLeft, 0),
          progress: num(d.activity.progress, 0),
        } : null,
        canGoOut: d.canGoOut === true,
        boxStage: isObj(d.boxStage) ? {
          key: str(d.boxStage.key, 'box'),
          label: str(d.boxStage.label, L('纸盒')),
          emoji: str(d.boxStage.emoji, '📦'),
          size: num(d.boxStage.size, 58),
        } : { key: 'box', label: L('纸盒'), emoji: '📦', size: 58 },
        awayBlocked: typeof d.awayBlocked === 'string' ? d.awayBlocked : null,
        pending: arr(d.pending).filter(e => isObj(e) && typeof e.at === 'number'),
        maxHealth: num(d.maxHealth, 5),
      }
    }

    /** The languages the host offers; the full set when it sent none. */
    function normalizeLangs(raw) {
      var out = arr(raw).map(entry => ({
        key: str(obj(entry).key, ''),
        label: str(obj(entry).label, LANG_NAMES[str(obj(entry).key, '')] ?? ''),
      })).filter(entry => LANG_KEYS.indexOf(entry.key) >= 0 && entry.label !== '')
      if (out.length > 0) return out
      return LANG_KEYS.map(key => ({ key: key, label: LANG_NAMES[key] }))
    }

    function normalizeActions(raw) {
      var source = obj(raw)
      var out = {}
      for (var i = 0; i < MODES.length; i += 1) {
        var key = MODES[i]
        var entry = obj(source[key])
        out[key] = {
          ready: entry.ready !== false,
          waitSeconds: num(entry.waitSeconds, 0),
          blocked: typeof entry.blocked === 'string' ? entry.blocked : null,
        }
      }
      return out
    }

    // ---------------------------------------------------------------------
    // Styles — the pig and the cream icon bar mirror the original.
    // ---------------------------------------------------------------------

    var CSS = [
      // ---------------------------------------------------------------------
      // Animal Crossing design language, transcribed from
      // guokaigdg/animal-island-ui docs/design-system (design-tokens.md and the
      // standalone css-variables.md template).
      //
      // The tokens are declared on the widget root rather than :root: the host
      // page must not inherit them, and they must not be clobbered by it.
      //
      // The rules that shape everything below:
      //   · warm earth-brown text on cream parchment, never pure black or grey
      //   · 12px minimum radius; buttons and inputs are 50px pills
      //   · the thick 3D bottom shadow belongs to primary buttons only
      //   · cards carry a border, not an elevation shadow
      //   · motion is 0.15-0.35s on cubic-bezier(.4,0,.2,1)
      //   · focus rings are yellow or teal, never blue
      // ---------------------------------------------------------------------
      '[data-dsh-pig]{',
      '--ac-font:Nunito,"Noto Sans SC",-apple-system,"PingFang SC","Hiragino Sans GB",sans-serif;',
      '--ac-primary:#19c8b9;--ac-primary-hover:#3dd4c6;--ac-primary-active:#11a89b;',
      '--ac-primary-bg:#e6f9f6;',
      '--ac-text:#794f27;--ac-text-body:#725d42;--ac-text-2:#9f927d;--ac-text-muted:#8a7b66;',
      '--ac-text-disabled:#c4b89e;',
      '--ac-bg:#f8f8f0;--ac-bg-content:rgb(247,243,223);--ac-bg-input:#fffbe7;',
      '--ac-bg-disabled:#f0ece2;',
      '--ac-border:#c4b89e;--ac-border-light:#e5dcc6;--ac-border-hover:#a89878;',
      '--ac-radius-sm:12px;--ac-radius-card:20px;--ac-pill:50px;',
      '--ac-shadow-sm:0 2px 4px 0 rgba(61,52,40,.06);',
      '--ac-shadow:0 3px 10px 0 rgba(61,52,40,.1);',
      '--ac-shadow-lg:0 8px 24px 0 rgba(61,52,40,.16);',
      '--ac-inset:inset 0 2px 4px rgba(114,93,66,.15);',
      // sidebar tokens: the library uses these for the selected menu row, which
      // is exactly the role the icon bar plays here.
      '--ac-active:#b7c6e5;--ac-hover:#d6dff0;',
      '--ac-success:#6fba2c;--ac-warning:#f5c31c;--ac-error:#e05a5a;',
      '--ac-ease:cubic-bezier(.4,0,.2,1);',
      // One place to size the pig; the scene and the panel cap derive from it.
      '--pig-size:56px;--pig-gap-below:12px;--scene-open:132px;--panel-width:292px;',
      'position:fixed;right:18px;bottom:18px;z-index:2147483000;',
      'font-family:var(--ac-font);font-weight:500;letter-spacing:.01em;',
      '-webkit-user-select:none;user-select:none;touch-action:none;',
      // The wrapper spans a column wider and taller than what it paints (the
      // scene's padding, the gap above the panel). Without this it swallows
      // clicks aimed at the page underneath — which once looked like "sending a
      // message does nothing" while the whole stack was healthy.
      'pointer-events:none;',
      // The pig is the only in-flow child, so the wrapper's box is exactly the
      // pig's box and the panel can be parked anywhere around it without ever
      // nudging the pig. `fitPanel` places the panel.
      'display:block}',
      // Japanese text wants Japanese glyph shapes, not the Simplified Chinese
      // ones Noto Sans SC would draw for the shared kanji.
      '[data-dsh-pig][lang="ja"]{--ac-font:Nunito,"Noto Sans JP","Hiragino Sans","Hiragino Kaku Gothic ProN",',
      '"Yu Gothic",-apple-system,sans-serif}',
      '[data-dsh-pig] *{box-sizing:border-box}',
      '[data-dsh-pig]>*{pointer-events:auto}',
      // `hidden` MUST win. The UA sheet's `[hidden]{display:none}` ties on
      // specificity with a single class, so any `.dp-x{display:grid|flex}` rule
      // below silently beats it and the element keeps rendering. That is exactly
      // how a collapsed panel ended up showing the icon bar and the hud while
      // every `el.hidden === true` assertion still passed.
      '[data-dsh-pig] .dp-card[hidden],[data-dsh-pig] .dp-bar[hidden],',
      '[data-dsh-pig] .dp-content[hidden],[data-dsh-pig] .dp-hud[hidden],',
      '[data-dsh-pig] .dp-bubble[hidden],[data-dsh-pig] .dp-scene[hidden],',
      '[data-dsh-pig] .dp-work[hidden],[data-dsh-pig] .dp-soul[hidden],',
      '[data-dsh-pig] .dp-poke-hint[hidden],',
      '[data-dsh-pig] .dp-pig-img[hidden],[data-dsh-pig] .dp-pig-emoji[hidden]{display:none}',

      /* ---------- the panel: cream parchment, border not shadow ---------- */
      // Taken out of flow on purpose. In flow it would widen the wrapper, and a
      // wider wrapper moves the pig — the exact thing this layout exists to
      // prevent. Absolutely positioned, the wrapper's box stays the pig's box
      // and `fitPanel` can put the panel on whichever side has room.
      '.dp-card{position:absolute;right:0;bottom:calc(100% + 8px);width:var(--panel-width);',
      'border-radius:var(--ac-radius-card);overflow:hidden;',
      'display:flex;flex-direction:column;',
      'background:var(--ac-bg);border:2px solid var(--ac-border-light);',
      'box-shadow:var(--ac-shadow-lg);color:var(--ac-text-body)}',

      /* ---------- the pig: never moved, never boxed ---------- */
      // [dsh-piggy-claude-code mod] a heavy pig (up to 200 px) needs a taller
      // scene, with room above it for the hud and the speech bubble.
      '.dp-scene{position:relative;height:max(var(--scene-open),calc(var(--pig-size) + var(--pig-gap-below) + 72px));background:none;cursor:grab;',
      'overflow:visible;display:flex;align-items:flex-end;justify-content:flex-end;',
      'padding:0 6px var(--pig-gap-below);width:max-content}',
      '.dp-scene[data-dragging="true"]{cursor:grabbing}',
      // Collapsed the scene is exactly the pig, so the wrapper paints nothing
      // extra to click through. Open it widens to the panel so the hud and the
      // speech bubble have somewhere to sit — the pig is right-aligned either
      // way, so widening costs it no movement.
      '[data-dsh-pig][data-open="true"] .dp-scene{width:var(--panel-width)}',
      // Collapsed the scene shrinks to just the pig. An explicit height rather
      // than `auto` keeps the pig's line box identical in both states, so
      // opening moves it by exactly zero pixels.
      '[data-dsh-pig][data-open="false"] .dp-scene{height:calc(var(--pig-size) + var(--pig-gap-below));',
      'cursor:pointer}',
      '.dp-pig{line-height:1;transform-origin:50% 85%;cursor:pointer;',
      'filter:drop-shadow(0 4px 6px rgba(61,52,40,.28));animation:dp-bob 1.8s ease-in-out infinite}',
      '[data-dsh-pig][data-open="false"] .dp-pig{filter:drop-shadow(0 5px 9px rgba(61,52,40,.26))}',
      // A petting hand rather than an arrow. Drawn inline as an SVG data URI so
      // it needs no asset and can carry the palette's warm outline; the hotspot
      // sits in the palm, which is where a pat actually lands. The `pointer`
      // after it is the fallback for browsers that refuse a custom cursor.
      '.dp-pig{cursor:url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" '
        + 'width="30" height="30" viewBox="0 0 30 30"><g fill="%23F7C9B6" stroke="%23794F27" '
        + 'stroke-width="1.7" stroke-linejoin="round"><rect x="10" y="13.5" width="14" height="12" '
        + 'rx="4.8"/><rect x="10.6" y="6.6" width="3.6" height="10" rx="1.8"/><rect x="14.9" '
        + 'y="5.1" width="3.6" height="11.5" rx="1.8"/><rect x="19.2" y="6.6" width="3.6" '
        + 'height="10" rx="1.8"/><rect x="5.7" y="12.4" width="3.4" height="7.8" rx="1.7" '
        + 'transform="rotate(-27 7.4 16.3)"/></g></svg>\') 16 24, pointer}',
      // Transform-only keyframes: the pig is an ordinary flex item, so there is
      // no translateX(-50%) centring to preserve.
      '@keyframes dp-bob{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-7px) rotate(-2.5deg)}}',
      '@keyframes dp-breathe{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(1px) scale(1.09)}}',
      '@keyframes dp-shake{0%,100%{transform:translateX(0) rotate(0)}20%{transform:translateX(-4px) rotate(-5deg)}60%{transform:translateX(4px) rotate(5deg)}}',
      '@keyframes dp-squash{0%{transform:scale(1,1)}25%{transform:scale(1.28,.74)}55%{transform:scale(.92,1.14)}100%{transform:scale(1,1)}}',
      '@keyframes dp-spin{0%{transform:rotate(0)}50%{transform:rotate(180deg) scale(1.2)}100%{transform:rotate(360deg)}}',
      '@keyframes dp-jump{0%{transform:translateY(0)}30%{transform:translateY(-26px) scale(1.12)}60%{transform:translateY(0) scale(.92)}100%{transform:translateY(0)}}',
      '@keyframes dp-wobble{0%,100%{transform:rotate(0)}20%{transform:rotate(-14deg)}55%{transform:rotate(14deg)}}',
      '@keyframes dp-cough{0%,100%{transform:translateX(0)}30%{transform:translateX(-4px) rotate(-7deg)}70%{transform:translateX(4px) rotate(6deg)}}',
      '.dp-pig[data-mood="happy"]{animation-duration:1.15s}',
      '.dp-pig[data-mood="sleepy"]{animation-name:dp-breathe;animation-duration:3.6s}',
      '.dp-pig[data-mood="hungry"]{animation-name:dp-shake;animation-duration:2.4s}',
      '.dp-pig[data-mood="dirty"]{animation-name:dp-breathe;animation-duration:2.6s;filter:sepia(.4) drop-shadow(0 4px 6px rgba(61,52,40,.28))}',
      '.dp-pig[data-mood="sick"]{animation-name:dp-cough;animation-duration:2.2s;filter:hue-rotate(-28deg) saturate(.75) drop-shadow(0 4px 6px rgba(61,52,40,.28))}',
      // One pose per activity, so being away reads as a thing the pig is doing.
      '@keyframes dp-typing{0%,100%{transform:translateY(0) rotate(0)}25%{transform:translateY(-2px) rotate(-1.5deg)}50%{transform:translateY(0) rotate(0)}75%{transform:translateY(-2px) rotate(1.5deg)}}',
      '@keyframes dp-reading{0%,100%{transform:translateY(0) rotate(0)}35%{transform:translateY(1px) rotate(-5deg)}70%{transform:translateY(1px) rotate(-2deg)}}',
      '@keyframes dp-walking{0%,100%{transform:translateY(0) rotate(0)}25%{transform:translateY(-6px) rotate(-4deg)}50%{transform:translateY(0) rotate(0)}75%{transform:translateY(-6px) rotate(4deg)}}',
      '.dp-pig[data-mood="working"]{animation-name:dp-typing;animation-duration:.7s}',
      '.dp-pig[data-mood="studying"]{animation-name:dp-reading;animation-duration:2.4s}',
      '.dp-pig[data-mood="traveling"]{animation-name:dp-walking;animation-duration:1s}',
      '.dp-pig[data-mood="dead"]{animation:none;filter:grayscale(1)}',
      '.dp-pig[data-react]{animation-duration:.85s;animation-iteration-count:1}',
      '.dp-pig[data-react="feed"]{animation-name:dp-jump}',
      '.dp-pig[data-react="bathe"]{animation-name:dp-wobble;animation-duration:1.05s}',
      '.dp-pig[data-react="play"]{animation-name:dp-spin;animation-duration:.9s}',
      '.dp-pig[data-react="pet"]{animation-name:dp-squash;animation-duration:.6s}',
      '.dp-pig[data-react="away"]{animation-name:dp-jump;animation-duration:.9s}',
      '.dp-pig[data-react="cure"]{animation-name:dp-spin;animation-duration:.9s}',
      '.dp-pig[data-react="levelup"]{animation-name:dp-jump;animation-duration:.95s}',
      '.dp-pig[data-react="refuse"]{animation-name:dp-shake;animation-duration:.5s}',

      /* ---------- what the pig is off doing ---------- */
      '[data-dsh-pig] .dp-work{display:flex;flex-direction:column;align-items:center;gap:4px;',
      'margin:0 2px 6px 0}',
      '.dp-prop{font-size:26px;line-height:1;filter:drop-shadow(0 3px 5px rgba(61,52,40,.22));',
      'animation:dp-prop-bob 2.4s ease-in-out infinite}',
      '[data-dsh-pig][data-away="study"] .dp-prop{animation-duration:3.4s}',
      '[data-dsh-pig][data-away="trip"] .dp-prop{animation-name:dp-prop-swing;animation-duration:1.6s}',
      '@keyframes dp-prop-bob{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-3px) rotate(3deg)}}',
      '@keyframes dp-prop-swing{0%,100%{transform:translateY(0) rotate(-8deg)}50%{transform:translateY(-4px) rotate(8deg)}}',
      '.dp-progress{width:42px;height:7px;border-radius:var(--ac-pill);background:var(--ac-bg-disabled);',
      'box-shadow:var(--ac-inset);overflow:hidden}',
      '.dp-progress i{display:block;height:100%;border-radius:var(--ac-pill);',
      'background:var(--ac-primary);transition:width .5s var(--ac-ease)}',
      // The scene needs room for the prop; it grows leftward, so the pig stays put.
      '[data-dsh-pig][data-away="work"] .dp-scene,[data-dsh-pig][data-away="study"] .dp-scene,',
      '[data-dsh-pig][data-away="trip"] .dp-scene{width:max-content;min-width:132px}',

      /* ---------- hud: a cream tag beside the pig ---------- */
      '.dp-hud{position:absolute;left:9px;top:7px;display:flex;flex-direction:column;gap:1px;',
      'font-size:10.5px;font-weight:600;line-height:1.45;color:var(--ac-text);',
      'background:var(--ac-bg);border:2px solid var(--ac-border-light);padding:5px 10px;',
      'border-radius:var(--ac-radius-sm);box-shadow:var(--ac-shadow-sm)}',
      '.dp-hud b{font-weight:700}',

      // A drawn sprite is sized by the same variable as the emoji, so growing up
      // works identically either way.
      '.dp-pig-img{width:var(--pig-size);height:var(--pig-size);display:block;',
      '-webkit-user-drag:none;user-select:none}',
      '.dp-pig-emoji{font-size:var(--pig-size);line-height:1}',

      // No drawings yet — every stage is the same 🐖, so age reads as size plus
      // a faded coat on the last one.
      '[data-dsh-pig][data-faded="true"] .dp-pig-emoji{filter:grayscale(.5) opacity(.72)}',

      // The box advertises itself: a slow breathing glow plus a label, so it
      // does not read as scenery.
      '[data-dsh-pig][data-unhatched="true"] .dp-pig{cursor:pointer;',
      'animation:dp-box-breathe 2.4s ease-in-out infinite}',
      '[data-dsh-pig][data-unhatched="true"] .dp-pig-emoji{',
      'filter:drop-shadow(0 0 0 rgba(255,214,102,0)) drop-shadow(0 4px 6px rgba(61,52,40,.28))}',
      '@keyframes dp-box-breathe{0%,100%{transform:translateY(0) scale(1)}',
      '50%{transform:translateY(-3px) scale(1.06)}}',
      '.dp-poke-hint{position:absolute;right:2px;bottom:-2px;display:flex;align-items:center;gap:3px;',
      'font-size:9.5px;font-weight:700;color:var(--ac-text);background:var(--ac-bg);',
      'border:1.5px solid var(--ac-border-light);border-radius:var(--ac-pill);padding:1px 7px;',
      'box-shadow:0 2px 0 rgba(61,52,40,.12);pointer-events:none;white-space:nowrap;z-index:3;',
      'animation:dp-hint-bob 1.6s ease-in-out infinite}',
      '@keyframes dp-hint-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}',
      // Each poke shakes it harder; the third one opens it instead.
      '[data-dsh-pig] .dp-pig[data-mood="poke"],',
      '[data-dsh-pig][data-poke] .dp-pig{animation-name:dp-poke-shake}',
      '[data-dsh-pig][data-poke="2"] .dp-pig{animation-duration:.28s}',
      '@keyframes dp-poke-shake{0%,100%{transform:rotate(0)}25%{transform:rotate(-7deg)}',
      '50%{transform:rotate(6deg)}75%{transform:rotate(-4deg)}}',

      /* ---------- developer tab ---------- */
      '.dp-dev-note{font-size:10px;color:var(--ac-text-2);margin:4px 0 2px;line-height:1.5}',
      '.dp-dev-row{display:flex;flex-wrap:wrap;gap:5px;margin:0 0 2px}',
      '.dp-dev-btn{flex:0 0 auto;font-size:10px;padding:3px 8px}',
      '[data-dsh-pig][data-dev="true"] .dp-ico[data-tab="dev"]{color:var(--ac-primary)}',

      /* ---------- the soul that settles on an unclaimed grave ---------- */
      '.dp-soul{position:absolute;left:50%;transform:translateX(-50%);top:-4px;font-size:22px;',
      'line-height:1;opacity:.9;pointer-events:none;z-index:1;',
      'animation:dp-haunt 3.4s ease-in-out infinite}',
      '@keyframes dp-haunt{0%,100%{transform:translate(-50%,0) scale(1);opacity:.75}',
      '50%{transform:translate(-50%,-9px) scale(1.08);opacity:1}}',
      // A grave does not bob about like a living pig.
      '.dp-pig[data-stage="grave"]{animation:none;filter:grayscale(.35) drop-shadow(0 4px 6px rgba(61,52,40,.3))}',
      '.dp-pig[data-stage="box"]{animation:dp-box-wobble 3.2s ease-in-out infinite}',
      '@keyframes dp-box-wobble{0%,100%{transform:rotate(0)}30%{transform:rotate(-4deg)}',
      '45%{transform:rotate(3deg)}60%{transform:rotate(-2deg)}}',

      /* ---------- speech bubble ---------- */
      // `z-index` matters: the pig comes later in the DOM, so without it the pig
      // paints over the bubble whenever the two boxes overlap — which is exactly
      // what happened when collapsed and the scene was only as wide as the pig.
      '.dp-bubble{position:absolute;right:8px;top:7px;z-index:2;max-width:162px;padding:6px 10px;',
      'border-radius:var(--ac-radius-sm);font-size:10.5px;font-weight:600;line-height:1.45;',
      'color:var(--ac-text-body);background:var(--ac-bg-input);',
      'border:2px solid var(--ac-border-light);box-shadow:var(--ac-shadow-sm)}',
      // Tail drawn as a small rotated square so the 2px border stays continuous.
      '.dp-bubble::after{content:"";position:absolute;left:14px;bottom:-6px;width:8px;height:8px;',
      'background:var(--ac-bg-input);border-right:2px solid var(--ac-border-light);',
      'border-bottom:2px solid var(--ac-border-light);transform:rotate(45deg)}',
      // Collapsed, the scene is exactly the pig, so a bubble drawn inside it
      // would sit on the pig's face. Float it above the head with the tail
      // pointing down, anchored to the right edge so it can never run off the
      // window. The hearts rise from behind it.
      '[data-dsh-pig][data-open="false"] .dp-bubble{top:auto;bottom:calc(100% + 8px);',
      'left:auto;right:0;max-width:230px}',
      '[data-dsh-pig][data-open="false"] .dp-bubble::after{left:auto;right:26px;',
      'top:100%;bottom:auto;margin:0;transform:rotate(45deg);',
      'border:0;border-right:2px solid var(--ac-border-light);',
      'border-bottom:2px solid var(--ac-border-light)}',

      /* ---------- icon bar: the library sidebar, laid on its side ---------- */
      '.dp-bar{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;padding:8px;',
      'background:var(--ac-bg-content);border-top:2px solid var(--ac-border-light);',
      'border-bottom:2px solid var(--ac-border-light)}',
      '.dp-ico{display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;',
      'font:inherit;font-size:9.5px;font-weight:600;color:var(--ac-text-muted);background:none;',
      'border:2px solid transparent;border-radius:var(--ac-radius-sm);padding:5px 1px;',
      'transition:all .2s var(--ac-ease)}',
      '.dp-ico span.dp-ico-e{font-size:18px;line-height:1}',
      '.dp-ico:hover{background:var(--ac-hover)}',
      '.dp-ico[data-active="true"]{background:var(--ac-active);border-color:#9db0d6;',
      'color:var(--ac-text);font-weight:700}',
      '.dp-ico:focus-visible{outline:2px solid var(--ac-primary);outline-offset:1px}',
      '@keyframes dp-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}',
      '.dp-ico[data-alert="true"] span.dp-ico-e{animation:dp-pulse 1.4s ease-in-out infinite}',

      /* ---------- content ---------- */
      '.dp-content{padding:12px 13px 13px;overflow-y:auto;flex:1 1 auto;min-height:0}',
      '.dp-content::-webkit-scrollbar{width:8px}',
      '.dp-content::-webkit-scrollbar-thumb{background:var(--ac-border-light);border-radius:4px}',
      '.dp-content::-webkit-scrollbar-track{background:transparent}',
      '.dp-title{display:flex;justify-content:space-between;align-items:baseline;font-size:11px;',
      'margin-bottom:8px}',
      '.dp-title b{font-weight:700;color:var(--ac-text)}',
      '.dp-title span{color:var(--ac-text-2);font-size:10.5px;font-weight:600}',
      '.dp-row{display:flex;justify-content:space-between;font-size:11px;font-weight:600;',
      'color:var(--ac-text-body);margin:2px 0}',
      '.dp-row b{font-weight:700;color:var(--ac-text)}',

      /* ---------- attribute bars: pill track with an inset well ---------- */
      '.dp-meter{height:9px;border-radius:var(--ac-pill);background:var(--ac-bg-disabled);',
      'box-shadow:var(--ac-inset);overflow:hidden;margin:3px 0 8px}',
      '.dp-meter i{display:block;height:100%;border-radius:var(--ac-pill);',
      'background:var(--ac-warning);transition:width .35s var(--ac-ease)}',
      '.dp-meter.dp-mood i{background:#f8a6b2}',
      '.dp-meter.dp-clean i{background:#82d5bb}',
      '.dp-meter.dp-health i{background:#8ac68a}',
      '.dp-traits{display:flex;gap:10px;font-size:10.5px;font-weight:600;color:var(--ac-text-2);',
      'margin:8px 0 3px}',

      /* ---------- banners ---------- */
      '.dp-alert{margin:0 0 9px;padding:8px 10px;border-radius:var(--ac-radius-sm);',
      'font-size:10.5px;font-weight:600;line-height:1.55;border:2px solid}',
      '.dp-alert b{font-weight:700;color:var(--ac-text)}',
      '.dp-alert.dp-sick{background:#fdeeee;border-color:#f2c2c2}',
      '.dp-alert.dp-work{background:#eef1fb;border-color:#c3cdf0}',
      '.dp-alert.dp-dead{background:var(--ac-bg-disabled);border-color:var(--ac-border-light)}',
      '.dp-alert.dp-legacy{background:#fdf7e2;border-color:#f0dfa8}',

      /* ---------- buttons: secondary is a cream pill with soft elevation ---- */
      '.dp-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}',
      '.dp-btn{display:flex;align-items:center;justify-content:center;gap:5px;font:inherit;',
      'font-size:11px;font-weight:700;letter-spacing:.02em;color:var(--ac-text-body);',
      'cursor:pointer;padding:8px 6px;border-radius:var(--ac-pill);',
      'border:2px solid var(--ac-border);background:var(--ac-bg-input);',
      'box-shadow:var(--ac-shadow-sm);transition:all .2s var(--ac-ease)}',
      '.dp-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:var(--ac-shadow);',
      'border-color:var(--ac-border-hover)}',
      '.dp-btn:active:not(:disabled){transform:translateY(2px);box-shadow:var(--ac-shadow-sm)}',
      '.dp-btn:focus-visible{outline:2px solid var(--ac-primary);outline-offset:1px}',
      '.dp-btn:disabled{background:var(--ac-bg-disabled);color:var(--ac-text-disabled);',
      'border-color:var(--ac-border-light);box-shadow:none;cursor:not-allowed}',
      '.dp-btn-wide{grid-column:1/-1}',
      '.dp-btn .dp-wait{color:var(--ac-text-2);font-size:10px;font-weight:600}',

      /* ---------- segmented control ---------- */
      '.dp-seg{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:9px}',
      '.dp-seg button{font:inherit;font-size:10.5px;font-weight:600;color:var(--ac-text-muted);',
      'cursor:pointer;padding:6px 2px;border-radius:var(--ac-pill);',
      'border:2px solid var(--ac-border-light);background:var(--ac-bg-input);',
      'transition:all .2s var(--ac-ease)}',
      '.dp-seg button:hover{background:var(--ac-hover)}',
      '.dp-seg button[data-active="true"]{background:var(--ac-active);border-color:#9db0d6;',
      'color:var(--ac-text);font-weight:700}',

      /* ---------- list rows ---------- */
      '.dp-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}',
      '.dp-list{display:flex;flex-direction:column;gap:7px}',
      '.dp-shelf{margin:9px 0 1px;font-size:10px;font-weight:700;color:var(--ac-text-2);',
      'letter-spacing:.04em}',
      '.dp-shelf:first-child{margin-top:0}',
      '.dp-item{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:600;',
      'color:var(--ac-text-body);padding:7px 9px;border-radius:var(--ac-radius-sm);',
      'background:var(--ac-bg-content);border:2px solid var(--ac-border-light)}',
      '.dp-item .dp-grow{flex:1;min-width:0}',
      '.dp-item .dp-dim{color:var(--ac-text-2);font-size:10px;font-weight:500;overflow:hidden;',
      'text-overflow:ellipsis;white-space:nowrap}',
      '.dp-item.dp-wanted{background:#fdf7e2;border-color:var(--ac-warning)}',

      /* ---------- primary buttons: teal pill with the game 3D bottom edge --- */
      '.dp-mini{font:inherit;font-size:10.5px;font-weight:700;letter-spacing:.02em;color:#fff;',
      'cursor:pointer;padding:6px 13px;border-radius:var(--ac-pill);',
      'border:2px solid var(--ac-primary-active);background:var(--ac-primary);',
      'box-shadow:0 3px 0 0 var(--ac-primary-active);transition:all .15s var(--ac-ease)}',
      '.dp-mini:hover:not(:disabled){background:var(--ac-primary-hover);transform:translateY(-1px);',
      'box-shadow:0 4px 0 0 var(--ac-primary-active)}',
      '.dp-mini:active:not(:disabled){transform:translateY(2px);',
      'box-shadow:0 1px 0 0 var(--ac-primary-active)}',
      '.dp-mini:focus-visible{outline:2px solid var(--ac-primary);outline-offset:2px}',
      '.dp-mini:disabled{background:var(--ac-bg-disabled);color:var(--ac-text-disabled);',
      'border-color:var(--ac-border-light);box-shadow:none;cursor:not-allowed}',

      /* ---------- the care item picker ---------- */
      '.dp-pick{margin-top:9px;padding:9px 10px;border-radius:var(--ac-radius-sm);',
      'background:var(--ac-bg-content);border:2px solid var(--ac-border-light)}',
      '.dp-pick-head{font-size:10.5px;font-weight:700;color:var(--ac-text);margin-bottom:7px}',
      '.dp-cancel{display:block;width:100%;margin-top:8px;font:inherit;font-size:10.5px;',
      'font-weight:600;color:var(--ac-text-2);cursor:pointer;padding:5px;',
      'border-radius:var(--ac-pill);border:2px solid var(--ac-border-light);',
      'background:var(--ac-bg-input);transition:all .2s var(--ac-ease)}',
      '.dp-cancel:hover{background:var(--ac-hover);color:var(--ac-text)}',
      '.dp-count{margin-left:2px;font-size:9px;font-weight:700;color:var(--ac-text-2);',
      'background:var(--ac-bg-content);border-radius:var(--ac-pill);padding:0 5px}',
      '.dp-btn[data-open-picker="true"]{background:var(--ac-active);border-color:#9db0d6}',
      '.dp-looks .dp-btn[aria-pressed="true"],',
      '.dp-langs .dp-btn[aria-pressed="true"]{background:var(--ac-active);border-color:#9db0d6}',
      // [dsh-piggy-claude-code mod] the language switcher: one pill per language.
      '.dp-langs{grid-template-columns:repeat(3,1fr);margin-top:4px}',
      '.dp-langs .dp-btn{padding:6px 4px}',
      '.dp-seg button[data-locked="true"]{color:var(--ac-text-disabled);',
      'border-style:dashed;background:var(--ac-bg-disabled)}',
      '.dp-seg button[data-locked="true"]:hover{background:var(--ac-bg-disabled)}',
      '.dp-locked{margin:0 0 8px;font-size:10.5px;font-weight:600;line-height:1.5;',
      'color:var(--ac-text-body);background:#fdf7e2;border:2px solid #f0dfa8;',
      'border-radius:var(--ac-radius-sm);padding:6px 9px}',

      '.dp-empty{color:var(--ac-text-2);font-size:10.5px;font-weight:500;line-height:1.65;',
      'margin-top:4px}',
      '.dp-memo{margin-top:9px;padding-top:8px;border-top:2px solid var(--ac-border-light);',
      'color:var(--ac-text-muted);font-size:10px;font-weight:500;line-height:1.55;',
      'white-space:pre-wrap;word-break:break-word}',

      /* ---------- particles and toast ---------- */
      '.dp-fx{position:absolute;z-index:1;pointer-events:none;font-size:17px;',
      'animation:dp-rise 1.1s ease-out forwards}',
      '@keyframes dp-rise{0%{opacity:0;transform:translate(var(--dx0,0),4px) scale(.5)}18%{opacity:1}',
      '100%{opacity:0;transform:translate(var(--dx,0),-56px) scale(1.15)}}',
      '.dp-toast{position:absolute;left:9px;right:9px;top:8px;padding:8px 11px;',
      'border-radius:var(--ac-radius-sm);font-size:10.5px;font-weight:600;line-height:1.5;',
      'color:var(--ac-text);background:var(--ac-bg-input);border:2px solid var(--ac-border);',
      'box-shadow:var(--ac-shadow);pointer-events:none;white-space:normal;',
      'animation:dp-toast 4.6s var(--ac-ease) forwards}',
      '@keyframes dp-toast{0%{opacity:0;transform:translateY(-8px)}8%{opacity:1;transform:translateY(0)}',
      '82%{opacity:1}100%{opacity:0;transform:translateY(-6px)}}',
    ].join('')

    // ---------------------------------------------------------------------
    // Tiny DOM helpers
    // ---------------------------------------------------------------------

    function readStore(key) {
      try { return window.localStorage.getItem(key) } catch (error) { return null }
    }

    function readStore(key) {
      try { return window.localStorage.getItem(key) } catch (error) { return null }
    }

    function writeStore(key, value) {
      try { window.localStorage.setItem(key, value) } catch (error) { /* private mode */ }
    }

    function el(tag, className, text) {
      var node = document.createElement(tag)
      if (className) node.className = className
      if (text !== undefined) node.textContent = text
      return node
    }

    function button(className, attrs, onClick) {
      var node = el('button', className)
      node.type = 'button'
      for (var key in attrs) node.setAttribute(key, attrs[key])
      node.addEventListener('click', function (event) {
        event.stopPropagation()
        onClick()
      })
      return node
    }

    function meter(value, variant) {
      var wrap = el('div', 'dp-meter' + (variant ? ' ' + variant : ''))
      var fill = document.createElement('i')
      fill.style.width = Math.max(0, Math.min(100, num(value, 0))) + '%'
      wrap.appendChild(fill)
      return wrap
    }

    function apply(ctx) {
      // A client plugin that throws while activating can take the whole web boot
      // down with it, so the pig never lets an exception escape.
      try {
        return mount()
      } catch (error) {
        console.warn('[dsh-pig] 挂载失败，猪先退到一边', error)
        return () => {}
      }
    }

    function mount() {
      if (document.querySelector('[' + MOUNTED + ']') !== null) {
        console.warn('[dsh-pig] 已存在实例，跳过重复挂载')
        return () => {}
      }

      // Nunito + Noto Sans SC, per the design system's standalone recipe. The
      // request is non-blocking (`display=swap`) and the token font stack falls
      // back to system faces, so an offline or blocked load degrades quietly
      // instead of breaking the panel.
      var font = document.createElement('link')
      font.rel = 'stylesheet'
      font.href = 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900'
        + '&family=Noto+Sans+SC:wght@400;500;700&display=swap'
      document.head.appendChild(font)

      var style = document.createElement('style')
      style.textContent = CSS
      document.head.appendChild(style)

      var host = document.createElement('div')
      host.setAttribute(MOUNTED, '')
      var savedPos = readStore(POSITION_KEY)
      // The pig's position as the user set it, before any on-screen clamp.
      var userRight = 18
      var userBottom = 18
      if (savedPos !== null) {
        try {
          var parsed = JSON.parse(savedPos)
          if (parsed && typeof parsed.right === 'number') userRight = parsed.right
          if (parsed && typeof parsed.bottom === 'number') userBottom = parsed.bottom
        } catch (error) { /* ignore */ }
      }
      host.style.right = userRight + 'px'
      host.style.bottom = userBottom + 'px'

      // Keep the pig itself on screen — and nothing more. There used to be a
      // composer-avoidance floor here that forced the widget above the input box:
      // it existed because the wrapper swallowed clicks aimed at the send button.
      // `pointer-events:none` solves that properly now, so the clamp only ever
      // stopped the user from parking their pet where they wanted it.
      function clampPig() {
        var vw = window.innerWidth || 0
        var vh = window.innerHeight || 0
        if (vw <= 0 || vh <= 0) return
        // Bound by the pig, not by the scene. The scene widens to the panel when
        // open, and clamping against that would shove the pig sideways on any
        // window resize; the panel's own overflow is `fitPanel`'s problem.
        var pigRect = pig.getBoundingClientRect ? pig.getBoundingClientRect() : null
        var w = (pigRect ? pigRect.width || 0 : 0) + 2 * PIG_PADDING_X
        // Vertically reserve the OPEN scene, or a pig parked high up pushes its
        // own hud off the top of the window the moment the panel opens.
        var sceneRect = scene.getBoundingClientRect ? scene.getBoundingClientRect() : null
        var h = Math.max(sceneRect ? sceneRect.height || 0 : 0, SCENE_RESERVE)
        var right = Math.min(Math.max(4, userRight), Math.max(4, vw - w - 4))
        // Only the pig anchors vertically. Clamping by the open panel would move
        // the pig when the panel appears, which is the one thing the layout
        // exists to prevent — `fitPanel` shrinks the panel instead.
        var bottom = Math.min(Math.max(4, userBottom), Math.max(4, vh - h - 4))
        host.style.right = Math.round(right) + 'px'
        host.style.bottom = Math.round(bottom) + 'px'
      }

      /**
       * Place the panel so it is fully on screen, wherever the pig has been
       * parked. The pig itself is never moved by this: the panel is absolutely
       * positioned, so it takes no space in the wrapper's box.
       */
      function fitPanel() {
        if (!isOpen) return
        var vw = window.innerWidth || 0
        var vh = window.innerHeight || 0
        if (vw <= 0 || vh <= 0) return

        var rect = scene.getBoundingClientRect()
        var roomAbove = rect.top - PANEL_GAP - PANEL_MARGIN
        var roomBelow = vh - rect.bottom - PANEL_GAP - PANEL_MARGIN

        // Open on whichever side has space. Ties go above, which is where a
        // bottom-docked pig expects its menu — but a pig parked near the top
        // must flip, otherwise its own menu opens off the screen.
        // Exactly one of top/bottom may apply. Clearing with '' would fall back
        // to the stylesheet's `bottom`, leaving both set — and an absolutely
        // positioned box with both edges pinned collapses to zero height.
        if (roomAbove >= roomBelow) {
          card.style.top = 'auto'
          card.style.bottom = 'calc(100% + ' + PANEL_GAP + 'px)'
          card.style.maxHeight = Math.max(PANEL_MIN_HEIGHT, Math.round(roomAbove)) + 'px'
        } else {
          card.style.bottom = 'auto'
          card.style.top = 'calc(100% + ' + PANEL_GAP + 'px)'
          card.style.maxHeight = Math.max(PANEL_MIN_HEIGHT, Math.round(roomBelow)) + 'px'
        }

        // Horizontal: the panel is wider than the pig, so anchoring its right
        // edge to the pig can push it off the left of the window. A negative
        // `right` moves the panel without touching the wrapper's width, so the
        // pig stays exactly where it was put.
        var width = Math.min(PANEL_WIDTH, vw - 2 * PANEL_MARGIN)
        card.style.maxWidth = Math.round(width) + 'px'
        var shift = PANEL_MARGIN - (rect.right - width)
        card.style.right = shift > 0 ? -Math.round(shift) + 'px' : '0px'

        // The hud lives inside the scene, which runs past the left edge whenever
        // the panel above had to be shifted back into view. Line it up with the
        // panel's left edge so it stays visible too.
        var cardLeft = Math.max(rect.right - width, PANEL_MARGIN)
        hud.style.left = Math.max(9, Math.round(cardLeft - rect.left)) + 'px'
      }

      var card = el('div', 'dp-card')
      // The pig lives beside the panel, not inside it, so it stays transparent
      // and unmoved when the panel opens.
      var scene = el('div', 'dp-scene')

      var hud = el('div', 'dp-hud')
      var hudName = el('div', null, T('猪猪'))
      var hudCoins = el('div', null, '🪙 0')
      var hudHealth = el('div', null, '💚 5/5')
      hud.appendChild(hudName)
      hud.appendChild(hudCoins)
      hud.appendChild(hudHealth)
      scene.appendChild(hud)

      var bubble = el('div', 'dp-bubble', '')
      bubble.hidden = true
      scene.appendChild(bubble)

      // What the pig is doing while it is out: a prop to work/read/travel with,
      // and a line showing how far through it is. Sits to the pig's left, so the
      // pig itself never shifts when it appears.
      var work = el('div', 'dp-work')
      var prop = el('span', 'dp-prop', '💼')
      var progressWrap = el('div', 'dp-progress')
      var progressFill = document.createElement('i')
      progressWrap.appendChild(progressFill)
      work.appendChild(prop)
      work.appendChild(progressWrap)
      work.hidden = true
      scene.appendChild(work)

      // Shown while the box is still shut, so it reads as something to poke
      // rather than a decorative cardboard box sitting in the corner.
      var pokeHint = el('div', 'dp-poke-hint')
      pokeHint.appendChild(el('span', null, '👆'))
      var pokeHintText = el('span', null, T('戳三下'))
      pokeHint.appendChild(pokeHintText)
      pokeHint.hidden = true
      scene.appendChild(pokeHint)

      var soul = el('span', 'dp-soul', '👻')
      soul.hidden = true
      scene.appendChild(soul)

      // Drawn stages (the piglet, the elder pig) use an <img>; the rest fall
      // back to the emoji. Both live in the pig box so the layout never cares.
      var pigArt = document.createElement('img')
      pigArt.className = 'dp-pig-img'
      pigArt.alt = ''
      pigArt.hidden = true
      var pigEmoji = el('span', 'dp-pig-emoji', '🐖')
      var pig = el('div', 'dp-pig')
      pig.appendChild(pigArt)
      pig.appendChild(pigEmoji)
      scene.appendChild(pig)
      // Right-click is not discoverable on its own, so the native tooltip says so.
      scene.title = T('左键摸摸 · 右键打开面板 · 拖动可移动')

      var bar = el('div', 'dp-bar')
      var icons = {}
      // Each icon's caption and its Chinese key, so a language switch can
      // relabel the bar in place without rebuilding it.
      var iconLabels = {}

      /** The tabs on show right now: the normal six, plus 调试 when dev mode is on. */
      function visibleTabs() {
        return devMode ? TABS.concat([DEV_TAB]) : TABS
      }

      /** Rebuild the icon bar. Called whenever dev mode flips. */
      function paintBar() {
        while (bar.firstChild) bar.removeChild(bar.firstChild)
        var list = visibleTabs()
        for (var t = 0; t < list.length; t += 1) buildIcon(list[t])
        if (icons[tab] === undefined) tab = 'status'
        for (var k in icons) icons[k].setAttribute('data-active', k === tab ? 'true' : 'false')
      }

      function buildIcon(tab) {
        (function (tab) {
          var btn = button('dp-ico', { 'data-tab': tab.key }, function () {
            if (host.getAttribute('data-open') !== 'true') setOpen(true)
            select(tab.key)
          })
          btn.appendChild(el('span', 'dp-ico-e', tab.emoji))
          var caption = el('span', null, T(tab.label))
          btn.appendChild(caption)
          btn.setAttribute('aria-label', T(tab.label))
          icons[tab.key] = btn
          iconLabels[tab.key] = { node: caption, zh: tab.label }
          bar.appendChild(btn)
        })(tab)
      }

      for (var t = 0; t < TABS.length; t += 1) buildIcon(TABS[t])

      /** Re-caption the icon bar in the current language. */
      function relabelBar() {
        for (var k in iconLabels) {
          iconLabels[k].node.textContent = T(iconLabels[k].zh)
          if (icons[k] !== undefined) icons[k].setAttribute('aria-label', T(iconLabels[k].zh))
        }
      }

      var content = el('div', 'dp-content')

      // Panel first, pig second: as flex siblings in a bottom-anchored column,
      // the pig ends up at a fixed screen position whether the panel is open or
      // not, and the panel can only ever grow upwards from it.
      card.appendChild(content)
      card.appendChild(bar)
      host.appendChild(card)
      host.appendChild(scene)
      if (document.body !== null && document.body !== undefined) {
        document.body.appendChild(host)
      } else {
        document.addEventListener('DOMContentLoaded', function () {
          try { document.body.appendChild(host) } catch (error) { /* shell not ready */ }
        }, { once: true })
      }

      // ---- state ----
      var view = normalize(null)
      var tab = 'status'
      var stage = 'primary'
      // Which care action's item picker is open, if any.
      var picker = null
      var isOpen = readStore(OPEN_KEY) === 'true'
      var lastStage = null
      var lastPendingAt = 0
      var pollTimer = null
      var reactTimer = null
      var stopped = false
      var busy = false

      // ---- animation ----
      function react(kind, ms) {
        if (reactTimer !== null) window.clearTimeout(reactTimer)
        pig.setAttribute('data-react', kind)
        // The flat (collapsed) form needs the non-translating keyframes.
        reactTimer = window.setTimeout(function () {
          pig.removeAttribute('data-react')
          reactTimer = null
        }, ms || 900)
      }

      function burst(emojis, count) {
        for (var i = 0; i < (count || 1); i += 1) {
          (function (index) {
            window.setTimeout(function () {
              if (stopped) return
              var node = el('span', 'dp-fx', emojis[index % emojis.length])
              node.style.setProperty('--dx', Math.round((Math.random() - 0.5) * 46) + 'px')
              // Anchor to the pig, not the scene. The scene is panel-wide when
              // open, so fixed coordinates put every particle off to one side.
              var spot = headSpot()
              node.style.left = (spot.x + Math.round((Math.random() - 0.5) * 22)) + 'px'
              node.style.top = spot.y + 'px'
              scene.appendChild(node)
              window.setTimeout(function () { node.remove() }, 1200)
            }, index * 110)
          })(i)
        }
      }

      /** Just above the pig's head, in scene coordinates. */
      function headSpot() {
        var fallback = { x: 24, y: 8 }
        if (typeof pig.getBoundingClientRect !== 'function' || typeof scene.getBoundingClientRect !== 'function') return fallback
        var p = pig.getBoundingClientRect()
        var s = scene.getBoundingClientRect()
        if (p.width === 0 && p.height === 0) return fallback
        return { x: p.left - s.left + p.width / 2, y: p.top - s.top - 20 }
      }

      var REACTIONS = {
        hatch: { kind: 'levelup', ms: 980, fx: ['🥚', '✨', '🐖', '🎉'], count: 4, say: '孵出来啦！' },
        feed: { kind: 'feed', ms: 900, fx: ['🍎', '😋', '✨'], count: 3, say: '吃掉了！' },
        bathe: { kind: 'bathe', ms: 1050, fx: ['🫧', '🫧', '💧', '✨'], count: 4, say: '洗干净啦～' },
        play: { kind: 'play', ms: 900, fx: ['🎾', '⭐', '💨'], count: 3, say: '好开心！' },
        pet: { kind: 'pet', ms: 620, fx: ['❤️', '❤️'], count: 2, say: '好舒服…' },
        work: { kind: 'away', ms: 900, fx: ['💼', '🧱', '🪙'], count: 3, say: '出门打工！' },
        study: { kind: 'away', ms: 900, fx: ['📚', '✏️', '🧠'], count: 3, say: '上学去！' },
        trip: { kind: 'away', ms: 900, fx: ['🧳', '🗺', '✨'], count: 3, say: '出发旅行！' },
        calloff: { kind: 'refuse', ms: 520, fx: ['💨'], count: 1, say: '提前回来了…' },
        buy: { kind: 'pet', ms: 620, fx: ['🪙', '🛒'], count: 2, say: '买到了！' },
        use: { kind: 'pet', ms: 620, fx: ['✨'], count: 2, say: '用掉了。' },
      }

      function flash(action) {
        var spec = REACTIONS[action]
        if (spec === undefined) return
        react(spec.kind, spec.ms)
        burst(spec.fx, spec.count)
        showBubble(T(spec.say), 2200)
      }

      var bubbleTimer = null
      function showBubble(text, ms) {
        if (bubbleTimer !== null) window.clearTimeout(bubbleTimer)
        bubble.textContent = text
        bubble.hidden = false
        bubbleTimer = window.setTimeout(function () {
          bubble.hidden = true
          bubbleTimer = null
        }, ms || 2600)
      }

      function toast(text) {
        var node = el('div', 'dp-toast', text)
        card.insertBefore(node, card.firstChild)
        window.setTimeout(function () { node.remove() }, 4800)
      }

      // ---- open / close ----
      function setOpen(next) {
        isOpen = next
        host.setAttribute('data-open', next ? 'true' : 'false')
        // Collapsed must be the pig and *nothing else*. One switch hides the
        // whole panel now that the pig is not inside it — and driving visibility
        // from the DOM rather than only from CSS makes it something a test can
        // actually assert.
        card.hidden = !next
        // The hud rides with the panel: a bare pig in the corner should not have
        // a name and a coin count floating beside it.
        hud.hidden = !next
        if (!next) bubble.hidden = true
        writeStore(OPEN_KEY, next ? 'true' : 'false')
        if (next) {
          renderContent()
          fitPanel()
        } else {
          // Back to the default anchor so the next open starts from a clean
          // slate. `auto` (not '') keeps the stylesheet's bottom from re-applying
          // alongside a stale top.
          card.style.right = ''
          card.style.top = 'auto'
          card.style.bottom = ''
          card.style.maxHeight = ''
          card.style.maxWidth = ''
        }
      }

      function select(next) {
        tab = next
        picker = null
        renderContent()
        for (var k in icons) icons[k].setAttribute('data-active', k === tab ? 'true' : 'false')
      }

      /**
       * Developer tab. Drives the pig into any state so a change can be looked at
       * immediately instead of waiting days for it — and so the states that are
       * hard to reach by playing (dying, the last illness stage, an elder pig)
       * can be checked at all.
       */
      function devTab() {
        content.appendChild(el('div', 'dp-dev-note', '🔧 ' + T('开发者模式 · Ctrl+Shift+D 关闭')))

        var p = view.pig
        if (p === null) {
          content.appendChild(el('div', 'dp-empty', T('还没有猪。先「拆开纸盒」再调。')))
          return
        }

        /** A row of small buttons under a caption. */
        function group(title, entries) {
          var head = el('div', 'dp-title')
          head.appendChild(el('b', null, T(title)))
          content.appendChild(head)
          var wrap = el('div', 'dp-dev-row')
          for (var i = 0; i < entries.length; i += 1) {
            (function (entry) {
              var btn = button('dp-mini dp-dev-btn', { 'data-dev': entry.key }, function () { entry.run() })
              btn.textContent = devLabel(entry.label)
              wrap.appendChild(btn)
            })(entries[i])
          }
          content.appendChild(wrap)
        }

        var patch = function (body) { send('dev', { patch: body }) }

        /** '🍎 饿' → emoji kept, the words translated. */
        function devLabel(label) {
          var space = label.indexOf(' ')
          if (space < 0) return T(label)
          return label.slice(0, space) + ' ' + T(label.slice(space + 1))
        }

        group('状态', [
          { key: 'full', label: '😊 满状态', run: function () { patch({ satiety: 100, happiness: 100, cleanliness: 100, health: 5 }) } },
          { key: 'hungry', label: '🍎 饿', run: function () { patch({ satiety: 10 }) } },
          { key: 'dirty', label: '🫧 脏', run: function () { patch({ cleanliness: 10 }) } },
          { key: 'lonely', label: '🥺 孤单', run: function () { patch({ happiness: 10 }) } },
          { key: 'sleepy', label: '💤 困', run: function () { patch({ satiety: 90, happiness: 90, cleanliness: 90 }) } },
        ])

        group('生病', [
          { key: 'cold1', label: '🤒 感冒一期', run: function () { patch({ illness: { chain: 0, stage: 1 }, health: 4 }) } },
          { key: 'cold4', label: '☠️ 肺炎', run: function () { patch({ illness: { chain: 0, stage: 4 }, health: 1 }) } },
          { key: 'cough', label: '🫁 肺结核', run: function () { patch({ illness: { chain: 1, stage: 4 }, health: 1 }) } },
          { key: 'belly', label: '🤢 胃癌', run: function () { patch({ illness: { chain: 2, stage: 4 }, health: 1 }) } },
          { key: 'cure', label: '💚 治好', run: function () { patch({ illness: null, health: 5 }) } },
        ])

        group('年龄', [
          { key: 'box', label: '📦 纸盒', run: function () { patch({ hatched: false }) } },
          { key: 'piglet', label: '小猪', run: function () { patch({ hatched: true, ageDays: 0.2 }) } },
          { key: 'young', label: '青年', run: function () { patch({ ageDays: 2 }) } },
          { key: 'middle', label: '中年', run: function () { patch({ ageDays: 5 }) } },
          { key: 'elder', label: '老年', run: function () { patch({ ageDays: 9 }) } },
          { key: 'gone', label: '🪦 老死', run: function () { patch({ ageDays: 20 }) } },
        ])

        group('资源', [
          { key: 'coin100', label: '🪙 +100', run: function () { patch({ coins: p.coins + 100 }) } },
          { key: 'coin999', label: '🪙 9999', run: function () { patch({ coins: 9999 }) } },
          { key: 'traits', label: '🧠+5 ✨+5 💪+5', run: function () { patch({ traits: { intel: 5, charm: 5, strong: 5 } }) } },
          { key: 'bag', label: '🎒 全套药', run: function () { patch({ inventory: { med1: 3, med2: 3, med3: 3, med4: 3, soul: 2, apple: 5, soap: 5, yoyo: 3 } }) } },
        ])

        group('生死', [
          { key: 'kill', label: '💀 弄死', run: function () { patch({ dead: true }) } },
          { key: 'revive', label: '✨ 复活', run: function () { patch({ dead: false, health: 5 }) } },
          { key: 'adopt', label: '📦 领养', run: function () { send('adopt') } },
          { key: 'reset', label: '🔄 重置', run: function () { send('reset') } },
        ])

        group('面板', [
          { key: 'open', label: '展开/收起', run: function () { setOpen(host.getAttribute('data-open') !== 'true') } },
          { key: 'away1', label: '⏩ +1 小时', run: function () { patch({ __advanceMs: 3600000 }) } },
          { key: 'away24', label: '⏩ +1 天', run: function () { patch({ __advanceMs: 86400000 }) } },
        ])

        content.appendChild(el('div', 'dp-dev-note',
          T('当前：{stage} · 健康 {health} · 🪙 {coins}', { stage: p.stage.label, health: p.health, coins: p.coins })
          + (p.illness === null ? '' : ' · ' + p.illness.name)))
      }

      // ---- panel rendering ----
      function labelledBar(label, value, valueText, variant) {
        var row = el('div', 'dp-row')
        row.appendChild(el('span', null, label))
        row.appendChild(el('b', null, valueText))
        content.appendChild(row)
        content.appendChild(meter(value, variant))
      }

      function statusTab() {
        var p = view.pig
        if (p === null) return
        labelledBar('🍚 ' + T('饱食'), p.satiety, p.satiety + '%')
        labelledBar('❤️ ' + T('心情'), p.happiness, p.happiness + '%', 'dp-mood')
        labelledBar('🫧 ' + T('清洁'), p.cleanliness, p.cleanliness + '%', 'dp-clean')
        labelledBar('💚 ' + T('健康'), p.healthPercent, p.health + '/' + view.maxHealth, 'dp-health')

        var traits = el('div', 'dp-traits')
        traits.appendChild(el('span', null, '🧠 ' + T('智力') + ' ' + p.traits.intel))
        traits.appendChild(el('span', null, '✨ ' + T('魅力') + ' ' + p.traits.charm))
        traits.appendChild(el('span', null, '💪 ' + T('武力') + ' ' + p.traits.strong))
        content.appendChild(traits)

        var info = el('div', 'dp-row')
        info.appendChild(el('span', null, '⚖️ ' + T('体重') + ' ' + p.weight))
        info.appendChild(el('b', null, '🪙 ' + p.coins))
        content.appendChild(info)

        var age = el('div', 'dp-row')
        age.appendChild(el('span', null, '🎂 ' + T('年龄')))
        age.appendChild(el('b', null, p.ageLabel + ' · ' + p.stage.label))
        content.appendChild(age)
        // [dsh-piggy-claude-code mod] the pig grows by weight, not by age.
        if (p.kgToNextStage !== null) {
          content.appendChild(el('div', 'dp-empty',
            T('再长 {kg} kg 就长成下一阶段了', { kg: p.kgToNextStage.toFixed(1) })))
        }
        if (p.canChooseLook) {
          var looks = el('div', 'dp-actions dp-looks')
          var LOOK_CHOICES = [['elder', '👴 ' + T('老年猪')], ['original', '🐷 ' + T('原版')]]
          for (var li = 0; li < LOOK_CHOICES.length; li += 1) {
            (function (key, label) {
              var pick = button('dp-btn', { 'data-look': key, 'aria-pressed': String(p.look === key) }, function () {
                if (p.look !== key) send('look', { look: key })
              })
              pick.appendChild(el('span', null, label))
              looks.appendChild(pick)
            })(LOOK_CHOICES[li][0], LOOK_CHOICES[li][1])
          }
          content.appendChild(looks)
        }

        var grid = el('div', 'dp-actions')
        for (var i = 0; i < MODES.length; i += 1) {
          (function (key) {
            var info = view.actions[key]
            var shelf = view.care[key] ?? []
            var needsItem = shelf.length > 0
            var btn = button('dp-btn', { 'data-action': key }, function () {
              // Feeding, washing and playing all spend something, so the button
              // opens the pig's bag instead of guessing what to use.
              if (needsItem) {
                picker = picker === key ? null : key
                renderContent()
              } else {
                send(key)
              }
            })
            btn.setAttribute('data-open-picker', picker === key ? 'true' : 'false')
            btn.appendChild(el('span', null, CARE_LABEL[key][1]))
            btn.appendChild(el('span', null, T(CARE_LABEL[key][0])))
            if (needsItem) btn.appendChild(el('span', 'dp-count', String(shelf.length)))
            // Trust but verify: a dead pig cannot be cared for even if the host
            // forgot to clear its readiness flags.
            if (!info.ready || view.dead) {
              btn.disabled = true
              if (view.dead) btn.appendChild(el('span', 'dp-wait', '—'))
              else if (info.waitSeconds > 0) btn.appendChild(el('span', 'dp-wait', T('{n}s', { n: info.waitSeconds })))
              else if (info.blocked === 'away') btn.appendChild(el('span', 'dp-wait', T('不在家')))
            }
            grid.appendChild(btn)
          })(MODES[i])
        }
        content.appendChild(grid)

        if (picker !== null && (view.care[picker] ?? []).length > 0) content.appendChild(pickerPanel(picker))

        if (p.memories.length > 0) {
          content.appendChild(el('div', 'dp-memo', p.memories.slice(-3).join('\n')))
        }

        content.appendChild(langSwitcher())
      }

      /**
       * [dsh-piggy-claude-code mod] 🌐 语言: one button per language the host
       * offers, each named in its own language so it can be found from any of
       * them. The current one is pressed; the others post `lang`.
       */
      function langSwitcher() {
        var wrap = el('div', 'dp-lang')
        var head = el('div', 'dp-row')
        head.style.marginTop = '10px'
        head.appendChild(el('span', null, '🌐 ' + T('语言')))
        wrap.appendChild(head)
        var row = el('div', 'dp-actions dp-langs')
        row.style.marginTop = '4px'
        for (var i = 0; i < view.langs.length; i += 1) {
          (function (entry) {
            var pick = button('dp-btn', { 'data-lang': entry.key, 'aria-pressed': String(view.lang === entry.key) }, function () {
              if (view.lang !== entry.key) send('lang', { lang: entry.key })
            })
            pick.setAttribute('lang', entry.key)
            pick.appendChild(el('span', null, entry.label))
            row.appendChild(pick)
          })(view.langs[i])
        }
        wrap.appendChild(row)
        return wrap
      }

      /** The pig's bag for one care action: pick what to spend. */
      function pickerPanel(action) {
        var wrap = el('div', 'dp-pick')
        var asks = { feed: '喂点什么？', bathe: '用哪个洗澡？', play: '拿哪个玩具？' }
        wrap.appendChild(el('div', 'dp-pick-head', T(asks[action] ?? '用哪个？')))
        var list = el('div', 'dp-list')
        var shelf = view.care[action] ?? []
        for (var i = 0; i < shelf.length; i += 1) {
          (function (item) {
            var row = el('div', 'dp-item')
            row.appendChild(el('span', null, item.emoji))
            var grow = el('div', 'dp-grow')
            grow.appendChild(el('div', null, item.default
              ? T('{label}（自带）', { label: item.label })
              : item.label + ' ×' + num(item.count, 0)))
            grow.appendChild(el('div', 'dp-dim', careEffectLine(action, item)))
            row.appendChild(grow)
            var use = button('dp-mini', { 'data-care': action + ':' + item.key }, function () {
              picker = null
              send(action, { item: item.key })
            })
            use.textContent = T('用')
            row.appendChild(use)
            list.appendChild(row)
          })(shelf[i])
        }
        wrap.appendChild(list)
        var cancel = button('dp-cancel', {}, function () { picker = null; renderContent() })
        cancel.textContent = T('算了')
        wrap.appendChild(cancel)
        return wrap
      }

      /** "+35 清洁" and friends, so the picker says what each item does. */
      function careEffectLine(action, item) {
        var parts = []
        if (action === 'feed') {
          parts.push(T('饱食') + ' +' + item.satiety)
          if (item.happiness) parts.push(T('心情') + ' +' + item.happiness)
        } else if (action === 'bathe') {
          parts.push(T('清洁') + ' +' + item.cleanliness)
          if (item.happiness) parts.push(T('心情') + ' +' + item.happiness)
        } else {
          parts.push(T('心情') + ' +' + item.happiness)
          if (item.satiety) parts.push(T('饱食') + ' ' + item.satiety)
        }
        return parts.join(' · ')
      }

      function studyTab() {
        if (view.subjects.length === 0) {
          content.appendChild(el('div', 'dp-empty', T('宿主还没提供课程表。')))
          return
        }
        var seg = el('div', 'dp-seg')
        for (var s = 0; s < STAGES.length; s += 1) {
          (function (entry) {
            var detail = null
            for (var k = 0; k < view.stages.length; k += 1) if (view.stages[k].key === entry.key) detail = view.stages[k]
            var locked = detail !== null && detail.unlocked === false
            var label = T(entry.label) + (detail ? ' · ' + detail.tuition + '🪙' : '') + (locked ? ' 🔒' : '')
            // A locked stage stays clickable on purpose: selecting it is how the
            // pig tells you what it is still missing. Only the courses inside it
            // are inert.
            var btn = button(null, { 'data-stage': entry.key }, function () {
              stage = entry.key
              renderContent()
            })
            btn.textContent = label
            btn.setAttribute('data-active', entry.key === stage ? 'true' : 'false')
            btn.setAttribute('data-locked', locked ? 'true' : 'false')
            seg.appendChild(btn)
          })(STAGES[s])
        }
        content.appendChild(seg)

        var detail = null
        for (var d = 0; d < view.stages.length; d += 1) if (view.stages[d].key === stage) detail = view.stages[d]
        if (detail !== null) {
          var note = el('div', 'dp-empty', T('{time} · 学费 {tuition} 🪙 · 属性 +{gain}',
            { time: formatMinutes(detail.minutes), tuition: detail.tuition, gain: detail.gain }))
          note.style.marginBottom = '7px'
          note.style.marginTop = '0'
          content.appendChild(note)
          // A gated stage says exactly what it is waiting for.
          if (detail.unlocked === false && detail.progress !== null) {
            content.appendChild(el('div', 'dp-locked', '🔒 ' + T('要先念完{label}（{done}/{need}）',
              { label: detail.progress.label, done: detail.progress.done, need: detail.progress.need })))
          }
        }

        var grid = el('div', 'dp-grid')
        for (var i = 0; i < view.subjects.length; i += 1) {
          (function (sub) {
            var btn = button('dp-item', { 'data-subject': sub.key }, function () {
              send('study', { subject: sub.key, stage: stage })
            })
            if (detail !== null && detail.unlocked === false) btn.disabled = true
            btn.style.cursor = 'pointer'
            btn.style.textAlign = 'left'
            btn.appendChild(el('span', null, sub.emoji))
            var grow = el('div', 'dp-grow')
            grow.appendChild(el('div', null, sub.label))
            grow.appendChild(el('div', 'dp-dim', sub.traitLabel + ' · ' + T('已上 {n} 次', { n: sub.level })))
            btn.appendChild(grow)
            grid.appendChild(btn)
          })(view.subjects[i])
        }
        content.appendChild(grid)
      }

      function workTab() {
        if (view.jobs.length === 0) {
          content.appendChild(el('div', 'dp-empty', T('宿主还没提供工作列表。')))
          return
        }
        var list = el('div', 'dp-list')
        for (var i = 0; i < view.jobs.length; i += 1) {
          (function (job) {
            var row = el('div', 'dp-item')
            row.appendChild(el('span', null, job.emoji))
            var grow = el('div', 'dp-grow')
            grow.appendChild(el('div', null, job.label))
            var line = formatMinutes(job.minutes) + ' · ' + T('赚 {coins} 🪙', { coins: job.coins })
            if (job.traitPoints > 0) {
              line += ' · ' + T('省 {pct}% 时间', { pct: job.speedPercent })
            }
            grow.appendChild(el('div', 'dp-dim', line))
            // Spell out which lessons are paying for this, or the linkage between
            // 学习 and 打工 is invisible.
            var byTrait = job.traitEmoji + job.traitLabel + ' ' + job.traitPoints
              + ' · ' + (job.payPercent > 0 ? T('报酬 +{pct}%', { pct: job.payPercent }) : T('去上课就能涨'))
            grow.appendChild(el('div', 'dp-dim', byTrait))
            row.appendChild(grow)
            var go = button('dp-mini', { 'data-job': job.key }, function () { send('work', { job: job.key }) })
            go.textContent = T('出发')
            go.disabled = !view.canGoOut
            row.appendChild(go)
            list.appendChild(row)
          })(view.jobs[i])
        }
        content.appendChild(list)
      }

      function shopTab() {
        if (view.shop.length === 0) {
          content.appendChild(el('div', 'dp-empty', T('宿主还没提供货架。')))
          return
        }
        var head = el('div', 'dp-title')
        head.appendChild(el('b', null, '🛒 ' + T('商店')))
        head.appendChild(el('span', null, '🪙 ' + view.pig.coins))
        content.appendChild(head)
        var list = el('div', 'dp-list')
        var shelf = ''
        // The host sends the shop in shelf order, but sort defensively so a
        // reordered table cannot produce duplicate headers.
        var ordered = view.shop.slice().sort(
          (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind),
        )
        for (var i = 0; i < ordered.length; i += 1) {
          (function (item) {
            // Shelves, so 21 items read as five short lists instead of one long one.
            if (item.kind !== shelf) {
              shelf = item.kind
              var title = KIND_TITLE[shelf]
              list.appendChild(el('div', 'dp-shelf', title === undefined ? shelf : title[0] + ' ' + T(title[1])))
            }
            var row = el('div', 'dp-item' + (item.needed ? ' dp-wanted' : ''))
            row.appendChild(el('span', null, item.emoji))
            var grow = el('div', 'dp-grow')
            grow.appendChild(el('div', null, item.label))
            grow.appendChild(el('div', 'dp-dim', item.price + ' 🪙' + (item.needed ? ' · ' + T('现在需要') : '')))
            row.appendChild(grow)
            var buy = button('dp-mini', { 'data-buy': item.key }, function () { send('buy', { item: item.key }) })
            buy.textContent = T('买')
            buy.disabled = !item.affordable
            row.appendChild(buy)
            list.appendChild(row)
          })(ordered[i])
        }
        content.appendChild(list)
      }

      function travelTab() {
        if (view.trips.length === 0) {
          content.appendChild(el('div', 'dp-empty', T('宿主还没提供目的地。')))
          return
        }
        var list = el('div', 'dp-list')
        for (var i = 0; i < view.trips.length; i += 1) {
          (function (trip) {
            var row = el('div', 'dp-item')
            row.appendChild(el('span', null, trip.emoji))
            var grow = el('div', 'dp-grow')
            grow.appendChild(el('div', null, trip.label))
            grow.appendChild(el('div', 'dp-dim', formatMinutes(trip.minutes) + ' · ' + trip.cost + ' 🪙'))
            row.appendChild(grow)
            var go = button('dp-mini', { 'data-trip': trip.key }, function () { send('trip', { trip: trip.key }) })
            go.textContent = T('出发')
            go.disabled = !view.canGoOut || !trip.affordable
            row.appendChild(go)
            list.appendChild(row)
          })(view.trips[i])
        }
        content.appendChild(list)

        var souvenirs = view.pig.souvenirs
        var head = el('div', 'dp-title')
        head.style.marginTop = '10px'
        head.appendChild(el('b', null, '🎁 ' + T('纪念品') + ' ' + souvenirs.length))
        content.appendChild(head)
        content.appendChild(el('div', 'dp-empty', souvenirs.length === 0 ? T('还没出过远门。') : souvenirs.join(' · ')))
      }

      function bagTab() {
        var owned = []
        for (var i = 0; i < view.shop.length; i += 1) {
          if (num(view.inventory[view.shop[i].key], 0) > 0) owned.push(view.shop[i])
        }
        if (owned.length === 0) {
          content.appendChild(el('div', 'dp-empty', T('背包空空的 —— 去「商店」买点东西。')))
        } else {
          var list = el('div', 'dp-list')
          for (var j = 0; j < owned.length; j += 1) {
            (function (item) {
              var row = el('div', 'dp-item' + (item.needed ? ' dp-wanted' : ''))
              row.appendChild(el('span', null, item.emoji))
              var grow = el('div', 'dp-grow')
              grow.appendChild(el('div', null, item.label + ' ×' + num(view.inventory[item.key], 0)))
              grow.appendChild(el('div', 'dp-dim', kindLabel(item)))
              row.appendChild(grow)
              var use = button('dp-mini', { 'data-use': item.key }, function () { send('use', { item: item.key }) })
              use.textContent = T('使用')
              row.appendChild(use)
              list.appendChild(row)
            })(owned[j])
          }
          content.appendChild(list)
        }

        var souvenirs = view.pig.souvenirs
        var head = el('div', 'dp-title')
        head.style.marginTop = '10px'
        head.appendChild(el('b', null, '🎁 ' + T('纪念品') + ' ' + souvenirs.length))
        content.appendChild(head)
        content.appendChild(el('div', 'dp-empty', souvenirs.length === 0 ? T('收藏册还空着。') : souvenirs.join(' · ')))
      }

      /** "3 天" / "12 小时" / "40 分钟" for an upcoming stage, in the pig's language. */
      function formatDays(days) {
        if (days >= 1) return T('{n} 天', { n: Math.round(days) })
        const hours = days * 24
        return hours >= 1 ? T('{n} 小时', { n: Math.round(hours) }) : formatMinutes(Math.max(1, Math.round(hours * 60)))
      }

      /** "40 分钟" · "40分" · "40 min". */
      function formatMinutes(minutes) {
        return T('{n} 分钟', { n: num(minutes, 0) })
      }

      function kindLabel(item) {
        if (item.kind === 'medicine') return T(item.needed ? '对症！' : '药')
        if (item.kind === 'revive') return T('复活用')
        if (item.kind === 'bath') return T('洗浴')
        if (item.kind === 'toy') return T('玩具')
        return T('食物')
      }

      function renderContent() {
        content.textContent = ''
        for (var k = 0; k < TABS.length; k += 1) {
          icons[TABS[k].key].setAttribute('data-active', TABS[k].key === tab ? 'true' : 'false')
        }
        if (host.getAttribute('data-open') !== 'true') return

        // Alerts sit above the tab body so they are visible from any tab.
        // Each one is guarded on `pig` because an unhatched pig is null — the
        // hatch affordance below is the only thing that may render then.
        if (view.legacy) {
          var legacy = el('div', 'dp-alert dp-legacy')
          legacy.appendChild(el('b', null, '⚠️ ' + T('宿主是旧版本')))
          legacy.appendChild(el('div', null, T('金币、健康、打工、商店这些是新增的，重启 dsh（不是刷新页面）之后才会出现。')))
          content.appendChild(legacy)
        }
        if (view.pig !== null && view.dead) {
          var dead = el('div', 'dp-alert dp-dead')
          dead.appendChild(el('b', null, '🪦 ' + T(view.pig.soul ? '{name} 走了，灵魂还留在墓碑上 👻' : '{name} 走了',
            { name: view.pig.name })))
          dead.appendChild(el('div', null, T(view.pig.soul
            ? '用还魂丹可以把它叫回来，或者领养一只新的小猪'
            : '在「背包」里用还魂丹就能救回来（金币、收藏、上过的课都保留）')))
          content.appendChild(dead)
          // Adopting is available the moment the pig dies — not only once the
          // soul turns up a day later. Waiting a day to start over was a
          // mistake: the grave is already a dead end with nothing to do.
          var adoptWrap = el('div', 'dp-actions')
          var adopt = button('dp-btn dp-btn-wide', { 'data-action': 'adopt' }, function () { send('adopt') })
          adopt.appendChild(el('span', null, '📦'))
          adopt.appendChild(el('span', null, T('领养新猪')))
          adoptWrap.appendChild(adopt)
          content.appendChild(adoptWrap)
        } else if (view.pig !== null && view.pig.illness !== null) {
          var sick = el('div', 'dp-alert dp-sick')
          sick.appendChild(el('b', null, '🤒 ' + T('{name}（第 {stage}/4 期）',
            { name: view.pig.illness.name, stage: view.pig.illness.stage })))
          sick.appendChild(el('div', null, T('需要「{cure}」—— 去商店买对应的药', { cure: view.pig.illness.cure })))
          // If it cannot afford the cure, say the way out plainly: being ill is
          // not a reason to stay home, so it can go out and earn the medicine.
          // careView only carries the consumable shelves (feed/bathe/play), so
          // the price has to come from the shop listing.
          var cures = (view.shop || []).filter(function (i) { return i.kind === 'medicine' })
          var cheapest = cures.length === 0 ? null : cures.reduce(function (a, b) { return a.price <= b.price ? a : b })
          if (view.canGoOut) {
            sick.appendChild(el('div', 'dp-dim',
              T('带病也能出门，但报酬只有一半；在外面病情会走得更快，躺着养最省')))
          }
          if (cheapest !== null && view.canGoOut && view.pig.coins < cheapest.price) {
            sick.appendChild(el('div', 'dp-dim',
              T('钱不够也没关系 —— 先去打工，赚够 {price} 🪙 买「{item}」', { price: cheapest.price, item: cheapest.label })))
          }
          content.appendChild(sick)
        } else if (view.pig !== null && view.activity !== null) {
          var away = el('div', 'dp-alert dp-work')
          away.appendChild(el('b', null, view.activity.emoji + ' ' + T('在外面：{label}', { label: view.activity.label })))
          away.appendChild(el('div', null, T('还有 {n} 秒', { n: view.activity.secondsLeft })))
          content.appendChild(away)
          var wrap = el('div', 'dp-actions')
          var call = button('dp-btn dp-btn-wide', { 'data-action': 'calloff' }, function () { send('calloff') })
          call.appendChild(el('span', null, '↩️'))
          call.appendChild(el('span', null, T('叫它回来')))
          wrap.appendChild(call)
          content.appendChild(wrap)
        }

        if (view.pig === null) {
          content.appendChild(el('div', 'dp-empty', T('门口放着一个纸盒，里面窸窸窣窣 📦')))
          var grid = el('div', 'dp-actions')
          var hatch = button('dp-btn dp-btn-wide', { 'data-action': 'hatch' }, function () { send('hatch') })
          hatch.appendChild(el('span', null, '🥚'))
          hatch.appendChild(el('span', null, T('拆开纸盒')))
          grid.appendChild(hatch)
          content.appendChild(grid)
          content.appendChild(el('div', 'dp-empty', T('拆开就会蹦出一只小猪 —— 不用敲命令')))
          // The language can be picked before the pig exists.
          content.appendChild(langSwitcher())
          fitPanel()
          return
        }

        if (tab === 'status') statusTab()
        else if (tab === 'study') studyTab()
        else if (tab === 'work') workTab()
        else if (tab === 'shop') shopTab()
        else if (tab === 'travel') travelTab()
        else if (tab === 'dev') devTab()
        else bagTab()

        // Every tab is a different height, so the fit is recomputed after each
        // render rather than only on open.
        fitPanel()
      }

      var AWAY_LINE = {
        work: '在忙',
        study: '在念书',
        trip: '在路上',
      }

      function render(next) {
        view = normalize(next)
        // [dsh-piggy-claude-code mod] everything below is rebuilt from scratch
        // on every render, so switching language needs nothing but this.
        currentLang = view.lang
        host.setAttribute('lang', view.lang)
        relabelBar()
        scene.title = T('左键摸摸 · 右键打开面板 · 拖动可移动')
        pokeHintText.textContent = T('戳三下')
        host.setAttribute('data-dead', view.dead ? 'true' : 'false')
        host.setAttribute('data-open', isOpen ? 'true' : 'false')
      host.setAttribute('data-dev', 'false')
        // Drives both the prop and the pig's own activity animation.
        host.setAttribute('data-away', view.activity === null ? 'false' : view.activity.kind)
        if (view.activity === null) {
          work.hidden = true
        } else {
          work.hidden = false
          prop.textContent = view.activity.emoji
          progressFill.style.width = view.activity.progress + '%'
          work.setAttribute('data-kind', view.activity.kind)
          work.title = T('{what}：{label}', { what: T(AWAY_LINE[view.activity.kind] ?? '在外面'), label: view.activity.label })
        }

        if (view.hatched !== true) {
          pigArt.hidden = true
          pigArt.removeAttribute('src')
          pigEmoji.hidden = false
          pigEmoji.textContent = view.boxStage.emoji
          pig.removeAttribute('data-art')
          pig.setAttribute('data-mood', 'box')
          // Size comes from the host so the box and the pig can never drift.
          host.style.setProperty('--pig-size', view.boxStage.size + 'px')
          soul.hidden = true
          host.setAttribute('data-soul', 'false')
          host.setAttribute('data-faded', 'false')
          host.setAttribute('data-unhatched', 'true')
          pokeHint.hidden = false
          hudName.textContent = T('一个{box}', { box: view.boxStage.label })
          hudCoins.textContent = T('点开拆开它')
          hudHealth.textContent = ''
          lastStage = null
        } else {
          const stage = view.pig.stage
          // A drawn stage shows its sprite; everything else is the emoji.
          if (stage.art !== null) {
            pigArt.src = ART_URL + stage.art + '.svg'
            pigArt.hidden = false
            pigEmoji.hidden = true
            pig.setAttribute('data-art', stage.art)
          } else {
            pigArt.hidden = true
            pigArt.removeAttribute('src')
            pigEmoji.hidden = false
            pigEmoji.textContent = stage.emoji
            pig.removeAttribute('data-art')
          }
          // Literally grows up: the stage carries its own size.
          host.style.setProperty('--pig-size', stage.size + 'px')
          pig.setAttribute('data-mood', view.pig.mood)
          host.setAttribute('data-soul', view.pig.soul ? 'true' : 'false')
          // Old age reads as a faded coat, since every stage is the same 🐖.
          host.setAttribute('data-faded', stage.faded ? 'true' : 'false')
          host.setAttribute('data-unhatched', 'false')
          pokeHint.hidden = true
          soul.hidden = view.pig.soul !== true
          pig.setAttribute('data-stage', stage.key)
          hudName.textContent = view.pig.name + ' · ' + stage.label + (view.pig.ageLabel ? ' · ' + view.pig.ageLabel : '')
          hudCoins.textContent = '🪙 ' + view.pig.coins
          hudHealth.textContent = '💚 ' + view.pig.health + '/' + view.maxHealth
          // Growing up is announced with the same flourish a level-up used to get.
          if (lastStage !== null && stage.key !== lastStage) {
            react('levelup', 950)
            burst(['✨', '🎉', '⭐'], 4)
            showBubble(T('我长大啦！') + stage.emoji, 2600)
          }
          lastStage = stage.key
        }

        // Alerts on the icon bar itself, so a collapsed pig still warns.
        icons.study.setAttribute('data-alert', view.pig !== null && view.pig.illness === null && view.activity === null && view.pig.satiety < 25 ? 'false' : 'false')
        icons.shop.setAttribute('data-alert', view.pig !== null && view.pig.illness !== null ? 'true' : 'false')
        icons.travel.setAttribute('data-alert', view.pig !== null && view.pig.coins >= 400 ? 'true' : 'false')

        for (var i = 0; i < view.pending.length; i += 1) {
          var event = view.pending[i]
          if (event.at <= lastPendingAt) continue
          lastPendingAt = event.at
          toast(str(event.text, T('猪有新消息')))
          if (event.kind === 'levelup') { react('levelup', 950); burst(['✨', '🎉'], 3) }
          else if (event.kind === 'cured') { react('cure', 900); burst(['💚', '✨'], 3) }
          else if (event.kind === 'death') react('refuse', 700)
          else if (event.kind === 'work') { react('away', 900); burst(['🪙', '💰'], 3) }
          else if (event.kind === 'study') { react('away', 900); burst(['📚', '✨'], 3) }
          else if (event.kind === 'trip') { react('away', 900); burst(['🧳', '🎁'], 3) }
        }

        renderContent()
      }

      // ---- talking to the host ----
      async function refresh() {
        if (stopped) return
        // A poll can change the live content (a job finishing, an illness
        // starting), so re-check the panel still fits.
        fitPanel()
        try {
          var res = await fetch(STATE_URL, { cache: 'no-store' })
          if (!res.ok) throw new Error('HTTP ' + res.status)
          render(await res.json())
        } catch (error) {
          if (stopped) return
          showBubble(T('连接不上宿主'), 4000)
        }
      }

      async function send(action, extra) {
        if (busy || stopped) return
        // The language can be switched before hatching, too.
        if (view.pig === null && action !== 'hatch' && action !== 'lang') return
        busy = true
        flash(action)
        try {
          var body = { action: action }
          if (extra) for (var k in extra) body[k] = extra[k]
          var res = await fetch(ACT_URL, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
          })
          var next = await res.json()
          render(next)
          if (next && next.ok === false) {
            react('refuse', 520)
            if (next.reason === 'no-item') {
              var emptyKind = str(next.kind, '')
              showBubble(T(NO_ITEM_LINE[emptyKind] ?? '背包里没有能用的东西'), 3200)
              return
            }
            var reasons = {
              poor: '钱不够',
              away: '它在外面',
              weak: '太虚弱了，先养好再出门',
              hungry: '太饿了',
              'wrong-medicine': '药不对症',
              empty: '背包里没有',
              'not-sick': '它没生病',
              dead: '它已经走了…',
              idle: '它没在外面',
              'bad-lang': '不认识这种语言',
            }
            showBubble(next.reason === 'cooldown'
              ? T('还要等 {n} 秒', { n: num(next.wait, 0) })
              : T(reasons[next.reason] ?? '这个操作没成'), 2400)
          }
        } catch (error) {
          showBubble(T('操作没送到宿主'), 2600)
          react('refuse', 520)
        } finally {
          busy = false
        }
      }

      // ---- drag the pig; right-click it for the menu ----
      var drag = null
      scene.addEventListener('pointerdown', function (event) {
        if (event.button !== 0) return
        drag = {
          x: event.clientX, y: event.clientY,
          right: parseFloat(getComputedStyle(host).right) || 18,
          bottom: parseFloat(getComputedStyle(host).bottom) || 18,
          moved: false,
        }
        scene.setAttribute('data-dragging', 'true')
        scene.setPointerCapture?.(event.pointerId)
      })
      scene.addEventListener('pointermove', function (event) {
        if (drag === null) return
        var dx = event.clientX - drag.x
        var dy = event.clientY - drag.y
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true
        userRight = drag.right - dx
        userBottom = drag.bottom - dy
        clampPig()
        // The panel rides along so it is never left behind off screen.
        fitPanel()
      })
      function endDrag() {
        if (drag === null) return false
        var moved = drag.moved
        drag = null
        scene.removeAttribute('data-dragging')
        clampPig()
        writeStore(POSITION_KEY, JSON.stringify({ right: userRight, bottom: userBottom }))
        fitPanel()
        return moved
      }
      var boxPokes = 0

      /**
       * Poke the box. Three pokes and the piglet comes out — the count is what
       * makes it feel like something is in there rather than a button that
       * happens to be cardboard-shaped.
       */
      function pokeBox() {
        boxPokes += 1
        react('poke', 560)
        if (boxPokes >= BOX_POKES_TO_OPEN) {
          boxPokes = 0
          host.removeAttribute('data-poke')
          showBubble(T('哇——！'), 1200)
          burst(['✨', '🎉', '💨'], 6)
          send('hatch')
          return
        }
        host.setAttribute('data-poke', String(boxPokes))
        burst(['💨'], 2)
        showBubble(T(BOX_POKE_LINES[boxPokes - 1]), 2200)
      }

      // Left click is a pat on the head. The menu is on the context menu, so a
      // stray click can no longer open or close the panel by accident.
      scene.addEventListener('pointerup', function () {
        if (endDrag()) return
        // An unhatched save is a box, whether or not one exists yet.
        if (view.hatched !== true) {
          pokeBox()
          return
        }
        if (!view.dead) flash('pet')
      })
      scene.addEventListener('pointercancel', function () { endDrag() })
      scene.addEventListener('contextmenu', function (event) {
        event.preventDefault()
        setOpen(!isOpen)
        if (isOpen && view.pig !== null) flash('pet')
      })

      // ---- life ----
      clampPig()
      setOpen(isOpen)
      render(view)
      refresh()
      pollTimer = window.setInterval(refresh, POLL_MS)
      // Optional call: minimal test environments stub a window without listeners.
      // Optional call: minimal test environments stub a window without listeners.
      function onResize() {
        clampPig()
        fitPanel()
      }
      window.addEventListener?.('resize', onResize)

      // ---- developer mode: Ctrl+Shift+D ----
      function setDevMode(on) {
        devMode = on === true
        writeStore(DEV_KEY, devMode ? '1' : '0')
        host.setAttribute('data-dev', devMode ? 'true' : 'false')
        paintBar()
        if (devMode) {
          setOpen(true)
          select('dev')
          showBubble('🔧 ' + T('开发者模式已开'), 2000)
        } else {
          if (tab === 'dev') select('status')
          showBubble(T('开发者模式已关'), 1600)
        }
      }

      devMode = readStore(DEV_KEY) === '1'
      host.setAttribute('data-dev', devMode ? 'true' : 'false')
      if (devMode) paintBar()

      function onKeyDown(event) {
        if (event.ctrlKey && event.shiftKey && (event.key === 'D' || event.key === 'd')) {
          event.preventDefault()
          setDevMode(!devMode)
        }
      }
      window.addEventListener?.('keydown', onKeyDown)

      // Also reachable from the console, for when the panel is off screen.
      try {
        window.dshPigDev = {
          on: function () { setDevMode(true) },
          off: function () { setDevMode(false) },
          toggle: function () { setDevMode(!devMode) },
        }
      } catch (error) { /* frozen window */ }

      function dispose() {
        stopped = true
        window.removeEventListener?.('resize', onResize)
        if (pollTimer !== null) window.clearInterval(pollTimer)
        if (reactTimer !== null) window.clearTimeout(reactTimer)
        if (bubbleTimer !== null) window.clearTimeout(bubbleTimer)
        pollTimer = null
        reactTimer = null
        bubbleTimer = null
        host.remove()
        style.remove()
        font.remove()
      }

      return dispose
    }

    exports.name = 'dsh-piggy'
    exports.apply = apply
    // For tests and tooling, like the host's `dictionaries`.
    exports.I18N = I18N
    exports.tr = tr
    return module.exports
  },
})
