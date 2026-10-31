const { test } = require("node:test");
const assert = require("node:assert");
const { resolveStyleToken } = require("../dist/src/style.js");

test("bg shorthand maps to background-color", () => {
    assert.deepEqual(resolveStyleToken("bg #fda"), [{ key: "background-color", value: "#fda" }]);
});

test("rd shorthand auto-appends px only for bare numbers", () => {
    assert.deepEqual(resolveStyleToken("rd 4"), [{ key: "border-radius", value: "4px" }]);
    assert.deepEqual(resolveStyleToken("rd 4px"), [{ key: "border-radius", value: "4px" }]);
    assert.deepEqual(resolveStyleToken("rd 0.5em"), [{ key: "border-radius", value: "0.5em" }]);
});

test("preset classes expand to concrete CSS property groups", () => {
    const tab = resolveStyleToken("tab");
    const keys = tab.map((item) => item.key);
    assert.ok(keys.includes("display"));
    assert.ok(keys.includes("border-radius"));
    assert.equal(tab.find((item) => item.key === "border-radius").value, "9999px");

    const label = resolveStyleToken("label");
    assert.ok(label.some((item) => item.key === "font-size"));
});

test("bare numbers and percents become width", () => {
    assert.deepEqual(resolveStyleToken("70"), [{ key: "width", value: "70%" }]);
    assert.deepEqual(resolveStyleToken("70%"), [{ key: "width", value: "70%" }]);
    assert.deepEqual(resolveStyleToken("12.5"), [{ key: "width", value: "12.5%" }]);
});

test("css-like tokens pass through as property pairs", () => {
    assert.deepEqual(resolveStyleToken("border 1px solid red"), [
        { key: "border", value: "1px solid red" },
    ]);
});

test("unresolvable tokens return null", () => {
    assert.equal(resolveStyleToken("foo"), null);
    assert.equal(resolveStyleToken(""), null);
    assert.equal(resolveStyleToken("   "), null);
});
