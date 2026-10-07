import { useMemo, useState } from "react";
import { mockFolders, mockNotes } from "../features/notes/mockNotes";
import type {
  FolderColor,
  FolderIconName,
  Note,
  NoteFolder,
  NotePatch,
  NoteSection,
} from "../types/note";

export function useNotes() {
  const [notes, setNotes] = useState(mockNotes);
  const [selectedId, setSelectedId] = useState<number | null>(1);
  const [section, setSection] = useState<NoteSection>("all");
  const [folder, setFolder] = useState("");
  const [search, setSearch] = useState("");
  const [folders, setFolders] = useState<NoteFolder[]>(mockFolders);

  const selectedNote =
    notes.find((note) => note.id === selectedId && !note.trashed) ?? null;
  const visibleNotes = useMemo(
    () =>
      notes.filter((note) => {
        if (section === "trash") return Boolean(note.trashed);
        if (note.trashed) return false;
        if (section === "pinned" && !note.pinned) return false;
        if (folder && note.folder !== folder) return false;
        const query = search.toLowerCase();
        return (
          !query ||
          note.title.toLowerCase().includes(query) ||
          note.body.toLowerCase().includes(query)
        );
      }),
    [notes, section, folder, search],
  );

  const updateNote = (id: number, patch: NotePatch) =>
    setNotes((current) =>
      current.map((note) =>
        note.id === id ? { ...note, ...patch, updated: "just now" } : note,
      ),
    );

  const createNote = (
    draft: Partial<Pick<Note, "title" | "body" | "folder" | "pinned">> = {},
  ) => {
    const id = Math.max(0, ...notes.map((note) => note.id)) + 1;
    const note: Note = {
      id,
      title: draft.title?.trim() || "Untitled note",
      body: draft.body ?? "",
      folder: draft.folder ?? folder,
      pinned: draft.pinned ?? false,
      updated: "just now",
    };
    setNotes((current) => [note, ...current]);
    setSection("all");
    setSelectedId(id);
    return id;
  };

  const togglePinned = (id: number) => {
    const note = notes.find((item) => item.id === id);
    if (note) updateNote(id, { pinned: !note.pinned });
  };

  const moveToTrash = (id: number) => updateNote(id, { trashed: true });
  const permanentlyDelete = (id: number) =>
    setNotes((current) => current.filter((note) => note.id !== id));

  const createFolder = (
    name: string,
    icon: FolderIconName,
    color: FolderColor,
  ) => {
    const normalizedName = name.trim();
    if (
      !normalizedName ||
      folders.some((folder) => folder.name === normalizedName)
    )
      return false;
    setFolders((current) => [
      ...current,
      { name: normalizedName, icon, color },
    ]);
    setFolder(normalizedName);
    setSection("all");
    return true;
  };

  const selectSection = (nextSection: NoteSection) => {
    setSection(nextSection);
    setFolder("");
  };

  const selectFolder = (nextFolder: string) => {
    setSection("all");
    setFolder((current) => (current === nextFolder ? "" : nextFolder));
  };

  return {
    notes,
    visibleNotes,
    selectedNote,
    selectedId,
    setSelectedId,
    section,
    folder,
    search,
    setSearch,
    folders,
    createNote,
    updateNote,
    togglePinned,
    moveToTrash,
    permanentlyDelete,
    createFolder,
    selectSection,
    selectFolder,
  };
}
