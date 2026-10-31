const { test } = require("node:test");
const assert = require("node:assert");
const { parse } = require("../dist/src/parser.js");
const { shape } = require("./helpers.js");

const structuresOf = (source) =>
    parse(source).statements.filter((s) => s.kind === "structure").map((s) => shape(s.expression));

test("operator precedence: + binds tighter than /", () => {
    assert.deepEqual(structuresOf("A + B / C"), ["(column (row A B) C)"]);
    assert.deepEqual(structuresOf("A / B + C + D / E"), ["(column A (row B C D) E)"]);
});

test("parens group forces precedence without adding nodes", () => {
    assert.deepEqual(structuresOf("A + (B / C)"), ["(row A (column B C))"]);
    // 同向嵌套没有优先级可言，collapse 展平为一层（视觉等价且避免双层 gap）
    assert.deepEqual(structuresOf("A / (B / C) / D"), ["(column A B C D)"]);
});

test("container brackets nest and set content", () => {
    assert.deepEqual(structuresOf("A [B / C]"), ["A[(column B C)]"]);
    assert.deepEqual(structuresOf("A[B[C]]"), ["A[B[C]]"]);
});

test("implicit + only inside []", () => {
    assert.deepEqual(structuresOf("A [B C]"), ["A[(row B C)]"]);
    assert.deepEqual(structuresOf("A[B C[D E]]"), ["A[(row B C[(row D E)])]"]);
    // 顶层空格不是结构符号 → 解析错误诊断
    const doc = parse("A B");
    assert.ok(doc.diagnostics.some((d) => d.level === "error" && /Unexpected token 'B'/.test(d.message)));
});

test("quickstart single line parses to the documented tree", () => {
    assert.deepEqual(
        structuresOf("Header / Sidebar + Main [ Tabs / Content ] / Footer"),
        ["(column Header (row Sidebar Main[(column Tabs Content)]) Footer)"]
    );
});

test("interior declarations recorded in pre-order with line numbers", () => {
    const doc = parse("A [B [C]]");
    const decls = doc.templates.A.interiorDeclarations;
    assert.equal(decls.length, 1);
    assert.equal(decls[0].line, 1);
    assert.equal(decls[0].order, 0);
    assert.equal(shape(decls[0].content), "B[C]");
    assert.equal(doc.templates.B.interiorDeclarations.length, 1);
    assert.equal(doc.templates.B.interiorDeclarations[0].order, 1);
    assert.equal(doc.templates.C.interiorDeclarations.length, 0);
});

test("templateOrder follows first appearance", () => {
    const doc = parse("Footer\nMain [ A ]\nB");
    assert.deepEqual(doc.templateOrder, ["Footer", "Main", "A", "B"]);
});

test("leading style anchor: pure style line merges per property", () => {
    const doc = parse("Main: bg #fda; 70;");
    assert.equal(doc.statements.filter((s) => s.kind === "structure").length, 0);
    assert.deepEqual(doc.templates.Main.styles, {
        "background-color": "#fda",
        width: "70%",
    });
});

test("later style line overrides same property only", () => {
    const doc = parse("A: bg #fda; 70;\nA: bg #99f;");
    assert.deepEqual(doc.templates.A.styles, {
        "background-color": "#99f",
        width: "70%",
    });
});

test("trailing structure after style anchor continues from the anchored entity", () => {
    const doc = parse("A: bg #fda/Footer");
    assert.deepEqual(structuresOf("A: bg #fda/Footer"), ["(column A Footer)"]);
    assert.deepEqual(doc.templates.A.styles, { "background-color": "#fda" });
    assert.equal(doc.statements.filter((s) => s.kind === "style").length, 1);
});

test("inline style anchor binds to the nearest identifier only", () => {
    const doc = parse("List [Item: bg #99f; Item Item]");
    const stmt = doc.statements.find((s) => s.kind === "structure");
    const row = stmt.expression.content;
    assert.equal(row.children[0].inlineStyles[0].key, "background-color");
    assert.equal(row.children[0].inlineStyles[0].value, "#99f");
    assert.equal(row.children[1].inlineStyles, undefined);
    assert.equal(row.children[2].inlineStyles, undefined);
    // 分号后的裸名称是兄弟主体，不是样式内容
    assert.equal(row.children.length, 3);
});

test("unresolvable style token warns and is dropped", () => {
    const doc = parse("A: foo;");
    assert.ok(doc.diagnostics.some((d) => d.level === "warning" && /Unsupported style token: foo/.test(d.message)));
    assert.deepEqual(doc.templates.A.styles, {});
});

test("invalid character produces an error diagnostic, line skipped", () => {
    const doc = parse("A | B\nC / D");
    assert.ok(doc.diagnostics.some((d) => d.level === "error" && /Invalid character '\|'/.test(d.message)));
    assert.deepEqual(structuresOf("A | B\nC / D"), ["(column C D)"]);
});

test("redeclaration warning lists every declaration line", () => {
    const doc = parse("A [ X ]\nA [ Y ]");
    const warnings = doc.diagnostics.filter((d) => d.level === "warning");
    assert.equal(warnings.length, 1);
    assert.ok(/A 的内部结构被声明 2 次（第 1、2 行）/.test(warnings[0].message));
});

test("CRLF sources parse identically to LF", () => {
    const lf = parse("Header / Main [ Tabs ] / Footer\nMain: bg #fda;");
    const crlf = parse("Header / Main [ Tabs ] / Footer\r\nMain: bg #fda;");
    assert.deepEqual(crlf.templateOrder, lf.templateOrder);
    assert.deepEqual(crlf.templates.Main.styles, lf.templates.Main.styles);
});
