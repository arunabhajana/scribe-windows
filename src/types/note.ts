export type Note = {
  id: number;
  title: string;
  body: string;
  folder: string;
  pinned: boolean;
  updated: string;
  trashed?: boolean;
};

export type NoteSection = "all" | "pinned" | "trash";

export type NotePatch = Partial<Omit<Note, "id">>;

export type FolderIconName =
  | "folder"
  | "briefcase"
  | "book"
  | "code"
  | "heart"
  | "idea"
  | "music"
  | "travel"
  | "star";
export type FolderColor =
  | "violet"
  | "blue"
  | "mint"
  | "amber"
  | "rose"
  | "cyan";
export type NoteFolder = {
  name: string;
  icon: FolderIconName;
  color: FolderColor;
};
