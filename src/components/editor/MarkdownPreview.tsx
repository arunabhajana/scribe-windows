function escapeHtml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function inlineMarkdown(value: string) {
    return value
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
        .replace(
            /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
            '<a href="$2" target="_blank" rel="noreferrer">$1</a>',
        );
}

function markdownToHtml(markdown: string) {
    return escapeHtml(markdown)
        .split(/\n{2,}/)
        .map((block) => {
            const lines = block.split("\n");
            if (lines[0].startsWith("```"))
                return `<pre><code>${lines
                    .slice(1)
                    .filter((line) => line !== "```")
                    .join("\n")}</code></pre>`;
            if (lines.every((line) => /^\s*([-*+] |\d+\. )/.test(line))) {
                const ordered = /^\s*\d+\. /.test(lines[0]);
                const items = lines
                    .map(
                        (line) =>
                            `<li>${inlineMarkdown(line.replace(/^\s*(?:[-*+] |\d+\. )/, ""))}</li>`,
                    )
                    .join("");
                return `<${ordered ? "ol" : "ul"}>${items}</${ordered ? "ol" : "ul"}>`;
            }
            if (lines.every((line) => /^\s*&gt; /.test(line)))
                return `<blockquote>${lines.map((line) => inlineMarkdown(line.replace(/^\s*&gt; /, ""))).join("<br/>")}</blockquote>`;
            const heading =
                lines.length === 1 ? lines[0].match(/^(#{1,3})\s+(.+)$/) : null;
            if (heading)
                return `<h${heading[1].length}>${inlineMarkdown(heading[2])}</h${heading[1].length}>`;
            return `<p>${lines.map(inlineMarkdown).join("<br/>")}</p>`;
        })
        .join("");
}

export function MarkdownPreview({ value }: { value: string }) {
    if (!value.trim())
        return (
            <div className="markdown-preview-empty">
                Your formatted note preview will appear here.
            </div>
        );
    return (
        <div
            className="markdown-preview"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(value) }}
        />
    );
}
