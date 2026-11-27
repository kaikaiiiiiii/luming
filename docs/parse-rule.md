# Luming 解析器实现文档（v0.1 定稿）

> 本文按**当前 TypeScript 实现**描述 路明 的解析与编译全过程，对应
> `src/parser.ts`、`src/compile.ts`、`src/style.ts`、`src/renderer.ts`、`src/generator.ts`。
> 语法的规范表述见 `README.zh-CN.md`；语义裁决的推导轨迹见 `docs/design-notes.md`。
> 改动实现时先同步本文与 README，再改代码。

## 1. 管线与数据结构

```
.luming 源码
  │ parse()                              src/parser.ts
  ▼
ParsedDocument { statements, templates, templateOrder, diagnostics }
  │ compile()                            src/compile.ts
  ▼
CompileResult { scenes, roots, sceneLineNumbers, diagnostics }
  │ renderPreviewHtml() / generateFiles()
  ▼
预览 HTML（单文件）/ 组件文件（html、vue、react）
```

核心类型（`src/types.ts`）：

```ts
interface EntityExpr     { kind: "entity"; name: string; inlineStyles?: StylePair[] }
interface GroupExpr      { kind: "group"; direction: "row" | "column"; children: ExpressionNode[] }
interface ContainerExpr  { kind: "container"; name: string; content: ExpressionNode;
                           inlineStyles?: StylePair[] }

interface InteriorDeclaration { line: number; order: number; content: ExpressionNode }
interface TemplateDefinition {
    name: string;
    firstDefinedLine: number;
    interiorDeclarations: InteriorDeclaration[];  // 该主体的全部内部构造声明
    styles: Record<string, string>;               // 主体级样式（按属性合并后）
}
interface StructureStatement { kind: "structure"; line: number; raw: string;
                               topLevelEntities: string[]; expression: ExpressionNode }
interface StyleStatement    { kind: "style"; line: number; raw: string;
                              entity: string; tokens: string[] }
```

两阶段模型：`parse` 产出**声明与合并后的模板表**；`compile` 选取**顶层单元**并把声明
**展开**为实例树，合成**唯一的页面根**。渲染阶段（预览或代码生成）只消费实例树，
不再回头改声明。

两条语义主规则（裁决记录见 design-notes）：

1. **同行并行**：同一行内的多次内部声明互不覆盖，各绑定其书写位置。
2. **跨行覆盖**：不同行对同一主体的声明按行序后者胜，可越过早先行内的书面结构。

## 2. parse：逐行解析（src/parser.ts）

按 `/\r?\n/` 切行、trim，空行跳过。每行的处理：

### 2.1 前导样式锚点

正则 `^([A-Za-z][A-Za-z0-9_]*)\s*:\s*` 命中 → 冒号后进入样式区扫描 `scanStyleChunk`：

* 扫描到**结构字符**（`+ / [ ]`）或行尾 → 样式区结束；**未配对的 `)`** 同样结束样式区
  （用于关闭外层 `()` 分组，如 `(A: bg #fda; / B) + C`）；
* **成对圆括号**属于样式值：遇到 `(` 进入括号深度，括号内的 `+ / [ ] : ;` 等字符均按
  值字符处理（`bg rgba(0, 0, 0, 0.5)`、`width calc(100% - 20px)`、`url(https://…)`），
  配对的 `)` 使深度回到 0；
* 扫描到 `;` 时向前看：若 `;` 之后到下一个结构符 / `;` / 行尾之间**全部是空格分隔的
  裸名称** → 该 `;` 是样式区与后续兄弟主体的分界
  （`List [Item: bg #99f; Item Item]` 依赖此规则）；
* 样式区按 `;` 切分 token（同样按括号深度，括号内的 `;` 不切分），每个 token 经
  `resolveStyleToken`（§5）解析为 CSS 属性对，**按属性合并**写入 `template.styles`
  （后行覆盖同名属性）；解析失败 → warning「Unsupported style token」；
* 样式区之后若还有内容 → 把锚点主体名**拼回**结构表达式
  （`A: bg #fda/Footer` ≡ 主体级样式声明 + 结构 `A / Footer`）；
  否则本行是纯样式行。

### 2.2 结构表达式

`tokenizeStructure`：跳过空白；`+ / [ ] ( )` 直接成 token；字母开头的连续序列是名称；
名称后（允许空格）紧跟 `:` → **行内样式锚点**，同样调用 `scanStyleChunk`，解析出的
属性对挂在名称 token 上（实例级样式，见 §5 的作用域规则）。其它字符 → error 诊断，
放弃该行。

`ExpressionParser`（递归下降）：

