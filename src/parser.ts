import { resolveStyleToken } from "./style";
import {
    Diagnostic,
    ExpressionNode,
    GroupExpr,
    ParsedDocument,
    ParsedStatement,
    StyleStatement,
    StructureStatement,
    TemplateDefinition,
} from "./types";

type TokenType = "name" | "plus" | "slash" | "lbracket" | "rbracket" | "lparen" | "rparen";

type Token = {
    type: TokenType;
    value: string;
    index: number;
};

class ExpressionParser {
    private readonly tokens: Token[];
    private index = 0;

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    parseRoot(allowImplicitPlus = false): ExpressionNode {
        const expr = this.parseSlash(allowImplicitPlus);
        if (!this.eof()) {
            const token = this.peek();
            const msg = token
                ? `Unexpected token '${token.value}' at ${token.index}`
                : "Unexpected EOF";
            throw new Error(msg);
        }
        return expr;
    }

    private parseSlash(allowImplicitPlus: boolean): ExpressionNode {
        const nodes: ExpressionNode[] = [this.parsePlus(allowImplicitPlus)];

        while (this.match("slash")) {
            this.consume("slash");
            nodes.push(this.parsePlus(allowImplicitPlus));
        }

        return collapseGroup("column", nodes);
    }

    private parsePlus(allowImplicitPlus: boolean): ExpressionNode {
        const nodes: ExpressionNode[] = [this.parsePostfix(allowImplicitPlus)];

        while (true) {
            if (this.match("plus")) {
                this.consume("plus");
                nodes.push(this.parsePostfix(allowImplicitPlus));
                continue;
            }

            if (allowImplicitPlus && this.isPrimaryStart(this.peek())) {
                nodes.push(this.parsePostfix(allowImplicitPlus));
                continue;
            }

            break;
        }

        return collapseGroup("row", nodes);
    }

    private parsePostfix(allowImplicitPlus: boolean): ExpressionNode {
        let node = this.parsePrimary(allowImplicitPlus);

        while (this.match("lbracket")) {
            this.consume("lbracket");
            const content = this.parseSlash(true);
            this.consume("rbracket");

            if (node.kind !== "entity") {
                throw new Error("Only entity can be used as container target before '[]'");
            }

            node = {
                kind: "container",
                name: node.name,
                content,
            };
        }

        return node;
    }

    private parsePrimary(allowImplicitPlus: boolean): ExpressionNode {
        const token = this.peek();
        if (!token) {
            throw new Error("Unexpected end of expression");
        }

        if (token.type === "name") {
            this.index += 1;
            return { kind: "entity", name: token.value };
        }

        if (token.type === "lparen") {
            this.index += 1;
            const expr = this.parseSlash(allowImplicitPlus);
            this.consume("rparen");
            return expr;
        }

        throw new Error(`Unexpected token '${token.value}' at ${token.index}`);
    }

    private isPrimaryStart(token: Token | undefined): boolean {
        return token?.type === "name" || token?.type === "lparen";
    }

    private match(type: TokenType): boolean {
        return this.peek()?.type === type;
    }

    private consume(type: TokenType): Token {
        const token = this.peek();
        if (!token || token.type !== type) {
            const value = token?.value ?? "EOF";
            throw new Error(`Expected ${type}, found '${value}'`);
        }
        this.index += 1;
        return token;
    }

    private peek(): Token | undefined {
        return this.tokens[this.index];
    }

    private eof(): boolean {
        return this.index >= this.tokens.length;
    }
}

function ensureTemplate(
    templates: Record<string, TemplateDefinition>,
    templateOrder: string[],
    name: string,
    line: number
): TemplateDefinition {
    const existing = templates[name];
    if (existing) {
        return existing;
    }

    const created: TemplateDefinition = {
        name,
        firstDefinedLine: line,
        defaultChildren: [],
        styles: {},
        contentExpression: null,
    };
    templates[name] = created;
    templateOrder.push(name);
    return created;
}

