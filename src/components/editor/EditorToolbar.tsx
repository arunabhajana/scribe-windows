import {
    Bold,
    Code2,
    Eye,
    EyeOff,
    Heading1,
    Heading2,
    Italic,
    Link2,
    List,
    ListOrdered,
    Quote,
} from "lucide-react";
import type { ReactNode } from "react";
import {
    getAltModifierLabel,
    getModifierLabel,
} from "../../features/shortcuts/keyboardShortcuts";

export type MarkdownAction =
    | "bold"
    | "italic"
    | "heading1"
    | "heading2"
    | "bullet"
    | "number"
    | "quote"
    | "code"
    | "link";

export function EditorToolbar({
    preview,
    onTogglePreview,
    onAction,
    className = "",
}: {
    preview: boolean;
    onTogglePreview: () => void;
    onAction: (action: MarkdownAction) => void;
    className?: string;
}) {
    const modifier = getModifierLabel();
    const altModifier = getAltModifierLabel();
    const button = (
        label: string,
        action: MarkdownAction,
        icon: ReactNode,
        shortcut = "",
    ) => (
        <button
            type="button"
            className="format-button"
            data-tooltip={`${label}${shortcut ? ` · ${modifier} + ${shortcut}` : ""}`}
            aria-label={label}
            disabled={preview}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onAction(action)}
        >
            {icon}
        </button>
    );
    return (
        <div
            className={`format-toolbar ${className}`}
            role="toolbar"
            aria-label="Markdown formatting"
        >
            <div className="format-group">
                {button(
                    "Heading 1",
                    "heading1",
                    <Heading1 size={16} />,
                    `${altModifier} + 1`,
                )}
                {button(
                    "Heading 2",
                    "heading2",
                    <Heading2 size={16} />,
                    `${altModifier} + 2`,
                )}
            </div>
            <span className="toolbar-divider" />
            <div className="format-group">
                {button("Bold", "bold", <Bold size={15} />, "B")}
                {button("Italic", "italic", <Italic size={15} />, "I")}
            </div>
            <span className="toolbar-divider" />
            <div className="format-group">
                {button("Bulleted list", "bullet", <List size={16} />)}
                {button("Numbered list", "number", <ListOrdered size={16} />)}
            </div>
            <span className="toolbar-divider" />
            <div className="format-group">
                {button("Quote", "quote", <Quote size={15} />)}
                {button("Inline code", "code", <Code2 size={15} />)}
                {button("Link", "link", <Link2 size={15} />, "K")}
            </div>
            <div className="format-group markdown-view-toggle">
                <button
                    type="button"
                    className={`format-button ${preview ? "active" : ""}`}
                    onClick={onTogglePreview}
                    data-tooltip={preview ? "Edit Markdown" : "Preview Markdown"}
                    aria-label={preview ? "Edit Markdown" : "Preview Markdown"}
                >
                    {preview ? <EyeOff size={15} /> : <Eye size={15} />}
                    <span>{preview ? "Edit" : "Preview"}</span>
                </button>
            </div>
        </div>
    );
}
