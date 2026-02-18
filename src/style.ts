export interface ResolvedStyleToken {
    key: string;
    value: string;
}

const NUMBER_ONLY_RE = /^\d+(?:\.\d+)?$/;
const PERCENT_RE = /^\d+(?:\.\d+)?%$/;

function ensurePx(value: string): string {
    if (NUMBER_ONLY_RE.test(value)) {
        return `${value}px`;
    }
    return value;
}

export function resolveStyleToken(token: string): ResolvedStyleToken | null {
    const trimmed = token.trim();
    if (!trimmed) {
        return null;
    }

    const [head, ...restParts] = trimmed.split(/\s+/);
    const rest = restParts.join(" ").trim();

    if (head === "bg" && rest) {
        return { key: "background-color", value: rest };
    }

    if (head === "rd" && rest) {
        return { key: "border-radius", value: ensurePx(rest) };
    }

    if (head === "tab" || head === "card" || head === "label") {
        return { key: "class", value: head };
    }

    if (NUMBER_ONLY_RE.test(trimmed)) {
        return { key: "width", value: `${trimmed}%` };
    }

    if (PERCENT_RE.test(trimmed)) {
        return { key: "width", value: trimmed };
    }

    const cssLike = /^([a-zA-Z-]+)\s+(.+)$/.exec(trimmed);
    if (cssLike) {
        return { key: cssLike[1], value: cssLike[2] };
    }

    return null;
}
