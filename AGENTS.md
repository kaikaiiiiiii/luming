# AGENTS.md

Guidance for AI coding agents working in this repository.

## Core Principle (项目核心准则)

**`README.zh-CN.md` is the canonical specification of this project.**

- `README.zh-CN.md` is the source of truth (规范源). `README.md` (English) is a
  translation of it; the code, `docs/`, `examples/`, and all other content are
  **implementations** of `README.zh-CN.md`.
- Any inconsistency between other content and `README.zh-CN.md` is resolved in
  favor of `README.zh-CN.md`: fix the other content to match the spec, never
  rewrite the spec to match the implementation.
- Only **internal conflicts inside `README.zh-CN.md` itself** (contradictory
  statements between its own sections) require the user to arbitrate; do not
  decide those unilaterally. When in doubt about such a conflict, ask the user.
- When changing behavior, keep `README.zh-CN.md` in sync first, then update
  `README.md` (translation) and the implementation to match.

## Project Overview

**Luming** (路明) is a textual DSL and CLI tool for describing static page
structures. It parses a `.luming` text file into a structural model and then
compiles it into either a single-file HTML preview or a set of component files
(HTML, Vue, or React).

**Important caveat**: This tool is AI-generated and untested. Do not use it on
existing projects; only test it in new/experimental ones.

## Commands

```bash
npm run build       # compile TypeScript to dist/ (tsc -p tsconfig.json)
npm run typecheck   # type-check only, no emit (tsc --noEmit)
npm run clean       # remove dist/
npm run preview     # node dist/cli.js preview
npm run generate    # node dist/cli.js generate
```

CLI usage (after build):

```bash
node dist/cli.js preview <input.luming> [-o output.html]
node dist/cli.js generate <input.luming> [-o outdir] [--framework html|vue|react] [--config path]
```

Verify changes with `npm run typecheck` and, when behavior changed, `npm run build`.

## Repository Layout

```
index.ts            # top-level entry, re-exports src/*
cli.ts              # CLI argument parsing and preview/generate subcommands
index.d.ts          # type declarations
src/
  types.ts          # core type definitions (AST, runtime, compile/generate options)
  style.ts          # style token resolution (bg, rd, classes, css-like, widths)
  parser.ts         # text -> ParsedDocument (AST)
  compile.ts        # AST -> RuntimeNode/RuntimeLayoutNode roots and scenes
  renderer.ts       # compile result -> preview HTML
  generator.ts      # compile result -> component files (html/vue/react)
  index.ts          # re-exports src modules
docs/               # documentation (partially incomplete)
examples/           # .luming inputs and generated output for all frameworks
```

Processing pipeline: `parse` -> `compile` -> `renderPreviewHtml` or
`generateFiles`. Each stage is a pure function over the types in `src/types.ts`.

## Code Conventions

- TypeScript, strict mode, target ES2020, CommonJS modules.
- Indentation: 4 spaces. Double quotes. Semicolons.
- Functions use explicit return type annotations.
- Exported APIs are aggregated through `src/index.ts` / `index.ts`.
- Follow the existing parser/compiler style: small helper functions with a
  single responsibility, working over the types in `src/types.ts`.
- Diagnostics are collected on the `ParsedDocument` / `CompileResult` as
  `Diagnostic[]`; do not throw for recoverable user-input problems in the
  compiler proper (the CLI catches thrown errors and prints them).

## Luming DSL Cheat Sheet

- `/` — vertical stacking (A above B).
- `+` — horizontal layout (A left of B).
- `[]` — containment (B contains A and C: `B [ A / C ]`).
- `()` — grouping / operator precedence (e.g. `A + (B / C)`).
- Precedence: `[]` > `()` > `+` > `/`.
- Styles: `Entity: bg #fda; 70;` — content between `:` and `;`, properties
  separated by `;`. Trailing `;` is optional at end of line.
- Style tokens: `bg <color>` (background-color), `rd <n>` (border-radius,
  px suffix auto-added), `tab`/`card`/`label` (preset class), bare number or
  percent (width %), or `css-prop value` (e.g. `border 1px solid red`).
- Compositional syntax: the same entity may be defined across multiple lines;
  later definitions override earlier ones (styles merge per-property).
- Same-name entities on one line are separate copies (e.g. `List [Item Item Item]`).
- Circular inclusion is allowed but expanded finitely, stopping at a "terminus".
- Implicit `+` inside `[]` is allowed when unambiguous: `A[B C]` == `A [ B + C ]`.

Full syntax reference: `README.md` (§ Syntax v0.1, Styles, Advanced Usage).
Style presets: `docs/style.md`.

## Examples

`examples/quickstart.luming` is the canonical minimal example:

```
Header / Sidebar + Main [ Tabs / Content ] / Footer
Content [Form / Preview]

Main: bg #fda; 70;
Tabs: label;
Form: rd 4;
```

Run `node dist/cli.js preview examples/quickstart.luming -o examples/quickstart.preview.html`
to regenerate the preview.
