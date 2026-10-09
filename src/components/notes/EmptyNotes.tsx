import { Icon } from "../Icon";

export function EmptyNotes({
    search,
    isTrash,
    onCreateNote,
    newNoteShortcut,
}: {
    search: string;
    isTrash: boolean;
    onCreateNote: () => void;
    newNoteShortcut: string;
}) {
    return (
        <div className="empty-notes">
            <div className="empty-icon">
                <Icon name={isTrash ? "trash" : "note"} size={21} />
            </div>
            <strong>
                {search
                    ? "No notes found"
                    : isTrash
                        ? "Trash is empty"
                        : "No notes here yet"}
            </strong>
            <span>
                {search ? "Try another search term." : "Create a note to get started."}
            </span>
            {!isTrash && (
                <button
                    onClick={onCreateNote}
                    data-tooltip={`Create a note · ${newNoteShortcut}`}
                >
                    Create a note
                </button>
            )}
        </div>
    );
}
