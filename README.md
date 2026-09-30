# dsh-piggy for Claude Code 🐖

把 [dsh-piggy](https://github.com/CLICGGER-TYPES/dsh-piggy)——那只住在 DeepSeek Harness 里、照 QQ 宠物（怀旧服 v1.2.4）复刻的猪——搬进 **Claude Code**。

它吃你在 Claude Code 里的**真实工作**长大：你提的每个问题、每一轮回复、每一次工具调用都是它的口粮。会上课、打工、旅行、生病，玩法和数值见上游的 [原版说明](README.dsh.md)。

- **零 token**：只用 hooks 和 statusLine，hook 永不输出，模型不知道猪存在（`claude plugin details` 显示常驻开销 ~0）
- **不拖慢工作**：所有 hook 都是 `async`，出了任何问题也永远 `exit 0`
- **上游代码零修改**：本仓库是上游的 fork，根目录的 `index.js` / `core.js` / `client.js` 等保持原样，适配层全部在新增目录里，可以直接 merge 上游更新

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
pig serve                            面板服务
pig status-line                      一行状态
```

（`pig` = `node ~/dsh-piggy-claude-code/bin/pig.js`，可以自己 alias。）刻意不做成 Claude Code 斜杠命令——那样每次都要经过模型、花 token。

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
