// Acceptance matrix for the frozen Option-2 semantics (docs/parse-rule.md §7).
const { compile } = require("../dist/src/compile.js");

let failures = 0;

function serialize(node, indent = "") {
    if (node.kind === "entity") {
        const n = node.node;
        const styles = Object.entries(n.styles).map(([k, v]) => `${k}=${v}`).join(",");
        let line = `${indent}${n.templateName}${n.terminated ? "!" : ""}`;
        if (styles) line += `{${styles}}`;
        if (n.content) line += "\n" + serialize(n.content, indent + "  ");
        return line;
    }
    const dir = node.direction === "row" ? "+" : "/";
    return indent + `(${dir})\n` + node.children.map((c) => serialize(c, indent + "  ")).join("\n");
}

function case1(name, source, expectScenes, expectedTrees, expectWarnings) {
    const result = compile(source, { mode: "preview" });
    const trees = result.scenes.map((s) => serialize(s));
    const warnings = result.diagnostics.filter((d) => d.level === "warning");
    const problems = [];
    if (result.scenes.length !== expectScenes) {
        problems.push(`scene count ${result.scenes.length} != ${expectScenes}`);
    }
    for (const expected of expectedTrees) {
        if (!trees.some((t) => t === expected)) {
            problems.push(`missing tree:\n${expected}\n---- got ----\n${trees.join("\n====\n") || "(none)"}`);
        }
    }
    if (expectedTrees.length !== trees.length) {
        problems.push(`tree count ${trees.length} != ${expectedTrees.length}`);
    }
    if (expectWarnings !== undefined && warnings.length !== expectWarnings) {
        problems.push(`warning count ${warnings.length} != ${expectWarnings}`);
    }
    if (problems.length > 0) {
        failures += 1;
        console.log(`FAIL ${name}`);
        problems.forEach((p) => console.log("  " + p.split("\n").join("\n  ")));
    } else {
        console.log(`PASS ${name}`);
    }
}

// 1
case1("A[A] two layers, inner terminus", "A[A]", 1, [
    "A\n  A!",
]);
// 2
case1("A[A[A]] three layers, written preserved", "A[A[A]]", 1, [
    "A\n  A\n    A!",
]);
// 3
case1("A[B]+B[A]", "A[B]\nB[A]", 1, [
    "A\n  B\n    A!",
]);
// 4
case1("B[C]+C[B]", "B[C]\nC[B]", 1, [
    "B\n  C\n    B!",
]);
// 5
case1("list[item item item]+item[list]", "list [item item item]\nitem [list]", 1, [
    "list\n  (+)\n    item\n      list!\n    item\n      list!\n    item\n      list!",
]);
// 6
case1("Page/Main share Content, full copies", "Page [ Content ]\nMain [ Content ]\nContent [ Icon ]", 2, [
    "Page\n  Content\n    Icon",
    "Main\n  Content\n    Icon",
]);
// 7
case1("A / B then A + B replaces scene", "A / B\nA + B", 1, [
    "(+)\n  A\n  B",
]);
// 8
case1("3-line main revision", "header / main [up + down] / footer\nmain[good bad]\nheader / main [left + right] / footer", 1, [
    "(/)\n  header\n  main\n    (+)\n      left\n      right\n  footer",
], 1);
// 9
case1("quickstart single-line", "Header / Sidebar + Main [ Tabs / Content [Form / Preview]] / Footer\nMain: bg #fda; 70;", 1, [
    "(/)\n  Header\n  (+)\n    Sidebar\n    Main{background-color=#fda,width=70%}\n      (/)\n        Tabs\n        Content\n          (/)\n            Form\n            Preview\n  Footer",
]);
// 9b three-line quickstart equals single-line
case1("quickstart three-line", "Header / Sidebar + Main / Footer\nMain [ Tabs / Content ]\nContent [Form / Preview]\nMain: bg #fda; 70;", 1, [
    "(/)\n  Header\n  (+)\n    Sidebar\n    Main{background-color=#fda,width=70%}\n      (/)\n        Tabs\n        Content\n          (/)\n            Form\n            Preview\n  Footer",
]);
// 10
case1("Row[Col[Titles]+Col[Body]] parallel same-line", "Row [ Col[Titles] + Col[Body] ]", 1, [
    "Row\n  (+)\n    Col\n      Titles\n    Col\n      Body",
]);
// 11
case1("List[Item[Icon] Item Item] first-only", "List [Item[Icon] Item Item]", 1, [
    "List\n  (+)\n    Item\n      Icon\n    Item\n    Item",
]);
// 12
case1("inline style binds to first instance only", "List [Item: bg #99f; Item Item]\nItem: bg #f99;", 1, [
    "List\n  (+)\n    Item{background-color=#99f}\n    Item{background-color=#f99}\n    Item{background-color=#f99}",
]);
// 13
case1("trailing structure after style anchor", "A: bg #fda/Footer", 1, [
    "(/)\n  A{background-color=#fda}\n  Footer",
]);
// 14
case1("cross-line override reaches into written interior", "Header / Sidebar + Main [ Tabs / Content ] / Footer\nMain [ Good Bad ]", 1, [
    "(/)\n  Header\n  (+)\n    Sidebar\n    Main\n      (+)\n        Good\n        Bad\n  Footer",
]);
// 15
case1("later standalone beats earlier written", "Row [ Col[Titles] + Col[Body] ]\nCol [Common]", 1, [
    "Row\n  (+)\n    Col\n      Common\n    Col\n      Common",
]);
// 16
case1("redeclaration warning emitted", "A [ X ]\nA [ Y ]", 1, [
    "A\n  Y",
], 1);

console.log(failures === 0 ? `\nALL ${16} CASES PASS` : `\n${failures} CASE(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
