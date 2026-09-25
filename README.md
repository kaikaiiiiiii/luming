#  **Luming**（路明）

[简体中文](./README.zh-CN.md) | [English](./README.md)

> **This CLI tool is AI-generated and untested. Do not use it on existing projects, feel free to test it in new/experimental ones.**

<span style='color: #ffb464; font-weight: bold;'>**Luming**</span> is a textual language and accompanying implementation tool used to describe static page structures. Its core goal is **to provide a simplified, readable textual expression for webpage interface structures.**

## Why Luming?

In front-end development, developers often need to translate abstract page ideas, layout sketches, or interaction concepts into visual results. Traditional design tools or vector graphic formats can be cumbersome to use, or the results they generate are difficult to map directly into reusable code components.

**Luming**'s design philosophy addresses this gap: **Allowing page structure, layout relationships, and visual hierarchy to be expressed through clear, concise text, while retaining the ability to generate previews.**

Goals:

* Express page structure hierarchy using concise text
* Enable version control (diff-friendly)
* Quickly generate structural previews
* Compatible with Vibe Coding and structural communication 

Features:

* Text-based DSL for describing interface structures
* Supports features like **composition**, **layout**, and **declarative overrides**
* Separates structure from style modifications, maintaining clear page hierarchy
* Can be combined with AI or automation tools to map to front-end components (Vue, React, etc.)

Constraints:

* Not a replacement for visual design tools
* Not a CSS substitute
* Not a front-end framework
* Not a dynamic templating language

