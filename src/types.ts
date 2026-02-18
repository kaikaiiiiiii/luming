export type CompileMode = "preview" | "generate";

export type DiagnosticLevel = "warning" | "error";

export interface Diagnostic {
    level: DiagnosticLevel;
    message: string;
    line?: number;
    column?: number;
}

export type LayoutDirection = "row" | "column";

export interface EntityExpr {
    kind: "entity";
    name: string;
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

export interface TemplateDefinition {
    name: string;
    firstDefinedLine: number;
    defaultChildren: string[];
    styles: Record<string, string>;
    contentExpression: ExpressionNode | null;
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
    diagnostics: Diagnostic[];
}

export type GenerateFramework = "html" | "vue" | "react";

export interface GenerateOptions {
    framework: GenerateFramework;
    outDir: string;
}

export interface GeneratedFile {
    filePath: string;
    content: string;
}
