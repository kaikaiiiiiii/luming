import { CompileResult, RuntimeLayoutNode, RuntimeNode } from "./types";

/**
 * Default visual language: Microsoft Fluent 2.
 * Per-hierarchy-level accent colors come from the Fluent 2 shared palette
 * (brand blue, purple, green, orange, red, teal); surfaces use the Fluent
 * medium corner radius and elevation-4 shadow; text uses Segoe UI.
 */
const LEVEL_COLORS = ["#0F6CBD", "#8661C5", "#12A15E", "#F7630C", "#C50F1F", "#00B7C3"];

/** Fluent 2 elevation 4: layered, soft, directional. */
const FLUENT_SHADOW = "0 1px 2px rgba(0, 0, 0, 0.14), 0 0 2px rgba(0, 0, 0, 0.12)";

function levelBorderColor(level: number): string {
    return LEVEL_COLORS[level % LEVEL_COLORS.length];
}

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

function renderRuntimeEntity(node: RuntimeNode, level: number, flexChild = false): string {
    const styles: Record<string, string> = {
        ...{
            border: `1px solid ${levelBorderColor(level)}`,
            padding: "8px",
            margin: "6px",
            "border-radius": "8px",
            "background-color": "#ffffff",
            "box-shadow": FLUENT_SHADOW,
        },
        ...node.styles,
    };
    // `+` 水平组的子项默认横向等分；显式设置过 width / flex 的子项保留自己的设定。
    if (flexChild && !Object.prototype.hasOwnProperty.call(node.styles, "width")
        && !Object.prototype.hasOwnProperty.call(node.styles, "flex")) {
        styles.flex = "1 1 0";
    }

    const label = `<div class="luming-label">${escapeHtml(node.templateName)}${node.terminated ? " (Terminus)" : ""
        }</div>`;
    const content = node.content ? renderLayoutNode(node.content, level + 1) : "";

    return `<div class="luming-node level-${level}" style="${styleRecordToInline(styles)}">${label}${content}</div>`;
}

function renderLayoutNode(node: RuntimeLayoutNode, level: number, flexChild = false): string {
    if (node.kind === "entity") {
        return renderRuntimeEntity(node.node, level, flexChild);
    }

    const direction = node.direction === "row" ? "row" : "column";
    const children = node.children
        .map((child) => renderLayoutNode(child, level, node.direction === "row"))
        .join("");
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
      body { font-family: "Segoe UI", "Segoe UI Web (West European)", -apple-system, BlinkMacSystemFont, sans-serif; margin: 16px; background: #fafafa; color: #242424; }
      .luming-label { font-size: 12px; color: #616161; margin-bottom: 6px; font-weight: 600; }
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