<style>
    /* Shared styles for inline layout figures (SVG fidelity) */
    div.lm-fig { display: inline-flex; vertical-align: bottom; margin-right: 6px; font-family: "Helvetica Neue", Arial, sans-serif; font-size: 13px; }
    .lm-col { display: flex; flex-direction: column; gap: 6px; }
    .lm-row { display: flex; flex-direction: row; gap: 6px; }
    .lm-cell { border: 1px solid; border-radius: 4px; display: flex; align-items: center; justify-content: center; text-align: center; color: #000; }
    .lm-a { background: #b9f9ff; border-color: #45c3ce; box-shadow: 0 0 10px 2px rgba(69, 195, 206, 0.5); }
    .lm-b { background: #fffdc6; border-color: #ffca65; box-shadow: 0 0 10px 2px rgba(255, 202, 101, 0.8); }
    .lm-c { background: #80ff80; border-color: #00e500; box-shadow: 0 0 10px 2px rgba(0, 143, 0, 0.5); }
    .lm-bd { box-sizing: border-box; border: 1px solid #ffca65; background: #fffdc6; border-radius: 6px; padding: 8px; box-shadow: 0 0 10px 2px rgba(255, 202, 101, 0.8); }
    .lm-layout { margin: 10px 0; }
    .lm-w36 { width: 36px; }
    .lm-w80 { width: 80px; }
    .lm-h36 { height: 36px; }
    .lm-h80 { height: 80px; }
    /* Quick start preview figure (SVG fidelity) */
    .lm-qk { box-sizing: border-box; font-family: "Helvetica Neue", Arial, sans-serif; font-size: 16px; display: flex; flex-direction: column; gap: 6px; width: 560px; padding: 6px; background: white; }
    .lm-qk .entity { border: 1px solid #999; display: flex; align-items: center; justify-content: center; text-align: center; padding: 6px 10px; background: white; }
    .lm-qk .header, .lm-qk .footer { border-color: #0096ff; box-shadow: 2px 2px 6px rgba(0, 150, 255, 0.5); height: 70px; }
    .lm-qk .mid { display: flex; gap: 6px; }
    .lm-qk .sidebar { border-color: #0096ff; box-shadow: 2px 2px 6px rgba(0, 150, 255, 0.5); width: 160px; }
    .lm-qk .main { border-color: #ff9300; box-shadow: 2px 2px 6px rgba(255, 147, 0, 0.5); color: #ff9300; flex: 1; flex-direction: column; align-items: stretch; gap: 6px; padding: 6px; }
    .lm-qk .tabs { display: flex; gap: 6px; }
    .lm-qk .pill { flex: 1; height: 40px; border-radius: 20px; }
    .lm-qk .t1 { background: #c0ffc0; border: 1px solid #009051; }
    .lm-qk .t2 { background: #ffc0c0; border: 1px solid #ff0002; }
    .lm-qk .t3 { background: #ffffc0; border: 1px solid #ff9300; }
    .lm-qk .t4 { background: #c0ffff; border: 1px solid #0096ff; }
    .lm-qk .t5 { background: #c0c0ff; border: 1px solid #011893; }
    .lm-qk .content { border-color: #ff2600; box-shadow: 2px 2px 6px rgba(255, 38, 0, 0.8); color: #ff2600; flex: 1; display: flex; flex-direction: column; align-items: stretch; gap: 6px; padding: 6px; }
    .lm-qk .form { border-color: #0096ff; box-shadow: 2px 2px 6px rgba(0, 150, 255, 0.5); border-radius: 6px; height: 120px; color: #333; }
    .lm-qk .preview { border-color: #0096ff; box-shadow: 2px 2px 6px rgba(0, 150, 255, 0.5); height: 160px; color: #333; }
    .lm-qk .main-label, .lm-qk .content-label { text-align: right; }
</style>

## Quick Start

```text
Header / Sidebar + Main [ Tabs / Content ] / Footer
Content [Form / Preview]

Main: bg #fda; 70;
Tabs: label;
Form: rd 4;
```
The above text can be parsed by **Luming** into a visual interface preview:

<div class="lm-qk">
    <div class="entity header">&lt; Header /&gt;</div>
    <div class="mid">
        <div class="entity sidebar">&lt; Sidebar /&gt;</div>
        <div class="entity main">
            <div class="tabs">
                <div class="pill t1"></div>
                <div class="pill t2"></div>
                <div class="pill t3"></div>
                <div class="pill t4"></div>
                <div class="pill t5"></div>
            </div>
            <div class="content">
                <div class="entity form">&lt; Form /&gt;</div>
                <div class="entity preview">&lt; Preview /&gt;</div>
                <div class="content-label">&lt; Content /&gt;</div>
            </div>
            <div class="main-label">&lt; Main /&gt;</div>
        </div>
    </div>
    <div class="entity footer">&lt; Footer /&gt;</div>
</div>

Or further, to generate front-end code components:

```vue
<script setup>
// App.vue
import Header from './components/Header.vue';
import Sidebar from './components/Sidebar.vue';
import Main from './components/Main.vue';
import Footer from './components/Footer.vue';
</script>

<template>
    <Header />
    <Sidebar />
    <Main />
    <Footer />
</template>

<style scoped>
</style>
```

```vue
<script setup>
// Main.vue
import Tabs from './Tabs.vue';
import Content from './Content.vue';
</script>

<template>
    <Tabs />
    <Content />
</template>

<style scoped>
</style>

...
```
Or directly generate a skill file in the project directory for vibe coding:

```text
---
name: luming
description: Write, edit, and debug .luming DSL files. Luming is a textual DSL for describing static page structures.
---

# Luming DSL Core Syntax

Entities are defined by names that start with a letter and may contain letters, numbers, and underscores.

## Layout Operators
- `/` — vertical stacking (A above B).
- `+` — horizontal layout (A left of B).
- `[]` — containment (B contains A and C: `B [ A / C ]`).
- `()` — grouping / operator precedence (e.g. `A + (B / C)`).
- Precedence: `[]` > `()` > `+` > `/`.

## Styles
- `Entity: bg #fda; 70;` — content between `:` and `;`; properties separated by `;`. Trailing `;` is optional at the end of a line.
- Tokens: `bg <color>` (background-color), `rd <n>` (border-radius, px suffix auto-added), `tab` / `card` / `label` (preset class), a bare number or percent (width %), or `css-prop value` (e.g. `border 1px solid red`).

## Compositional Syntax
- The same entity may be defined across multiple lines; later definitions override earlier ones (styles merge per-property).
- Same-name entities on one line are separate copies (e.g. `List [Item Item Item]`).
- Implicit `+` inside `[]` is allowed when unambiguous: `A[B C]` == `A [ B + C ]`.

## Rule Tolerance
- Any number of spaces or tabs is treated as a single space; spaces around relationship operators are optional.
- Circular inclusion is allowed but expanded finitely, stopping at a "terminus".
```

In the quick example, we defined a page structure containing Header, Sidebar, Main, and Footer. Inside Main, there are Tabs and Content, and Content further contains Form and Preview. With concise syntax, we can clearly express the page's hierarchical relationships and layout.

Beyond the structure, we can also add style modifiers for each entity, such as Main's background color, Tabs' label style, Sidebar's width, and Form's border radius. These styles are defined separately from the structure, keeping the page hierarchy clear while providing enough flexibility to adjust the visual effect.

Although **Luming** cannot directly generate complete design drafts or high-fidelity prototypes, or produce fully functional front-end code, its goal is to provide **a tool for quickly expressing and iterating on web interface structures**, helping developers rapidly prototype and build usable component skeletons, which is particularly useful in Vibe Coding.

# Syntax v0.1

> **v0.1 is finalized.** This chapter is the normative syntax description. The
> implementation-level documentation of parsing, merging, and expansion semantics
> is in [docs/parse-rule.md](docs/parse-rule.md) (described after the actual
> interpreter); the design-decision trail is in [docs/design-notes.md](docs/design-notes.md).

<span style='color: #ffb464; font-weight: bold;'>**Luming**</span>'s syntax is designed to be concise and intuitive, allowing for the quick expression of interface structures and layout relationships. Here are the basic syntax rules for version v0.1:

## Entity Names

* Entities are defined by names, which must start with a letter and can contain letters, numbers, and underscores (ASCII Latin letters only; Unicode characters such as CJK are not supported). Multiple entities can be separated by spaces, newlines, or relationship operators. For example:

  ```
  Part1
  A
  camelCaseName
  under_score_name
  ```

* Within the same document, the same entity name can appear on multiple lines, and they will be treated as the same entity. Users do not need to write overly long single lines to express complex hierarchies. For example:

  ```
  Header / Sidebar + Main [ Tabs / Content [Form / Preview]] / Footer
  ```

  is equivalent to:

  ```
  Header / Sidebar + Main  / Footer
  Main [ Tabs / Content ]
  Content [Form / Preview]
  ```

  is equivalent to:

  ```
  Header / Sidebar + Main / Footer
                     Main [ Tabs / Content ]
                                   Content [ Form / Preview]
  ```

  This equivalence holds strictly only when no entity's interior is declared more
  than once in the document; when an entity's interior is declared multiple times,
  the single-line form (parallel within a line) and the split form (cross-line
  override) can differ. See the [extended explanation](docs/rule-explains.md).

* When multiple same name entities appear on the same line, they are treated as multiple distinct copies of that entity. For example:
  ```
  List [Item Item Item]
  Item [ Icon Text ]
  ```
  is equivalent to:
  ```
  List [Item[ Icon Text ] Item[ Icon Text ] Item[ Icon Text ]]
  ```

> To clarify again, **Luming**'s goal is not to directly generate production-ready engineering code, and it does not include features like component instantiation, lifecycle methods, or mixins. Allowing multiple entities with the same name on one line is because this is a very common and typical scenario in prototyping interfaces. However, in actual engineering, the cyclic reuse of components is often related to iterating over real business data, which is handled by engineering code generation. **Luming** does not help you generate loop code; it only helps you quickly express this structural relationship during the prototyping phase for iteration and preview.

## Layout Relationship Expressions

<div class="lm-layout"><div class="lm-fig lm-col"><div class="lm-cell lm-a lm-w80 lm-h36">A</div><div class="lm-cell lm-b lm-w80 lm-h36">B</div></div> ：`A / B` means A is above B at the same hierarchical level. This is the most common arrangement in uncomposed HTML documents.</div>

<div class="lm-layout"><div class="lm-fig lm-row"><div class="lm-cell lm-a lm-w36 lm-h80">A</div><div class="lm-cell lm-b lm-w36 lm-h80">B</div></div> ：`A + B` means A and B are on the same level, with A to the left and B to the right.</div>

<div class="lm-layout"><div class="lm-fig lm-bd lm-w80 lm-h80"><div class="lm-col" style="gap:8px;justify-content:center"><div class="lm-cell lm-a" style="box-sizing:border-box;width:64px;height:28px">A</div><div class="lm-cell lm-c" style="box-sizing:border-box;width:64px;height:28px">C</div></div></div> ：`B [ A / C ]` means B is the container for A and C. `[]` indicates a containment relationship.</div>

<div class="lm-layout"><div class="lm-fig lm-col"><div class="lm-row"><div class="lm-cell lm-a lm-w36 lm-h36">A</div><div class="lm-cell lm-b lm-w36 lm-h36">B</div></div><div class="lm-cell lm-c lm-w80 lm-h36">C</div></div>：`A + B / C` means A is at the top-left, B at the top-right, and C is below A and B, all on the same hierarchical level.</div>

<div class="lm-layout"><div class="lm-fig lm-row"><div class="lm-cell lm-a lm-w36 lm-h80">A</div><div class="lm-col"><div class="lm-cell lm-b lm-w36 lm-h36">B</div><div class="lm-cell lm-c lm-w36 lm-h36">C</div></div></div>：`A + (B / C)` means A is on the left, B is at the top, and C is at the bottom-right, all on the same level. `()` indicates forcing priority within the same level. That is, B and C are grouped together first, then this group is arranged horizontally with A.</div>

Note: The `()` grouping symbol is a special one, implemented differently in various layout schemes. In flexbox layouts, or older in float layouts, an extra container element is needed to achieve the corresponding effect. In such cases, `()` is equivalent to an anonymous `[]`. For Grid layout, no extra container element is required; elements are arranged directly within the same level. According to **Luming**'s design philosophy, `()` is semantically defined as '**layout operation priority**' rather than directly mapping to an anonymous container or hierarchical relationship.

## Operator Precedence

Within the same line, the precedence of operators is: `[]` > `()` > `+` > `/`。

* For example, for `A + B / (C / D [ E + F ])`, first `[]` is processed, grouping E and F horizontally as a whole, making it the content of D.
* Then, within `A + B / (C / D)`, `()` is processed, grouping C and D vertically as a whole.
* Third, `+` is processed, grouping A and B horizontally as a whole.
* Finally, `/` is processed, grouping A+B and C/D vertically as a whole.

Alternatively, think of it this way:
  
* First, extract the contents within `[]` and `()`.
* Then, use `/` to split the entities and parenthesized groups, arranging them vertically.
* Finally, check within each group for `+`, and arrange horizontally if present. 
* For example, `A / B + C + D / E` is equivalent to `A / (B + C + D ) / E`

Unlike arithmetic operators, there is no inherent rule in page layout that division is tighter than addition. Considering that page layout naturally flows from top to bottom, **Luming** chose a precedence rule that processes vertical relationships first, then horizontal relationships within the same level, aligning better with the natural hierarchy of page structures.

## Styles

`: ;`: Content between `:` and `;` represents style modifications. For example: `A: bg #fda; 70;` means entity A has a background color of #fda and a width of 70%. Style properties are separated by semicolons. The style modification part starts with a colon and ends with a semicolon. Style properties can be complete CSS styles, or abbreviations or style classes provided by **Luming**'s presets.

**Luming**'s design goal is to quickly express and iterate on interface structures, not to replace professional design tools or generate high-fidelity design drafts. It primarily focuses on layout and hierarchical relationships, rather than detailed visual design. Nevertheless, **Luming** supports direct use of CSS styles and also offers some common CSS shorthand abbreviations and even several predefined CSS classes to save time. For a specific list, please refer to [the documentation](./docs/style.md).

## Compositional Syntax

Users can use multiple lines to express the hierarchical relationships and style modifications of the same entity for better readability. Multiple lines are the recommended form. Single-line abbreviation is achieved through **inline style anchors** — styles written directly at an entity's occurrence:

```
List [Item: bg #99f; Item Item]
```

An entity's own entity-level style (e.g. `R: bg #fda; 70;`) should be written on its own line; style suffixes written after a container's brackets (e.g. `R [ T / V ]: bg #fda;`) are **not supported**.

## Advanced Usage

**Luming** allows users to define styles or properties for the same entity multiple times within the same document, and also permits the use of compositional syntax for more flexible expression. These mechanisms are initially intended to enhance the readability of **Luming** documents, but this flexibility also brings additional features to **Luming**:

* Inline Repetition: When multiple entities with the same name appear on the same line, they are treated as multiple distinct copies of that entity. For example:

  ```
  List [Item Item Item]
  ```

* Entity Style vs. Individual Copy Style:

  ```
  List [Item: bg #99f; Item Item]
  Item: bg #f99;
  ```
  The final effect is that the first Item inside List has a background color of <span style="background-color: #99f;">#99f</span>, while the second and third Items have a background color of <span style="background-color: #f99;">#f99</span>.

* Subsequent Definitions Override Previous Definitions:
  
  When the same entity is defined multiple times in a document, later defined properties override earlier ones. For example:
  ```
  A: bg #fda; 70;
  A: bg #99f;
  ```

  The final effect is that A's background color is <span style="background-color: #99f;">#99f</span>, and its width remains 70%.

  The same rule applies to hierarchical relationships and containment — note that
  overrides happen **across lines**: multiple writings within one line do not
  override each other and render at their written positions (see the
  [extended explanation](docs/rule-explains.md)). For example:

  ```
  A / B
  A + B
  ```
  The final effect is that A and B are on the same level, with A on the left and B on the right.

  ```
  A [ B C ]
  A [ D E ]
  ```
  The final effect is that A contains D and E, while B and C are no longer content of A.

* Reusing Copies

  There are two ways to reuse copies of the same entity:
  
  ```
  List [Item Item Item]
  ```
  and
  ```
  Page [ Content ]
  Main [ Content ]
  ```
  Note that this is not a case of a subsequent definition overriding a previous one. The definition of Main does not override the definition of Page, and vice versa. They simply share a Content entity. During the rendering phase, two copies of Content will be generated, one placed inside Page and one inside Main.

* Finite Expansion

  ```
  A [A]

  B [C]
  C [B]
  ```
  In **Luming**'s design, circular inclusion is allowed but is explicitly defined as finite expansion. When rendering, every **bare reference** (an occurrence without a written interior) checks the current ancestor chain before fetching its entity's definition: if the entity is already on the chain, that reference itself renders as a **terminus** — rendered normally with its styles, but never expanded. Explicitly written nested structures (such as the middle layer of `A[A[A]]`) are same-line writings: they render as written and are not checked. The entity ultimately becomes both the start and end point of a cycle. For the two examples above, the final results are:

  ```
  A
  └─A(Terminus)
  B
  └─C
    └─B(Terminus)
  ```


## Further Understanding

To understand the principles behind the advanced usage, it's necessary to know the processing flow of the **Luming** parser.

**Luming** is a simple descriptive language, not a full runtime environment. It does not have true variables, functions, or lifecycle mechanisms. Its processing flow can be divided into the following stages:

**Text Parsing**: The **Luming** parser first parses the input text line by line, identifying entity names, hierarchical relationships, style modifications, and other elements from each line, and converts the source code into the parser's own internal data structures.

When subsequent lines contain the same entity name, **Luming** merges them into the existing data structure according to specific rules. The two basic rules are: **multiple writings within one line do not override each other (parallel within a line)**, and **re-descriptions of the same entity across lines follow document order, the later one winning (cross-line override)**. For detailed handling rules, please refer to [the documentation](./docs/parse-rule.md).

**Copy Generation**: After parsing completes, the renderer builds instance trees per **scene**. Scenes are selected in document order: a structure line becomes a scene if any of its top-level subjects has not been placed by an earlier line; a multi-subject line whose subjects are all placed **replaces as a whole** the scene it revises (e.g. `A / B` followed by `A + B`); a single-subject line for an already-placed entity is only recorded as a declaration and no longer forms a scene. Bare references (no written interior) fetch a fallback definition from the entity's declarations; an entity recurring on the ancestor chain is truncated into a terminus.

**Code Composition**: During code generation, the generator will, based on input parameters, append relevant code corresponding to the specific mode when combining the generated entity copies.

Therefore, **Luming**'s text parsing has no situation where 'a later-line definition overrides properties of a copy that already existed in an earlier line' — copy properties are not produced line by line at render time and then modified by later lines. **Luming** reads all lines first, completes the merge, and then expands all scenes in a single pass. The merge-stage rules are: **multiple writings within one line do not override each other and render at their written positions; re-descriptions of the same entity across lines follow document order, the later one winning**; styles merge per property (for the same property, the later one wins), and inline style anchors bind to their occurrence position and take priority over entity-level styles.

## Rule Tolerance

**Luming** establishes some tolerant syntax rules to improve user input efficiency and its own error resilience:

* Any number of spaces or tabs are treated as a single space syntactically, enhancing the formatting capabilities of **Luming** documents. Spaces around relationship operators are also optional.

* Entities arranged horizontally need to be connected with `+`. However, if they are within `[]` at the same level and there are no other operators that could cause ambiguity, the `+` can be omitted. For example: `A[B C[D E]]` is equivalent to `A [ B + C [ D + E ] ]`. Spaces are still required for separation; otherwise, `BC` would be interpreted as another entity name.

* The trailing `;` in style syntax can be omitted if it is at the end of a line or adjacent to a relationship operator. For example: `A: bg #fda; 70` is equivalent to `A: bg #fda; 70;`. `A: bg #fda/Footer` is equivalent to `A: bg #fda;/Footer`.

## Best Practices

* Always start defining the interface structure with unique main entity, avoiding overly generic names (like Container, Wrapper), to improve readability and maintainability.

* Avoid arranging layout based on line order. Use explicit relationship expressions (like `/`, `+`, `[]`) to define hierarchical and layout relationships for enhanced structural clarity. Avoid undefined parser behavior.

* When defining styles for the same entity, try to do so on the same line or adjacent lines to avoid confusion caused by subsequent lines overriding previous ones.

* Although **Luming** explicitly defines the handling rules for circular references, complex hierarchical relationships like circular references should still be avoided, as they generally do not conform to standard interface structure design principles.

* Prefer using explicit containment `[]` to define component hierarchies rather than relying on `()` to forcibly adjust layout priority, for maximum compatibility with the compilation results.

* Minimize the excessive use of CSS styles; try to use preset style classes or abbreviations, and especially avoid using selectors. Pursuing detailed visual effects is not **Luming**'s strength; users should consider professional design tools like Sketch or Figma for visual design.

# Syntax v0.2

![TODO](./img/todo.svg) 

Add syntax for images and inner text of entities.

# Syntax v0.3

![TODO](./img/todo.svg)

Add conditional display syntax.

# Usage

<span style='color: #ffb464; font-weight: bold;'>**Luming**</span> provides a command-line tool to compile its textual descriptions into visual previews or structured front-end code components. To cater to different scenarios, **Luming** offers two invocation methods: Preview Mode and Generate Mode.

## Preview Mode

In preview mode, **Luming** will generate a single HTML document as much as possible, embedding all HTML, CSS, and JavaScript content within one file, so it can be directly rendered by browsers or other tools. In this mode, **Luming** automatically adds some basic styles to each entity to ensure they are visually discernible and clearly demonstrate the hierarchical relationships between them. These basic styles include:

* **Borders**: Each entity has a default border, making its boundaries clearly visible in the preview.

* **Hierarchy & Border Colors**: Entities at different hierarchical levels are assigned different border colors to help distinguish their relationships.

* **Margins & Padding**: Entities have some default margins and padding to ensure content doesn't stick to the borders.
* **Equal horizontal division**: Children in a `+` horizontal group split the remaining width equally by default (`flex: 1 1 0`); children with an explicit `width` or `flex` keep their own setting.

* **Entity Names**: The name of each entity is displayed inside it for easy identification in the preview.

When you explicitly specify styles, these basic styles are overridden. For example, if you set `border: none` for an entity, its border will no longer be displayed. Or if you set a specific background color or border color for an entity, those styles will override the defaults.

## Generate Mode

In generate mode, **Luming** creates a separate file for each entity, containing only the style attributes you explicitly specified and the necessary layout attributes. This means if you don't specify any styles for an entity, the generated code will contain no style attributes. However, essential CSS properties for layout (like `display: flex`, `flex-direction`, etc.) are automatically added to ensure the entity's layout relationships are correct.

Through parameter control, you can choose to generate component code for Vue, React, or other frameworks. Relationships between multiple components are connected via import statements or other means to ensure they can be correctly combined into a complete interface.

Note: Users can write complex interface structures using **Luming**, but since **Luming**'s generate mode creates a separate file for each component, a complex structure might generate a large number of files, requiring proper organization and management.

## Generation-Time Transformation:

Due to limitations inherent in HTML, **Luming** transforms certain specific component names when compiling and generating component files. For example, if you define an entity named `Header`, it might be transformed to `MyHeader` or another name during compilation to avoid conflicts with HTML's `<header>` tag. These transformation rules can be adjusted via configuration files to meet the needs of different projects. **Luming** does not use random strings for component names; it transforms them according to predefined rules to ensure the generated component names have a degree of readability and consistency. In complex projects, there is still a possibility that **Luming**'s automatically transformed component names might conflict with existing component names; it is recommended to manually adjust the configuration in such cases.

## Markdown Integration

![TODO](./img/todo.svg)

<pre>
&grave;&grave;&grave;**Luming**<br>
Header / Sidebar + Main [ Tabs / Content [Form / Preview]] / Footer<br>
&grave;&grave;&grave;
</pre>


# About

<span style='color: #ffb464; font-weight: bold;'>**Luming** (路明)</span> the name itself carries a metaphor: The English word "**Luming**" can be understood as Luminous, while the Chinese characters <span style='color: #ffb464; font-weight: bold;'>路明</span> (Lù Míng) symbolize a bright roadway and a clear route,  wishing for light to illuminate your way forward. **Luming** outlines the contours of interface structures with text, providing designers with a kind of "visual thinking line." It is not a substitute for fine aesthetics, but an auxiliary tool — making the bridge between ideas, structure, and code lighter, more efficient, and easier to understand.