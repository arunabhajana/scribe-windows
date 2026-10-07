import type { MarkdownAction } from "./EditorToolbar";

export function applyMarkdownAction(
    input: HTMLTextAreaElement | null,
    value: string,
    action: MarkdownAction,
    onChange: (value: string) => void,
) {
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selected = value.slice(start, end);
    const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const lineEndIndex = value.indexOf("\n", start);
    const lineEnd = lineEndIndex < 0 ? value.length : lineEndIndex;
    const currentLine = value.slice(lineStart, lineEnd);
    let next: string;
    let selectionStart = start;
    let selectionEnd = end;

    if (
        action === "heading1" ||
        action === "heading2" ||
        action === "bullet" ||
        action === "number" ||
        action === "quote"
    ) {
        const marker =
            action === "heading1"
                ? "# "
                : action === "heading2"
                    ? "## "
                    : action === "bullet"
                        ? "- "
                        : action === "number"
                            ? "1. "
                            : "> ";
        const plainLine = currentLine.replace(
            /^(#{1,2} |[-*+] |\d+\. |&gt; |> )/,
            "",
        );
        const existing = currentLine.match(/^(#{1,2} |[-*+] |\d+\. |> )/)?.[0];
        const replacement =
            existing === marker ? plainLine : `${marker}${plainLine}`;
        next = `${value.slice(0, lineStart)}${replacement}${value.slice(lineEnd)}`;
        selectionStart = lineStart + marker.length;
        selectionEnd = lineStart + replacement.length;
    } else {
        const [before, after] =
            action === "bold"
                ? ["**", "**"]
                : action === "italic"
                    ? ["*", "*"]
                    : action === "code"
                        ? ["`", "`"]
                        : ["[", "](https://)"];
        const content = selected || (action === "link" ? "link text" : "text");
        const insertion = `${before}${content}${after}`;
        next = `${value.slice(0, start)}${insertion}${value.slice(end)}`;
        selectionStart = start + before.length;
        selectionEnd = selectionStart + content.length;
    }

    onChange(next);
    requestAnimationFrame(() => {
        input.focus();
        input.setSelectionRange(selectionStart, selectionEnd);
    });
}
