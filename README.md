# dsh-piggy for Claude Code 🐖

把 [dsh-piggy](https://github.com/CLICGGER-TYPES/dsh-piggy)——那只住在 DeepSeek Harness 里、照 QQ 宠物（怀旧服 v1.2.4）复刻的猪——搬进 **Claude Code**。

它吃你在 Claude Code 里的**真实工作**长大：你提的问题、每一轮回复、每一次工具调用都是它的口粮（有节流，见下文）。会上课、打工、旅行、生病，基础玩法和数值见上游的 [原版说明](README.dsh.md)，本仓库的改动见「[玩法改动](#玩法改动)」。

- **零 token**：只用 hooks 和 statusLine，hook 永不输出，模型不知道猪存在（`claude plugin details` 显示常驻开销 ~0）
- **不拖慢工作**：所有 hook 都是 `async`，出了任何问题也永远 `exit 0`
- **贴着上游改**：本仓库是上游的 fork。Claude Code 适配层全部在新增目录里；玩法改动只动了根目录几处，都标了 `[dsh-piggy-claude-code mod]`，merge 上游更新时容易对照

三种看猪的方式：

| | 是什么 | 平台 |
|---|---|---|
| 状态栏 | Claude Code 底部一行：`🐖 猪猪 · 🍚79 ❤️73 🫧90 💚5/5 · 🪙500 · 😊` | 全平台 |
| 网页面板 | 上游原版的六图标面板（手绘小猪 / 老年猪 SVG），浏览器打开 | 全平台 |
| 桌面悬浮猪 | 透明、置顶的桌面宠物 + 菜单栏图标，点击猪以外的地方直接穿透 | macOS |

> **不用 Claude Code、只想要一只桌宠？** 用 `app/` 里的独立桌面版（Windows + macOS，双击安装，自带运行时，不需要命令行），见下面「独立桌宠 App」。

## 需要

- Claude Code（带 `PostToolUseFailure` / `StopFailure` hook 的版本；在 2.1.285 上验证）
- Node.js ≥ 20
- 桌面悬浮猪另需 macOS 13+ 和 Swift 6 工具链（Xcode 或 Command Line Tools）

## 安装

**1. 插件（喂猪的 hooks）**

```bash
claude plugin marketplace add Fatemin/dsh-piggy-claude-code
```

```bash
claude plugin install dsh-piggy@dsh-piggy-claude-code
```

重启 Claude Code 后生效。

**2. 克隆一份（命令行、状态栏、面板、桌面猪都用它）**

```bash
git clone https://github.com/Fatemin/dsh-piggy-claude-code.git ~/dsh-piggy-claude-code
```

**3. 孵一只猪**

```bash
node ~/dsh-piggy-claude-code/bin/pig.js hatch
```

（或者在面板 / 桌面猪里戳三下纸盒。）

## 状态栏

在 `~/.claude/settings.json` 里：

```json
"statusLine": { "type": "command", "command": "sh ~/dsh-piggy-claude-code/bin/statusline.sh" }
```

已经有自己的 statusLine？把原命令当参数传进去，猪会接在后面：

```json
"statusLine": { "type": "command", "command": "sh ~/dsh-piggy-claude-code/bin/statusline.sh ~/.claude/my-statusline" }
```

状态栏只读，不会写存档。

## 网页面板

```bash
node ~/dsh-piggy-claude-code/bin/pig.js serve
```

打开 <http://127.0.0.1:41717/>，右键猪开菜单，左键摸摸。

## 桌面悬浮猪（macOS）

```bash
~/dsh-piggy-claude-code/desktop/build.command
```

```bash
~/dsh-piggy-claude-code/desktop/.build/release/DshPiggyDesk
```

- **右键猪**开关菜单，**左键**摸摸，**拖动猪**移动整个窗口（位置会记住）
- 猪以外的透明区域，点击**直接穿透**到下面的窗口
- 菜单栏小猪：状态一行、显示/隐藏、回到右下角、在浏览器打开面板、退出
- 自己拉起面板服务（已有就复用），退出时一起停；App 意外退出，服务 2 秒内自行退出并保存

开机自启（LaunchAgent）：

```bash
~/dsh-piggy-claude-code/desktop/install-autostart.command
```

撤销：`desktop/uninstall-autostart.command`。

> 如果 `swift build` 报 `Invalid manifest` / 链接失败（部分 macOS 版本上 Command Line Tools 自带的 Swift 会这样），`brew install swift` 后再构建即可，`build.command` 会自动优先用 Homebrew 的工具链。

自检：用 `PIGGY_DEBUG_SNAPSHOT=<目录>` 启动时，App 会把窗口渲染（收起 / 展开）和点击穿透判定写进该目录，不需要录屏权限。

## 独立桌宠 App（Windows + macOS）

`app/` 是 Electron 版的桌面猪：不接 Claude Code，双击就能用，适合只想养猪的人。猪的逻辑、面板和上面的桌面悬浮猪是同一份（`app/scripts/sync.mjs` 把根目录的运行时拷进去）。

- Mac：`.dmg`，通用包（Intel + Apple 芯片）；Windows：一键安装的 `Setup.exe`（x64，免管理员）
- 右键开菜单、左键摸摸、拖动移动，猪以外的区域点击穿透；托盘 / 菜单栏图标可隐藏、复位、开机自启、退出
- 存档在系统的应用数据目录（Mac `~/Library/Application Support/DSH Piggy/`，Windows `%APPDATA%\DSH Piggy\`），和 Claude Code 版互不影响

```bash
cd app && npm install
```

```bash
npm run dist:mac
```

```bash
npm run dist:win
```

产物在 `app/dist/`。未签名：Mac 首次打开要在「系统设置 → 隐私与安全性」里点「仍要打开」，Windows 要在 SmartScreen 里点「更多信息 → 仍要运行」。给不熟悉电脑的人的说明见 [`app/share-readme.txt`](app/share-readme.txt)。开发时 `npm start` 直接运行。

## 命令

```
pig                                  状态卡
pig hatch | feed | bathe | play | pet
pig study <科目> <小学|大学|研究生>    pig work <odd|site|office>    pig trip <suburb|mountain|sea|abroad>
pig shop | buy <物品> | use <物品> | calloff | weigh | name <名字>
pig look 老年 | 原版                  80 kg 以后切换老年猪 / 原版小猪的样子
pig lang zh | ja | en                 切换语言
pig serve                            面板服务
pig status-line                      一行状态
```

（`pig` = `node ~/dsh-piggy-claude-code/bin/pig.js`，可以自己 alias。）刻意不做成 Claude Code 斜杠命令——那样每次都要经过模型、花 token。

## 玩法改动

和上游原版相比：

| | 上游原版 | 本仓库 |
|---|---|---|
| 长大靠什么 | 年龄：第 1 / 3 / 7 天换阶段 | **体重**：20 kg 青年猪、50 kg 中年猪、**80 kg 老年猪** |
| 体型 | 每个阶段固定大小（40–62 px） | **随体重连续变大**：出生 40 px，**120 kg 时 200 px**（封顶） |
| 形象 | 小猪手绘 → 🐖 emoji → 老年猪手绘 | 80 kg 前一直是手绘小猪；80 kg 起是老年猪，**可以在状态页切换「老年猪 / 原版」**（或 `pig look 老年 / 原版`） |
| 体重从哪来 | 每个事件、每次喂食固定加几克 | **只来自真正吃下去的饱食度**：每点约 98 g，80 kg 后约 50 g。吃饱了再喂不长肉 |
| 长大要多久 | — | 正常照顾（饱食度每天自然消耗约 115 点）：约 1 周到 80 kg，约 2 周到 120 kg |
| 寿命 | 第 14 天老死 | **不会老死**；生病拖到健康归零仍会死，还魂丹照样能救 |
| 名字 | 只能用命令改 | 第一次起名免费；之后每次改名用一张**更名卡**（商店「道具」，1000 🪙） |
| 旅行 | 郊游 / 名山大川 / 看海 / 出国四档，纪念品没用 | **7 个地区 21 个目的地**，按你电脑所在时区算：100 🪙 + 每跨一个时区 200 🪙，1 小时 + 每个时区 1 小时。每次带回一件纪念品，60% 概率顺手带回消耗品（一半是只能旅行得到的当地特产）。**集齐一个地区的 6 件纪念品**给属性奖励和一个被动效果，七个地区都集齐成为「环球旅行家」 |
| 上学 | 小学 → 大学 → 研究生，一次一门 | 加 **博士**（12 小时、学费 2400、属性 +7，九门上完答辩通过再各 +1）；**大学可以同时上 2 门，研究生和博士 3 门** |
| 语言 | 只有中文 | **中文 / 日本語 / English** 随时切换：面板状态页、托盘 / 菜单栏菜单、`pig lang zh\|ja\|en` |

改动集中在 `data.js`（`GROWTH`、`LIFE_STAGES`）、`core.js`（`lifeStageFor`、`growFromFood`、`setLook`）、`index.js`、`store.js`、`client.js`，都标了 `[dsh-piggy-claude-code mod]`。

### 旅行地区与奖励

| 地区 | 目的地 | 集齐奖励 | 被动效果 |
|---|---|---|---|
| 🐉 中国 | 北京 · 成都 · 西安 | 武力 +3、体重 +5 kg | 🍚 干饭王：吃东西长肉 +10% |
| 🗾 东亚 | 东京 · 首尔 · 乌兰巴托 | 智力 +2、魅力 +2 | 📚 卷王：上课时间 -20% |
| 🛺 南亚·东南亚 | 曼谷 · 新加坡 · 新德里 | 魅力 +2 | 🧘 佛系：心情掉得慢 25% |
| 🏰 欧洲 | 巴黎 · 罗马 · 伦敦 | 智力 +4（历史满分） | 🖼 博物馆通票：旅行回来心情 +50% |
| 🗽 美洲 | 纽约 · 墨西哥城 · 里约热内卢 | 武力 +2、魅力 +2 | ✈️ 常旅客：旅费 -20% |
| 🐫 中东·非洲 | 迪拜 · 开罗 · 内罗毕 | 魅力 +1、武力 +1 | 💰 土豪：打工收入 +15% |
| 🐧 大洋洲·南极 | 悉尼 · 奥克兰 · 南极科考站 | 武力 +2 | 🧣 抗寒体质：更不容易生病 |
| 🌍 全部集齐 | — | 三项属性各 +3，称号「环球旅行家」 | — |

每个目的地有 2 件纪念品，优先给还没集到的；当地特产（北京烤鸭、九宫格火锅、草津温泉入浴剂、猫山王榴莲……）商店买不到。数值都在 [`world.js`](world.js)。

### 多语言

语言跟着存档走：面板、状态栏、托盘 / 菜单栏、终端命令都用同一只猪的语言。

- 新猪默认用 `PIG_LANG`；桌面猪和独立桌宠 App 会把系统语言传进去，所以第一次打开就是你电脑的语言。没有设置时是中文
- 这个功能出现之前的老存档一律保持中文，不会自己变
- 翻译以中文原文为键（gettext 方式），词典在 `locales/`，术语表在 [`locales/GLOSSARY.md`](locales/GLOSSARY.md)；缺翻译时回落到中文
- 切换前已经写下的回忆和公告保持原来的语言，之后的新内容用新语言

## 怎么接上的

| DSH | Claude Code |
|---|---|
| `agent/inbox/claimed` | `UserPromptSubmit` → `message` |
| `agent/turn-stopping` | `Stop` → `turn` |
| `tools/result`（成功 / 失败） | `PostToolUse` / `PostToolUseFailure` → `tool` / `toolError` |
| `agent/error` | `StopFailure` → `agentError` |
| `ctx.webServer` + 客户端挂载 | `pig serve` + `web/index.html`（浏览器）/ `web/desk.html`（桌面猪） |
| `/pig` 斜杠命令 | 终端里的 `pig` |

`lib/host.js` 伪造了上游 `apply(ctx)` 用到的四个接口（`on` / `inject` / `effect` / 服务注册），上游插件以为自己还在 DSH 里。

| 目录 | 内容 |
|---|---|
| `.claude-plugin/` · `hooks/` | 插件清单、marketplace、5 个 hook |
| `bin/` | `pig.js`（命令行 / 服务）、`pig-hook.js`（hook 入口）、`statusline.sh`、`pig-node.sh`（在 PATH 不含 node 的环境里找 node） |
| `lib/` | 宿主模拟、存档锁、面板服务、状态栏 |
| `web/` | 浏览器面板与桌面猪的外壳页 |
| `desktop/` | macOS 悬浮猪（SwiftPM） |
| 根目录其余文件 | 上游 dsh-piggy，未修改 |

## 存档

默认 `~/.claude/pig/state.json`，可用环境变量 `PIG_STATE` 改；面板端口默认 `41717`，可用 `PIG_PORT` 改。

每个 hook 都是独立的短进程，还可能有多个会话同时在跑，所以：

Claude Code 一小时能有几百次工具调用，远超上游数值设计时的假设，照原样会把猪喂成永远满饱食的胖子。所以**被动喂食有节流：所有会话合起来最多每 30 分钟喂一口**（`PIG_FEED_EVERY_MIN` 可调，`0` = 关闭）。这样高强度干活时饱食度掉得慢一点，但还是要你自己喂。

1. 面板服务（`pig serve` 或桌面猪）在跑时，它持有存档锁、是**唯一写者**，hook 只通知它；
2. 服务没跑时，hook 拿锁后直接读 → 喂 → **立即落盘**；
3. 1 秒内拿不到锁就丢掉这一口——少吃一口没事，卡住 Claude Code 不行。

锁是带 pid 的目录，持有者进程死了会被自动接管。

## 安全

面板服务只绑 `127.0.0.1`；校验 `Host`（防 DNS rebinding），带 `Origin` 时必须是本服务，POST 必须是 `application/json`（别的网页发不了"简单请求"来戳猪）。本机其他进程仍然可以访问它。

## 测试

```bash
node --test test/*.test.js
```

包含上游自带的测试和适配层测试（`test/cc.test.js`）。

## 已知限制

- `StopFailure` 已接线，但没有端到端验证（难以人为制造 API 错误）
- 桌面悬浮猪目前只有 macOS 版
- 过期锁接管在"两个进程同时发现过期锁"的极端情况下有很小的竞态窗口

## 许可与致谢

MIT，见 [LICENSE](LICENSE)。游戏本体、数值、美术来自 [CLICGGER-TYPES/dsh-piggy](https://github.com/CLICGGER-TYPES/dsh-piggy)；游戏数值与名称取自 QQ 宠物逆向成果，QQ 宠物是腾讯的商标，本项目为独立的非官方致敬作品。
