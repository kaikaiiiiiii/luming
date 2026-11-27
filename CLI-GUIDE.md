# Luming CLI 使用指南

本项目已实现完整的 TypeScript CLI 工具，支持按 README 定义的 v0.1 语法进行解析、编译与输出。

> 本文件是 CLI 速览；**权威用法、语法与退出码约定以 `README.zh-CN.md`（§使用）为准**，
> 出口诊断明细见 `docs/parse-rule.md` §6。

---

## 快速开始

### 本地构建

```bash
npm install
npm run build
```

### 全局安装（可选）

```bash
npm link
```

安装后可全局使用 `luming` 命令。

---

## 命令行用法

### 预览模式（Preview Mode）

生成带边框、标签与层级可视化的 HTML 预览文件：

```bash
node dist/cli.js preview <input.luming> [-o output.html]

# 或安装后
luming preview examples/quickstart.luming -o preview.html
```

**默认输出：** `luming.preview.html`

### 生成模式（Generate Mode）

生成按框架组织的独立组件代码文件（每个模板一个文件）：

```bash
node dist/cli.js generate <input.luming> [-o outdir] [--framework html|vue|react]

# 示例
luming generate examples/quickstart.luming -o components --framework vue
```

**默认参数：**
- 输出目录：`generated/`
- 框架：`html`

**支持的框架：**
- `html`：基础 HTML + CSS
- `vue`：Vue 3 SFC（`.vue`）
- `react`：React TSX（`.tsx`）

**配置：** `--config path`（默认读取当前目录的 `luming.config.json`）；字段
`componentRename`（`Record<string, string>`，显式改名，优先级最高）与
`reservedPrefix`（HTML 保留标签前缀，默认 `My`）。

**诊断与退出码：** 诊断逐条打印到 stderr；仅有 warning 时退出码 `0`；出现 error 级诊断时
产物仍会写出、退出码 `1`；参数或输入文件错误退出 `1`。

---

## 已实现特性

✅ 完整表达式解析（`[] () + /` 优先级按 README 定义）  
✅ 行内样式语法（`Entity: bg #fda; 70;`）  
✅ 模板循环展开安全截断（Terminus 节点标记）  
✅ 隐式 `+` 支持（`[]` 内空格即为横向排列）  
✅ 样式缩写（`bg`、`rd`、数值宽度等）  
✅ 多行组合式定义  
✅ 预览模式带视觉层级与诊断信息  
✅ 生成模式输出 Vue/React/HTML 独立组件

---

## 已验证用例

```bash
# QuickStart 示例（来自 README）
luming preview examples/quickstart.luming

# 循环引用截断测试
luming preview examples/circular.luming

# 多框架生成
luming generate examples/quickstart.luming -o vue-out --framework vue
luming generate examples/quickstart.luming -o react-out --framework react
```

查看 `examples/` 目录下的 `.luming` 源码与生成结果。

---

## 项目结构

```
luming/
├── cli.ts                    # CLI 入口
├── index.ts                  # 包导出入口
├── src/
│   ├── types.ts              # 核心类型定义
│   ├── parser.ts             # 表达式解析器
│   ├── compile.ts            # 编译管线
│   ├── style.ts              # 样式 token 解析
│   ├── renderer.ts           # HTML 预览渲染
│   ├── generator.ts          # 多框架组件生成器
│   └── index.ts              # 模块导出
├── examples/                 # 测试用例与输出样例
├── dist/                     # 编译后产物
└── package.json
```

---

## 附：已支持的 v0.1 语法

| 语法项           | 示例                   | 说明                        |
| ---------------- | ---------------------- | --------------------------- |
| 实体声明         | `Header`               | 定义组件/模板               |
| 垂直排列         | `A / B`                | 上下布局                    |
| 水平排列         | `A + B`                | 左右布局                    |
| 容器包含         | `A[B C]`               | A 包含 B、C                 |
| 优先级分组       | `(A / B)`              | 强制优先级                  |
| 行内样式         | `Main: bg #fda; 70;`   | 背景色 + 宽度               |
| 隐式水平排列     | `List[Item Item Item]` | 空格即为 `+`（仅 `[]` 内）  |
| 模板后续覆盖     | 多行同名实体定义       | 后定义属性覆盖前定义        |
| 循环引用安全截断 | `A[B]` + `B[A]`        | 自动停止递归并标记 Terminus |

---

交付完成，请您验收！🎉
