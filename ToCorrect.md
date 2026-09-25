# Luming 文档勘误与订正清单

> 本文件汇总 README.zh-CN.md / README.md / docs/parser.md / docs/style.md / docs/compiler.md 中**规范层面**的缺口与不一致。
> 不包含翻译、标点等细节问题。

> **2026-09 v0.1 定稿后状态**：第 2、3 项（Slot 合并语义、术语不一致）已由
> 「同行并行 + 行间覆盖」模型彻底解决，正式语义见 `docs/parse-rule.md`（v0.1 定稿，
> 旧 `docs/parser.md` 已由其取代）。第 1、4、5、6、7、10 项仍待后续版本处理；
> 第 8、9 项维持原判断。新发现的两个已知边缘记录在 parse-rule.md §8。

## 优先级图例

- **P0**：规范核心缺失或自相矛盾，不补无法稳定实现
- **P1**：文档补全类，缺失会让落地方完全靠猜
- **P2**：规范补丁类，建议下一版同步
- **P3**：范围澄清，远期

---

## 1. `docs/compiler.md` 是空壳（影响全部生成阶段规范）

**现状**：`docs/compiler.md` 仅 1 行标题。

**P0**：把以下内容补完：

- 保留 HTML 标签清单：哪些名字会被加 `My` 前缀？目前只有 `Header → MyHeader` 一个示例，规范没有给清单。
- 匿名 `()` 在生成阶段的实体化规则：`Page [A + (B / C)]` 中的 `A+(B/C)` 中间产物在生成 Vue/React/HTML 时如何命名？是否单独成文件？是否参与样式继承？
- 循环展开最大深度上限：`A→B→A` 与 100 步循环必须设硬上限，否则实现可能死循环或内存溢出。
- 根实体与"无父主体"在生成模式下的区别：是否输出入口文件？入口文件命名？
- 输出目录结构规则：嵌套层级如何映射到子目录？默认扁平还是按结构树？
- 父组件引用子组件的相对路径规则。

---

## 2. Slot 合并语义——规范最关键的缺口

**现状**：同一实体跨多行定义时，`src/compile.ts` 注释里提到「Slot model (README「语法 v0.1 - 高阶用法」)」，但 README 和 docs 都没有定义 Slot 是什么。

**P0**：明确以下规则：

- 同一实体的结构行合并时，**取最后一条以该实体起头的结构行作为整行层级关系**，还是**逐段合并**？两种解读产生不同结果。
- 行内副本样式（如 `List [Item: bg #99f; Item Item]` 中的第一个 Item 的 `#99f`）与**主体级样式**（`Item: bg #f99;`）的合并优先级：哪个覆盖哪个？
- 「行级覆盖」与「位置级复用」如何不冲突：
  - `Page [ Content ]` + `Main [ Content ]`（README 说共享 Content，生成两份副本）
  - `A / B` + `A + C`（README 说 A+B → A+C 的横向关系覆盖）
  - 这两种「同名实体出现两次」语义截然不同，规范必须给出可判定规则。

---

## 3. README 与 `docs/parser.md` 使用了不一致的抽象词汇

**现状**：
- `docs/parser.md` 使用「显式子节点（Explicit Child）」+「主体子节点（Template Child）」描述展开与循环检测。
- README §「高阶用法 - 有限展开」使用「以该主体为起点的结构行中最后一条」描述覆盖规则。

**P0**：在 README 中显式声明**两套描述指向同一套机制**，并把 `docs/parser.md` 的术语表同步到 README；或反过来把 README 的覆盖规则翻译为 slot 模型。

---

## 4. `docs/style.md` 与 README 的样式 token 列表不一致

**现状**：
- README §「样式」声明的 token：`bg <color>` / `rd <n>` / `tab` / `card` / `label` / **裸数字或百分比（width %）** / `css-prop value`。
- `docs/style.md` 表格**只列出 `bg` 和 `rd`**，缺失：
  - 裸数字 / 百分号 → width %
  - `tab` / `card` / `label` 三个预设类（虽然在文中下半部分展开了，但未列入 token 清单表）

**P1**：把 token 完整列表同步到 `docs/style.md` 顶部表格，并补充：
- token 内含 `(` / `)` / `,` / `:` / `;` 的转义规则（如 `cubic-bezier(0.4, 0, 0.2, 1)`、伪类 `::before`）。
- 简写与原生命名冲突时的处理（如 `bg` 作为实体名是否合法）。
- 数字单位规则（`rd 4` vs `rd 4px` vs `rd 4em`）。

