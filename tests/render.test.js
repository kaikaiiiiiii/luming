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

test("Fluent 2 defaults: medium corner, elevation shadow, brand level color", () => {
    const html = renderPreviewHtml(compile(QUICKSTART, { mode: "preview" }));
    assert.ok(html.includes("border-radius: 8px;"), "Fluent medium corner radius");
    assert.ok(html.includes("box-shadow: 0 1px 2px rgba(0, 0, 0, 0.14), 0 0 2px rgba(0, 0, 0, 0.12);"),
        "Fluent elevation-4 shadow");
    assert.ok(html.includes("border: 1px solid #0F6CBD;"), "level 0 uses the Fluent brand color");
    assert.ok(html.includes('"Segoe UI"'), "page uses Segoe UI");
    assert.ok(html.includes("background: #fafafa;"), "Fluent neutral page background");
    assert.ok(html.includes("color: #616161;"), "labels use Fluent secondary text color");
});

test("user styles override the Fluent defaults (preset card provides its own shadow)", () => {
    const html = renderPreviewHtml(compile("Panel: card;", { mode: "preview" }));
    assert.ok(html.includes("box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);"),
        "card preset shadow wins over the default");
    assert.ok(!html.includes("0 1px 2px rgba(0, 0, 0, 0.14)"),
        "default shadow must not leak onto the styled entity");
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
