// Shared helpers for tests. Not a test file (excluded from node --test discovery).
const { compile } = require("../dist/src/compile.js");

/** Compact textual shape of an expression tree, e.g. "(column Header (row Sidebar Main[...]))". */
function shape(expr) {
    if (expr.kind === "entity") return expr.name;
    if (expr.kind === "container") return expr.name + "[" + shape(expr.content) + "]";
    return "(" + expr.direction + " " + expr.children.map(shape).join(" ") + ")";
}

/** Compact textual dump of a scene list (entities carry ! when terminated). */
function dumpScene(node, indent = "") {
    if (node.kind === "entity") {
        const n = node.node;
        let line = indent + n.templateName + (n.terminated ? "!" : "");
        if (n.content) line += "\n" + dumpScene(n.content, indent + "  ");
        return line;
    }
    const dir = node.direction === "row" ? "(+)" : "(/)";
    return indent + dir + "\n" + node.children.map((c) => dumpScene(c, indent + "  ")).join("\n");
}

function scenesOf(source) {
    return compile(source, { mode: "preview" }).scenes.map((s) => dumpScene(s));
}

module.exports = { shape, dumpScene, scenesOf, compile };
