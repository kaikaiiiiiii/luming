import { resolveStyleToken } from "./style";
import {
    Diagnostic,
    EntityExpr,
    ExpressionNode,
    GroupExpr,
    ParsedDocument,
    ParsedStatement,
    StructureStatement,
    StylePair,
    StyleStatement,
    TemplateDefinition,
} from "./types";

type TokenType = "name" | "plus" | "slash" | "lbracket" | "rbracket" | "lparen" | "rparen";

interface Token {
    type: TokenType;
    value: string;
    index: number;
    inlineStyles?: StylePair[];
}

const STRUCTURE_CHARS = new Set(["+", "/", "[", "]", "(", ")"]);
const NAME_START_RE = /^[A-Za-z]$/;
const NAME_CHAR_RE = /^[A-Za-z0-9_]$/;
const BARE_NAME_RE = /^[A-Za-z][A-Za-z0-9_]*$/;
const LEADING_ANCHOR_RE = /^([A-Za-z][A-Za-z0-9_]*)\s*:\s*/;

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
                inlineStyles: node.inlineStyles,
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
            const entity: EntityExpr = { kind: "entity", name: token.value };
            if (token.inlineStyles && token.inlineStyles.length > 0) {
                entity.inlineStyles = token.inlineStyles;
            }
            return entity;
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
        interiorDeclarations: [],
        styles: {},
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

    return { kind: "group", direction, children: flattened };
}

/**
 * Scan a style chunk starting right after a `name:` anchor. The chunk ends at a
 * structure character, at end of line, or at a `;` whose following segment (up to
 * the next structure char / `;` / EOL) consists solely of bare entity names — that
 * `;` is the boundary between the style block and sibling entities
 * (e.g. `Item: bg #99f; Item Item`).
 */
function scanStyleChunk(source: string, start: number): { tokens: string[]; end: number } {
    let index = start;
    while (index < source.length) {
        const char = source[index];
        if (STRUCTURE_CHARS.has(char)) {
            break;
        }
        if (char === ";") {
            let cursor = index + 1;
            while (cursor < source.length && /\s/.test(source[cursor])) {
                cursor += 1;
            }
            let segmentEnd = cursor;
            while (
                segmentEnd < source.length &&
                !STRUCTURE_CHARS.has(source[segmentEnd]) &&
                source[segmentEnd] !== ";"
            ) {
                segmentEnd += 1;
            }
            const words = source.slice(cursor, segmentEnd).trim().split(/\s+/).filter(Boolean);
            const allBareNames = words.length > 0 && words.every((word) => BARE_NAME_RE.test(word));
            if (allBareNames) {
                return { tokens: splitStyleTokens(source.slice(start, index)), end: index + 1 };
            }
        }
        index += 1;
    }
    return { tokens: splitStyleTokens(source.slice(start, index)), end: index };
}

function splitStyleTokens(chunk: string): string[] {
    return chunk
        .split(";")
        .map((item) => item.trim())
        .filter(Boolean);
}

function resolveInlineStyles(
    tokens: string[],
    lineNumber: number,
    diagnostics: Diagnostic[]
): StylePair[] {
    const pairs: StylePair[] = [];
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
        for (const item of resolved) {
            pairs.push({ key: item.key, value: item.value });
        }
    }
    return pairs;
}

function tokenizeStructure(
    input: string,
    lineNumber: number,
    diagnostics: Diagnostic[]
): Token[] {
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

        if (NAME_START_RE.test(char)) {
            const start = index;
            index += 1;
            while (index < input.length && NAME_CHAR_RE.test(input[index])) {
                index += 1;
            }
            const value = input.slice(start, index);

            // Inline style anchor: `Name: tokens` (optional spaces before the colon).
            let probe = index;
            while (probe < input.length && /\s/.test(input[probe])) {
                probe += 1;
            }
            if (input[probe] === ":") {
                const { tokens: styleTokens, end } = scanStyleChunk(input, probe + 1);
                tokens.push({
                    type: "name",
                    value,
                    index: start,
                    inlineStyles: resolveInlineStyles(styleTokens, lineNumber, diagnostics),
                });
                index = end;
                continue;
            }

            tokens.push({ type: "name", value, index: start });
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

function recordDeclarations(
    expression: ExpressionNode,
    lineNumber: number,
    order: { value: number },
    templates: Record<string, TemplateDefinition>,
    templateOrder: string[]
): void {
    if (expression.kind === "entity") {
        ensureTemplate(templates, templateOrder, expression.name, lineNumber);
        return;
    }

    if (expression.kind === "container") {
        const template = ensureTemplate(templates, templateOrder, expression.name, lineNumber);
        template.interiorDeclarations.push({
            line: lineNumber,
            order: order.value++,
            content: expression.content,
        });
        recordDeclarations(expression.content, lineNumber, order, templates, templateOrder);
        return;
    }

    for (const child of expression.children) {
        recordDeclarations(child, lineNumber, order, templates, templateOrder);
    }
}

function parseStructureLine(
    structurePart: string,
    lineNumber: number,
    templates: Record<string, TemplateDefinition>,
    templateOrder: string[],
    diagnostics: Diagnostic[]
): StructureStatement | null {
    try {
        const tokens = tokenizeStructure(structurePart, lineNumber, diagnostics);
        if (tokens.length === 0) {
            return null;
        }
        const expression = new ExpressionParser(tokens).parseRoot();
        recordDeclarations(expression, lineNumber, { value: 0 }, templates, templateOrder);

        const names = new Set<string>();
        collectEntityNames(expression, names);
        for (const name of names) {
            ensureTemplate(templates, templateOrder, name, lineNumber);
        }

        return {
            kind: "structure",
            line: lineNumber,
            raw: structurePart,
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

        // Leading `Name:` anchor = an entity-level style declaration; whatever
        // follows it (if anything) is a structure expression on the same line.
        const leadingAnchor = LEADING_ANCHOR_RE.exec(line);
        let structurePart = line;
        if (leadingAnchor) {
            const name = leadingAnchor[1];
            const { tokens, end } = scanStyleChunk(line, leadingAnchor[0].length);
            const template = ensureTemplate(templates, templateOrder, name, lineNumber);
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
                for (const item of resolved) {
                    template.styles[item.key] = item.value;
                }
            }
            statements.push({
                kind: "style",
                line: lineNumber,
                raw: line,
                entity: name,
                tokens,
            });
            const rest = line.slice(end);
            // A trailing structure after the anchor continues from the anchored
            // entity itself: `A: bg #fda/Footer` ≡ style(A) + structure `A / Footer`.
            structurePart = rest.trim() ? name + rest : "";
        }

        const trimmed = structurePart.trim();
        if (!trimmed) {
            return;
        }
        const statement = parseStructureLine(
            trimmed,
            lineNumber,
            templates,
            templateOrder,
            diagnostics
        );
        if (statement) {
            statements.push(statement);
        }
    });

    for (const name of templateOrder) {
        const template = templates[name];
        if (template.interiorDeclarations.length >= 2) {
            const lineNumbers = template.interiorDeclarations
                .map((declaration) => declaration.line)
                .join("、");
            diagnostics.push({
                level: "warning",
                line: template.firstDefinedLine,
                message:
                    `${name} 的内部结构被声明 ${template.interiorDeclarations.length} 次` +
                    `（第 ${lineNumbers} 行），按行序后者生效；同行内的声明按书写位置各自呈现`,
            });
        }
    }

    return {
        source,
        statements,
        templates,
        templateOrder,
        diagnostics,
    };
}
