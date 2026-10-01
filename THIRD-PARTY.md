# Third-party notices · 第三方声明 · サードパーティ表示

**简体中文** · [English](#english) · [日本語](#日本語)

---

## 简体中文

本项目（Piggy Piggy Companion）以 MIT 发布，见 [LICENSE](LICENSE)。下面列出它的上游来源，以及它参考、依赖或提及的第三方内容。本节在上游 [dsh-piggy 的 THIRD-PARTY.md](https://github.com/CLICGGER-TYPES/dsh-piggy/blob/main/THIRD-PARTY.md) 基础上改写，并补充了本项目新增的部分。

### 上游项目（fork 来源）

| 项目 | 许可 | 本项目用到了什么 |
|---|---|---|
| [CLICGGER-TYPES/dsh-piggy](https://github.com/CLICGGER-TYPES/dsh-piggy) | MIT，© 2026 dsh-pig contributors | **游戏本体的代码**：状态机、数值表、存档、六图标面板与文案（根目录的 `core.js`、`data.js`、`store.js`、`render.js`、`index.js`、`client.js` 等）及其测试。本项目在其上做了修改，修改处标有 `[dsh-piggy-claude-code mod]`。上游的版权声明与许可文本原样保留在 [LICENSE](LICENSE)，上游原版说明保留在 [README.dsh.md](README.dsh.md) |

### 设计参考资料（沿用上游的声明）

**没有复制任何下列项目的代码、文档或游戏原版素材**——用到的数值与名称属于事实性数据。

| 项目 | 许可 | 用到了什么 |
|---|---|---|
| [xuemian168/qqpet_automation](https://github.com/xuemian168/qqpet_automation) | MIT（其原创部分） | 只参考**数值与名称**：属性阈值、三条疾病链的名称与分期、九门科目名、部分物品名。其源代码、数据文件结构与本项目不同，未复制 |
| [ice-cream-headache/ice-cream-headache.github.io](https://github.com/ice-cream-headache/ice-cream-headache.github.io) | MIT | 只参考**界面截图**（宠物在上、奶油色图标栏在下、带标签的属性条）。截图未随本项目分发 |
| [guokaigdg/animal-island-ui](https://github.com/guokaigdg/animal-island-ui) | MIT | 只参考**设计 token**：颜色、圆角、缓动曲线。按其 `docs/design-system/css-variables.md` 的取值重写为纯 CSS |

### 字体

| 内容 | 许可 | 说明 |
|---|---|---|
| Nunito / Noto Sans SC | SIL Open Font License 1.1 | 面板在浏览器里按需从 Google Fonts 加载；加载失败自动退回系统字体。**字体文件不随本项目分发** |

### 构建与分发依赖（本项目新增）

| 内容 | 许可 | 说明 |
|---|---|---|
| [Electron](https://github.com/electron/electron) | MIT | 仅用于 `app/` 独立桌宠。打包后的安装包内含 Electron 运行时，以及 Chromium、Node.js 等组件；它们的许可文本由 Electron 随包附带（`LICENSE.electron.txt`、`LICENSES.chromium.html`） |
| [electron-builder](https://github.com/electron-userland/electron-builder) | MIT | 仅在构建 `app/` 安装包时使用，不随安装包分发 |

Claude Code 插件、命令行与网页面板只依赖 Node.js 内置模块；macOS 悬浮猪（`desktop/`）只使用 Apple 系统框架。二者都没有第三方运行时依赖。

### 美术

- `assets/` 下的 SVG 形象（`stage-*`、`mood-*`、`away-*`、`react-*`、`soul`）是本项目**重新绘制的原创矢量图**，取代了上游的 `piglet.svg` / `elder.svg`。绘制时参考了一组风格示意图，但没有拷贝任何图片的像素或路径；参考图不随本项目分发。
- 界面里的其它图形一律用系统 emoji 字体渲染，不附带图形文件。

### 商标

- QQ 宠物 / QQ 是腾讯控股有限公司的商标。本项目与腾讯**无任何关联，亦未获其授权**；文档中提到该名称只为说明玩法与数值的参考来源。
- Claude、Claude Code 是 Anthropic 的商标；DeepSeek 是其各自权利人的商标。本项目是这些平台的非官方第三方扩展，与其权利人无关联。
- 若权利人认为本仓库有不妥之处，请开 issue，作者会立即调整或下架。

---

## English

This project (Piggy Piggy Companion) is released under the MIT License, see [LICENSE](LICENSE). Below are its upstream source and the third-party material it references, depends on or mentions. This section is adapted from upstream [dsh-piggy's THIRD-PARTY.md](https://github.com/CLICGGER-TYPES/dsh-piggy/blob/main/THIRD-PARTY.md), extended with what this project adds.

### Upstream project (fork source)

| Project | License | What this project uses |
|---|---|---|
| [CLICGGER-TYPES/dsh-piggy](https://github.com/CLICGGER-TYPES/dsh-piggy) | MIT, © 2026 dsh-pig contributors | **The game's code**: state machine, number tables, save handling, six-icon panel and texts (root files such as `core.js`, `data.js`, `store.js`, `render.js`, `index.js`, `client.js`) and their tests. This project modifies them; modifications are tagged `[dsh-piggy-claude-code mod]`. Upstream's copyright notice and license text are kept intact in [LICENSE](LICENSE); the original upstream README is kept as [README.dsh.md](README.dsh.md) |

### Design references (carried over from upstream)

**No code, documentation or original game assets from the projects below were copied** — the numbers and names used are factual data.

| Project | License | What was used |
|---|---|---|
| [xuemian168/qqpet_automation](https://github.com/xuemian168/qqpet_automation) | MIT (for its original parts) | **Numbers and names only**: attribute thresholds, names and stages of the three illness chains, the nine subject names, some item names. Its source code and data layout differ from this project and were not copied |
| [ice-cream-headache/ice-cream-headache.github.io](https://github.com/ice-cream-headache/ice-cream-headache.github.io) | MIT | **UI screenshots only** (pet on top, cream icon bar below, labelled stat bars). The screenshots are not distributed with this project |
| [guokaigdg/animal-island-ui](https://github.com/guokaigdg/animal-island-ui) | MIT | **Design tokens only**: colours, corner radii, easing curves, rewritten as plain CSS from the values in its `docs/design-system/css-variables.md` |

### Fonts

| Item | License | Notes |
|---|---|---|
| Nunito / Noto Sans SC | SIL Open Font License 1.1 | Loaded on demand from Google Fonts in the browser; falls back to system fonts if loading fails. **No font files are distributed with this project** |

### Build and distribution dependencies (added by this project)

| Item | License | Notes |
|---|---|---|
| [Electron](https://github.com/electron/electron) | MIT | Used only for the standalone app in `app/`. Packaged installers contain the Electron runtime together with Chromium, Node.js and other components; their license texts are shipped by Electron inside the package (`LICENSE.electron.txt`, `LICENSES.chromium.html`) |
| [electron-builder](https://github.com/electron-userland/electron-builder) | MIT | Used only to build the `app/` installers; not shipped in them |

The Claude Code plugin, CLI and web panel use only Node.js built-in modules; the macOS floating pig (`desktop/`) uses only Apple system frameworks. Neither has third-party runtime dependencies.

### Art

- The SVG sprites under `assets/` (`stage-*`, `mood-*`, `away-*`, `react-*`, `soul`) are **original vector drawings made for this project**, replacing upstream's `piglet.svg` / `elder.svg`. A set of style reference images was consulted while drawing, but no pixels or paths were copied from any image; the reference images are not distributed with this project.
- All other graphics in the UI are rendered with the system emoji font; no image files are bundled for them.

### Trademarks

- QQ Pet (QQ 宠物) and QQ are trademarks of Tencent Holdings Limited. This project is **not affiliated with or authorised by Tencent**; the name is mentioned only to describe where the gameplay and numbers were drawn from.
- Claude and Claude Code are trademarks of Anthropic; DeepSeek is a trademark of its respective owner. This project is an unofficial third-party extension and is not affiliated with these owners.
- If a rights holder considers anything in this repository inappropriate, please open an issue and it will be adjusted or taken down promptly.

---

## 日本語

本プロジェクト（Piggy Piggy Companion）は MIT ライセンスで公開しています。[LICENSE](LICENSE) を参照してください。以下に、上流の出典と、参考・依存・言及しているサードパーティのコンテンツを示します。本節は上流の [dsh-piggy の THIRD-PARTY.md](https://github.com/CLICGGER-TYPES/dsh-piggy/blob/main/THIRD-PARTY.md) をもとに書き直し、本プロジェクトで追加した部分を補足したものです。

### 上流プロジェクト（フォーク元）

| プロジェクト | ライセンス | 本プロジェクトで使っているもの |
|---|---|---|
| [CLICGGER-TYPES/dsh-piggy](https://github.com/CLICGGER-TYPES/dsh-piggy) | MIT、© 2026 dsh-pig contributors | **ゲーム本体のコード**：状態機械、数値テーブル、セーブ処理、6 アイコンのパネルと文言（ルートの `core.js`、`data.js`、`store.js`、`render.js`、`index.js`、`client.js` など）とそのテスト。本プロジェクトで改変しており、改変箇所には `[dsh-piggy-claude-code mod]` の印があります。上流の著作権表示とライセンス文は [LICENSE](LICENSE) にそのまま残し、上流のオリジナル README は [README.dsh.md](README.dsh.md) として残しています |

### デザインの参考資料（上流の表示を継承）

**以下のプロジェクトのコード、ドキュメント、ゲームのオリジナル素材は一切コピーしていません**——使用している数値と名称は事実に関するデータです。

| プロジェクト | ライセンス | 使ったもの |
|---|---|---|
| [xuemian168/qqpet_automation](https://github.com/xuemian168/qqpet_automation) | MIT（独自部分） | **数値と名称のみ**：ステータスのしきい値、3 系統の病気の名前と段階、9 科目の名前、一部のアイテム名。ソースコードやデータ構造は本プロジェクトとは異なり、コピーしていません |
| [ice-cream-headache/ice-cream-headache.github.io](https://github.com/ice-cream-headache/ice-cream-headache.github.io) | MIT | **画面のスクリーンショットのみ**（上にペット、下にクリーム色のアイコンバー、ラベル付きのステータスバー）。スクリーンショットは本プロジェクトに含めていません |
| [guokaigdg/animal-island-ui](https://github.com/guokaigdg/animal-island-ui) | MIT | **デザイントークンのみ**：色、角丸、イージングカーブ。`docs/design-system/css-variables.md` の値をもとに素の CSS として書き直しています |

### フォント

| 内容 | ライセンス | 説明 |
|---|---|---|
| Nunito / Noto Sans SC | SIL Open Font License 1.1 | パネルがブラウザ上で必要に応じて Google Fonts から読み込みます。読み込めない場合はシステムフォントにフォールバックします。**フォントファイルは本プロジェクトに含めていません** |

### ビルドと配布の依存関係（本プロジェクトで追加）

| 内容 | ライセンス | 説明 |
|---|---|---|
| [Electron](https://github.com/electron/electron) | MIT | `app/` の単体アプリでのみ使用。パッケージ化したインストーラーには Electron ランタイムと Chromium、Node.js などのコンポーネントが含まれ、それらのライセンス文は Electron がパッケージ内に同梱します（`LICENSE.electron.txt`、`LICENSES.chromium.html`） |
| [electron-builder](https://github.com/electron-userland/electron-builder) | MIT | `app/` のインストーラーをビルドするときだけ使用し、インストーラーには含まれません |

Claude Code プラグイン、CLI、Web パネルは Node.js の組み込みモジュールのみを使い、macOS のデスクトップのブタ（`desktop/`）は Apple のシステムフレームワークのみを使います。どちらにもサードパーティのランタイム依存はありません。

### アート

- `assets/` 以下の SVG（`stage-*`、`mood-*`、`away-*`、`react-*`、`soul`）は本プロジェクトのために**新たに描いたオリジナルのベクター画像**で、上流の `piglet.svg` / `elder.svg` を置き換えたものです。描く際に画風の参考画像を見ていますが、どの画像からもピクセルやパスはコピーしておらず、参考画像は本プロジェクトに含めていません。
- UI のその他の図柄はすべてシステムの絵文字フォントで描画しており、画像ファイルは同梱していません。

### 商標

- QQ ペット（QQ 宠物）/ QQ は Tencent Holdings Limited の商標です。本プロジェクトは Tencent と**一切関係がなく、その許可も受けていません**。名称は、遊び方と数値の参考元を説明するためにのみ記載しています。
- Claude、Claude Code は Anthropic の商標です。DeepSeek は各権利者の商標です。本プロジェクトはこれらのプラットフォーム向けの非公式なサードパーティ拡張であり、各権利者とは関係ありません。
- 権利者の方が本リポジトリに不適切な点があるとお考えの場合は、issue を開いてください。速やかに修正または公開停止します。
