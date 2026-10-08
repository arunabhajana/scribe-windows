import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import { CreateFolderDialog } from "./components/dialogs/CreateFolderDialog";
import { EditorPane } from "./components/editor/EditorPane";
import { NotesPane } from "./components/notes/NotesPane";
import { Sidebar } from "./components/layout/Sidebar";
import { useNotes } from "./hooks/useNotes";
import type { Note } from "./types/note";
import { SettingsPage } from "./components/settings/SettingsPage";
import { AuthPage } from "./components/auth/AuthPage";
import { useAuth } from "./hooks/useAuth";
import { profileFromUser } from "./features/auth/accountProfile";
import type { AccentColor } from "./features/settings/accentColors";
import { accentColors } from "./features/settings/accentColors";
import { TitleBar } from "./components/layout/TitleBar";
import { NewNoteComposer } from "./components/dialogs/NewNoteComposer";
import { TooltipLayer } from "./components/layout/TooltipLayer";
import {
  formatShortcut,
  getShortcutBindings,
  matchesShortcut,
  shortcutActions,
  type ShortcutBindings,
} from "./features/shortcuts/keyboardShortcuts";

type AppPage = "notes" | "preferences";

function App() {
  const notesState = useNotes();
  const auth = useAuth();
  const [isDark, setIsDark] = useState(true);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isComposerModalActive, setIsComposerModalActive] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("scribe-sidebar-collapsed") === "true",
  );
  const [page, setPage] = useState<AppPage>("notes");
  const [shortcuts, setShortcuts] =
    useState<ShortcutBindings>(getShortcutBindings);
  const [accent, setAccent] = useState<AccentColor>(
    () => (localStorage.getItem("scribe-accent") as AccentColor) || "violet",
  );

  const storageMetrics = useMemo(() => {
    const bytes = (value: unknown) =>
      new TextEncoder().encode(JSON.stringify(value)).length;
    const settingsBytes = [
      "scribe-accent",
      "scribe-keyboard-shortcuts",
      "scribe-sidebar-collapsed",
    ].reduce(
      (total, key) =>
        total +
        new TextEncoder().encode(localStorage.getItem(key) ?? "").length,
      0,
    );
    return {
      noteCount: notesState.notes.length,
      folderCount: notesState.folders.length,
      noteBytes: bytes(notesState.notes),
      folderBytes: bytes(notesState.folders),
      settingsBytes,
    };
  }, [notesState.notes, notesState.folders]);

  const changeAccent = (value: AccentColor) => {
    setAccent(value);
    localStorage.setItem("scribe-accent", value);
  };

  const changeShortcuts = (value: ShortcutBindings) => {
    setShortcuts(value);
    localStorage.setItem("scribe-keyboard-shortcuts", JSON.stringify(value));
  };

  const toggleSidebar = useCallback(() => {
    const nextCollapsed = !sidebarCollapsed;
    setSidebarCollapsed(nextCollapsed);
    localStorage.setItem("scribe-sidebar-collapsed", String(nextCollapsed));
  }, [sidebarCollapsed]);

  const openNewNote = useCallback(() => {
    if (isComposerOpen) {
      window.dispatchEvent(new Event("scribe:restore-note-draft"));
    } else {
      setIsComposerOpen(true);
      setIsComposerModalActive(true);
    }
  }, [isComposerOpen]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (
        !auth.user ||
        page !== "notes" ||
        isComposerModalActive ||
        event.defaultPrevented ||
        event.isComposing
      )
        return;
      const action = shortcutActions.find((item) =>
        matchesShortcut(event, shortcuts[item.id]),
      );
      if (!action) return;
      event.preventDefault();
      switch (action.id) {
        case "newNote":
          openNewNote();
          break;
        case "search":
          window.dispatchEvent(new Event("scribe:focus-notes-search"));
          break;
        case "allNotes":
          notesState.selectSection("all");
          break;
        case "pinnedNotes":
          notesState.selectSection("pinned");
          break;
        case "trash":
          notesState.selectSection("trash");
          break;
        case "toggleSidebar":
          toggleSidebar();
          break;
        case "togglePin":
          if (notesState.selectedNote)
            notesState.togglePinned(notesState.selectedNote.id);
          break;
        case "openSettings":
          setPage("preferences");
          break;
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [
    isComposerModalActive,
    auth.user,
    notesState,
    openNewNote,
    page,
    shortcuts,
    toggleSidebar,
  ]);

  const handleDeleteNote = (note: Note) => {
    if (note.trashed) {
      notesState.permanentlyDelete(note.id);
    } else {
      notesState.moveToTrash(note.id);
    }
    notesState.setSelectedId(null);
  };

  if (auth.loading)
    return (
      <div className={`desktop-frame ${isDark ? "theme-dark" : "theme-light"}`}>
        <TitleBar dark={isDark} onToggleTheme={() => setIsDark((value) => !value)} />
        <main className="auth-screen auth-loading" aria-label="Restoring session">
          <span className="auth-online-dot" />
          <span>Restoring your session…</span>
        </main>
      </div>
    );

  if (!auth.user)
    return (
      <div
        className={`desktop-frame ${isDark ? "theme-dark" : "theme-light"}`}
        style={
          {
            "--accent": accentColors.violet.color,
            "--accent-soft": `color-mix(in srgb, ${accentColors.violet.color} 18%, transparent)`,
          } as React.CSSProperties
        }
      >
        <TitleBar
          dark={isDark}
          onToggleTheme={() => setIsDark((value) => !value)}
        />
        <AuthPage
          configured={auth.configured}
          onSignIn={auth.signInWithPassword}
          onSignUp={auth.signUpWithPassword}
          callbackError={auth.authCallbackError}
          notice={auth.authNotice}
          onAuthenticated={() => setPage("notes")}
        />
      </div>
    );
  if (page === "preferences")
    return (
      <div
        className="desktop-frame"
        style={
          { "--accent": accentColors[accent].color } as React.CSSProperties
        }
      >
        <TitleBar
          dark={isDark}
          onToggleTheme={() => setIsDark((value) => !value)}
        />
        <SettingsPage
          dark={isDark}
          accent={accent}
          onAccentChange={changeAccent}
          onToggleTheme={setIsDark}
          onClose={() => setPage("notes")}
          shortcuts={shortcuts}
          onShortcutsChange={changeShortcuts}
          storageMetrics={storageMetrics}
          profile={profileFromUser(auth.user)}
        />
      </div>
    );

  return (
    <main
      className={`app-shell ${isDark ? "theme-dark" : "theme-light"} accent-${accent}`}
      style={
        {
          "--accent": accentColors[accent].color,
          "--accent-soft": `color-mix(in srgb, ${accentColors[accent].color} 18%, transparent)`,
        } as React.CSSProperties
      }
    >
      <TooltipLayer />
      <TitleBar
        dark={isDark}
        onToggleTheme={() => setIsDark((value) => !value)}
        onOpenSettings={() => setPage("preferences")}
        inert={isComposerModalActive}
        settingsShortcut={formatShortcut(shortcuts.openSettings)}
      />
      <div
        className={`app-layout ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}
        inert={isComposerModalActive}
      >
        <Sidebar
          section={notesState.section}
          folder={notesState.folder}
          folders={notesState.folders}
          noteCount={notesState.notes.filter((note) => !note.trashed).length}
          search={notesState.search}
          onSearchChange={notesState.setSearch}
          onSelectSection={notesState.selectSection}
          onSelectFolder={notesState.selectFolder}
          onCreateFolder={() => setIsCreateFolderOpen(true)}
          onOpenPreferences={() => setPage("preferences")}
          onLogout={async () => {
            await auth.signOut();
            notesState.resetDemoData();
          }}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={toggleSidebar}
          onExpandSidebar={() => setSidebarCollapsed(false)}
          shortcuts={shortcuts}
          profile={profileFromUser(auth.user)}
        />
        <NotesPane
          notes={notesState.visibleNotes}
          folders={notesState.folders}
          selectedId={notesState.selectedId}
          section={notesState.section}
          folder={notesState.folder}
          search={notesState.search}
          onSelectNote={notesState.setSelectedId}
          onTogglePinned={notesState.togglePinned}
          onCreateNote={openNewNote}
          shortcuts={shortcuts}
        />
        <EditorPane
          note={notesState.selectedNote}
          isTrash={notesState.section === "trash"}
          deleteLabel={
            notesState.section === "trash" ? "Delete" : "Move to trash"
          }
          onCreateNote={openNewNote}
          onUpdateNote={notesState.updateNote}
          onDeleteNote={handleDeleteNote}
          pinShortcut={formatShortcut(shortcuts.togglePin)}
          newNoteShortcut={formatShortcut(shortcuts.newNote)}
        />
      </div>
      {isCreateFolderOpen && (
        <CreateFolderDialog
          onClose={() => setIsCreateFolderOpen(false)}
          onCreate={notesState.createFolder}
        />
      )}
      {isComposerOpen && (
        <NewNoteComposer
          folders={notesState.folders}
          onSave={(draft) => {
            notesState.createNote(draft);
            setIsComposerOpen(false);
            setIsComposerModalActive(false);
          }}
          onClose={() => {
            setIsComposerOpen(false);
            setIsComposerModalActive(false);
          }}
          onModalActiveChange={setIsComposerModalActive}
        />
      )}
    </main>
  );
}

export default App;
