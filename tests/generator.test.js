const { test } = require("node:test");
const assert = require("node:assert");
const { compile } = require("../dist/src/compile.js");
const { generateFiles, transformComponentName } = require("../dist/src/generator.js");

const QUICKSTART =
    "Header / Sidebar + Main [ Tabs / Content ] / Footer\nContent [Form / Preview]\n\nMain: bg #fda; 70;\nTabs: label;\nForm: rd 4;";

test("reserved HTML tag names get the default My prefix", () => {
    assert.equal(transformComponentName("Header"), "MyHeader");
    assert.equal(transformComponentName("Main"), "MyMain");
    assert.equal(transformComponentName("Form"), "MyForm");
    assert.equal(transformComponentName("Sidebar"), "Sidebar");
    assert.equal(transformComponentName("Tabs"), "Tabs");
});

test("componentRename takes priority over the reserved prefix", () => {
    assert.equal(transformComponentName("Header", { componentRename: { Header: "SiteHeader" } }), "SiteHeader");
    assert.equal(transformComponentName("Header", { reservedPrefix: "App" }), "AppHeader");
});

test("one file per active template, overridden-away templates get no file", () => {
    const quickstart = generateFiles(compile(QUICKSTART), "vue");
    assert.deepEqual(
        quickstart.map((f) => f.filePath).sort(),
        [
            "Content.vue", "MyFooter.vue", "MyForm.vue", "MyHeader.vue",
            "MyMain.vue", "Preview.vue", "Sidebar.vue", "Tabs.vue",
        ]
    );

    // A[B] 后写 A[C]：B 被覆盖出局，不生成文件；A 是保留标签 <a>，带 My 前缀
    const overridden = generateFiles(compile("A[B]\nA[C]"), "vue");
    assert.deepEqual(overridden.map((f) => f.filePath).sort(), ["C.vue", "MyA.vue"]);
});

test("vue files: script setup imports, section class, scoped styles", () => {
    const files = generateFiles(compile(QUICKSTART), "vue");
    const main = files.find((f) => f.filePath === "MyMain.vue").content;
    assert.ok(main.includes('<script setup lang="ts">'));
    assert.ok(main.includes("import Tabs from './Tabs.vue';"));
    assert.ok(main.includes("import Content from './Content.vue';"));
    assert.ok(main.includes('<section class="Main">'));
    assert.ok(main.includes("<style scoped>"));
    assert.ok(main.includes("background-color: #fda;"));
});

test("react files: tsx function components with style objects", () => {
    const files = generateFiles(compile(QUICKSTART), "react");
    const main = files.find((f) => f.filePath === "MyMain.tsx").content;
    assert.ok(main.includes('import { Tabs } from \'./Tabs\';'));
    assert.ok(main.includes("export function MyMain()"));
    assert.ok(main.includes('"background-color": "#fda"'));
});

test("html files: section with style block", () => {
    const files = generateFiles(compile(QUICKSTART), "html");
    const main = files.find((f) => f.filePath === "MyMain.html").content;
    assert.ok(main.includes('<section class="Main">'));
    assert.ok(main.includes(".Main {"));
    assert.ok(main.includes("<style>"));
});

test("component content comes from the latest declaration", () => {
    const files = generateFiles(compile("A[B]\nA[C]"), "html");
    const a = files.find((f) => f.filePath === "MyA.html").content;
    assert.ok(/<C\s*\/>/.test(a), "A should render C");
    assert.ok(!a.includes("<B"), "A should not render the overridden B");
});
