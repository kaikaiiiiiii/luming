import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

export type SkillScope = "project" | "user";

/** Per-user directories used to resolve user-scope skill roots. */
export interface SkillEnvironment {
    homeDir: string;
    dshHome: string;
    configHome: string;
    agentsHome: string;
}

/** One supported agent tool and its conventional skill roots. */
export interface SkillToolDefinition {
    id: string;
    label: string;
    /** Skills root relative to the project root (project scope). */
    projectDir: string;
    /** Absolute marker directory that identifies the tool for the current user. */
    userMarkerDir: (environment: SkillEnvironment) => string;
    /** Absolute skills root for the user scope. */
    userSkillsDir: (environment: SkillEnvironment) => string;
}

export const SKILL_NAME = "luming";
export const SKILL_FILE_NAME = "SKILL.md";

/** Built-in tool registry (README「集成路线 - Skill 集成」). */
const SKILL_TOOLS: SkillToolDefinition[] = [
    {
        id: "dsh",
        label: "DeepSeek Harness",
        projectDir: ".dsh/skills",
        userMarkerDir: (environment) => environment.dshHome,
        userSkillsDir: (environment) => path.join(environment.dshHome, "skills"),
    },
    {
        id: "claude",
        label: "Claude Code",
        projectDir: ".claude/skills",
        userMarkerDir: (environment) => path.join(environment.homeDir, ".claude"),
        userSkillsDir: (environment) =>
            path.join(environment.homeDir, ".claude", "skills"),
    },
    {
        id: "opencode",
        label: "OpenCode",
        projectDir: ".opencode/skills",
        userMarkerDir: (environment) => path.join(environment.configHome, "opencode"),
        userSkillsDir: (environment) =>
            path.join(environment.configHome, "opencode", "skills"),
    },
    {
        id: "agents",
        label: "Agent Skills (cross-tool)",
        projectDir: ".agents/skills",
        userMarkerDir: (environment) => environment.agentsHome,
        userSkillsDir: (environment) => path.join(environment.agentsHome, "skills"),
    },
];

export function skillToolIds(): string[] {
    return SKILL_TOOLS.map((tool) => tool.id);
}

export function findSkillTool(id: string): SkillToolDefinition | undefined {
    return SKILL_TOOLS.find((tool) => tool.id === id);
}

/** Resolve user-scope roots from the environment (DSH_HOME, XDG_CONFIG_HOME, HOME). */
export function resolveSkillEnvironment(
    env: NodeJS.ProcessEnv = process.env
): SkillEnvironment {
    const homeDir = env.USERPROFILE || env.HOME || os.homedir();
    return {
        homeDir,
        dshHome: env.DSH_HOME ? path.resolve(env.DSH_HOME) : path.join(homeDir, ".dsh"),
        configHome: env.XDG_CONFIG_HOME
            ? path.resolve(env.XDG_CONFIG_HOME)
            : path.join(homeDir, ".config"),
        agentsHome: path.join(homeDir, ".agents"),
    };
}

/** Nearest ancestor containing `.git`; falls back to the starting directory. */
export function resolveProjectRoot(startDir: string): string {
    const start = path.resolve(startDir);
    let current = start;
    for (;;) {
        if (fs.existsSync(path.join(current, ".git"))) {
            return current;
        }
        const parent = path.dirname(current);
        if (parent === current) {
            return start;
        }
        current = parent;
    }
}

/** Tool directories that already exist in a project (README: auto-detect). */
export function detectProjectTools(projectRoot: string): SkillToolDefinition[] {
    return SKILL_TOOLS.filter((tool) => {
        const marker = tool.projectDir.split("/")[0];
        return fs.existsSync(path.join(projectRoot, marker));
    });
}

/** Tool marker directories that already exist for the current user. */
export function detectUserTools(
    environment: SkillEnvironment
): SkillToolDefinition[] {
    return SKILL_TOOLS.filter((tool) => fs.existsSync(tool.userMarkerDir(environment)));
}

/** Absolute path of the installed `luming/SKILL.md` under a skills root. */
export function skillFilePath(skillsRoot: string): string {
    return path.join(skillsRoot, SKILL_NAME, SKILL_FILE_NAME);
}

/** Read an installed skill body, or null when it does not exist yet. */
export function readInstalledSkill(skillsRoot: string): string | null {
    const filePath = skillFilePath(skillsRoot);
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
}

/** Write the skill bundle, creating the skills root and `luming/` as needed. */
export function writeSkill(skillsRoot: string, content: string): void {
    const filePath = skillFilePath(skillsRoot);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, "utf8");
}

/**
 * Canonical skill copy shipped with this package (`skill/SKILL.md`, listed in
 * package.json "files"). Works both from dist/src during development and from an
 * installed package.
 */
export function resolveCanonicalSkillPath(): string {
    return path.resolve(__dirname, "..", "..", "skill", SKILL_FILE_NAME);
}

export function readCanonicalSkill(): string {
    const filePath = resolveCanonicalSkillPath();
    if (!fs.existsSync(filePath)) {
        throw new Error(`Canonical skill file not found: ${filePath}`);
    }
    return fs.readFileSync(filePath, "utf8");
}
