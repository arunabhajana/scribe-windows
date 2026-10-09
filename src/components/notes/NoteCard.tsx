import type { Note, NoteFolder } from "../../types/note";
import { Icon } from "../Icon";

export function NoteCard({
  note,
  folderConfig,
  selected,
  onSelect,
  onTogglePinned,
}: {
  note: Note;
  folderConfig?: NoteFolder;
  selected: boolean;
  onSelect: () => void;
  onTogglePinned: () => void;
}) {
  const relativeTime = new Intl.RelativeTimeFormat(undefined, {
    numeric: "auto",
  });
  const ageSeconds =
    (new Date().getTime() - new Date(note.updatedAt).getTime()) / 1000;
  const seconds = Math.max(0, Math.round(ageSeconds));
  const updated =
    seconds < 60
      ? relativeTime.format(-seconds, "second")
      : seconds < 3600
        ? relativeTime.format(-Math.round(seconds / 60), "minute")
        : seconds < 86400
          ? relativeTime.format(-Math.round(seconds / 3600), "hour")
          : relativeTime.format(-Math.round(seconds / 86400), "day");
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter") onSelect();
      }}
      className={`note-card ${selected ? "selected" : ""}`}
    >
      <div className="note-card-title">
        <h2>{note.title || "Untitled note"}</h2>
        <button
          className={`card-pin ${note.pinned ? "is-pinned" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            onTogglePinned();
          }}
          aria-label={note.pinned ? "Unpin note" : "Pin note"}
          data-tooltip={note.pinned ? "Unpin note" : "Pin note"}
        >
          <Icon name="pin" size={14} />
        </button>
      </div>
      <p>
        {note.body
          .replace(/[#•\n]/g, " ")
          .replace(/\s+/g, " ")
          .trim() || "No additional text"}
      </p>
      <div className="card-meta">
        <span className="card-updated">{updated}</span>
        {note.folderId && (
          <span className="folder-chip-row">
            <span
              className={`folder-chip folder-chip-${folderConfig?.color ?? "violet"}`}
            >
              <span className="chip-dot" />
              {folderConfig?.name}
            </span>
          </span>
        )}
      </div>
    </article>
  );
}
