#!/usr/bin/env node
// Deploy playground.html to the gh-pages branch as index.html, then push.
// Policy (AGENTS.md「gh-pages 在线预览」): run after committing your changes —
// the working tree must be clean, and a rebuild must not produce diffs.
const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const TMP = path.join(root, ".gh-pages-tmp");

function git(args, options = {}) {
    return execSync("git " + args, {
        cwd: root,
        stdio: options.quiet ? "pipe" : "inherit",
    }).toString().trim();
}

/** Content-based clean check (ignores EOL phantom modifications). */
function isDirty() {
    try {
        git("diff --quiet HEAD", { quiet: true });
        return false;
    } catch {
        return true;
    }
}

function main() {
    if (isDirty()) {
        console.error("Deploy aborted: working tree has uncommitted changes. Commit first.");
        process.exit(1);
    }

    console.log("> rebuild playground");
    execSync("npm run build", { cwd: root, stdio: "inherit" });
    execSync("npm run playground", { cwd: root, stdio: "inherit" });

    if (isDirty()) {
        console.error(
            "Deploy aborted: rebuild changed files that are not committed.\n" +
            "Commit the rebuilt playground.html first (so the site matches the repo), then deploy again."
        );
        process.exit(1);
    }

    const masterSha = git("rev-parse --short HEAD", { quiet: true });
    git("worktree prune");

    let worktreeAdded = false;
    try {
        git("worktree add " + JSON.stringify(TMP) + " gh-pages");
        worktreeAdded = true;
        // gh-pages 分支上的行尾属性：index.html 固定 LF（与主仓库的生成产物一致）
        const attrs = path.join(TMP, ".gitattributes");
        if (!fs.existsSync(attrs)) {
            fs.writeFileSync(attrs, "index.html text eol=lf\n");
        }
        fs.copyFileSync(path.join(root, "playground.html"), path.join(TMP, "index.html"));

        if (!git("status --porcelain", { quiet: true, cwd: TMP })) {
            console.log("gh-pages already up to date (master " + masterSha + ").");
            return;
        }
        git("-C " + JSON.stringify(TMP) + " add index.html");
        git("-C " + JSON.stringify(TMP) + " add .gitattributes");
        git("-C " + JSON.stringify(TMP) + ' commit -m "deploy: playground @ master ' + masterSha + '"');
        git("push origin gh-pages");
        console.log("Deployed to gh-pages (playground @ master " + masterSha + ").");
    } finally {
        if (worktreeAdded) {
            try {
                git("worktree remove --force " + JSON.stringify(TMP));
            } catch (error) {
                console.error("Warning: failed to remove worktree " + TMP + " — run `git worktree prune`.");
            }
        }
    }
}

main();
