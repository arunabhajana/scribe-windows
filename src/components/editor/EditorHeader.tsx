import type { Note } from "../../types/note";
import { Icon } from "../Icon";

export function EditorHeader({
    note,
    onUpdateTitle,
    onTogglePinned,
    onDelete,
    deleteLabel,
    pinShortcut,
}: {
    note: Note;
    onUpdateTitle: (title: string) => void;
    onTogglePinned: () => void;
    onDelete: () => void;
    deleteLabel: string;
    pinShortcut: string;
}) {
    return (
        <header className="editor-header">
            <div className="editor-title-wrap">
                <span className="editor-mobile-label">Editing</span>
                <input
                    className="note-title-input"
                    value={note.title}
                    onChange={(event) => onUpdateTitle(event.target.value)}
                    aria-label="Note title"
                />
            </div>
            <div className="editor-actions">
                <span className="save-status" data-tooltip="All changes are saved">
                    <span className="save-dot" />
                    Saved
                </span>
                <button
                    className={`action-button ${note.pinned ? "pinned" : ""}`}
                    onClick={onTogglePinned}
                    data-tooltip={`${note.pinned ? "Unpin note" : "Pin note"} · ${pinShortcut}`}
                >
                    <Icon name="pin" size={15} />
                    <span>{note.pinned ? "Pinned" : "Pin"}</span>
                </button>
                <button
                    className="action-button delete-action"
                    onClick={onDelete}
                    data-tooltip={deleteLabel}
                >
                    <Icon name="trash" size={15} />
                    <span>{deleteLabel}</span>
                </button>
            </div>
        </header>
    );
}
