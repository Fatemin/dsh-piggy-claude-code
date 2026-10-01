// [dsh-piggy-claude-code mod] Translations for the adapter (status line, CLI,
// tray / menu-bar menus): keys are the Chinese source strings.
// See i18n.js and locales/GLOSSARY.md.
export default {
  ja: {
    // lib/status.js
    '快好了': 'もうすぐ',
    '{m}分': '{m}分',
    '{h}时{m}分': '{h}時間{m}分',
    '纸盒里有动静…（pig hatch）': 'ダンボール箱がゴソゴソ…（pig hatch）',
    '还剩{left}': 'あと{left}',
    // bin/pig.js
    '面板：{url}（Ctrl+C 退出）': 'パネル：{url}（Ctrl+C で終了）',
    '面板服务返回 {status}': 'パネルサーバーの応答 {status}',
    '存档被别的进程占着，稍后再试': 'セーブデータを別のプロセスが使っています。少しあとでもう一度どうぞ',
    // tray / menu bar
    '隐藏猪猪': 'ブタをかくす',
    '显示猪猪': 'ブタを表示',
    '猪猪回到右下角': 'ブタを右下にもどす',
    '打开大面板': '大きいパネルを開く',
    '语言': '言語',
    '开机自动启动': 'ログイン時に起動',
    '退出': '終了',
  },
  en: {
    // lib/status.js
    '快好了': 'almost done',
    '{m}分': '{m} min',
    '{h}时{m}分': '{h} h {m} min',
    '纸盒里有动静…（pig hatch）': 'Something is rustling in the box… (pig hatch)',
    '还剩{left}': '{left} left',
    // bin/pig.js
    '面板：{url}（Ctrl+C 退出）': 'Panel: {url} (Ctrl+C to quit)',
    '面板服务返回 {status}': 'Panel server answered {status}',
    '存档被别的进程占着，稍后再试': 'Another process is using the save; try again in a moment',
    // tray / menu bar
    '隐藏猪猪': 'Hide the pig',
    '显示猪猪': 'Show the pig',
    '猪猪回到右下角': 'Move the pig back to the corner',
    '打开大面板': 'Open the big panel',
    '语言': 'Language',
    '开机自动启动': 'Start at login',
    '退出': 'Quit',
  },
}