```
parseRoot(allowImplicitPlus = false) → parseSlash
parseSlash  → parsePlus 组的 "/" 序列，collapse 为 column 组
parsePlus   → parsePostfix 组的 "+" 序列；allowImplicitPlus 时名称直接相邻视为 "+"，
              collapse 为 row 组
parsePostfix → parsePrimary 后跟 "[...]" → ContainerExpr（仅主体名可作容器目标）
parsePrimary → 名称 | "(" parseSlash ")"
```

* 隐式 `+` 只在 `[]` 内部开启（顶层 parseRoot 传 false）：`A [B C]` ≡ `A [B + C]`。
* `()` 只是分组：parsePrimary 返回内部表达式本身，不产生节点、不可被样式修饰。
* collapse 时同向相邻组合并。

解析成功后：

1. `recordDeclarations`：**前序遍历**表达式树（容器先于其内容，即阅读顺序），每个
   `ContainerExpr` 记录一条 `InteriorDeclaration { line, order, content }`（order 为
   行内递增序号）；`entity` 只 ensureTemplate；
2. 树中全部名称 ensureTemplate，按首次出现顺序进入 `templateOrder`；
3. 产出 `StructureStatement`。

### 2.3 收尾诊断

全部行处理完后，凡 `interiorDeclarations.length ≥ 2` 的主体输出一条 warning：
「X 的内部结构被声明 N 次（第 a、b 行），按行序后者生效；同行内的声明按书写位置各自呈现」。

## 3. compile：顶层单元选取（selectScenes）

structure 语句按文档序处理：

```
placed = ∅            # 出现在任何已处理行表达式树中的主体名
units = []
for stmt in structureStatements:
    tops = topLevelEntities(stmt.expression)     # 顶层主体（容器计其名）
    if tops 中存在未放置者:
        units.push(stmt)                         # 新顶层单元
    else if tops.length ≥ 2:
        从最近单元向回找第一个与 tops 有交集的单元，整行替换
        （无交集则追加为新单元）
    else:                                        # 单主体且已放置
        跳过（仅作为声明记录）
    placed ∪= stmt 树中的全部名称
```

* `sceneLineNumbers` = 存活顶层单元的行号列表（供工具链做覆盖可视化，如 playground
  的置灰）。
* 整行替换不是差集合并：被替换行中多出的主体随之消失。
* 纯样式文档（无结构行）：`templateOrder` 中每个主体作为根展开。

### 3.1 页面合成（唯一页面根）

**一份 `.luming` 文档就是一个页面**：编译输出恰好一个页面根。语言没有"场景切换 /
结束"语法，输出层也不得出现场景划分。存活顶层单元合成页面根的规则：

1. 只有一个单元 → 该单元的表达式树直接作为页面根；
2. 多个互不相交的单元 → 按文档序**纵向排列**为一个 column 组作为页面根
   （与 HTML 文档的自然自上而下流一致）。

例：`header / main [up + down] / footer`、`main[good bad]`、
`header / main [left + right] / footer` 三行 → 页面根是最后一个布局行
（替换第一行），main 内部取最后声明 `left + right`，中间行整体失效。

例：`Page [ Content ]` + `Main [ Content ]` + `Content [ Icon ]` → 页面根纵向
排列 Page 与 Main 两个单元，各自展开出一份完整副本（同页先后呈现）。

例：`Row [ Col[Titles] + Col[Body] ]` 与 `List [Item Item Item]` 两行 → 同一页面上
先 Row 后 List 纵向排列，不拆分为多个输出。

## 4. compile：展开与递归截断（expandExpr）

对每个顶层单元，从其 `expression` 自顶向下 `expandExpr(expression, unitLine, path, seq)`，
`path` 是祖先链（模板名栈）：

* **group** → `RuntimeLayoutGroup`，children 递归。
* **container X**（该位置有书面内部 C）：
  1. `makeNode`：实例样式 = 主体级样式（合并后）+ 该位置 inlineStyles（实例级覆盖）；
  2. 内容解析：`X` 存在行号 **> unitLine** 的声明 → 取其中**最后一条**的 content
     （跨行覆盖侵入行内）；否则用书面 C（同行并行、原样呈现）；
  3. `path.push(X)` → 递归展开内容 → `path.pop()`。
* **裸引用 X**（该位置无书面内部）：
  1. **路径检查**：`path` 中已有 X → 返回**终止节点**（Terminus：正常渲染、主体级样式
     生效、不再展开，`terminated: true`）；
  2. 取内容：行号 > unitLine 的最后声明 → 否则行号 **< unitLine** 的最后声明
     （**同行声明不入池**，如 `List [Item[Icon] Item Item]` 的后两个裸 Item 为空）→
     否则空；
  3. `path.push(X)` → 递归 → `path.pop()`。

**终止性**：取定义展开只发生在"裸引用且 X 不在 path"时，每次取定义使该分支的 path
严格变长；书面嵌套是有限文本。因此展开必然终止。

