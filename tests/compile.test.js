const { test } = require("node:test");
const assert = require("node:assert");
const { compile } = require("../dist/src/compile.js");
const { scenesOf, dumpScene } = require("./helpers.js");

test("acceptance: recursion truncation family", () => {
    assert.deepEqual(scenesOf("A[A]"), ["A\n  A!"]);
    assert.deepEqual(scenesOf("A[A[A]]"), ["A\n  A\n    A!"]);
    assert.deepEqual(scenesOf("A[B]\nB[A]"), ["A\n  B\n    A!"]);
    assert.deepEqual(scenesOf("B[C]\nC[B]"), ["B\n  C\n    B!"]);
    assert.deepEqual(scenesOf("list [item item item]\nitem [list]"), [
        "list\n  (+)\n    item\n      list!\n    item\n      list!\n    item\n      list!",
    ]);
});

test("acceptance: shared entity produces full independent copies on one page", () => {
    assert.deepEqual(scenesOf("Page [ Content ]\nMain [ Content ]\nContent [ Icon ]"), [
        "(/)\n  Page\n    Content\n      Icon\n  Main\n    Content\n      Icon",
    ]);
});

test("acceptance: cross-line override reaches into written interiors", () => {
    assert.deepEqual(
        scenesOf("Header / Sidebar + Main [ Tabs / Content ] / Footer\nMain [ Good Bad ]"),
        ["(/)\n  Header\n  (+)\n    Sidebar\n    Main\n      (+)\n        Good\n        Bad\n  Footer"]
    );
});

test("acceptance: same-line declarations are parallel, later lines override", () => {
    assert.deepEqual(scenesOf("Row [ Col[Titles] + Col[Body] ]"), [
        "Row\n  (+)\n    Col\n      Titles\n    Col\n      Body",
    ]);
    assert.deepEqual(scenesOf("Row [ Col[Titles] + Col[Body] ]\nCol [Common]"), [
        "Row\n  (+)\n    Col\n      Common\n    Col\n      Common",
    ]);
    assert.deepEqual(scenesOf("A[B]\nA[C]"), ["A\n  C"]);
});

test("acceptance: same-line declarations never leak into bare siblings", () => {
    assert.deepEqual(scenesOf("List [Item[Icon] Item Item]"), [
        "List\n  (+)\n    Item\n      Icon\n    Item\n    Item",
    ]);
});

test("scene selection: single-subject line for a placed entity is declaration-only", () => {
    const result = compile("Header / Sidebar + Main / Footer\nMain [ Tabs / Content ]\nContent [Form / Preview]");
    assert.deepEqual(result.sceneLineNumbers, [1]);
    // 三行拆分与单行等效
    assert.deepEqual(scenesOf("Header / Sidebar + Main / Footer\nMain [ Tabs / Content ]\nContent [Form / Preview]"), [
        "(/)\n  Header\n  (+)\n    Sidebar\n    Main\n      (/)\n        Tabs\n        Content\n          (/)\n            Form\n            Preview\n  Footer",
    ]);
});

test("page composition: surviving units compose the single page root in document order", () => {
    const result = compile("A [ X ]\nB [ Y ]\nA / B");
    assert.deepEqual(result.sceneLineNumbers, [1, 3]);
    assert.deepEqual(result.scenes.map((s) => dumpScene(s)), [
        "(/)\n  A\n    X\n  (/)\n    A\n      X\n    B\n      Y",
    ]);
    assert.equal(result.scenes.length, 1, "a document is exactly one page");
});

test("page composition: disjoint units flow vertically, never split into sections", () => {
    const result = compile("Row [ Col[Titles] + Col[Body] ]\nList [Item Item Item]");
    assert.equal(result.scenes.length, 1);
    assert.deepEqual(result.scenes.map((s) => dumpScene(s)), [
        "(/)\n  Row\n    (+)\n      Col\n        Titles\n      Col\n        Body\n  List\n    (+)\n      Item\n      Item\n      Item",
    ]);
});

test("multi-subject replacement drops entities that only existed in the replaced line", () => {
    const result = compile("Header / Main [ A ] / Footer\nHeader / Main [ B ]");
    assert.deepEqual(result.sceneLineNumbers, [2]);
    assert.deepEqual(result.scenes.map((s) => dumpScene(s)), ["(/)\n  Header\n  Main\n    B"]);
});

test("terminus nodes keep entity-level styles", () => {
    const result = compile("A: bg red;\nA[B]\nB[A]");
    // 裸引用展开不包 group：A 的 content 直接是 B 实例，B 的 content 是终止 A
    const innerA = result.scenes[0].node.content.node.content.node;
    assert.equal(innerA.terminated, true);
    assert.equal(innerA.styles["background-color"], "red");
});

test("instance inline styles override entity-level styles per occurrence", () => {
    const result = compile("List [Item: bg #99f; Item Item]\nItem: bg #f99;");
    const row = result.scenes[0].node.content.children;
    assert.equal(row[0].node.styles["background-color"], "#99f");
    assert.equal(row[1].node.styles["background-color"], "#f99");
    assert.equal(row[2].node.styles["background-color"], "#f99");
});

test("style-only document still exposes its templates as roots", () => {
    const result = compile("A: bg red;");
    assert.equal(result.scenes.length, 1);
    assert.equal(result.scenes[0].node.templateName, "A");
    assert.equal(result.scenes[0].node.styles["background-color"], "red");
});

test("empty source yields no scenes and no crash", () => {
    const result = compile("");
    assert.equal(result.scenes.length, 0);
    assert.equal(result.roots.length, 0);
});

test("CRLF source compiles identically to LF", () => {
    const src = "Header / Sidebar + Main [ Tabs / Content ] / Footer\nContent [Form / Preview]";
    assert.deepEqual(scenesOf(src.replace(/\n/g, "\r\n")), scenesOf(src));
});