---

## 5. 配置文件 `luming.config.json` 的 schema 完全缺失

**现状**：CLI Guide / `AGENTS.md` / `src/types.ts` 提到 `GeneratorConfig`，字段有 `reservedPrefix` 和 `componentRename`。但：
- 字段含义、默认值、类型未公开。
- `AGENTS.md` 提到 `--config path` 但没说明文件格式。
- 没有字段验证规则、没有版本号、没有继承/合并机制。

**P1**：在 `docs/compiler.md`（或新建 `docs/config.md`）中给出：
- 完整字段清单（含未来扩展占位）。
- 默认值。
- 字段缺失或非法时的行为。
- 是否支持多配置文件、环境变量、命令行覆盖的优先级。

---

## 6. Diagnostics 错误码体系与退出码

**现状**：`AGENTS.md` 与 `src/types.ts` 提到 `Diagnostic[]` 与 `level: "warning" | "error"`，但：
- 哪些条件触发 warning，哪些是 error，没有清单。
- 没有错误码（code）字段，无法让工具用户自动化处理。
- 退出码语义（CLI 收到 error 时是 exit 0 还是 1）未定义。

**P1**：在 `docs/parser.md` 或新建 `docs/diagnostics.md` 中给出：
- 错误码清单。
- 严重级别判定规则。
- CLI 退出码约定。

---

## 7. 框架特异风格未规范（Vue / React / HTML）

**现状**：README 仅说「可以通过参数控制生成 Vue、React 或其他框架的组件代码」，未规定：
- Vue：SFC `<script setup>` 还是 Options API？模板根节点限制？是否生成 `<style scoped>`？
- React：函数组件还是 class 组件？是否生成 TypeScript 接口？Props 命名规范？
- HTML：CSS 是内联 `<style>` 还是每个组件一个 `.css` 文件？class 命名如何避免冲突？

**P1**：为每个目标框架写明默认风格与可配置项，避免不同实现产生不同结果。

---

## 8. v0.2 / v0.3 与「vibe coding skill 生成」的范围澄清

**现状**：
- README §「语法 v0.2」和「语法 v0.3」只有 TODO 占位，没有 RFC 草案。
- README §「快速开始」展示了一段「可以直接在项目目录下生成 skill 文件用于 vibe coding」的 YAML，但 CLI 中**没有 `skill` 子命令**。

**P3**：
- 明确 v0.2（图片与主体内文本）、v0.3（条件显示）是 v0.1 后续还是平行提案。
- 决定「vibe coding skill 生成」是 v0.1 的可执行承诺，还是描述性散文。若是承诺，CLI 需要新增子命令；若是散文，从 README 中移除或加注「示例」标识。

---

## 9. Markdown 集成（` ```luming ` 围栏）

**现状**：README §「Markdown 集成」承诺支持 `` ```luming `` 围栏的转译，但：
- 谁来转译（CLI 子命令？独立工具？IDE 插件？）
- 是否支持非围栏的内联（`` `A[B C]` ``）
- 围栏内是否允许完整的 v0.1 语法

**P2**：补完 Markdown 集成的功能边界，或明确为「v0.x 后续支持」并降级描述。

---

## 10. 「无父主体」的判定与入口文件

**现状**：README §「副本生成」：
> 如果一个主体没有被其它主体包含，那么它就会按文档中最初出现的顺序生成独立副本……

未说明：
- 多个「无父主体」时如何排序（首次出现顺序的精确定义——结构行还是样式行？）。
- 生成模式是否需要为「根」实体生成入口文件（如 `App.vue` / `index.html`）？入口文件如何选取（第一个无父主体？特定名字？）。
- 「无父」与「被无父包含」的区别在生成时如何处理（如 `Page [Content]` 与独立 `Content`）。

**P1**：在 `docs/compiler.md` 中给出根选取规则与入口文件策略。

---

## 附：本清单未涵盖的问题

以下**不在本清单**内，列为参考但不订正：
- 翻译层面笔误（英文 README 中的全角句号）。
- README.md §「进一步了解」中「行起头」的语义漂移。
- 命名大小写规则、关键字（保留字）规则。
- README 的内联 `<style>` 布局图在纯文本查看器下的体验问题。
- `CLI-GUIDE.md` 是否并入 README 的文档组织问题。
