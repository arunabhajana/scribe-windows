import type { MarkdownAction } from "./EditorToolbar";

const inlineDelimiters: Partial<Record<MarkdownAction, [string, string]>> = {
  bold: ["**", "**"],
  italic: ["*", "*"],
  code: ["`", "`"],
  link: ["[", "](https://)"],
};

function trimMarkdownMarkers(value: string, start: number, end: number) {
  let contentStart = start;
  let contentEnd = end;
  const firstLineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const prefix = value.slice(firstLineStart, start);
  const listPrefixLength =
    prefix.match(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/)?.[0].length ?? 0;
  contentStart = Math.max(contentStart, firstLineStart + listPrefixLength);
  while (contentStart < contentEnd && /\s/.test(value[contentStart]))
    contentStart++;
  while (contentEnd > contentStart && /\s/.test(value[contentEnd - 1]))
    contentEnd--;
  return { contentStart, contentEnd };
}

function delimiterRange(
  value: string,
  contentStart: number,
  contentEnd: number,
  before: string,
  after: string,
) {
  let left = contentStart;
  let right = contentEnd;
  while (left < right && /\s/.test(value[left])) left++;
  while (right > left && /\s/.test(value[right - 1])) right--;
  const startsWith = value.slice(left - before.length, left) === before;
  const endsWith = value.slice(right, right + after.length) === after;
  return startsWith && endsWith
    ? {
        left: left - before.length,
        right: right + after.length,
        contentStart: left,
        contentEnd: right,
      }
    : null;
}

export function applyMarkdownAction(
  input: HTMLTextAreaElement | null,
  value: string,
  action: MarkdownAction,
  onChange: (value: string) => void,
) {
  if (!input) return;
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const lineEndIndex = value.indexOf("\n", start);
  const lineEnd = lineEndIndex < 0 ? value.length : lineEndIndex;
  const currentLine = value.slice(lineStart, lineEnd);
  let next: string;
  let selectionStart = start;
  let selectionEnd = end;

  if (["heading1", "heading2", "bullet", "number", "quote"].includes(action)) {
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
    const existing =
      currentLine.match(/^(#{1,6}\s+|[-*+]\s+|\d+[.)]\s+|>\s+)/)?.[0] ?? "";
    const content = existing ? currentLine.slice(existing.length) : currentLine;
    const replacement = existing === marker ? content : `${marker}${content}`;
    next = `${value.slice(0, lineStart)}${replacement}${value.slice(lineEnd)}`;
    selectionStart = lineStart + (existing === marker ? 0 : marker.length);
    selectionEnd = lineStart + replacement.length;
  } else {
    const [before, after] = inlineDelimiters[action] ?? ["", ""];
    const range = trimMarkdownMarkers(value, start, end);
    const hasUsableSelection = range.contentEnd > range.contentStart;
    const content = hasUsableSelection
      ? value.slice(range.contentStart, range.contentEnd)
      : action === "link"
        ? "link text"
        : "text";
    const existing = hasUsableSelection
      ? delimiterRange(
          value,
          range.contentStart,
          range.contentEnd,
          before,
          after,
        )
      : null;
    const wraps = Boolean(existing);
    const replaceStart = existing?.left ?? range.contentStart;
    const replaceEnd = existing?.right ?? range.contentEnd;
    const insertion = wraps
      ? value.slice(existing!.contentStart, existing!.contentEnd)
      : `${before}${content}${after}`;
    next = `${value.slice(0, replaceStart)}${insertion}${value.slice(replaceEnd)}`;
    selectionStart = replaceStart + (wraps ? 0 : before.length);
    selectionEnd = selectionStart + content.length;
  }

  onChange(next);
  requestAnimationFrame(() => {
    input.focus();
    input.setSelectionRange(selectionStart, selectionEnd);
  });
}
