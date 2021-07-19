/**
 * Encodes special characters (Character in the "Other" unicode category), making them safe to print in errors, etc.
 */
export function makeSafeString(val: string): string {
    return val.replace(/\p{C}/gu, (c) => '\\x' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'));
}

/**
 * Splits a string at the first occurrence of another string.
 * @param value The value to split.
 * @param splitter The string to split on.
 */
export function splitFirst(value: string, splitter: string): [string] | [string, string] {
    const index = value.indexOf(splitter);
    return index < 0 ? [value] : [value.slice(0, index), value.slice(index + splitter.length)];
}

export function firstIndexNotOf(str: string, chars: string[]): number {
    let i = -1;
    while (chars.includes(str.charAt(++i)));
    return i;
}

export function lastIndexNotOf(str: string, chars: string[]): number {
    let i = str.length;
    while (chars.includes(str.charAt(--i)));
    return i;
}

export function trimStart(str: string, chars: string | string[]): string {
    return str.substring(firstIndexNotOf(str, Array.isArray(chars) ? chars : [chars]));
}

export function trimEnd(str: string, chars: string | string[]): string {
    return str.substring(0, lastIndexNotOf(str, Array.isArray(chars) ? chars : [chars]) + 1);
}

export function ensureStart(str: string, char: string): string {
    return char + trimStart(str, char);
}

export function ensureEnd(str: string, char: string): string {
    return trimEnd(str, char) + char;
}
