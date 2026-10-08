import { useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  Minimize2,
  Minus,
  Moon,
  Settings2,
  Square,
  Sun,
  X,
} from "lucide-react";

export function TitleBar({
  onOpenSettings,
  dark,
  onToggleTheme,
  inert,
  settingsShortcut,
}: {
  onOpenSettings?: () => void;
  dark?: boolean;
  onToggleTheme?: () => void;
  inert?: boolean;
  settingsShortcut?: string;
}) {
  const [maximized, setMaximized] = useState(false);
  const desktop = isTauri();

  useEffect(() => {
    if (!desktop) return;
    const appWindow = getCurrentWindow();
    let unlisten: (() => void) | undefined;
    void appWindow.isMaximized().then(setMaximized);
    void appWindow
      .onResized(() => {
        void appWindow.isMaximized().then(setMaximized);
      })
      .then((handler) => {
        unlisten = handler;
      });
    return () => unlisten?.();
  }, [desktop]);

  const toggleMaximize = () => {
    if (!desktop) return;
    void getCurrentWindow().toggleMaximize();
  };

  const startWindowDrag = (event: React.MouseEvent<HTMLElement>) => {
    if (!desktop || inert || event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button")) return;
    void getCurrentWindow().startDragging();
  };

  return (
    <header
      className="titlebar"
      data-tauri-drag-region
      onMouseDown={startWindowDrag}
      onDoubleClick={toggleMaximize}
      inert={inert}
    >
      <div className="titlebar-leading" data-tauri-drag-region>
        <span className="titlebar-status-dot" />
        <span>On this device</span>
      </div>
      <div className="titlebar-title" data-tauri-drag-region>
        Scribe
      </div>
      <div className="titlebar-trailing">
        {onToggleTheme && (
          <button
            className="titlebar-action theme-titlebar-action"
            onClick={onToggleTheme}
            aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
            title={dark ? "Switch to light theme" : "Switch to dark theme"}
          >
            {dark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        )}
        {onOpenSettings && (
          <button
            className="titlebar-action"
            onClick={onOpenSettings}
            aria-label="Open settings"
            title={`Settings${settingsShortcut ? ` · ${settingsShortcut}` : ""}`}
          >
            <Settings2 size={14} />
          </button>
        )}
        {desktop && (
          <div className="window-action-group">
            <button
              className="window-action"
              aria-label="Minimize"
              title="Minimize"
              onClick={() => void getCurrentWindow().minimize()}
            >
              <Minus size={14} />
            </button>
            <button
              className="window-action"
              aria-label={maximized ? "Restore" : "Maximize"}
              title={maximized ? "Restore" : "Maximize"}
              onClick={toggleMaximize}
            >
              {maximized ? <Minimize2 size={12} /> : <Square size={11} />}
            </button>
            <button
              className="window-action close-window-action"
              aria-label="Close"
              title="Close"
              onClick={() => void getCurrentWindow().close()}
            >
              <X size={15} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
