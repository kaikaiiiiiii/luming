---
name: luming
description: Write, edit, and debug .luming DSL files, or explain the Luming page-structure language. Use when the user asks about luming syntax, wants to author or modify a .luming file, or needs to parse/compile/preview/generate from one.
---

# Luming DSL Authoring Guide

**Luming** (路明) is a textual DSL for describing static page structures. A
`.luming` file mixes structure expressions and style statements. The parser
(`src/parser.ts`) converts it to an AST; the compiler (`src/compile.ts`) then
produces layout nodes for preview or component generation.

## Structure Expressions

Operators, in one line of text:

| Operator | Meaning | Example |
| --- | --- | --- |
| `/` | Vertical: A above B | `A / B` |
| `+` | Horizontal: A left of B | `A + B` |
| `[]` | Containment: B contains A and C | `B [ A / C ]` |
| `()` | Grouping / precedence | `A + (B / C)` |

- Precedence: `[]` > `()` > `+` > `/`.
- `()` semantically means "layout operation priority", not an anonymous
  container. Prefer explicit `[]` for real component hierarchies.
- Inside `[]`, `+` may be omitted when unambiguous: `A[B C]` == `A [ B + C ]`.
- Any number of spaces/tabs collapse to a single space; spaces around
  operators are optional.

## Compositional Definitions

The same entity may be defined across multiple lines; definitions merge.

- Later structure lines override earlier ones.
- Later style lines override earlier per-property.
- Multiple same-name entities on one line are **separate copies**:
  `List [Item Item Item]` makes three Items inside List.
- An entity referenced from several containers gets one copy per container.
- Circular inclusion is allowed but expands finitely, stopping at a "terminus".

## Styles

Syntax: `Entity: <token>; <token>; ...` — content between `:` and `;`.
The trailing `;` may be omitted at end of line or before an operator.

Style tokens (resolved in `src/style.ts`):

| Token | CSS output |
| --- | --- |
| `bg <color>` | `background-color: <color>` |
| `rd <n>` | `border-radius: <n>px` (px added automatically) |
| `tab` / `card` / `label` | preset class |
| `<number>` or `<number>%` | `width: <n>%` |
| `<css-prop> <value>` | raw CSS, e.g. `border 1px solid red` |

## Common Pitfalls

- Do not rely on line order for layout — always use explicit operators.
- Entity names start with a letter; may contain letters, digits, underscores.
- Avoid overusing CSS; prefer preset classes/abbreviations.
- `()` requires an extra wrapper container in flexbox layouts; use `[]`
  instead when the hierarchy matters.

## Verification

After writing a `.luming` file, verify with:

```bash
npm run typecheck
npm run build
node dist/cli.js preview <file.luming> -o out.html   # visual check
node dist/cli.js generate <file.luming> -o outdir --framework vue
```
