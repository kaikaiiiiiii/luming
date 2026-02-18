import { CompileResult, RuntimeLayoutNode, RuntimeNode } from "./types";

function styleRecordToInline(styles: Record<string, string>): string {
    const entries = Object.entries(styles);
    if (entries.length === 0) {
        return "";
    }
    return entries.map(([key, value]) => `${key}: ${value};`).join(" ");
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function renderRuntimeEntity(node: RuntimeNode, level: number): string {
    const styles = {
        ...{
            border: "1px solid #94a3b8",
            padding: "8px",
            margin: "6px",
            "border-radius": "8px",
            "background-color": "#ffffff",
        },
        ...node.styles,
    };

    const label = `<div class="luming-label">${escapeHtml(node.templateName)}${node.terminated ? " (Terminus)" : ""
        }</div>`;
    const content = node.content ? renderLayoutNode(node.content, level + 1) : "";

    return `<div class="luming-node level-${level}" style="${styleRecordToInline(styles)}">${label}${content}</div>`;
}

function renderLayoutNode(node: RuntimeLayoutNode, level: number): string {
    if (node.kind === "entity") {
        return renderRuntimeEntity(node.node, level);
    }

    const direction = node.direction === "row" ? "row" : "column";
    const children = node.children.map((child) => renderLayoutNode(child, level)).join("");
    return `<div class="luming-group" style="display:flex; flex-direction:${direction}; align-items:stretch; gap:6px;">${children}</div>`;
}

export function renderPreviewHtml(result: CompileResult): string {
    const scenes = result.scenes
        .map((scene, index) => `<section class="luming-scene" data-scene="${index + 1}">${renderLayoutNode(scene, 0)}</section>`)
        .join("\n");

    const diagnostics = result.diagnostics
        .map((d) => `<li>[${d.level}] ${escapeHtml(d.message)}</li>`)
        .join("");

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Luming Preview</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 16px; background: #f8fafc; }
      .luming-label { font-size: 12px; color: #334155; margin-bottom: 6px; font-weight: 600; }
      .luming-scene { margin-bottom: 12px; }
      .luming-diags { background: #fff7ed; border: 1px solid #fdba74; border-radius: 8px; padding: 10px 14px; }
      .luming-diags h2 { margin: 0 0 8px; font-size: 14px; }
      .luming-diags ul { margin: 0; padding-left: 18px; }
    </style>
  </head>
  <body>
    ${scenes || "<p>No structure scene parsed.</p>"}
    ${diagnostics ? `<aside class="luming-diags"><h2>Diagnostics</h2><ul>${diagnostics}</ul></aside>` : ""}
  </body>
</html>`;
}
