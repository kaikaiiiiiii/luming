---
name: luming
description: Write, review, and debug Luming (.luming) page-structure files and compile them with the luming CLI into a single-file HTML preview or HTML/Vue/React components. Use when a task involves .luming files, page-layout sketches written in Luming DSL, or the luming CLI.
---

# Luming (.luming) authoring guide

Luming is a small text DSL that describes **static page structure** — boxes, containment,
layout order, and light styling. One `.luming` file is exactly one page. It compiles to:

- a single self-contained HTML preview: `lum preview page.luming -o page.html`;
- one component file per entity: `lum generate page.luming --framework vue|react|html`.

The CLI command is `lum` (npm package `luming-say`), so `npx luming-say <command>` is
equivalent when nothing is installed.

There are no variables, loops, data binding, events, selectors, or runtime. If a task needs
those, express only the structure in Luming and handle behavior in the surrounding code.

## Cheat sheet

| Token | Meaning |
| --- | --- |
| `A / B` | vertical layout: A above B |
| `A + B` | horizontal layout: A left of B |
| `B [ A / C ]` | B contains A and C |
| `(A + B)` | grouping / layout-operand priority only; not a container, cannot be styled |
| precedence in one line | `[]` > `()` > `+` > `/` |

- Entity names: ASCII letter first, then letters/digits/underscore (`Header`, `Form1`,
  `under_score`). Case-sensitive. Prefer meaningful, page-specific names over `Container`.
- Multi-line composition is the recommended style. All lines of one file are merged before
  rendering, so later lines may reference or refine entities defined earlier:

  ```luming
  Header / Sidebar + Main / Footer
  Main [ Tabs / Content ]
  Content [ Form / Preview ]
  ```

- Inside `[]`, adjacent entities may omit `+`: `A[B C]` is `A [ B + C ]` (whitespace is
  still required). At the top level `+` is mandatory.
- Styles: `Name: token; token; ...` — `:` starts the style block, `;` separates tokens,
  the trailing `;` is optional at end of line or next to an operator.
  - `bg <color>` → `background-color`; `rd <n>` → `border-radius` (bare number gets `px`);
  - `tab` / `card` / `label` → preset CSS classes;
  - a bare number or percentage → width (`70` → `width: 70%`);
  - any `css-property value` pair passes through, e.g. `border 1px solid #999`;
  - paired parentheses inside a value are part of the value: `bg rgba(0,0,0,.5)`,
    `width calc(100% - 20px)`, `background url(https://…)`.
- Inline style anchor binds to the occurrence it follows:
  `List [Item: bg #99f; Item Item]` styles only the first Item; a separate
  `Item: bg #f99;` line styles the remaining copies.

## Semantics that commonly surprise

1. **Same-line parallel, cross-line override.** Different writings on one line all render
   at their written positions and never overwrite each other. A later *line* describing the
   same entity replaces its interior as a whole:

   ```luming
   A [ B ]        # then a later line:
   A [ C ]        # A contains only C now
   ```

2. **Same-line copies start empty.** `List [Item[Icon] Item Item]` gives the first Item an
   Icon; the two later bare Items are empty, they do not inherit the same-line interior.
   Define the interior on its own line (or earlier) and reference copies bare.

3. **One page root.** Several disjoint top-level units stack vertically into the same page,
   in document order. There is no scene-switch syntax and the output is never split into
   "scenes".

4. **Recursion is truncated, not an error.** A bare reference expands the entity's current
   interior; if that name already appears on the ancestor chain it becomes a *terminus* —
   rendered with its styles but not expanded again. Avoid cycles anyway; they are poor page
   structure.

5. **`()` only changes grouping.** It does not create a node, cannot carry styles, and may
   be dissolved by the renderer. Prefer explicit `[]` containment for real hierarchy.

6. **Style scopes.** Entity-level styles merge per property (later lines win). Inline
   occurrence styles apply to that occurrence only and beat entity-level styles.

7. **Top-level line order matters for unit selection**, but the rule is deliberately plain:
   the first line placing an unplaced entity starts a top-level unit; a later multi-entity
   line whose entities are all placed replaces the most recent unit sharing an entity.
   Avoid depending on subtle line-order effects — write one clear layout line per page.

## Recommended workflow

1. Draft the structure top-down with `/` for vertical, `+` for horizontal, `[]` for real
   containment, and `()` only for layout grouping.
2. Put container interiors on their own lines; reference copies bare.
3. Add styles last, using shorthands before raw CSS.
4. Preview and inspect: `lum preview page.luming -o page.html`, then open the HTML.
   Diagnostics print to stderr; any `error`-level diagnostic makes the exit code `1`
   (outputs are still written so you can inspect them).
5. Generate components when needed and move them into the project:
   `lum generate page.luming -o components --framework vue`. Names matching HTML tags
   get a `My` prefix; `luming.config.json` (`componentRename`, `reservedPrefix`) tunes this.
6. Never hand-edit generated preview HTML — edit the `.luming` source and regenerate.

## CLI quick reference

```bash
lum preview <input.luming> [-o output.html]
lum generate <input.luming> [-o outdir] [--framework html|vue|react] [--config path]
```

Without a global install: `npx luming-say preview ...`.

Exit codes: `0` success or warnings only; `1` an error-level diagnostic or a runtime error.
Unknown style tokens are warnings (token dropped); unparseable structure lines are errors
(line skipped).

## Common diagnostics and fixes

| Message | Likely cause | Fix |
| --- | --- | --- |
| `Invalid character '…'` | stray symbol in the structure area | remove it; styles belong after `:` |
| `Unexpected token …` / `Expected … found EOF` | unbalanced `[]`/`()` or missing top-level `+` | balance brackets; use `+` between top-level siblings |
| `Unsupported style token: X` | unknown shorthand or malformed value | use `bg`/`rd`/preset/width number, or `css-property value` |
| `X 的内部结构被声明 N 次 …` (warning) | the same entity interior is declared multiple lines | keep one definition; later line wins |
| a `/` inside a style value | `font 12px/1.5` style shorthand is not supported | wrap in parentheses where possible or avoid that shorthand |
| two copies of an entity in the output | partially overlapping top-level relation lines | write the page as one clear layout line per unit |

## Minimal complete example

```luming
Header / Sidebar + Main [ Tabs / Content ] / Footer
Content [ Form / Preview ]

Main: bg #fda; 70;
Tabs: label;
Form: rd 4;
```

This renders: Header on top; Sidebar left of Main; Main contains Tabs above Content;
Content contains Form above Preview; Footer at the bottom. `Content` is defined on the
second line and used on the first — forward references are fine because parsing completes
before rendering.

## Canonical references

This skill is self-sufficient for Luming v0.1. In the Luming repository, the authoritative
specification is `README.zh-CN.md`; implementation-level semantics are in
`docs/parse-rule.md`, style presets in `docs/style.md`, and change history in `changes.log`.
