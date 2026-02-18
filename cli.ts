#!/usr/bin/env node

import * as fs from "node:fs";
import * as path from "node:path";
import { compile, generateFiles, GenerateFramework, renderPreviewHtml } from "./src";

type ParsedArgs = {
    command: "preview" | "generate" | "help";
    inputFile?: string;
    output?: string;
    framework: GenerateFramework;
};

function printHelp(): void {
    process.stdout.write(`Luming CLI\n\n`);
    process.stdout.write(`Usage:\n`);
    process.stdout.write(`  luming preview <input.luming> [-o output.html]\n`);
    process.stdout.write(`  luming generate <input.luming> [-o outdir] [--framework html|vue|react]\n\n`);
}

function parseArgs(argv: string[]): ParsedArgs {
    const [commandRaw, ...rest] = argv;
    if (!commandRaw || commandRaw === "-h" || commandRaw === "--help" || commandRaw === "help") {
        return { command: "help", framework: "html" };
    }

    if (commandRaw !== "preview" && commandRaw !== "generate") {
        throw new Error(`Unknown command: ${commandRaw}`);
    }

    let inputFile: string | undefined;
    let output: string | undefined;
    let framework: GenerateFramework = "html";

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

function runPreview(inputPath: string, output?: string): void {
    const source = fs.readFileSync(inputPath, "utf8");
    const result = compile(source, { mode: "preview" });
    const html = renderPreviewHtml(result);

    const outputPath = output
        ? path.resolve(process.cwd(), output)
        : path.resolve(process.cwd(), "luming.preview.html");
    fs.writeFileSync(outputPath, html, "utf8");

    process.stdout.write(`Preview written: ${outputPath}\n`);
    if (result.diagnostics.length > 0) {
        process.stdout.write(`Diagnostics: ${result.diagnostics.length}\n`);
    }
}

function runGenerate(
    inputPath: string,
    output: string | undefined,
    framework: GenerateFramework
): void {
    const source = fs.readFileSync(inputPath, "utf8");
    const result = compile(source, { mode: "generate" });
    const files = generateFiles(result, framework);

    const outDir = output
        ? path.resolve(process.cwd(), output)
        : path.resolve(process.cwd(), "generated");
    fs.mkdirSync(outDir, { recursive: true });

    for (const file of files) {
        const target = path.join(outDir, file.filePath);
        fs.writeFileSync(target, file.content, "utf8");
    }

    process.stdout.write(`Generated ${files.length} file(s) at: ${outDir}\n`);
    if (result.diagnostics.length > 0) {
        process.stdout.write(`Diagnostics: ${result.diagnostics.length}\n`);
    }
}

function main(): void {
    try {
        const args = parseArgs(process.argv.slice(2));
        if (args.command === "help") {
            printHelp();
            return;
        }

        const inputPath = ensureInput(args.inputFile);

        if (args.command === "preview") {
            runPreview(inputPath, args.output);
            return;
        }

        runGenerate(inputPath, args.output, args.framework);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write(`Error: ${message}\n`);
        process.exitCode = 1;
    }
}

main();
