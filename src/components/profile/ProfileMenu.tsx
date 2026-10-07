import { useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";

export function ProfileMenu({
  onOpenPreferences,
  onLogout,
  collapsed,
}: {
  onOpenPreferences: () => void;
  onLogout: () => void;
  collapsed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnPointerDown);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="profile-menu-wrap" ref={menuRef}>
      <button
        className={`icon-button profile-menu ${collapsed ? "profile-menu-avatar" : ""}`}
        aria-label="Account menu"
        data-tooltip="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {collapsed ? (
          <span className="avatar">A</span>
        ) : (
          <span className="profile-menu-dots" aria-hidden="true">
            ···
          </span>
        )}
      </button>
      {open && (
        <div
          className={`profile-popover ${collapsed ? "profile-popover-collapsed" : ""}`}
          role="menu"
        >
          <div className="profile-popover-user">
            <div className="avatar">A</div>
            <div>
              <strong>Alex Morgan</strong>
              <span>Local account</span>
            </div>
          </div>
          <div className="profile-popover-divider" />
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onOpenPreferences();
            }}
          >
            <Icon name="sun" size={15} /> Settings
          </button>
          <div className="profile-popover-divider menu-divider-bottom" />
          <button
            className="logout-menu-item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            <Icon name="logout" size={15} /> Log out
          </button>
        </div>
      )}
    </div>
  );
}

export function ProfileBar({
  onOpenPreferences,
  onLogout,
  collapsed,
}: {
  onOpenPreferences: () => void;
  onLogout: () => void;
  collapsed: boolean;
}) {
  return (
    <div className={`profile-row ${collapsed ? "is-collapsed" : ""}`}>
      <div className="avatar profile-avatar">A</div>
      <div className="profile-copy">
        <span className="profile-name">Alex Morgan</span>
        <span className="profile-plan">Local profile</span>
      </div>
      <ProfileMenu
        collapsed={collapsed}
        onOpenPreferences={onOpenPreferences}
        onLogout={onLogout}
      />
    </div>
  );
}
