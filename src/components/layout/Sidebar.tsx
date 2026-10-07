import type { NoteSection } from "../../types/note";
import type { NoteFolder } from "../../types/note";
import { FolderNavigation } from "../navigation/FolderNavigation";
import { PrimaryNavigation } from "../navigation/PrimaryNavigation";
import { SearchNotes } from "../navigation/SearchNotes";
import { BrandHeader } from "../navigation/BrandHeader";
import { ProfileBar } from "../profile/ProfileMenu";
import type { ShortcutBindings } from "../../features/shortcuts/keyboardShortcuts";
import { formatShortcut } from "../../features/shortcuts/keyboardShortcuts";

type SidebarProps = {
  section: NoteSection;
  folder: string;
  folders: NoteFolder[];
  noteCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  onSelectSection: (section: NoteSection) => void;
  onSelectFolder: (folder: string) => void;
  onCreateFolder: () => void;
  onOpenPreferences: () => void;
  onLogout: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onExpandSidebar: () => void;
  shortcuts: ShortcutBindings;
};

export function Sidebar(props: SidebarProps) {
  return (
    <aside className="sidebar">
      <BrandHeader
        collapsed={props.collapsed}
        onToggleCollapsed={props.onToggleCollapsed}
        shortcut={formatShortcut(props.shortcuts.toggleSidebar)}
      />
      <div className="sidebar-scroll">
        <SearchNotes
          value={props.search}
          onChange={props.onSearchChange}
          collapsed={props.collapsed}
          onExpand={props.onExpandSidebar}
          shortcut={formatShortcut(props.shortcuts.search)}
        />
        <PrimaryNavigation
          section={props.section}
          noteCount={props.noteCount}
          onSelect={props.onSelectSection}
          shortcuts={props.shortcuts}
        />
        <FolderNavigation
          folders={props.folders}
          selectedFolder={props.folder}
          onSelectFolder={props.onSelectFolder}
          onCreateFolder={props.onCreateFolder}
        />
      </div>
      <ProfileBar
        collapsed={props.collapsed}
        onOpenPreferences={props.onOpenPreferences}
        onLogout={props.onLogout}
      />
    </aside>
  );
}