## 5. 样式（src/style.ts）

| token | 解析结果 |
| --- | --- |
| `bg <color>` | `background-color: <color>` |
| `rd <n>` | `border-radius: <n>`（纯数字自动补 px） |
| `tab` / `card` / `label` | 预置样式类，展开为具体 CSS 属性组（见 docs/style.md） |
| 裸数字 `70` | `width: 70%` |
| 裸百分比 `70%` | `width: 70%` |
| `css属性 值` | 原样输出该属性对（如 `border 1px solid red`） |

无法解析的 token → warning 并丢弃。

样式值中的**成对圆括号**整体属于值（括号内不按结构符切分），因此 `bg rgba(0, 0, 0, 0.5)`、
`width calc(100% - 20px)`、`background url(https://…)` 均可直接书写；括号外的 `/` 等仍是
结构符（`font 12px/1.5` 这类值暂不可写，见 §8）。

作用域与优先级：

1. **主体级**：前导锚点/纯样式行。按属性合并，行序后者覆盖前者。作用于全部实例。
2. **实例级**：结构表达式内的 `名称:` 锚点。只作用于锚定位置的那一个实例，
   **覆盖主体级**。实例级样式永不互相覆盖，也永不被后行覆盖。
3. 终止节点只带主体级样式。

## 6. 输出层

* **renderer.ts（预览模式）**：页面根渲染为一段嵌套 flex 树；默认视觉采用
  **Microsoft Fluent 2** 设计语言——主体带层级配色边框（Fluent 2 共享调色板：
  品牌蓝 `#0F6CBD`、紫、绿、橙、红、青，逐层轮换）、8px 中号圆角、分层阴影
  （elevation 4）、Segoe UI 字体与次级文字色标签（`Terminus` 追加标记）；
  `+` 水平组的子项默认 `flex: 1 1 0` **横向等分**（显式设置过 `width` / `flex`
  的子项保留自己的设定）；显式样式覆盖全部默认值；诊断显示在页首。
* **generator.ts（生成模式）**：凡出现在页面根中的主体各生成一个组件文件
  （html / vue / react），组件内容 = 该主体**最后一条声明**的内部结构 + 合并样式；
  与 HTML 保留标签同名的主体加 `My` 前缀（`GeneratorConfig.componentRename` 可显式
  改名，优先级最高），文件名为 PascalCase。
* **CLI（cli.ts）**：预览/生成把诊断逐条打印到 **stderr**（预览 HTML 内仍附诊断列表）；
  仅 warning → 退出码 `0`；存在 error → 产物仍写出但退出码 `1`；参数/IO 错误 → `1`。

## 7. 验证用例矩阵

以下用例由 `tests/semantics-matrix.js` 自动化验证（`npm test` 的一部分，16 项全部通过）：

| 用例 | 结果 |
| --- | --- |
| `A[A]` | `A └ A(终点)` 两层 |
| `A[A[A]]` | `A └ A └ A(终点)` 三层（同行并行） |
| `A[B]` + `B[A]` | `A └ B └ A(终点)` |
| `B[C]` + `C[B]` | `B └ C └ B(终点)` |
| `list[item item item]` + `item[list]` | `list[item[list(终点)]×3]` |
| `Page[Content]` + `Main[Content]` + `Content[Icon]` | 两个完整副本 |
| `A / B` + `A + B` | 页面根为 `A + B`（整行替换） |
| `A[B]` 行 + `A[C]` 行 | `A[C]`（跨行覆盖） |
| `Row [Col[Titles] + Col[Body]]` | 两栏各异（同行并行） |
| quickstart + `Main [Good Bad]` | Good Bad 胜（跨行覆盖侵入行内） |
| `List [Item[Icon] Item Item]` | 仅第一项含 Icon（同行声明不入池） |
| `List [Item: bg #99f; Item Item]` + `Item: bg #f99;` | 首项 #99f，其余 #f99 |
| `A: bg #fda/Footer` | 主体级样式 + 结构 `A / Footer` |
| quickstart 单行 ≡ 三行 | 等效（该文档无同主体多次声明） |

## 8. 已知边缘

* **部分重叠的关系行**：`A / B` 后跟 `C / A`（主体集相交但不相同）——当前按新顶层单元
  处理（C/A 成为新单元追加），A 会被渲染两次。待后续版本裁决（整行替换 or 共存）。
* **括号外的 `/` 仍是结构符**：`font 12px/1.5 Arial` 这类 CSS 简写暂无法直接书写
  （括号内的 `/` 不受影响）；样式值含未配对括号时无法推断边界，会按无意义 token
  报 warning（或引发结构行 error）。
* **行内样式与兄弟主体的分界**依赖 §2.1 的裸名称启发式；样式值本身是裸名称序列时
  （罕见）应改写到独立样式行。
