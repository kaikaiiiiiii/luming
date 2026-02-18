import { CompileResult, ExpressionNode, GenerateFramework, GeneratedFile } from "./types";

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

function renderExprHtml(expr: ExpressionNode | null): string {
    if (!expr) {
        return "";
    }

    if (expr.kind === "entity") {
        return `<${expr.name} />`;
    }

    if (expr.kind === "container") {
        return `<${expr.name}>${renderExprHtml(expr.content)}</${expr.name}>`;
    }

    const dir = expr.direction === "row" ? "row" : "column";
    const body = expr.children.map((child) => renderExprHtml(child)).join("\n      ");
    return `<div style="display:flex; flex-direction:${dir}; gap:8px;">\n      ${body}\n    </div>`;
}

function toPascalName(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1);
}

function createVueFile(name: string, expr: ExpressionNode | null, styles: Record<string, string>): string {
    const refs = Array.from(new Set(extractEntityRefs(expr).filter((x) => x !== name)));
    const imports = refs
        .map((item) => `import ${toPascalName(item)} from './${toPascalName(item)}.vue';`)
        .join("\n");
    const body = renderExprHtml(expr)
        .replace(/<([A-Za-z][A-Za-z0-9_]*)\s*\/>/g, (_m, n) => `<${toPascalName(n)} />`)
        .replace(/<([A-Za-z][A-Za-z0-9_]*)>/g, (_m, n) => `<${toPascalName(n)}>`)
        .replace(/<\/([A-Za-z][A-Za-z0-9_]*)>/g, (_m, n) => `</${toPascalName(n)}>`);

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

function createReactFile(name: string, expr: ExpressionNode | null, styles: Record<string, string>): string {
    const refs = Array.from(new Set(extractEntityRefs(expr).filter((x) => x !== name)));
    const imports = refs
        .map((item) => `import { ${toPascalName(item)} } from './${toPascalName(item)}';`)
        .join("\n");
    const body = renderExprHtml(expr)
        .replace(/<([A-Za-z][A-Za-z0-9_]*)\s*\/>/g, (_m, n) => `<${toPascalName(n)} />`)
        .replace(/<([A-Za-z][A-Za-z0-9_]*)>/g, (_m, n) => `<${toPascalName(n)}>`)
        .replace(/<\/([A-Za-z][A-Za-z0-9_]*)>/g, (_m, n) => `</${toPascalName(n)}>`);

    const styleObj = Object.entries(styles)
        .map(([k, v]) => `    "${k}": "${v}"`)
        .join(",\n");

    return `import React from 'react';
${imports}

export function ${toPascalName(name)}() {
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

function createHtmlFile(name: string, expr: ExpressionNode | null, styles: Record<string, string>): string {
    return `<section class="${name}">
  ${renderExprHtml(expr)}
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
    styles: Record<string, string>
): GeneratedFile {
    if (framework === "vue") {
        return {
            filePath: `${toPascalName(name)}.vue`,
            content: createVueFile(name, expr, styles),
        };
    }

    if (framework === "react") {
        return {
            filePath: `${toPascalName(name)}.tsx`,
            content: createReactFile(name, expr, styles),
        };
    }

    return {
        filePath: `${name}.html`,
        content: createHtmlFile(name, expr, styles),
    };
}

export function generateFiles(
    result: CompileResult,
    framework: GenerateFramework
): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    for (const name of result.document.templateOrder) {
        const template = result.document.templates[name];
        files.push(
            createSingleFile(
                framework,
                name,
                template.contentExpression,
                template.styles
            )
        );
    }

    return files;
}
