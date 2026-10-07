import { Icon } from "../Icon";
import type { NoteFolder } from "../../types/note";

export function FolderNavigation({
  folders,
  selectedFolder,
  onSelectFolder,
  onCreateFolder,
}: {
  folders: NoteFolder[];
  selectedFolder: string;
  onSelectFolder: (folder: string) => void;
  onCreateFolder: () => void;
}) {
  return (
    <>
      <div className="folder-heading">
        <span>Folders</span>
        <button
          className="icon-button add-folder"
          onClick={onCreateFolder}
          aria-label="Create folder"
          data-tooltip="Create folder"
        >
          <Icon name="plus" size={16} />
        </button>
      </div>
      <nav className="folder-nav" aria-label="Folders">
        {folders.map((folder) => (
          <button
            key={folder.name}
            data-tooltip={folder.name}
            aria-label={folder.name}
            className={`folder-item ${selectedFolder === folder.name ? "active" : ""}`}
            onClick={() => onSelectFolder(folder.name)}
          >
            <span
              className="folder-icon"
              style={
                {
                  "--folder-color": `var(--folder-${folder.color})`,
                } as React.CSSProperties
              }
            >
              <Icon name={folder.icon} size={15} />
            </span>
            <span>{folder.name}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
