import { parse } from "./parser";
import {
    CompileOptions,
    CompileResult,
    Diagnostic,
    ExpressionNode,
    ParsedDocument,
    RuntimeNode,
    RuntimeLayoutNode,
    StructureStatement,
    StylePair,
    TemplateDefinition,
} from "./types";

/**
 * Content resolution for a container occurrence (position has written interior):
 * a declaration from a LATER line overrides the written interior (cross-line
 * override may reach into a scene line); otherwise the written interior applies
 * as written (same-line declarations are parallel and never override it).
 */
function resolveContainerContent(
    name: string,
    written: ExpressionNode,
    sceneLine: number,
    document: ParsedDocument
): ExpressionNode {
    const later = lastDeclarationAfter(name, sceneLine, document);
    return later ? later.content : written;
}

/**
 * Content resolution for a bare occurrence: the latest declaration from a LATER
 * line wins; otherwise the latest declaration from an EARLIER line (same-line
 * written interiors never leak into bare sibling positions); otherwise empty.
 */
function resolveBareContent(
    name: string,
    sceneLine: number,
    document: ParsedDocument
): ExpressionNode | null {
    const later = lastDeclarationAfter(name, sceneLine, document);
    if (later) {
        return later.content;
    }
    const template = document.templates[name];
    if (!template) {
        return null;
    }
    const earlier = template.interiorDeclarations.filter(
        (declaration) => declaration.line < sceneLine
    );
    if (earlier.length > 0) {
        return earlier[earlier.length - 1].content;
    }
    return null;
}

function lastDeclarationAfter(
    name: string,
    sceneLine: number,
    document: ParsedDocument
): { content: ExpressionNode } | null {
    const template = document.templates[name];
    if (!template) {
        return null;
    }
    const later = template.interiorDeclarations.filter(
        (declaration) => declaration.line > sceneLine
    );
    if (later.length > 0) {
        return later[later.length - 1];
    }
    return null;
}

function mergeStyles(
    template: TemplateDefinition | undefined,
    inlineStyles: StylePair[] | undefined
): Record<string, string> {
    const styles: Record<string, string> = { ...(template?.styles ?? {}) };
    for (const pair of inlineStyles ?? []) {
        styles[pair.key] = pair.value;
    }
    return styles;
}

function makeNode(
    name: string,
    inlineStyles: StylePair[] | undefined,
    document: ParsedDocument,
    diagnostics: Diagnostic[],
    sequence: { value: number }
): RuntimeNode {
    const id = `${name}_${sequence.value++}`;
    const template = document.templates[name];
    if (!template) {
        diagnostics.push({
            level: "error",
            message: `Unknown template: ${name}`,
        });
        return { id, templateName: name, content: null, styles: {}, terminated: false };
    }
    return {
        id,
        templateName: name,
        content: null,
        styles: mergeStyles(template, inlineStyles),
        terminated: false,
    };
}

function makeTerminus(
    name: string,
    document: ParsedDocument,
    sequence: { value: number }
): RuntimeNode {
    return {
        id: `${name}_${sequence.value++}`,
        templateName: name,
        content: null,
        styles: { ...(document.templates[name]?.styles ?? {}) },
        terminated: true,
    };
}

function expandExpr(
    expression: ExpressionNode,
    sceneLine: number,
    document: ParsedDocument,
    diagnostics: Diagnostic[],
    path: string[],
    sequence: { value: number }
): RuntimeLayoutNode {
    if (expression.kind === "group") {
        return {
            kind: "group",
            direction: expression.direction,
            children: expression.children.map((child) =>
                expandExpr(child, sceneLine, document, diagnostics, path, sequence)
            ),
        };
    }

    if (expression.kind === "container") {
        const node = makeNode(expression.name, expression.inlineStyles, document, diagnostics, sequence);
        const content = resolveContainerContent(
            expression.name,
            expression.content,
            sceneLine,
            document
        );
        path.push(expression.name);
        node.content = content
            ? expandExpr(content, sceneLine, document, diagnostics, path, sequence)
            : null;
        path.pop();
        return { kind: "entity", node };
    }

    // Bare occurrence: recursion truncation check before fetching a definition.
    if (path.includes(expression.name)) {
        return { kind: "entity", node: makeTerminus(expression.name, document, sequence) };
    }
    const node = makeNode(expression.name, expression.inlineStyles, document, diagnostics, sequence);
    const content = resolveBareContent(expression.name, sceneLine, document);
    path.push(expression.name);
    node.content = content
        ? expandExpr(content, sceneLine, document, diagnostics, path, sequence)
        : null;
    path.pop();
    return { kind: "entity", node };
}

