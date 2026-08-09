export interface ResolvedStyleToken {
    key: string;
    value: string;
}

const NUMBER_ONLY_RE = /^\d+(?:\.\d+)?$/;
const PERCENT_RE = /^\d+(?:\.\d+)?%$/;

/**
 * Preset classes (README「语法 v0.1 - 样式」, full list in docs/style.md).
 * Each preset expands to concrete CSS properties so the emitted styles are always valid.
 */
const PRESET_CSS: Record<string, Record<string, string>> = {
    tab: {
        display: "inline-block",
        padding: "4px 12px",
        border: "1px solid #cbd5e1",
        "border-radius": "9999px",
        "background-color": "#f1f5f9",
        color: "#334155",
    },
    card: {
        display: "block",
        padding: "12px",
        border: "1px solid #e2e8f0",
        "border-radius": "8px",
        "background-color": "#ffffff",
        "box-shadow": "0 1px 3px rgba(0, 0, 0, 0.1)",
    },
    label: {
        display: "inline-block",
        padding: "2px 8px",
        border: "1px solid #c7d2fe",
        "border-radius": "4px",
        "background-color": "#eef2ff",
        color: "#3730a3",
        "font-size": "12px",
    },
};

function ensurePx(value: string): string {
    if (NUMBER_ONLY_RE.test(value)) {
        return `${value}px`;
    }
    return value;
}

export function resolveStyleToken(token: string): ResolvedStyleToken[] | null {
    const trimmed = token.trim();
    if (!trimmed) {
        return null;
    }

    const [head, ...restParts] = trimmed.split(/\s+/);
    const rest = restParts.join(" ").trim();

    if (head === "bg" && rest) {
        return [{ key: "background-color", value: rest }];
    }

    if (head === "rd" && rest) {
        return [{ key: "border-radius", value: ensurePx(rest) }];
    }

    if (head === "tab" || head === "card" || head === "label") {
        const preset = PRESET_CSS[head];
        return Object.entries(preset).map(([key, value]) => ({ key, value }));
    }

    if (NUMBER_ONLY_RE.test(trimmed)) {
        return [{ key: "width", value: `${trimmed}%` }];
    }

    if (PERCENT_RE.test(trimmed)) {
        return [{ key: "width", value: trimmed }];
    }

    const cssLike = /^([a-zA-Z-]+)\s+(.+)$/.exec(trimmed);
    if (cssLike) {
        return [{ key: cssLike[1], value: cssLike[2] }];
    }

    return null;
}