function collapseGroup(direction: "row" | "column", nodes: ExpressionNode[]): ExpressionNode {
    if (nodes.length === 1) {
        return nodes[0];
    }

    const flattened: ExpressionNode[] = [];
    for (const node of nodes) {
        if (node.kind === "group" && node.direction === direction) {
            flattened.push(...node.children);
        } else {
            flattened.push(node);
        }
    }

    const group: GroupExpr = {
        kind: "group",
        direction,
        children: flattened,
    };

    return group;
}

function tokenizeStructure(input: string): Token[] {
    const tokens: Token[] = [];
    let index = 0;

    while (index < input.length) {
        const char = input[index];
        if (/\s/.test(char)) {
            index += 1;
            continue;
        }

        if (char === "+") {
            tokens.push({ type: "plus", value: char, index });
            index += 1;
            continue;
        }

        if (char === "/") {
            tokens.push({ type: "slash", value: char, index });
            index += 1;
            continue;
        }

        if (char === "[") {
            tokens.push({ type: "lbracket", value: char, index });
            index += 1;
            continue;
        }

        if (char === "]") {
            tokens.push({ type: "rbracket", value: char, index });
            index += 1;
            continue;
        }

        if (char === "(") {
            tokens.push({ type: "lparen", value: char, index });
            index += 1;
            continue;
        }

        if (char === ")") {
            tokens.push({ type: "rparen", value: char, index });
            index += 1;
            continue;
        }

        if (/[A-Za-z]/.test(char)) {
            const start = index;
            index += 1;
            while (index < input.length && /[A-Za-z0-9_]/.test(input[index])) {
                index += 1;
            }
            tokens.push({
                type: "name",
                value: input.slice(start, index),
                index: start,
            });
            continue;
        }

        throw new Error(`Invalid character '${char}' at ${index}`);
    }

    return tokens;
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

function topLevelEntities(expression: ExpressionNode): string[] {
    if (expression.kind === "entity") {
        return [expression.name];
    }
    if (expression.kind === "container") {
        return [expression.name];
    }
    return expression.children.flatMap((child) => topLevelEntities(child));
}

function updateTemplatesByExpression(
    expression: ExpressionNode,
    lineNumber: number,
    templates: Record<string, TemplateDefinition>,
    templateOrder: string[]
): void {
    if (expression.kind === "entity") {
        ensureTemplate(templates, templateOrder, expression.name, lineNumber);
        return;
    }

    if (expression.kind === "container") {
        const template = ensureTemplate(templates, templateOrder, expression.name, lineNumber);
        template.contentExpression = expression.content;
        template.defaultChildren = topLevelEntities(expression.content);
        updateTemplatesByExpression(expression.content, lineNumber, templates, templateOrder);
        return;
    }

    for (const child of expression.children) {
        updateTemplatesByExpression(child, lineNumber, templates, templateOrder);
    }
}

function parseStyleLine(
    lineText: string,
    lineNumber: number,
    templates: Record<string, TemplateDefinition>,
    templateOrder: string[],
    diagnostics: Diagnostic[]
): StyleStatement | null {
    const matched = /^([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.*)$/.exec(lineText);
    if (!matched) {
        return null;
    }

    const entity = matched[1];
    const body = matched[2].trim();
    const tokens = body
        .split(";")
        .map((item) => item.trim())
        .filter(Boolean);

    const template = ensureTemplate(templates, templateOrder, entity, lineNumber);
    for (const token of tokens) {
        const resolved = resolveStyleToken(token);
        if (!resolved) {
            diagnostics.push({
                level: "warning",
                line: lineNumber,
                message: `Unsupported style token: ${token}`,
            });
            continue;
        }
        template.styles[resolved.key] = resolved.value;
    }

    return {
        kind: "style",
        line: lineNumber,
        raw: lineText,
        entity,
        tokens,
    };
}

type InlineStyleExtraction = {
    structure: string;
    inlineStyles: Array<{ entity: string; tokens: string[] }>;
};

function extractInlineStyles(rawLine: string): InlineStyleExtraction {
    let structure = "";
    const inlineStyles: Array<{ entity: string; tokens: string[] }> = [];

    let index = 0;
    while (index < rawLine.length) {
        const segment = rawLine.slice(index);
        const styleAnchor = /(^|[^A-Za-z0-9_])([A-Za-z][A-Za-z0-9_]*)\s*:\s*/.exec(segment);
        if (!styleAnchor || styleAnchor.index === undefined) {
            structure += segment;
            break;
        }

        const fullStart = index + styleAnchor.index;
        const prefixLength = styleAnchor[1]?.length ?? 0;
        const entity = styleAnchor[2];
        const entityStart = fullStart + prefixLength;
        const styleStart = entityStart + entity.length + segment.slice(styleAnchor.index + prefixLength + entity.length).indexOf(":") + 1;

        structure += rawLine.slice(index, styleStart - 1);

        let j = styleStart;
        while (j < rawLine.length) {
            const c = rawLine[j];
            if (c === "/" || c === "+" || c === "[" || c === "]" || c === "(" || c === ")") {
                break;
            }
            j += 1;
        }

        const styleChunk = rawLine.slice(styleStart, j).trim();
        const tokens = styleChunk
            .split(";")
            .map((item) => item.trim())
            .filter(Boolean);
        if (tokens.length > 0) {
            inlineStyles.push({ entity, tokens });
        }

        index = j;
    }

    return { structure: structure.trim(), inlineStyles };
}

function parseStructureLine(
    lineText: string,
    lineNumber: number,
    templates: Record<string, TemplateDefinition>,
    templateOrder: string[],
    diagnostics: Diagnostic[]
): StructureStatement | null {
    const extracted = extractInlineStyles(lineText);
    const structureRaw = extracted.structure;

    for (const inline of extracted.inlineStyles) {
        const template = ensureTemplate(templates, templateOrder, inline.entity, lineNumber);
        for (const token of inline.tokens) {
            const resolved = resolveStyleToken(token);
            if (!resolved) {
                diagnostics.push({
                    level: "warning",
                    line: lineNumber,
                    message: `Unsupported style token: ${token}`,
                });
                continue;
            }
            template.styles[resolved.key] = resolved.value;
        }
    }

    if (!structureRaw) {
        return null;
    }

    try {
        const tokens = tokenizeStructure(structureRaw);
        if (tokens.length === 0) {
            return null;
        }
        const expression = new ExpressionParser(tokens).parseRoot();
        updateTemplatesByExpression(expression, lineNumber, templates, templateOrder);

        const names = new Set<string>();
        collectEntityNames(expression, names);
        for (const name of names) {
            ensureTemplate(templates, templateOrder, name, lineNumber);
        }

        return {
            kind: "structure",
            line: lineNumber,
            raw: lineText,
            topLevelEntities: topLevelEntities(expression),
            expression,
        };
    } catch (error) {
        diagnostics.push({
            level: "error",
            line: lineNumber,
            message: error instanceof Error ? error.message : "Structure parse failed",
        });
        return null;
    }
}

export function parse(source: string): ParsedDocument {
    const templates: Record<string, TemplateDefinition> = {};
    const templateOrder: string[] = [];
    const diagnostics: Diagnostic[] = [];
    const statements: ParsedStatement[] = [];

    const lines = source.split(/\r?\n/);
    lines.forEach((rawLine, index) => {
        const lineNumber = index + 1;
        const line = rawLine.trim();
        if (!line) {
            return;
        }

        const style = parseStyleLine(
            line,
            lineNumber,
            templates,
            templateOrder,
            diagnostics
        );
        if (style) {
            statements.push(style);
            return;
        }

        const structure = parseStructureLine(
            line,
            lineNumber,
            templates,
            templateOrder,
            diagnostics
        );
        if (structure) {
            statements.push(structure);
        }
    });

    return {
        source,
        statements,
        templates,
        templateOrder,
        diagnostics,
    };
}