function layoutToRootEntities(node: RuntimeLayoutNode): RuntimeNode[] {
    if (node.kind === "entity") {
        return [node.node];
    }
    return node.children.flatMap((child) => layoutToRootEntities(child));
}

interface SceneEntry {
    statement: StructureStatement;
    tops: string[];
}

/**
 * Scene selection (docs/parse-rule.md §4): process structure lines in document
 * order; a line becomes a scene if any of its top-level subjects is unplaced; a
 * multi-subject line whose subjects are all placed REPLACES the most recent scene
 * sharing a subject; a single-subject line for a placed entity is declaration-only.
 */
function selectScenes(statements: StructureStatement[]): SceneEntry[] {
    const scenes: SceneEntry[] = [];
    const placed = new Set<string>();

    for (const statement of statements) {
        const tops = statement.topLevelEntities;
        const allPlaced = tops.every((name) => placed.has(name));

        if (!allPlaced) {
            scenes.push({ statement, tops });
        } else if (tops.length >= 2) {
            let replaced = false;
            for (let i = scenes.length - 1; i >= 0; i -= 1) {
                if (scenes[i].tops.some((name) => tops.includes(name))) {
                    scenes[i] = { statement, tops };
                    replaced = true;
                    break;
                }
            }
            if (!replaced) {
                scenes.push({ statement, tops });
            }
        }

        collectEntityNames(statement.expression, placed);
    }

    return scenes;
}

function collectEntityNames(expression: ExpressionNode, out: Set<string>): void {
    if (expression.kind === "entity") {
        out.add(expression.name);
        return;
    }
    if (expression.kind === "container") {
        out.add(expression.name);
        collectEntityNames(expression.content, out);
        return;
    }
    for (const child of expression.children) {
        collectEntityNames(child, out);
    }
}

export function compile(
    source: string,
    options: CompileOptions = {}
): CompileResult {
    const document = parse(source);
    const diagnostics: Diagnostic[] = [...document.diagnostics];
    const mode = options.mode ?? "preview";
    const sequence = { value: 1 };

    const compileResult: CompileResult = {
        mode,
        document,
        roots: [],
        scenes: [],
        sceneLineNumbers: [],
        diagnostics,
    };

    const structureStatements = document.statements.filter(
        (statement): statement is StructureStatement => statement.kind === "structure"
    );

    if (structureStatements.length === 0) {
        const requestedRoots = options.rootNames?.length
            ? options.rootNames
            : document.templateOrder.slice();
        compileResult.roots = requestedRoots.map((name) => {
            const node = makeNode(name, undefined, document, diagnostics, sequence);
            const content = resolveBareContent(name, 0, document);
            node.content = content
                ? expandExpr(content, 0, document, diagnostics, [name], sequence)
                : null;
            return node;
        });
        compileResult.scenes = compileResult.roots.map((root) => ({
            kind: "entity",
            node: root,
        }));
        return compileResult;
    }

    const scenes = selectScenes(structureStatements);
    compileResult.scenes = scenes.map((scene) =>
        expandExpr(
            scene.statement.expression,
            scene.statement.line,
            document,
            diagnostics,
            [],
            sequence
        )
    );
    compileResult.sceneLineNumbers = scenes.map((scene) => scene.statement.line);
    compileResult.roots = compileResult.scenes.flatMap((scene) => layoutToRootEntities(scene));
    return compileResult;
}

export function parseAndCompile(
    source: string,
    options: CompileOptions = {}
): CompileResult {
    return compile(source, options);
}
