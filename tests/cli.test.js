const { test } = require("node:test");
const assert = require("node:assert");
const { execSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const CLI = path.join(ROOT, "dist", "cli.js");

function tmpdir(prefix) {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function run(args, cwd) {
    return execSync('node "' + CLI + '" ' + args, { cwd: cwd || ROOT, stdio: ["ignore", "pipe", "pipe"] });
}

function runFailing(args, cwd) {
    try {
        execSync('node "' + CLI + '" ' + args, { cwd: cwd || ROOT, stdio: ["ignore", "pipe", "pipe"] });
    } catch (error) {
        return error;
    }
    throw new Error("expected command to fail: " + args);
}

const INPUT =
    "Header / Sidebar + Main [ Tabs / Content ] / Footer\nContent [Form / Preview]\n\nMain: bg #fda; 70;\nTabs: label;\nForm: rd 4;";

test("cli preview writes a single-file html preview", () => {
    const dir = tmpdir("luming-cli-preview-");
    const input = path.join(dir, "input.luming");
    const out = path.join(dir, "out.html");
    fs.writeFileSync(input, INPUT, "utf8");

    run('preview "' + input + '" -o "' + out + '"');
    assert.ok(fs.existsSync(out), "preview file missing");
    const html = fs.readFileSync(out, "utf8");
    assert.ok(html.includes("luming-node"));
    assert.ok(html.includes("Main"));
});

test("cli preview uses the default output name when -o is absent", () => {
    const dir = tmpdir("luming-cli-default-");
    const input = path.join(dir, "input.luming");
    fs.writeFileSync(input, INPUT, "utf8");

    // 默认输出按 CWD 解析为 luming.preview.html —— 在输入所在目录下执行
    run('preview "' + input + '"', dir);
    const fallback = path.join(dir, "luming.preview.html");
    assert.ok(fs.existsSync(fallback), "default preview file missing");
});

test("cli generate emits vue components into the target directory", () => {
    const dir = tmpdir("luming-cli-gen-");
    const input = path.join(dir, "input.luming");
    const outDir = path.join(dir, "components");
    fs.writeFileSync(input, INPUT, "utf8");

    run('generate "' + input + '" -o "' + outDir + '" --framework vue');
    const files = fs.readdirSync(outDir);
    assert.ok(files.includes("MyMain.vue"));
    assert.ok(files.includes("MyHeader.vue"));
});

test("cli generate defaults to the html framework and generated/ directory", () => {
    const dir = tmpdir("luming-cli-genhtml-");
    const input = path.join(dir, "input.luming");
    fs.writeFileSync(input, INPUT, "utf8");

    run('generate "' + input + '"', dir);
    const files = fs.readdirSync(path.join(dir, "generated"));
    assert.ok(files.includes("MyMain.html"));
});

test("cli rejects unknown frameworks with a non-zero exit code", () => {
    const dir = tmpdir("luming-cli-badfw-");
    const input = path.join(dir, "input.luming");
    fs.writeFileSync(input, INPUT, "utf8");

    const error = runFailing('generate "' + input + '" --framework svelte');
    assert.notEqual(error.status, 0);
    assert.ok(String(error.stderr).includes("--framework must be one of"));
});

test("cli reports a missing input file and exits non-zero", () => {
    const error = runFailing('preview "' + path.join(tmpdir("luming-cli-missing-"), "nope.luming") + '"');
    assert.notEqual(error.status, 0);
    assert.ok(String(error.stderr).includes("Input file not found"));
});
