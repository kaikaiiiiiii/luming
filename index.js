function parseLuming(input) {
    // todo:check if input is valid Luming syntax

    const result = { raw: input, parsed: null, error: null };

    // if valid, cut to lines and parse each line to build a tree structure representing the UI components and their relationships
    const lines = input
        .split(/\r\n|\n|\r|\u2028|\u2029/)
        .map(line => line.trim())
        .filter(line => line.length > 0);

    // check if [] & () are balanced
    const stack = [];
    for (const line of lines) {
        for (const char of line) {
            if (char === '[' || char === '(') {
                stack.push(char);
            } else if (char === ']' || char === ')') {
                if (stack.length === 0) {
                    result.error = 'Unbalanced brackets';
                    return result;
                }
                const last = stack.pop();
                if ((char === ']' && last !== '[') || (char === ')' && last !== '(')) {
                    result.error = 'Mismatched brackets';
                    return result;
                }
            }
        }
    }
    if (stack.length > 0) {
        result.error = 'Unbalanced brackets';
        return result;
    }










    return result;
}
