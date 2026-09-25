#!/usr/bin/env node
// Build scripts/playground-template.html + dist/src modules into a single-file
// playground.html (embedded CSS/JS, open directly in a browser).
// Run `npm run build` first; then `npm run playground`.
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const templatePath = path.join(root, "scripts", "playground-template.html");
const outputPath = path.join(root, "playground.html");

const MODULE_FILES = ["./types", "./style", "./parser", "./compile"];
const PLACEHOLDER = "/*__MODULES__*/";

const template = fs.readFileSync(templatePath, "utf8");
if (!template.includes(PLACEHOLDER)) {
    throw new Error(`placeholder ${PLACEHOLDER} not found in template`);
}

const modulesCode = MODULE_FILES.map((name) => {
    const file = path.join(root, "dist", "src", name.slice(2) + ".js");
    const code = fs.readFileSync(file, "utf8");
    if (code.includes("</script")) {
        throw new Error(`${file} contains '</script' and cannot be inlined`);
    }
    return (
        "__define(" + JSON.stringify(name) + ", function (module, exports, require) {\n" +
        code +
        "\n});"
    );
}).join("\n\n");

const shim =
    "// Embedded Luming compiler (built from dist/src, CommonJS shim).\n" +
    "// Regenerate with: npm run build && npm run playground\n" +
    "var __registry = {};\n" +
    "function __define(name, factory) {\n" +
    "    var module = { exports: {} };\n" +
    "    factory(module, module.exports, function (dep) {\n" +
    "        if (!Object.prototype.hasOwnProperty.call(__registry, dep)) {\n" +
    "            throw new Error('module not found: ' + dep);\n" +
    "        }\n" +
    "        return __registry[dep];\n" +
    "    });\n" +
    "    __registry[name] = module.exports;\n" +
    "}\n";

const html = template.replace(PLACEHOLDER, () => shim + modulesCode);
fs.writeFileSync(outputPath, html, "utf8");
console.log(`Playground written: ${outputPath} (${(html.length / 1024).toFixed(1)} KB)`);
