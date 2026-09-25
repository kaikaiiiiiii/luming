import {
    CompileResult,
    ExpressionNode,
    GenerateFramework,
    GeneratedFile,
    GeneratorConfig,
    RuntimeLayoutNode,
} from "./types";

/** Reserved HTML tag names (README「使用 - 生成时转换」): such entity names get a prefix to avoid tag conflicts. */
const RESERVED_TAGS = new Set([
    "html", "head", "body", "title", "meta", "link", "style", "script", "noscript",
    "header", "footer", "main", "nav", "section", "article", "aside",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "div", "span", "p", "a", "abbr", "address", "area", "b", "base", "bdi", "bdo",
    "blockquote", "br", "button", "canvas", "caption", "cite", "code", "col", "colgroup",
    "data", "datalist", "dd", "del", "details", "dfn", "dialog", "dl", "dt", "em",
    "embed", "fieldset", "figcaption", "figure", "form", "hgroup", "hr", "i", "iframe",
    "img", "input", "ins", "kbd", "label", "legend", "li", "map", "mark", "menu", "meter",
    "object", "ol", "optgroup", "option", "output", "picture", "pre", "progress", "q",
    "rp", "rt", "ruby", "s", "samp", "search", "select", "slot", "small", "source",
    "strong", "sub", "summary", "sup", "table", "tbody", "td", "template", "textarea",
    "tfoot", "th", "thead", "time", "tr", "track", "u", "ul", "var", "video", "wbr",
]);

function toCssText(styles: Record<string, string>): string {
    return Object.entries(styles)
        .map(([k, v]) => `  ${k}: ${v};`)
        .join("\n");
}

function extractEntityRefs(expr: ExpressionNode | null): string[] {
    if (!expr) {
        return [];
    }

    if (expr.kind === "entity") {
        return [expr.name];
    }

    if (expr.kind === "container") {
        return [expr.name];
    }

    const output: string[] = [];
    for (const child of expr.children) {
        output.push(...extractEntityRefs(child));
    }
    return output;
}

function renderExprHtml(expr: ExpressionNode | null, toFinalName: (raw: string) => string): string {
    if (!expr) {
        return "";
    }

    if (expr.kind === "entity") {
        return `<${toFinalName(expr.name)} />`;
    }

    if (expr.kind === "container") {
        return `<${toFinalName(expr.name)}>${renderExprHtml(expr.content, toFinalName)}</${toFinalName(expr.name)}>`;
    }

    const dir = expr.direction === "row" ? "row" : "column";
    const body = expr.children.map((child) => renderExprHtml(child, toFinalName)).join("\n      ");
    return `<div style="display:flex; flex-direction:${dir}; gap:8px;">\n      ${body}\n    </div>`;
}

function toPascalName(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Generation-time name transformation (README「使用 - 生成时转换」):
 * reserved HTML tag names are prefixed (Header -> MyHeader by default) to avoid
 * conflicts; rules are adjustable via the generator config file.
 */
export function transformComponentName(name: string, config: GeneratorConfig = {}): string {
    const renamed = config.componentRename?.[name];
    if (renamed) {
        return renamed;
    }
    const prefix = config.reservedPrefix ?? "My";
    if (RESERVED_TAGS.has(name.toLowerCase())) {
        return `${prefix}${name}`;
    }
    return name;
}

/** Templates actually referenced in the final scenes (slot model: overridden-away entities produce no files). */
function collectSceneTemplateNames(scenes: RuntimeLayoutNode[], out: Set<string>): void {
    for (const scene of scenes) {
        if (scene.kind === "entity") {
            out.add(scene.node.templateName);
            if (scene.node.content) {
                collectSceneTemplateNames([scene.node.content], out);
            }
        } else {
            collectSceneTemplateNames(scene.children, out);
        }
    }
}

function createVueFile(
    name: string,
    expr: ExpressionNode | null,
    styles: Record<string, string>,
    toFinalName: (raw: string) => string
): string {
    const finalName = toFinalName(name);
    const refs = Array.from(new Set(extractEntityRefs(expr).filter((x) => x !== name)));
    const imports = refs
        .map((item) => `import ${toPascalName(toFinalName(item))} from './${toPascalName(toFinalName(item))}.vue';`)
        .join("\n");
    const body = renderExprHtml(expr, toFinalName);

    return `<script setup lang="ts">
${imports}
</script>

<template>
  <section class="${name}">
    ${body || ""}
  </section>
</template>

<style scoped>
.${name} {
${toCssText(styles)}
}
</style>
`;
}

function createReactFile(
    name: string,
    expr: ExpressionNode | null,
    styles: Record<string, string>,
    toFinalName: (raw: string) => string
): string {
    const finalName = toFinalName(name);
    const refs = Array.from(new Set(extractEntityRefs(expr).filter((x) => x !== name)));
    const imports = refs
        .map((item) => `import { ${toPascalName(toFinalName(item))} } from './${toPascalName(toFinalName(item))}';`)
        .join("\n");
    const body = renderExprHtml(expr, toFinalName);

    const styleObj = Object.entries(styles)
        .map(([k, v]) => `    "${k}": "${v}"`)
        .join(",\n");

    return `import React from 'react';
${imports}

export function ${toPascalName(finalName)}() {
  return (
    <section style={{
${styleObj}
    }}>
      ${body || ""}
    </section>
  );
}
`;
}

function createHtmlFile(
    name: string,
    expr: ExpressionNode | null,
    styles: Record<string, string>,
    toFinalName: (raw: string) => string
): string {
    const finalName = toFinalName(name);
    return `<section class="${name}">
  ${renderExprHtml(expr, toFinalName)}
</section>

<style>
.${name} {
${toCssText(styles)}
}
</style>
`;
}

function createSingleFile(
    framework: GenerateFramework,
    name: string,
    expr: ExpressionNode | null,
    styles: Record<string, string>,
    toFinalName: (raw: string) => string
): GeneratedFile {
    const finalName = toFinalName(name);
    if (framework === "vue") {
        return {
            filePath: `${toPascalName(finalName)}.vue`,
            content: createVueFile(name, expr, styles, toFinalName),
        };
    }

    if (framework === "react") {
        return {
            filePath: `${toPascalName(finalName)}.tsx`,
            content: createReactFile(name, expr, styles, toFinalName),
        };
    }

    return {
        filePath: `${finalName}.html`,
        content: createHtmlFile(name, expr, styles, toFinalName),
    };
}

export function generateFiles(
    result: CompileResult,
    framework: GenerateFramework,
    config: GeneratorConfig = {}
): GeneratedFile[] {
    const activeTemplates = new Set<string>();
    collectSceneTemplateNames(result.scenes, activeTemplates);

    const toFinalName = (raw: string): string => transformComponentName(raw, config);
    const files: GeneratedFile[] = [];

    for (const name of result.document.templateOrder) {
        if (!activeTemplates.has(name)) {
            continue;
        }
        const template = result.document.templates[name];
        // The generated component renders the entity's latest declared interior
        // (docs/parse-rule.md §3: same-line declarations are parallel, cross-line
        // declarations cascade — the last one is the component's definition).
        const declarations = template.interiorDeclarations;
        const content = declarations.length > 0
            ? declarations[declarations.length - 1].content
            : null;
        files.push(
            createSingleFile(framework, name, content, template.styles, toFinalName)
        );
    }

    return files;
}
