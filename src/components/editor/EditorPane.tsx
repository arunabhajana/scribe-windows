import { useRef, useState, type KeyboardEvent } from "react";
import type { Note } from "../../types/note";
import { EmptyEditor } from "./EmptyEditor";
import { EditorFooter } from "./EditorFooter";
import { EditorHeader } from "./EditorHeader";
import { NoteBodyEditor } from "./NoteBodyEditor";
import { EditorToolbar, type MarkdownAction } from "./EditorToolbar";
import { applyMarkdownAction } from "./markdownFormatting";
import { isMacOS } from "../../features/shortcuts/keyboardShortcuts";

type EditorPaneProps = {
    note: Note | null;
    isTrash: boolean;
    deleteLabel: string;
    onCreateNote: () => void;
    onUpdateNote: (
        id: number,
        patch: {
            title?: string;
            body?: string;
            pinned?: boolean;
            trashed?: boolean;
        },
    ) => void;
    onDeleteNote: (note: Note) => void;
    pinShortcut: string;
    newNoteShortcut: string;
};

export function EditorPane({
    note,
    isTrash,
    deleteLabel,
    onCreateNote,
    onUpdateNote,
    onDeleteNote,
    pinShortcut,
    newNoteShortcut,
}: EditorPaneProps) {
    const [preview, setPreview] = useState(false);
    const bodyInputRef = useRef<HTMLTextAreaElement>(null);
    const applyAction = (action: MarkdownAction) =>
        applyMarkdownAction(
            bodyInputRef.current,
            note?.body ?? "",
            action,
            (body) => note && onUpdateNote(note.id, { body }),
        );
    const handleFormattingKeyDown = (
        event: KeyboardEvent<HTMLTextAreaElement>,
    ) => {
        if (!(isMacOS() ? event.metaKey : event.ctrlKey)) return;
        const key = event.key.toLowerCase();
        const action: MarkdownAction | null =
            !event.altKey && !event.shiftKey && key === "b"
                ? "bold"
                : !event.altKey && !event.shiftKey && key === "i"
                    ? "italic"
                    : !event.altKey && !event.shiftKey && key === "k"
                        ? "link"
                        : event.altKey && !event.shiftKey && key === "1"
                            ? "heading1"
                            : event.altKey && !event.shiftKey && key === "2"
                                ? "heading2"
                                : null;
        if (!action) return;
        event.preventDefault();
        applyAction(action);
    };
    if (!note)
        return (
            <section className="editor-pane">
                <EmptyEditor
                    isTrash={isTrash}
                    onCreateNote={onCreateNote}
                    newNoteShortcut={newNoteShortcut}
                />
            </section>
        );
    return (
        <section className="editor-pane">
            <EditorHeader
                note={note}
                onUpdateTitle={(title) => onUpdateNote(note.id, { title })}
                onTogglePinned={() => onUpdateNote(note.id, { pinned: !note.pinned })}
                onDelete={() => onDeleteNote(note)}
                deleteLabel={deleteLabel}
                pinShortcut={pinShortcut}
            />
            <EditorToolbar
                preview={preview}
                onTogglePreview={() => setPreview((value) => !value)}
                onAction={applyAction}
            />
            <NoteBodyEditor
                value={note.body}
                preview={preview}
                inputRef={bodyInputRef}
                onChange={(body) => onUpdateNote(note.id, { body })}
                onKeyDown={handleFormattingKeyDown}
            />
            <EditorFooter body={note.body} />
        </section>
    );
}
