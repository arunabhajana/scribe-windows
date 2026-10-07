import type { Note, NoteSection } from "../../types/note";
import type { NoteFolder } from "../../types/note";
import { Icon } from "../Icon";
import { EmptyNotes } from "./EmptyNotes";
import { NoteCard } from "./NoteCard";
import {
  formatShortcut,
  type ShortcutBindings,
} from "../../features/shortcuts/keyboardShortcuts";

export function NotesPane({
  notes,
  folders,
  selectedId,
  section,
  folder,
  search,
  onSelectNote,
  onTogglePinned,
  onCreateNote,
  shortcuts,
}: {
  notes: Note[];
  folders: NoteFolder[];
  selectedId: number | null;
  section: NoteSection;
  folder: string;
  search: string;
  onSelectNote: (id: number) => void;
  onTogglePinned: (id: number) => void;
  onCreateNote: () => void;
  shortcuts: ShortcutBindings;
}) {
  const title =
    section === "pinned"
      ? "Pinned Notes"
      : section === "trash"
        ? "Trash"
        : folder || "All Notes";
  return (
    <section className="notes-pane">
      <header className="pane-header">
        <div>
          <h1>{title}</h1>
          <span className="pane-subtitle">
            {notes.length} {notes.length === 1 ? "note" : "notes"}
          </span>
        </div>
        <button
          className="new-note-button"
          onClick={onCreateNote}
          data-tooltip={`New note · ${formatShortcut(shortcuts.newNote)}`}
        >
          <Icon name="plus" size={16} />
          <span>New note</span>
        </button>
      </header>
      <div className="notes-scroll">
        {notes.length === 0 ? (
          <EmptyNotes
            search={search}
            isTrash={section === "trash"}
            onCreateNote={onCreateNote}
            newNoteShortcut={formatShortcut(shortcuts.newNote)}
          />
        ) : (
          notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              folderConfig={folders.find((item) => item.name === note.folder)}
              selected={selectedId === note.id}
              onSelect={() => onSelectNote(note.id)}
              onTogglePinned={() => onTogglePinned(note.id)}
            />
          ))
        )}
      </div>
      <footer className="list-footer">
        <span>
          <Icon name="clock" size={13} /> Synced just now
        </span>
        <span title="Search notes">{formatShortcut(shortcuts.search)}</span>
      </footer>
    </section>
  );
}
