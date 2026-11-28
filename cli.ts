#!/usr/bin/env node

import * as fs from "node:fs";
import * as path from "node:path";
import {
    compile,
    detectProjectTools,
    detectUserTools,
    Diagnostic,
    findSkillTool,
    generateFiles,
    GenerateFramework,
    GeneratorConfig,
    readCanonicalSkill,
    readInstalledSkill,
    renderPreviewHtml,
    resolveProjectRoot,
    resolveSkillEnvironment,
    SKILL_NAME,
    SkillScope,
    skillFilePath,
    skillToolIds,
    SkillToolDefinition,
    writeSkill,
} from "./src";

type ParsedArgs = {
    command: "preview" | "generate" | "skill" | "help";
    inputFile?: string;
    output?: string;
    framework: GenerateFramework;
    configPath?: string;
    skillAction?: "add";
    skillTool?: string;
    skillScope: SkillScope;
    skillDir?: string;
    force: boolean;
};

function printHelp(): void {
    process.stdout.write(`Luming CLI\n\n`);
    process.stdout.write(`Usage:\n`);
    process.stdout.write(`  lum preview <input.luming> [-o output.html]\n`);
    process.stdout.write(`  lum generate <input.luming> [-o outdir] [-f html|vue|react] [--config path]\n`);
    process.stdout.write(`  lum skill add [--tool dsh|claude|opencode|agents] [--scope project|user] [--dir <skills-root>] [--force]\n\n`);
    process.stdout.write(`Installed from npm as "luming-say": npx luming-say <command> works too.\n`);
    process.stdout.write(`Tools: ${skillToolIds().join(", ")} (agents = cross-tool convention)\n`);
    process.stdout.write(`Diagnostics go to stderr; an error-level diagnostic exits with code 1\n`);
    process.stdout.write(`(outputs are still written), warnings alone exit with code 0.\n`);
}

/** Load the generator config (README「使用 - 生成时转换」): explicit --config path or luming.config.json in cwd. */
function loadConfig(configPath?: string): GeneratorConfig {
    const candidates = configPath
        ? [configPath]
        : ["luming.config.json"];
    for (const candidate of candidates) {
        const abs = path.resolve(process.cwd(), candidate);
        if (!fs.existsSync(abs)) {
            continue;
        }
        try {
            return JSON.parse(fs.readFileSync(abs, "utf8")) as GeneratorConfig;
        } catch (error) {
            throw new Error(`Invalid config file: ${candidate}`);
        }
    }
    return {};
}

function helpArgs(): ParsedArgs {
    return {
        command: "help",
        framework: "html",
        skillScope: "project",
        force: false,
    };
}

