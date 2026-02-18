import { parse } from "./parser";
import {
    CompileOptions,
    CompileResult,
    Diagnostic,
    ExpressionNode,
    RuntimeNode,
    RuntimeLayoutNode,
} from "./types";

function collectContainedEntities(expr: ExpressionNode, out: Set<string>): void {
    if (expr.kind === "entity") {
        return;
    }

    if (expr.kind === "container") {
        collectReferencedEntities(expr.content, out);
        return;
    }

    for (const child of expr.children) {
        collectContainedEntities(child, out);
    }
}

function collectReferencedEntities(expr: ExpressionNode, out: Set<string>): void {
    if (expr.kind === "entity") {
        out.add(expr.name);
        return;
    }

    if (expr.kind === "container") {
        out.add(expr.name);
        collectReferencedEntities(expr.content, out);
        return;
    }

    for (const child of expr.children) {
        collectReferencedEntities(child, out);
    }
}

function inferRootNames(result: CompileResult): string[] {
    const containedByTemplate = new Set<string>();

    for (const templateName of result.document.templateOrder) {
        const tpl = result.document.templates[templateName];
        if (!tpl?.contentExpression) {
            continue;
        }
        collectReferencedEntities(tpl.contentExpression, containedByTemplate);
    }

    const roots = result.document.templateOrder.filter(
        (name) => !containedByTemplate.has(name)
    );

    if (roots.length > 0) {
        return roots;
    }

    for (const statement of result.document.statements) {
        if (statement.kind !== "structure") {
            continue;
        }
        const topRefs = new Set<string>();
        collectReferencedEntities(statement.expression, topRefs);
        if (topRefs.size > 0) {
            return Array.from(topRefs);
        }
    }

    return result.document.templateOrder.slice();
}

function expandEntity(
    templateName: string,
    compileResult: CompileResult,
    pathStack: string[],
    sequence: { value: number },
    explicitContent: ExpressionNode | null,
    fromTemplate: boolean
): RuntimeNode {
    const template = compileResult.document.templates[templateName];
    const id = `${templateName}_${sequence.value++}`;

    if (!template) {
        compileResult.diagnostics.push({
            level: "error",
            message: `Unknown template: ${templateName}`,
        });
        return {
            id,
            templateName,
            content: null,
            styles: {},
            terminated: true,
        };
    }

    if (fromTemplate && pathStack.includes(templateName)) {
        return {
            id,
            templateName,
            content: null,
            styles: { ...template.styles },
            terminated: true,
        };
    }

    const nextPath = fromTemplate ? [...pathStack, templateName] : pathStack;
    const preferred = explicitContent ?? template.contentExpression;
    const content = preferred
        ? expandLayout(preferred, compileResult, nextPath, sequence, true)
        : null;

    return {
        id,
        templateName,
        content,
        styles: { ...template.styles },
        terminated: false,
    };
}

function expandLayout(
    expression: ExpressionNode,
    compileResult: CompileResult,
    pathStack: string[],
    sequence: { value: number },
    fromTemplate: boolean
): RuntimeLayoutNode {
    if (expression.kind === "entity") {
        return {
            kind: "entity",
            node: expandEntity(
                expression.name,
                compileResult,
                pathStack,
                sequence,
                null,
                fromTemplate
            ),
        };
    }

    if (expression.kind === "container") {
        return {
            kind: "entity",
            node: expandEntity(
                expression.name,
                compileResult,
                pathStack,
                sequence,
                expression.content,
                false
            ),
        };
    }

    return {
        kind: "group",
        direction: expression.direction,
        children: expression.children.map((child) =>
            expandLayout(child, compileResult, pathStack, sequence, fromTemplate)
        ),
    };
}

function layoutToRootEntities(node: RuntimeLayoutNode): RuntimeNode[] {
    if (node.kind === "entity") {
        return [node.node];
    }
    return node.children.flatMap((child) => layoutToRootEntities(child));
}

export function compile(
    source: string,
    options: CompileOptions = {}
): CompileResult {
    const document = parse(source);

    const diagnostics: Diagnostic[] = [...document.diagnostics];
    const mode = options.mode ?? "preview";

    const compileResult: CompileResult = {
        mode,
        document,
        roots: [],
        scenes: [],
        diagnostics,
    };

    const sequence = { value: 1 };

    const structureStatements = document.statements.filter(
        (statement) => statement.kind === "structure"
    );

    if (structureStatements.length > 0) {
        compileResult.scenes = structureStatements.map((statement) =>
            expandLayout(statement.expression, compileResult, [], sequence, false)
        );
        compileResult.roots = compileResult.scenes.flatMap((scene) =>
            layoutToRootEntities(scene)
        );
        return compileResult;
    }

    const requestedRoots = options.rootNames?.length
        ? options.rootNames
        : inferRootNames(compileResult);
    compileResult.roots = requestedRoots.map((name) =>
        expandEntity(name, compileResult, [], sequence, null, true)
    );
    compileResult.scenes = compileResult.roots.map((root) => ({
        kind: "entity",
        node: root,
    }));

    return compileResult;
}

export function parseAndCompile(
    source: string,
    options: CompileOptions = {}
): CompileResult {
    return compile(source, options);
}
