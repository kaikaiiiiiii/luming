# AGENTS.md

面向在本仓库中工作的 AI 编码代理的指引。

## 核心准则

**`README.zh-CN.md` 是本项目的规范源（canonical specification）。**

- `README.zh-CN.md` 是唯一事实来源。`README.md`（英文版）是它的翻译；代码、`docs/`、`examples/` 以及其他所有内容都是 `README.zh-CN.md` 的**实现**。
- 其他任何内容与 `README.zh-CN.md` 不一致时，一律以 `README.zh-CN.md` 为准：修改其他内容去符合规范，绝不为迁就实现而改写规范。
- 只有 `README.zh-CN.md` **自身内部的冲突**（其不同章节之间相互矛盾的表述）才需要由用户仲裁；不要擅自做主。对这类冲突有疑问时，请询问用户。
- 修改行为时，先同步 `README.zh-CN.md`，再更新 `README.md`（翻译版）和实现，使其保持一致。

## 项目概述

**路明（Luming）** 是一种用于描述静态页面结构的文本 DSL 和配套 CLI 工具。它将 `.luming` 文本文件解析为结构模型，然后编译为单文件 HTML 预览，或一组组件文件（HTML、Vue 或 React）。

**重要提示**：本工具由 AI 生成且未经测试。不要在已有项目中使用它；只在新项目或实验性项目中试用。

## 常用命令

```bash
npm run build       # 将 TypeScript 编译到 dist/（tsc -p tsconfig.json）
npm run typecheck   # 仅类型检查，不产出文件（tsc --noEmit）
npm run clean       # 删除 dist/
npm run preview     # node dist/cli.js preview
npm run generate    # node dist/cli.js generate
npm run playground  # 由模板 + dist 模块重新生成单文件 playground.html
npm run deploy      # 校验工作区干净 -> 重建 -> 将 playground.html 同步为 gh-pages 的 index.html 并推送
npm test            # 自动先构建，然后运行 tests/*.test.js 全部测试与 tests/semantics-matrix.js（16 项语义验收矩阵）
```

CLI 用法（构建后）：

```bash
node dist/cli.js preview <input.luming> [-o output.html]
node dist/cli.js generate <input.luming> [-o outdir] [--framework html|vue|react] [--config path]
node dist/cli.js skill add [--tool dsh|claude|opencode|agents] [--scope project|user] [--dir <skills-root>] [--force]
```

npm 包名为 `luming-say`，安装后命令名为 `lum`（`npx luming-say <cmd>` 等价）。

用 `npm run typecheck` 验证改动；若行为发生变化，还需运行 `npm run build`。

## 仓库结构

```
index.ts            # 顶层入口，re-export src/* 的内容
cli.ts              # CLI 参数解析及 preview/generate/skill 子命令
index.d.ts          # 类型声明
src/
  types.ts          # 核心类型定义（AST、运行时、compile/generate 选项）
  style.ts          # 样式 token 解析（bg、rd、预设类、css 类、宽度）
  parser.ts         # 文本 -> ParsedDocument（AST）
  compile.ts        # AST -> RuntimeNode/RuntimeLayoutNode 根节点与场景
  renderer.ts       # 编译结果 -> 预览 HTML
  generator.ts      # 编译结果 -> 组件文件（html/vue/react）
  skill.ts          # skill 安装（工具目录 registry/探测、SKILL.md 读写）
  index.ts          # re-export src 各模块
docs/               # 文档：parse-rule.md（解析/合并/展开语义，定稿）、design-notes.md（裁决轨迹）、style.md
examples/           # .luming 输入及各框架的生成产物
skill/              # luming skill 权威副本（skill/SKILL.md），由 lum skill add 安装到工程/用户目录
changes.log         # 变动记录（[语法] / [工具] 两类，最新在上）
scripts/            # playground 构建脚本与模板（生成单文件 playground.html）
playground.html     # 单文件可交互预览页（浏览器直接打开；npm run playground 重新生成）
ChagGPT-Luming_Lang_Design_Discuss.md # 本项目最初的需求、创意与头脑风暴讨论文档
```

处理流水线：`parse` -> `compile` -> `renderPreviewHtml` 或 `generateFiles`。
每个阶段都是基于 `src/types.ts` 中类型的纯函数。

## 变动记录（changes.log）

- 仓库根目录的 `changes.log` 记录每一项变动，分两类标记：
  - `[语法]` — 语言/语法本身的变动或增删（影响 `.luming` 的合法写法与语义）；
  - `[工具]` — 工具链功能变动（编译器、CLI、playground、文档、部署等）。
- 每次提交涉及语法或功能变动时，在 `changes.log` **顶部**追加一条（最新在上，
  注明日期），两类可以同条混合时分开写清楚。
