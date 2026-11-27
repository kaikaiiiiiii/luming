const { test } = require("node:test");
const assert = require("node:assert");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const skill = require("../dist/src/skill.js");

const ROOT = path.join(__dirname, "..");
const CLI = path.join(ROOT, "dist", "cli.js");
const SKILL_SOURCE = path.join(ROOT, "skill", "SKILL.md");
const SKILL_CONTENT = fs.readFileSync(SKILL_SOURCE, "utf8");

function tmpdir(prefix) {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/** A throwaway project directory with a `.git` marker so project-root detection is stable. */
function makeProject() {
    const dir = tmpdir("luming-skill-project-");
    fs.mkdirSync(path.join(dir, ".git"));
    return dir;
}

function run(args, cwd, env) {
    return spawnSync(process.execPath, [CLI, ...args], {
        cwd: cwd || ROOT,
        encoding: "utf8",
        env: { ...process.env, ...env },
    });
}

function installedFile(root, toolDir) {
    return path.join(root, toolDir, "luming", "SKILL.md");
}

test("canonical skill file has valid frontmatter and cheat sheet", () => {
    assert.ok(fs.existsSync(SKILL_SOURCE), "skill/SKILL.md is missing");
    assert.match(SKILL_CONTENT, /^---\nname: luming\ndescription: /);
    assert.ok(SKILL_CONTENT.includes("## Cheat sheet"));
    assert.ok(SKILL_CONTENT.includes("A / B"));
});

test("tool registry exposes the documented tools and skill roots", () => {
    assert.deepEqual(skill.skillToolIds(), ["dsh", "claude", "opencode", "agents"]);

    const home = tmpdir("luming-skill-env-");
    const env = {
        homeDir: home,
        dshHome: path.join(home, ".dsh"),
        configHome: path.join(home, ".config"),
        agentsHome: path.join(home, ".agents"),
    };
    assert.equal(
        skill.findSkillTool("claude").userSkillsDir(env),
        path.join(home, ".claude", "skills")
    );
    assert.equal(
        skill.findSkillTool("opencode").userSkillsDir(env),
        path.join(home, ".config", "opencode", "skills")
    );
    assert.equal(
        skill.findSkillTool("dsh").userSkillsDir(env),
        path.join(home, ".dsh", "skills")
    );
    assert.equal(skill.findSkillTool("nope"), undefined);
});

test("resolveProjectRoot walks up to the nearest .git", () => {
    const project = makeProject();
    const nested = path.join(project, "apps", "web");
    fs.mkdirSync(nested, { recursive: true });
    assert.equal(skill.resolveProjectRoot(nested), project);
});

test("detectProjectTools reports only existing tool marker directories", () => {
    const project = makeProject();
    fs.mkdirSync(path.join(project, ".claude"));
    fs.mkdirSync(path.join(project, ".opencode"));
    assert.deepEqual(
        skill.detectProjectTools(project).map((tool) => tool.id),
        ["claude", "opencode"]
    );
});

test("skill add --tool claude installs the canonical bundle into the project", () => {
    const project = makeProject();
    const result = run(["skill", "add", "--tool", "claude"], project);
    assert.equal(result.status, 0, result.stderr);
    const filePath = installedFile(project, path.join(".claude", "skills"));
    assert.ok(fs.existsSync(filePath), "installed skill file missing");
    assert.equal(fs.readFileSync(filePath, "utf8"), SKILL_CONTENT);
    assert.ok(result.stdout.includes("installed"));
});

test("skill add auto-detects every existing project tool directory", () => {
    const project = makeProject();
    fs.mkdirSync(path.join(project, ".dsh"));
    fs.mkdirSync(path.join(project, ".opencode"));
    const result = run(["skill", "add"], project);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(fs.existsSync(installedFile(project, path.join(".dsh", "skills"))));
    assert.ok(fs.existsSync(installedFile(project, path.join(".opencode", "skills"))));
});

test("skill add falls back to .agents/skills when no tool directory exists", () => {
    const project = makeProject();
    const result = run(["skill", "add"], project);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(fs.existsSync(installedFile(project, path.join(".agents", "skills"))));
    assert.ok(result.stdout.includes(".agents/skills"));
});

test("skill add is idempotent when the installed copy is unchanged", () => {
    const project = makeProject();
    fs.mkdirSync(path.join(project, ".claude"));
    run(["skill", "add", "--tool", "claude"], project);
    const second = run(["skill", "add", "--tool", "claude"], project);
    assert.equal(second.status, 0, second.stderr);
    assert.ok(second.stdout.includes("up to date"));
});

test("skill add refuses to overwrite a different copy without --force", () => {
    const project = makeProject();
    fs.mkdirSync(path.join(project, ".claude"));
    const filePath = installedFile(project, path.join(".claude", "skills"));
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, "stale skill\n", "utf8");

    const refused = run(["skill", "add", "--tool", "claude"], project);
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /--force/);
    assert.equal(fs.readFileSync(filePath, "utf8"), "stale skill\n");

    const forced = run(["skill", "add", "--tool", "claude", "--force"], project);
    assert.equal(forced.status, 0, forced.stderr);
    assert.equal(fs.readFileSync(filePath, "utf8"), SKILL_CONTENT);
    assert.ok(forced.stdout.includes("--force"));
});

test("skill add --scope user --tool dsh honors DSH_HOME", () => {
    const project = makeProject();
    const dshHome = tmpdir("luming-skill-dsh-");
    const result = run(
        ["skill", "add", "--scope", "user", "--tool", "dsh"],
        project,
        { DSH_HOME: dshHome }
    );
    assert.equal(result.status, 0, result.stderr);
    assert.ok(fs.existsSync(path.join(dshHome, "skills", "luming", "SKILL.md")));
});

test("skill add --scope user auto-detects existing user tool markers", () => {
    const project = makeProject();
    const fakeHome = tmpdir("luming-skill-home-");
    fs.mkdirSync(path.join(fakeHome, ".claude"));
    const result = run(["skill", "add", "--scope", "user"], project, {
        HOME: fakeHome,
        USERPROFILE: fakeHome,
        DSH_HOME: path.join(fakeHome, ".dsh"),
    });
    assert.equal(result.status, 0, result.stderr);
    assert.ok(fs.existsSync(path.join(fakeHome, ".claude", "skills", "luming", "SKILL.md")));
    // The real user profile must not be touched by the test.
    assert.ok(!fs.existsSync(path.join(fakeHome, ".dsh", "skills")));
});

test("skill add --scope user fails when nothing is detected", () => {
    const project = makeProject();
    const fakeHome = tmpdir("luming-skill-empty-");
    const result = run(["skill", "add", "--scope", "user"], project, {
        HOME: fakeHome,
        USERPROFILE: fakeHome,
        DSH_HOME: path.join(fakeHome, ".dsh"),
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /No user-level tool directory detected/);
});

test("skill add --dir installs into an explicit skills root", () => {
    const project = makeProject();
    const result = run(["skill", "add", "--dir", "custom-skills"], project);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(fs.existsSync(path.join(project, "custom-skills", "luming", "SKILL.md")));
});

test("skill add rejects unknown tools and prints the supported ids", () => {
    const project = makeProject();
    const result = run(["skill", "add", "--tool", "svelte"], project);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Unknown tool: svelte/);
    assert.match(result.stderr, /dsh, claude, opencode, agents/);
});

test("skill add --help documents the command", () => {
    const result = run(["skill", "add", "--help"]);
    assert.equal(result.status, 0);
    assert.ok(result.stdout.includes("luming skill add"));
    assert.ok(result.stdout.includes("dsh, claude, opencode, agents"));
});
