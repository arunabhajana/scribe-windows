export const shortcutActions = [
  { id: "newNote", label: "New note", description: "Start a new note." },
  { id: "search", label: "Search notes", description: "Focus note search." },
  {
    id: "allNotes",
    label: "Show all notes",
    description: "Switch to All Notes.",
  },
  {
    id: "pinnedNotes",
    label: "Show pinned notes",
    description: "Switch to Pinned Notes.",
  },
  { id: "trash", label: "Show trash", description: "Switch to Trash." },
  {
    id: "toggleSidebar",
    label: "Toggle sidebar",
    description: "Expand or collapse the sidebar.",
  },
  {
    id: "togglePin",
    label: "Pin selected note",
    description: "Toggle the selected note’s pinned state.",
  },
  {
    id: "openSettings",
    label: "Open settings",
    description: "Open the settings page.",
  },
] as const;

export type ShortcutId = (typeof shortcutActions)[number]["id"];
export type ShortcutBinding = { key: string; shift: boolean };
export type ShortcutBindings = Record<ShortcutId, ShortcutBinding>;

export const defaultShortcutBindings: ShortcutBindings = {
  newNote: { key: "n", shift: false },
  search: { key: "k", shift: false },
  allNotes: { key: "1", shift: false },
  pinnedNotes: { key: "2", shift: false },
  trash: { key: "3", shift: false },
  toggleSidebar: { key: "b", shift: true },
  togglePin: { key: "p", shift: true },
  openSettings: { key: ",", shift: false },
};

export function getShortcutBindings(): ShortcutBindings {
  try {
    const saved = localStorage.getItem("scribe-keyboard-shortcuts");
    if (!saved) return defaultShortcutBindings;
    const parsed = JSON.parse(saved) as Partial<ShortcutBindings>;
    return Object.fromEntries(
      shortcutActions.map(({ id }) => {
        const binding = parsed[id];
        return [
          id,
          binding &&
          typeof binding.key === "string" &&
          typeof binding.shift === "boolean"
            ? binding
            : defaultShortcutBindings[id],
        ];
      }),
    ) as ShortcutBindings;
  } catch {
    return defaultShortcutBindings;
  }
}

export function isMacOS() {
  return /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);
}

export function getModifierLabel() {
  return isMacOS() ? "⌘" : "Ctrl";
}

export function getAltModifierLabel() {
  return isMacOS() ? "Option" : "Alt";
}

export function formatShortcut(binding: ShortcutBinding) {
  return `${getModifierLabel()} + ${binding.shift ? "Shift + " : ""}${binding.key === "," ? "," : binding.key.toUpperCase()}`;
}

export function matchesShortcut(
  event: KeyboardEvent,
  binding: ShortcutBinding,
) {
  const commandPressed = isMacOS() ? event.metaKey : event.ctrlKey;
  return (
    commandPressed &&
    !event.altKey &&
    event.shiftKey === binding.shift &&
    event.key.toLowerCase() === binding.key.toLowerCase()
  );
}