- `[语法]` 变动必须先同步 `README.zh-CN.md` 与 `docs/parse-rule.md`（规范源），
  再同步 `README.md`、`skill/SKILL.md` 与实现，并运行 `npm test` 维护验收矩阵。

## gh-pages 在线预览（部署约定）

- `gh-pages` 分支 = GitHub Pages 站点，根目录仅一个 `index.html`（由 `playground.html`
  复制而来）。访问地址：`https://kaikaiiiiiii.github.io/luming/`（Pages 源 = gh-pages
  分支 / 根目录，需在仓库 Settings → Pages 中开启一次）。
- **每次语法更新或实质性改进后必须同步部署**，流程：
  1. `npm run build && npm test && npm run playground`；
  2. 在 `changes.log` 顶部追加本次变动记录（见「变动记录」节），提交 master
     （确保重建后的 `playground.html` 已入库）；
  3. `npm run deploy` —— 脚本会校验工作区干净、重建 playground，并用 `git worktree`
     在临时目录 `.gh-pages-tmp` 中把 `index.html` 提交到 gh-pages 分支后推送。
- 部署脚本要求 master 工作区干净且重建无差异（保证线上与仓库严格一致）；
  若脚本报"rebuild changed files that are not committed"，先提交重建产物再部署。

## 代码约定

- TypeScript，strict 模式，target ES2020，CommonJS 模块。
- 缩进：4 个空格。双引号。分号。
- 函数使用显式返回类型注解。
- 导出的 API 统一通过 `src/index.ts` / `index.ts` 聚合。
- 遵循现有 parser/compiler 的风格：单一职责的小工具函数，基于 `src/types.ts` 中的类型进行操作。
- 诊断信息以 `Diagnostic[]` 形式收集在 `ParsedDocument` / `CompileResult` 上；编译器本体对可恢复的用户输入问题不要抛异常（CLI 会捕获抛出的错误并打印）。

## 开发与测试

- **改动代码后必须运行 `npm test`**（自动先 `npm run build`，再执行 `tests/*.test.js`
  全部测试与 `tests/semantics-matrix.js` 语义验收矩阵；类型错误或任何用例失败都会
  以非零码退出）。
- 测试布局：`tests/parser.test.js`（词法/文法/声明记录/诊断）、`tests/style.test.js`
  （样式 token）、`tests/compile.test.js`（语义与场景规则）、`tests/render.test.js`
  （预览 HTML 与默认样式）、`tests/generator.test.js`（组件生成与名称转换）、
  `tests/cli.test.js`（CLI 端到端）、`tests/skill.test.js`（skill 工具目录探测与安装）；
  `tests/semantics-matrix.js` 是可独立运行的 16 项语义验收矩阵。测试运行在 `dist/`
  编译产物上（pretest 自动构建）。
- **新语法、新行为、修 bug 必须同步补用例**：语义类进 `semantics-matrix.js`，
  单元/集成类进对应的 `*.test.js`；修 bug 时先写复现用例再修。

## Luming DSL 速查表

- `/` — 垂直堆叠（A 在 B 上方）。
- `+` — 水平排列（A 在 B 左侧）。
- `[]` — 包含（B 包含 A 和 C：`B [ A / C ]`）。
- `()` — 分组 / 运算符优先级（如 `A + (B / C)`）。
- 优先级：`[]` > `()` > `+` > `/`。
- 样式：`Entity: bg #fda; 70;` — `:` 与 `;` 之间为样式内容，各属性用 `;` 分隔。行尾的 `;` 可省略。
- 样式 token：`bg <color>`（背景色）、`rd <n>`（圆角，自动补 px 后缀）、`tab`/`card`/`label`（预设类）、裸数字或百分比（宽度 %）、或 `css属性 值`（如 `border 1px solid red`）。
- 多行声明：同一主体可跨多行定义。**同行并行**（同行内的多次声明互不覆盖、按书写位置呈现）、**跨行覆盖**（后行声明覆盖前行，含行内书面结构；样式按属性合并）。
- 同一行中的同名实体是各自独立的副本（如 `List [Item Item Item]`）。
- 允许循环包含：裸引用取定义展开前检查祖先链，命中即成为"终止节点"（正常渲染、不再展开）。
- `[]` 内在无歧义时可省略 `+`：`A[B C]` 等价于 `A [ B + C ]`。

完整语法参考：`README.zh-CN.md`（§ 语法 v0.1、Styles、Advanced Usage）。
解析/合并/展开语义（实现级，v0.1 定稿）：`docs/parse-rule.md`。
样式预设：`docs/style.md`。

## 示例

`examples/quickstart.luming` 是权威的最小示例：

```
Header / Sidebar + Main [ Tabs / Content ] / Footer
Content [Form / Preview]

Main: bg #fda; 70;
Tabs: label;
Form: rd 4;
```

运行 `node dist/cli.js preview examples/quickstart.luming -o examples/quickstart.preview.html`
可重新生成预览。
