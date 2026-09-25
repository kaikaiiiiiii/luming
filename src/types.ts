export type CompileMode = "preview" | "generate";

export type DiagnosticLevel = "warning" | "error";

export interface Diagnostic {
    level: DiagnosticLevel;
    message: string;
    line?: number;
    column?: number;
}

export type LayoutDirection = "row" | "column";

/** A resolved style property pair (structural superset of style.ts's ResolvedStyleToken). */
export interface StylePair {
    key: string;
    value: string;
}

export interface EntityExpr {
    kind: "entity";
    name: string;
    /** Instance-scoped styles bound to this exact occurrence (inline `Name: ...;` anchor). */
    inlineStyles?: StylePair[];
}

export interface GroupExpr {
    kind: "group";
    direction: LayoutDirection;
    children: ExpressionNode[];
}

export interface ContainerExpr {
    kind: "container";
    name: string;
    content: ExpressionNode;
    /** Instance-scoped styles bound to this exact occurrence. */
    inlineStyles?: StylePair[];
}

export type ExpressionNode = EntityExpr | GroupExpr | ContainerExpr;

export interface StructureStatement {
    kind: "structure";
    line: number;
    raw: string;
    topLevelEntities: string[];
    expression: ExpressionNode;
}

export interface StyleStatement {
    kind: "style";
    line: number;
    raw: string;
    entity: string;
    tokens: string[];
}

export type ParsedStatement = StructureStatement | StyleStatement;

/**
 * One written `X[...]` occurrence: a declaration of X's interior.
 * `order` is the traversal index within its line (same-line declarations are parallel).
 */
export interface InteriorDeclaration {
    line: number;
    order: number;
    content: ExpressionNode;
}

export interface TemplateDefinition {
    name: string;
    firstDefinedLine: number;
    interiorDeclarations: InteriorDeclaration[];
    /** Entity-level styles, merged per property in line order. */
    styles: Record<string, string>;
}

export interface ParsedDocument {
    source: string;
    statements: ParsedStatement[];
    templates: Record<string, TemplateDefinition>;
    templateOrder: string[];
    diagnostics: Diagnostic[];
}

export interface RuntimeNode {
    id: string;
    templateName: string;
    content: RuntimeLayoutNode | null;
    styles: Record<string, string>;
    terminated: boolean;
}

export interface RuntimeLayoutGroup {
    kind: "group";
    direction: LayoutDirection;
    children: RuntimeLayoutNode[];
}

export interface RuntimeLayoutEntity {
    kind: "entity";
    node: RuntimeNode;
}

export type RuntimeLayoutNode = RuntimeLayoutGroup | RuntimeLayoutEntity;

export interface CompileOptions {
    mode?: CompileMode;
    rootNames?: string[];
}

export interface CompileResult {
    mode: CompileMode;
    document: ParsedDocument;
    roots: RuntimeNode[];
    scenes: RuntimeLayoutNode[];
    /** Source line numbers of the rendered scenes (for override-aware tooling). */
    sceneLineNumbers: number[];
    diagnostics: Diagnostic[];
}

export type GenerateFramework = "html" | "vue" | "react";

/** Generation-time name transformation config (README「使用 - 生成时转换」). */
export interface GeneratorConfig {
    /** Explicit per-entity renames, e.g. { "Header": "SiteHeader" }. Takes priority. */
    componentRename?: Record<string, string>;
    /** Prefix applied to reserved HTML tag names (default "My", e.g. Header -> MyHeader). */
    reservedPrefix?: string;
}

export interface GenerateOptions {
    framework: GenerateFramework;
    outDir: string;
}

export interface GeneratedFile {
    filePath: string;
    content: string;
}
