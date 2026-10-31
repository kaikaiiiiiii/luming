const { test } = require("node:test");
const assert = require("node:assert");
const { compile } = require("../dist/src/compile.js");
const { renderPreviewHtml } = require("../dist/src/renderer.js");

const QUICKSTART =
    "Header / Sidebar + Main [ Tabs / Content ] / Footer\nContent [Form / Preview]\n\nMain: bg #fda; 70;\nTabs: label;\nForm: rd 4;";

test("preview renders every entity label and one section per scene", () => {
    const html = renderPreviewHtml(compile(QUICKSTART, { mode: "preview" }));
    for (const name of ["Header", "Sidebar", "Main", "Tabs", "Content", "Form", "Preview", "Footer"]) {
        assert.ok(html.includes('class="luming-label">' + name + "<"), "missing label: " + name);
    }
    assert.equal(html.split('class="luming-scene"').length - 1, 1);
});

test("preview keeps explicit width and equal-divides the remaining row child", () => {
    const html = renderPreviewHtml(compile(QUICKSTART, { mode: "preview" }));
    assert.ok(html.includes("width: 70%;"), "Main should keep width: 70%");
    assert.equal(html.split("flex: 1 1 0").length - 1, 1, "only Sidebar should flex");
});

test("preview marks terminus nodes", () => {
    const html = renderPreviewHtml(compile("A[B]\nB[A]", { mode: "preview" }));
    assert.ok(html.includes("(Terminus)"));
});

test("preview equal-divides all items of an implicit row", () => {
    const html = renderPreviewHtml(compile("List [Item Item Item]", { mode: "preview" }));
    assert.equal(html.split("flex: 1 1 0").length - 1, 3);
});

test("preview renders preset classes as concrete CSS", () => {
    const html = renderPreviewHtml(compile("Tabs: tab;\nForm: label;"));
    assert.ok(html.includes("border-radius: 9999px;"));
    assert.ok(html.includes("padding: 4px 12px;"));
    assert.ok(html.includes("font-size: 12px;"));
});

test("preview embeds diagnostics", () => {
    const result = compile("A: foo;");
    const html = renderPreviewHtml(result);
    assert.ok(html.includes('class="luming-diags"'));
    assert.ok(html.includes("Unsupported style token: foo"));
    assert.ok(html.includes("[warning]"));
});

test("preview embeds error diagnostics", () => {
    const html = renderPreviewHtml(compile("A | B"));
    assert.ok(html.includes("luming-diags"));
    assert.ok(html.includes("Invalid character")); // 渲染器会把单引号转义为 &#39;
    assert.ok(html.includes("[error]"));
});

test("empty document renders the no-scene placeholder", () => {
    const html = renderPreviewHtml(compile(""));
    assert.ok(html.includes("No structure scene parsed."));
});