function nextValue(args: string[], index: number, flag: string): string {
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${flag}`);
    }
    return value;
}

function parseSkillArgs(rest: string[]): ParsedArgs {
    const action = rest[0];
    if (!action || action === "-h" || action === "--help" || action === "help") {
        return helpArgs();
    }
    if (action !== "add") {
        throw new Error(`Unknown skill action: ${action}. Usage: lum skill add [options]`);
    }

    const parsed: ParsedArgs = {
        command: "skill",
        skillAction: "add",
        framework: "html",
        skillScope: "project",
        force: false,
    };
    for (let i = 1; i < rest.length; i += 1) {
        const arg = rest[i];
        if (arg === "-h" || arg === "--help") {
            return helpArgs();
        }
        if (arg === "--tool" || arg === "-t") {
            parsed.skillTool = nextValue(rest, i, arg);
            i += 1;
            continue;
        }
        if (arg === "--scope") {
            const value = nextValue(rest, i, arg);
            if (value !== "project" && value !== "user") {
                throw new Error("--scope must be one of: project, user");
            }
            parsed.skillScope = value;
            i += 1;
            continue;
        }
        if (arg === "--dir") {
            parsed.skillDir = nextValue(rest, i, arg);
            i += 1;
            continue;
        }
        if (arg === "--force") {
            parsed.force = true;
            continue;
        }
        throw new Error(`Unknown option for skill add: ${arg}`);
    }
    return parsed;
}

function parseArgs(argv: string[]): ParsedArgs {
    const [commandRaw, ...rest] = argv;
    if (!commandRaw || commandRaw === "-h" || commandRaw === "--help" || commandRaw === "help") {
        return helpArgs();
    }

    if (commandRaw === "skill") {
        return parseSkillArgs(rest);
    }

    if (commandRaw !== "preview" && commandRaw !== "generate") {
        throw new Error(`Unknown command: ${commandRaw}`);
    }

    let inputFile: string | undefined;
    let output: string | undefined;
    let framework: GenerateFramework = "html";
    let configPath: string | undefined;

    for (let i = 0; i < rest.length; i += 1) {
        const arg = rest[i];
        if (arg === "-o" || arg === "--out") {
            output = rest[i + 1];
            i += 1;
            continue;
        }
        if (arg === "-f" || arg === "--framework") {
            const value = rest[i + 1] as GenerateFramework | undefined;
            if (!value || (value !== "html" && value !== "vue" && value !== "react")) {
                throw new Error("--framework must be one of: html, vue, react");
            }
            framework = value;
            i += 1;
            continue;
        }
        if (arg === "-c" || arg === "--config") {
            configPath = rest[i + 1];
            i += 1;
            continue;
        }
        if (!inputFile) {
            inputFile = arg;
            continue;
        }
    }

    return {
        command: commandRaw,
        inputFile,
        output,
        framework,
        configPath,
        skillScope: "project",
        force: false,
    };
}

function ensureInput(inputFile: string | undefined): string {
    if (!inputFile) {
        throw new Error("Input file is required.");
    }
    const absolute = path.resolve(process.cwd(), inputFile);
    if (!fs.existsSync(absolute)) {
        throw new Error(`Input file not found: ${absolute}`);
    }
    return absolute;
}

/**
 * Print diagnostics to stderr and report whether any of them is an error.
 * Warnings alone keep the exit code at 0; errors set it to 1
 * (see README「使用 - 诊断与退出码」).
 */
function reportDiagnostics(diagnostics: Diagnostic[]): boolean {
    for (const diagnostic of diagnostics) {
        const location = diagnostic.line !== undefined ? `line ${diagnostic.line}: ` : "";
        process.stderr.write(`${location}[${diagnostic.level}] ${diagnostic.message}\n`);
    }
    return diagnostics.some((diagnostic) => diagnostic.level === "error");
}

function runPreview(inputPath: string, output?: string): void {
    const source = fs.readFileSync(inputPath, "utf8");
    const result = compile(source, { mode: "preview" });
    const html = renderPreviewHtml(result);

    const outputPath = output
        ? path.resolve(process.cwd(), output)
        : path.resolve(process.cwd(), "luming.preview.html");
    fs.writeFileSync(outputPath, html, "utf8");

    process.stdout.write(`Preview written: ${outputPath}\n`);
    const hasErrors = reportDiagnostics(result.diagnostics);
    if (result.diagnostics.length > 0) {
        process.stdout.write(`Diagnostics: ${result.diagnostics.length} (see stderr)\n`);
    }
    if (hasErrors) {
        process.exitCode = 1;
    }
}

function runGenerate(
    inputPath: string,
    output: string | undefined,
    framework: GenerateFramework,
    configPath: string | undefined
): void {
    const source = fs.readFileSync(inputPath, "utf8");
    const result = compile(source, { mode: "generate" });
    const config = loadConfig(configPath);
    const files = generateFiles(result, framework, config);

    const outDir = output
        ? path.resolve(process.cwd(), output)
        : path.resolve(process.cwd(), "generated");
    fs.mkdirSync(outDir, { recursive: true });

    for (const file of files) {
        const target = path.join(outDir, file.filePath);
        fs.writeFileSync(target, file.content, "utf8");
    }

    process.stdout.write(`Generated ${files.length} file(s) at: ${outDir}\n`);
    const hasErrors = reportDiagnostics(result.diagnostics);
    if (result.diagnostics.length > 0) {
        process.stdout.write(`Diagnostics: ${result.diagnostics.length} (see stderr)\n`);
    }
    if (hasErrors) {
        process.exitCode = 1;
    }
}

function requireSkillTool(id: string): SkillToolDefinition {
    const tool = findSkillTool(id);
    if (!tool) {
        throw new Error(`Unknown tool: ${id}. Supported tools: ${skillToolIds().join(", ")}`);
    }
    return tool;
}

/**
 * `lum skill add`: install the canonical `skill/SKILL.md` bundle into the
 * project (default) or user scope; see README「集成路线 - Skill 集成」.
 */
function runSkillAdd(args: ParsedArgs): void {
    const content = readCanonicalSkill();
    const environment = resolveSkillEnvironment();
    const requestedTool = args.skillTool ? requireSkillTool(args.skillTool) : undefined;
    const targets: Array<{ toolId: string; skillsRoot: string }> = [];
    let usedFallback = false;

    if (args.skillDir) {
        targets.push({
            toolId: "custom",
            skillsRoot: path.resolve(process.cwd(), args.skillDir),
        });
    } else if (args.skillScope === "project") {
        const projectRoot = resolveProjectRoot(process.cwd());
        const tools = requestedTool ? [requestedTool] : detectProjectTools(projectRoot);
        if (tools.length === 0) {
            usedFallback = true;
            tools.push(requireSkillTool("agents"));
        }
        for (const tool of tools) {
            targets.push({
                toolId: tool.id,
                skillsRoot: path.join(projectRoot, tool.projectDir),
            });
        }
        process.stdout.write(`Project root: ${projectRoot}\n`);
    } else {
        const tools = requestedTool ? [requestedTool] : detectUserTools(environment);
        if (tools.length === 0) {
            throw new Error(
                `No user-level tool directory detected; pass --tool <${skillToolIds().join("|")}> (or --dir).`
            );
        }
        for (const tool of tools) {
            targets.push({ toolId: tool.id, skillsRoot: tool.userSkillsDir(environment) });
        }
    }

    if (usedFallback) {
        process.stdout.write(
            "No tool directory detected; using the cross-tool .agents/skills convention.\n"
        );
    }

    const uniqueTargets = new Map<string, { toolId: string; skillsRoot: string }>();
    for (const target of targets) {
        const key = path.resolve(target.skillsRoot);
        if (!uniqueTargets.has(key)) {
            uniqueTargets.set(key, { ...target, skillsRoot: key });
        }
    }

    const plans = Array.from(uniqueTargets.values()).map((target) => {
        const filePath = skillFilePath(target.skillsRoot);
        const existing = readInstalledSkill(target.skillsRoot);
        const status: "installed" | "updated" | "up-to-date" | "conflict" =
            existing === null ? "installed" : existing === content ? "up-to-date" : "conflict";
        return { ...target, filePath, status };
    });

    const conflicts = plans.filter((plan) => plan.status === "conflict");
    if (conflicts.length > 0 && !args.force) {
        throw new Error(
            `Skill already exists with different content: ` +
            `${conflicts.map((plan) => plan.filePath).join(", ")}. ` +
            `Re-run with --force to overwrite.`
        );
    }

    for (const plan of plans) {
        if (plan.status === "installed") {
            writeSkill(plan.skillsRoot, content);
            process.stdout.write(`[${plan.toolId}] installed ${plan.filePath}\n`);
        } else if (plan.status === "conflict") {
            writeSkill(plan.skillsRoot, content);
            process.stdout.write(`[${plan.toolId}] updated ${plan.filePath} (--force)\n`);
        } else {
            process.stdout.write(`[${plan.toolId}] up to date ${plan.filePath}\n`);
        }
    }

    process.stdout.write(
        `Skill "${SKILL_NAME}" is ready; start a new agent session so it is discovered.\n`
    );
}

function main(): void {
    try {
        const args = parseArgs(process.argv.slice(2));
        if (args.command === "help") {
            printHelp();
            return;
        }
        if (args.command === "skill") {
            runSkillAdd(args);
            return;
        }

        const inputPath = ensureInput(args.inputFile);

        if (args.command === "preview") {
            runPreview(inputPath, args.output);
            return;
        }

        runGenerate(inputPath, args.output, args.framework, args.configPath);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write(`Error: ${message}\n`);
        process.exitCode = 1;
    }
}

main();
