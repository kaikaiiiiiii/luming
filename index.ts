// ======= tool func ========

function checkBalancedBrackets(input: string): boolean {
    const stack: string[] = [];
    const brackets: { [key: string]: string } = {
        ']': '[',
        ')': '(',
    };

    for (const char of input) {
        if (char === '[' || char === '(') {
            stack.push(char);
        } else if (char === ']' || char === ')') {
            if (stack.length === 0 || stack.pop() !== brackets[char]) {
                return false;
            }
        }
    }

    return stack.length === 0;
}


// ======== main ========

function parseLuming(input: string): { raw: string; parsed: any; error: string | null } {
    const result = { raw: input, parsed: null, error: null as string | null };

    // todo:check if input is valid

    // if valid, cut to lines and parse each line to build a tree structure representing the UI components and their relationships
    const lines: string[] = input
        .split(/\r\n|\n|\r|\u2028|\u2029/)
        .map(line => line.trim())
        .filter(line => line.length > 0);


    for (const [index, line] of lines.entries()) {

        if (!checkBalancedBrackets(line)) {
            result.error = `Unbalanced brackets at line ${index + 1}: ${line}`;
            return result;
        }




    }









    return result;
}
