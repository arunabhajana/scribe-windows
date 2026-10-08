import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  Database,
  FileText,
  Folder,
  HardDrive,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { Icon, type IconName } from "../Icon";
import {
  accentColors,
  type AccentColor,
} from "../../features/settings/accentColors";
import {
  defaultShortcutBindings,
  formatShortcut,
  getAltModifierLabel,
  getModifierLabel,
  isMacOS,
  shortcutActions,
  type ShortcutBindings,
  type ShortcutId,
} from "../../features/shortcuts/keyboardShortcuts";
import type { AccountProfile } from "../../features/auth/accountProfile";

type Category = {
  id: string;
  label: string;
  icon: IconName;
  color: string;
  description: string;
};
const categories: Category[] = [
  {
    id: "general",
    label: "General",
    icon: "general",
    color: "blue",
    description: "Make Scribe feel right for you.",
  },
  {
    id: "account",
    label: "Account",
    icon: "profile",
    color: "pink",
    description: "Manage your profile and account security.",
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: "appearance",
    color: "violet",
    description: "Shape the look and feel of your notes.",
  },
  {
    id: "editor",
    label: "Editor",
    icon: "note",
    color: "green",
    description: "Tune your writing environment.",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: "notifications",
    color: "amber",
    description: "Choose what deserves your attention.",
  },
  {
    id: "shortcuts",
    label: "Shortcuts",
    icon: "shortcuts",
    color: "cyan",
    description: "Find your flow with keyboard shortcuts.",
  },
  {
    id: "storage",
    label: "Storage",
    icon: "storage",
    color: "purple",
    description: "Manage notes stored on this device.",
  },
  {
    id: "about",
    label: "About",
    icon: "about",
    color: "pink",
    description: "A little more about Scribe.",
  },
];

const settingId = (label: string) =>
  `setting-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

const settingSearchIndex = [
  {
    label: "Launch at startup",
    detail: "Start Scribe when you sign in to your computer.",
    category: "general",
    terms: "startup launch windows start open",
  },
  {
    label: "Autosave",
    detail: "Choose when changes are saved while you write.",
    category: "general",
    terms: "save saving delay automatic",
  },
  {
    label: "Dark appearance",
    detail: "Use Scribe’s dark theme.",
    category: "appearance",
    terms: "theme night midnight dark",
    targetId: "setting-color-mood",
  },
  {
    label: "Light appearance",
    detail: "Use Scribe’s light theme.",
    category: "appearance",
    terms: "theme day daylight light bright",
    targetId: "setting-color-mood",
  },
  {
    label: "Accent color",
    detail: "Change the color used across the interface.",
    category: "appearance",
    terms: "colour accent purple violet blue pink",
  },
  {
    label: "Font family",
    detail: "Choose the typeface used in the editor.",
    category: "editor",
    terms: "font typography typeface",
  },
  {
    label: "Text size",
    detail: "Adjust the size of note text.",
    category: "editor",
    terms: "font size large small medium",
  },
  {
    label: "Spell check",
    detail: "Underline possible spelling mistakes.",
    category: "editor",
    terms: "spelling proofread",
  },
  {
    label: "Smart quotes",
    detail: "Use typographic quotation marks.",
    category: "editor",
    terms: "quotes punctuation curly",
  },
  {
    label: "Note reminders",
    detail: "Choose whether Scribe can send reminders.",
    category: "notifications",
    terms: "notification alert reminder",
  },
  {
    label: "Product updates",
    detail: "Choose whether to receive product updates.",
    category: "notifications",
    terms: "notification news announcements",
  },
  {
    label: "Sounds",
    detail: "Control subtle interface sounds.",
    category: "notifications",
    terms: "notification audio sound",
  },
  {
    label: "Keyboard shortcuts",
    detail: "Change shortcuts for common app actions.",
    category: "shortcuts",
    terms: "keys hotkey commands",
  },
  {
    label: "Local storage",
    detail: "View estimated space used by notes and settings.",
    category: "storage",
    terms: "space disk usage data files",
  },
  {
    label: "Profile photo",
    detail: "Choose the image shown on your account.",
    category: "account",
    terms: "avatar picture image photo",
  },
  {
    label: "Display name",
    detail: "Change the name shown in Scribe.",
    category: "account",
    terms: "username name profile",
  },
  {
    label: "Email address",
    detail: "Manage the address linked to your account.",
    category: "account",
    terms: "email sign in login",
  },
  {
    label: "Password & security",
    detail: "Reset your password and review account security.",
    category: "account",
    terms: "password reset security two factor 2fa",
  },
  {
    label: "Signed-in devices",
    detail: "Review devices using your account.",
    category: "account",
    terms: "devices sessions login",
  },
  {
    label: "Account data",
    detail: "Export or delete account data.",
    category: "account",
    terms: "privacy export delete data",
  },
  {
    label: "About Scribe",
    detail: "View app version and product information.",
    category: "about",
    terms: "version information app",
    targetId: "setting-scribe",
  },
];

function SettingToggle({
  label,
  detail,
  checked,
  onChange,
  color = "violet",
}: {
  label: string;
  detail: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  color?: string;
}) {
  return (
    <div className="setting-row" id={settingId(label)}>
      <div className="setting-row-copy">
        <strong>{label}</strong>
        <span>{detail}</span>
      </div>
      <button
        className={`setting-switch ${checked ? "checked" : ""} switch-${color}`}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        title={detail}
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </div>
  );
}

function SettingSelect({
  label,
  detail,
  value,
  options,
  onChange,
}: {
  label: string;
  detail: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);
  return (
    <div className="setting-row" id={settingId(label)}>
      <div className="setting-row-copy">
        <strong>{label}</strong>
        <span>{detail}</span>
      </div>
      <div className="setting-select-wrap" ref={pickerRef}>
        <button
          type="button"
          className={`setting-select-trigger ${open ? "is-open" : ""}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          title={detail}
          onClick={() => setOpen((current) => !current)}
        >
          <span>{value}</span>
          <ChevronDown size={15} />
        </button>
        {open && (
          <div
            className="setting-select-menu"
            role="listbox"
            aria-label={label}
          >
            {options.map((option) => (
              <button
                type="button"
                key={option}
                role="option"
                aria-selected={option === value}
                className={option === value ? "selected" : ""}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
              >
                {option === value && <Check size={14} />}
                <span>{option}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SettingCard({
  title,
  description,
  children,
  accent = "violet",
  id,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  accent?: string;
  id?: string;
}) {
  return (
    <section
      className={`settings-card accent-${accent}`}
      id={id ?? settingId(title)}
    >
      <div className="settings-card-heading">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

type StorageMetrics = {
  noteCount: number;
  folderCount: number;
  noteBytes: number;
  folderBytes: number;
  settingsBytes: number;
};
const formatBytes = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;

function AccountSettingRow({
  id,
  label,
  detail,
  action,
}: {
  id: string;
  label: string;
  detail: string;
  action: string;
}) {
  return (
    <div className="account-setting-row" id={settingId(id)}>
      <div>
        <strong>{label}</strong>
        <span>{detail}</span>
      </div>
      <button
        type="button"
        disabled
        title={`${action} is not available yet`}
      >
        {action}
        <ChevronRight size={15} />
      </button>
    </div>
  );
}

function StorageSettings({ metrics }: { metrics: StorageMetrics }) {
  const totalBytes =
    metrics.noteBytes + metrics.folderBytes + metrics.settingsBytes;
  const noteShare = totalBytes ? (metrics.noteBytes / totalBytes) * 100 : 0;
  const folderShare = totalBytes ? (metrics.folderBytes / totalBytes) * 100 : 0;
  const settingShare = totalBytes
    ? (metrics.settingsBytes / totalBytes) * 100
    : 0;
  return (
    <>
      <SettingCard
        title="Device storage"
        description="An estimate based on the notes and preferences currently held by Scribe."
        accent="purple"
        id={settingId("Local storage")}
      >
        <div className="storage-overview">
          <div className="storage-overview-icon">
            <HardDrive size={18} />
          </div>
          <div className="storage-overview-copy">
            <span>Estimated data in use</span>
            <strong>{formatBytes(totalBytes)}</strong>
            <small>Local content · calculated from current data</small>
          </div>
          <span className="storage-local-badge">
            <span />
            On this device
          </span>
        </div>
        <div
          className="storage-breakdown-bar"
          role="img"
          aria-label={`Storage breakdown: notes ${formatBytes(metrics.noteBytes)}, folders ${formatBytes(metrics.folderBytes)}, settings ${formatBytes(metrics.settingsBytes)}`}
        >
          <i style={{ width: `${noteShare}%` }} />
          <i style={{ width: `${folderShare}%` }} />
          <i style={{ width: `${settingShare}%` }} />
        </div>
        <div className="storage-breakdown-list">
          <div>
            <span className="storage-color-dot notes-dot" />
            <span className="storage-breakdown-label">
              <strong>Notes</strong>
              <small>{metrics.noteCount} notes, including items in Trash</small>
            </span>
            <b>{formatBytes(metrics.noteBytes)}</b>
          </div>
          <div>
            <span className="storage-color-dot folders-dot" />
            <span className="storage-breakdown-label">
              <strong>Folders</strong>
              <small>{metrics.folderCount} folders and their names</small>
            </span>
            <b>{formatBytes(metrics.folderBytes)}</b>
          </div>
          <div>
            <span className="storage-color-dot settings-dot" />
            <span className="storage-breakdown-label">
              <strong>Preferences</strong>
              <small>Theme, accent, and keyboard shortcuts</small>
            </span>
            <b>{formatBytes(metrics.settingsBytes)}</b>
          </div>
        </div>
      </SettingCard>
      <div className="storage-metric-grid">
        <SettingCard title="Your notes" accent="blue">
          <div className="storage-metric">
            <FileText size={17} />
            <strong>{metrics.noteCount}</strong>
            <span>notes</span>
          </div>
          <p className="storage-metric-foot">
            Text content uses approximately {formatBytes(metrics.noteBytes)}.
          </p>
        </SettingCard>
        <SettingCard title="Your folders" accent="green">
          <div className="storage-metric">
            <Folder size={17} />
            <strong>{metrics.folderCount}</strong>
            <span>folders</span>
          </div>
          <p className="storage-metric-foot">
            Folder names and settings use approximately{" "}
            {formatBytes(metrics.folderBytes)}.
          </p>
        </SettingCard>
      </div>
      <SettingCard
        title="Storage details"
        description="Some storage metrics will appear after local database and cloud sync are connected."
        accent="cyan"
      >
        <div className="storage-detail-row">
          <Database size={16} />
          <span>Database size</span>
          <strong>Not connected</strong>
        </div>
        <div className="storage-detail-row">
          <Smartphone size={16} />
          <span>Offline attachments</span>
          <strong>0 B</strong>
        </div>
        <div className="storage-detail-row">
          <HardDrive size={16} />
          <span>Cloud sync</span>
          <strong>Not connected</strong>
        </div>
        <div className="settings-info-banner">
          <span className="settings-info-icon">
            <Icon name="info" size={17} />
          </span>
          <span>
            Usage is estimated from in-memory demo content. It is not a
            measurement of disk usage yet.
          </span>
        </div>
      </SettingCard>
    </>
  );
}

function AccountSettings({ profile }: { profile: AccountProfile }) {
  const initials = profile.displayName.trim().charAt(0).toUpperCase() || "A";
  return (
    <>
      <SettingCard
        title="Your profile"
        description="Your account details from Supabase."
        accent="pink"
        id={settingId("Profile photo")}
      >
        <div className="account-profile-card">
          <div className="account-profile-avatar">
            {initials}
            <button
              type="button"
              disabled
              aria-label="Change profile photo"
              title="Profile photos are not available yet"
            >
              <Camera size={14} />
            </button>
          </div>
          <div className="account-profile-copy">
            <strong>{profile.displayName}</strong>
            <span>{profile.email}</span>
          </div>
          <span className="coming-soon-badge">Preview</span>
        </div>
        <AccountSettingRow
          id="Display name"
          label="Display name"
          detail={profile.displayName}
          action="Managed soon"
        />
        <AccountSettingRow
          id="Email address"
          label="Email address"
          detail={profile.email}
          action="Supabase"
        />
      </SettingCard>
      <SettingCard
        title="Password & security"
        description="Supabase protects sign-in and email verification. Additional account controls are planned."
        accent="blue"
        id={settingId("Password & security")}
      >
        <div className="account-security-intro">
          <span>
            <ShieldCheck size={18} />
          </span>
          <div>
            <strong>Email and password sign-in is active</strong>
            <small>Your session stays in this app’s local storage on this device. Sign out to remove it.</small>
          </div>
        </div>
        <AccountSettingRow
          id="Reset password"
          label="Reset password"
          detail="Request a password reset link."
          action="Coming soon"
        />
        <AccountSettingRow
          id="Signed-in devices"
          label="Signed-in devices"
          detail="Review and sign out of other devices."
          action="Coming soon"
        />
        <AccountSettingRow
          id="Two-step verification"
          label="Two-step verification"
          detail="Add another layer of sign-in protection."
          action="Coming soon"
        />
      </SettingCard>
      <SettingCard
        title="Account data"
        description="Control your account and personal data."
        accent="amber"
        id={settingId("Account data")}
      >
        <AccountSettingRow
          id="Export account data"
          label="Export account data"
          detail="Download a copy of your notes and account details."
          action="Coming soon"
        />
        <AccountSettingRow
          id="Delete account"
          label="Delete account"
          detail="Permanently remove your account and synced data."
          action="Coming soon"
        />
      </SettingCard>
    </>
  );
}

function KeyboardShortcutSettings({
  shortcuts,
  onChange,
}: {
  shortcuts: ShortcutBindings;
  onChange: (value: ShortcutBindings) => void;
}) {
  const [recording, setRecording] = useState<ShortcutId | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!recording) return;
    const capture = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setRecording(null);
        setError("");
        return;
      }
      const command = isMacOS() ? event.metaKey : event.ctrlKey;
      if (!command || event.altKey || event.key.length !== 1) return;
      event.preventDefault();
      event.stopPropagation();
      const key = event.key.toLowerCase();
      if ((key === "b" || key === "i") && !event.shiftKey) {
        setError(
          `${getModifierLabel()} + ${key.toUpperCase()} is reserved for text formatting.`,
        );
        return;
      }
      const conflict = shortcutActions.find(
        (action) =>
          action.id !== recording &&
          shortcuts[action.id].key === key &&
          shortcuts[action.id].shift === event.shiftKey,
      );
      if (conflict) {
        setError(`That shortcut is already assigned to ${conflict.label}.`);
        return;
      }
      onChange({ ...shortcuts, [recording]: { key, shift: event.shiftKey } });
      setRecording(null);
      setError("");
    };
    window.addEventListener("keydown", capture, true);
    return () => window.removeEventListener("keydown", capture, true);
  }, [recording, shortcuts, onChange]);

  return (
    <SettingCard
      title="Keyboard shortcuts"
      description="Choose a modifier shortcut for common actions. Press the shortcut you want after selecting Change."
      accent="cyan"
    >
      <div className="shortcut-settings-list">
        {shortcutActions.map((action) => (
          <div className="shortcut-setting-row" key={action.id}>
            <div className="shortcut-setting-copy">
              <strong>{action.label}</strong>
              <span>{action.description}</span>
            </div>
            <button
              className={`shortcut-edit-button ${recording === action.id ? "is-recording" : ""}`}
              onClick={() => {
                setError("");
                setRecording(action.id);
              }}
            >
              {recording === action.id
                ? "Press keys…"
                : formatShortcut(shortcuts[action.id])}
            </button>
          </div>
        ))}
      </div>
      {error && (
        <div className="shortcut-error" role="alert">
          {error}
        </div>
      )}
      <div className="shortcut-fixed-list">
        <strong>Text formatting</strong>
        <span>
          Bold <kbd>{getModifierLabel()} + B</kbd>
        </span>
        <span>
          Italic <kbd>{getModifierLabel()} + I</kbd>
        </span>
        <span>
          Heading 1{" "}
          <kbd>
            {getModifierLabel()} + {getAltModifierLabel()} + 1
          </kbd>
        </span>
        <span>
          Heading 2{" "}
          <kbd>
            {getModifierLabel()} + {getAltModifierLabel()} + 2
          </kbd>
        </span>
        <span>
          Insert link <kbd>{getModifierLabel()} + K</kbd>
        </span>
        <span>
          Close or discard a draft <kbd>Esc</kbd>
        </span>
        <small>
          Formatting and dialog shortcuts are fixed and can’t be reassigned.
        </small>
      </div>
      <button
        className="shortcut-reset-button"
        onClick={() => {
          onChange(defaultShortcutBindings);
          setRecording(null);
          setError("");
        }}
      >
        Restore default shortcuts
      </button>
    </SettingCard>
  );
}

function CategoryContent({
  category,
  dark,
  setDark,
  accent,
  onAccentChange,
  shortcuts,
  onShortcutsChange,
  storageMetrics,
  profile,
}: {
  category: Category;
  dark: boolean;
  setDark: (value: boolean) => void;
  accent: AccentColor;
  onAccentChange: (value: AccentColor) => void;
  shortcuts: ShortcutBindings;
  onShortcutsChange: (value: ShortcutBindings) => void;
  storageMetrics: StorageMetrics;
  profile: AccountProfile;
}) {
  const [toggles, setToggles] = useState({
    launch: true,
    spellcheck: true,
    smartQuotes: false,
    reminders: true,
    updates: true,
    sounds: false,
  });
  const [values, setValues] = useState({
    font: "DM Sans",
    size: "Medium",
    autosave: "Immediately",
  });
  const toggle = (key: keyof typeof toggles) => (value: boolean) =>
    setToggles((current) => ({ ...current, [key]: value }));
  const change = (key: keyof typeof values) => (value: string) =>
    setValues((current) => ({ ...current, [key]: value }));
  switch (category.id) {
    case "general":
      return (
        <>
          <SettingCard
            title="A smoother start"
            description="A few small choices that make Scribe yours."
            accent="blue"
          >
            <SettingToggle
              label="Launch at startup"
              detail="Open Scribe when you sign in to your computer."
              checked={toggles.launch}
              onChange={toggle("launch")}
              color="blue"
            />
            <SettingSelect
              label="Autosave"
              detail="Choose when Scribe saves your writing."
              value={values.autosave}
              options={["Immediately", "After 1 second", "After 5 seconds"]}
              onChange={change("autosave")}
            />
          </SettingCard>
          <SettingCard
            title="Your preferences"
            description="Scribe’s interface preferences are stored on this device."
            accent="green"
          >
            <div className="settings-info-banner">
              <span className="settings-info-icon">
                <Icon name="check" size={17} />
              </span>
              <span>
                Your settings stay on this device in the current preview.
              </span>
            </div>
          </SettingCard>
        </>
      );
    case "account":
      return <AccountSettings profile={profile} />;
    case "appearance":
      return (
        <>
          <SettingCard
            title="Color & mood"
            description="Choose a canvas for your notes. Your choice updates the whole app."
            accent="violet"
            id={settingId("Color & mood")}
          >
            <div className="theme-choice-row">
              <button
                className={`theme-choice theme-choice-dark ${dark ? "chosen" : ""}`}
                onClick={() => setDark(true)}
                aria-pressed={dark}
              >
                <span className="theme-preview dark-preview">
                  <i />
                  <i />
                  <i />
                </span>
                <strong>Midnight</strong>
                <span>Dark canvas</span>
              </button>
              <button
                className={`theme-choice theme-choice-light ${!dark ? "chosen" : ""}`}
                onClick={() => setDark(false)}
                aria-pressed={!dark}
              >
                <span className="theme-preview light-preview">
                  <i />
                  <i />
                  <i />
                </span>
                <strong>Daylight</strong>
                <span>Light canvas</span>
              </button>
            </div>
          </SettingCard>
          <SettingCard
            title="Accent color"
            description="Your color selection is used throughout the app."
            accent="pink"
          >
            <div className="accent-swatches">
              {Object.entries(accentColors).map(([key, item]) => (
                <button
                  key={key}
                  className={`accent-swatch ${accent === key ? "selected" : ""}`}
                  style={{ "--swatch": item.color } as React.CSSProperties}
                  onClick={() => onAccentChange(key as AccentColor)}
                  aria-label={`${item.label} accent`}
                  data-tooltip={`Use ${item.label} accent`}
                >
                  {accent === key && <Icon name="check" size={14} />}
                </button>
              ))}
            </div>
          </SettingCard>
        </>
      );
    case "editor":
      return (
        <>
          <SettingCard
            title="Writing setup"
            description="Set up a calm, comfortable place to write."
            accent="green"
          >
            <SettingSelect
              label="Font family"
              detail="Choose the voice of your notes."
              value={values.font}
              options={["DM Sans", "System default", "Georgia", "Monospace"]}
              onChange={change("font")}
            />
            <SettingSelect
              label="Text size"
              detail="Adjust editor text to your preference."
              value={values.size}
              options={["Small", "Medium", "Large"]}
              onChange={change("size")}
            />
            <SettingToggle
              label="Spell check"
              detail="Underline possible spelling mistakes as you type."
              checked={toggles.spellcheck}
              onChange={toggle("spellcheck")}
              color="green"
            />
            <SettingToggle
              label="Smart quotes"
              detail="Use typographic quotation marks while writing."
              checked={toggles.smartQuotes}
              onChange={toggle("smartQuotes")}
              color="green"
            />
          </SettingCard>
        </>
      );
    case "notifications":
      return (
        <>
          <SettingCard
            title="Stay in the loop"
            description="Choose which updates Scribe can send your way."
            accent="amber"
          >
            <SettingToggle
              label="Note reminders"
              detail="Get a gentle nudge for reminders you create."
              checked={toggles.reminders}
              onChange={toggle("reminders")}
              color="amber"
            />
            <SettingToggle
              label="Product updates"
              detail="Hear about new features and improvements."
              checked={toggles.updates}
              onChange={toggle("updates")}
              color="amber"
            />
            <SettingToggle
              label="Sounds"
              detail="Play subtle sounds for app interactions."
              checked={toggles.sounds}
              onChange={toggle("sounds")}
              color="amber"
            />
          </SettingCard>
        </>
      );
    case "shortcuts":
      return (
        <KeyboardShortcutSettings
          shortcuts={shortcuts}
          onChange={onShortcutsChange}
        />
      );
    case "storage":
      return <StorageSettings metrics={storageMetrics} />;
    default:
      return (
        <>
          <SettingCard
            title="Scribe"
            description="A quiet place for everything on your mind."
            accent="pink"
          >
            <div className="about-mark">
              <div className="brand-mark">
                <Icon name="note" size={22} />
              </div>
              <div>
                <strong>Scribe for Windows</strong>
                <span>Version 0.1.0 · Preview</span>
              </div>
            </div>
            <div className="settings-info-banner">
              <span className="settings-info-icon">
                <Icon name="info" size={17} />
              </span>
              <span>
                Built for thoughtful notes. Cross-platform sync is coming soon.
              </span>
            </div>
          </SettingCard>
        </>
      );
  }
}

type SearchResult = {
  label: string;
  detail: string;
  category: Category;
  targetId?: string;
  isCategory?: boolean;
};

function SettingsSearchResults({
  results,
  onOpen,
}: {
  results: SearchResult[];
  onOpen: (result: SearchResult) => void;
}) {
  if (!results.length)
    return (
      <div className="settings-search-empty">
        <span className="settings-search-empty-icon">
          <Icon name="search" size={20} />
        </span>
        <strong>No settings found</strong>
        <span>
          Try a name like “autosave”, “password”, “accent”, or “storage”.
        </span>
      </div>
    );
  const grouped = categories
    .map((category) => ({
      category,
      results: results.filter((result) => result.category.id === category.id),
    }))
    .filter((group) => group.results.length);
  return (
    <div className="settings-search-results">
      {grouped.map((group) => (
        <section className="settings-result-group" key={group.category.id}>
          <div className="settings-result-group-title">
            <span
              className={`settings-category-icon category-${group.category.color}`}
            >
              <Icon name={group.category.icon} size={15} />
            </span>
            <strong>{group.category.label}</strong>
            <span>{group.results.length}</span>
          </div>
          <div className="settings-result-list">
            {group.results.map((result, index) => (
              <button
                className="settings-result-card"
                key={`${result.label}-${index}`}
                onClick={() => onOpen(result)}
              >
                <span
                  className={`settings-result-icon category-${group.category.color}`}
                >
                  <Icon
                    name={result.isCategory ? group.category.icon : "settings"}
                    size={16}
                  />
                </span>
                <span className="settings-result-copy">
                  <strong>{result.label}</strong>
                  <small>{result.detail}</small>
                </span>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function SettingsPage({
  dark,
  accent,
  onAccentChange,
  onToggleTheme,
  onClose,
  shortcuts,
  onShortcutsChange,
  storageMetrics,
  profile,
}: {
  dark: boolean;
  accent: AccentColor;
  onAccentChange: (value: AccentColor) => void;
  onToggleTheme: (value: boolean) => void;
  onClose: () => void;
  shortcuts: ShortcutBindings;
  onShortcutsChange: (value: ShortcutBindings) => void;
  storageMetrics: StorageMetrics;
  profile: AccountProfile;
}) {
  const [categoryId, setCategoryId] = useState("general");
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const matchingSettings = useMemo(
    () =>
      settingSearchIndex
        .filter((item) =>
          `${item.label} ${item.detail} ${item.terms}`
            .toLowerCase()
            .includes(normalizedQuery),
        )
        .map((item) => ({
          ...item,
          category: categories.find(
            (category) => category.id === item.category,
          )!,
        })),
    [normalizedQuery],
  );
  const matchingCategoryResults = useMemo(
    () =>
      categories
        .filter(
          (category) =>
            normalizedQuery &&
            category.label.toLowerCase().includes(normalizedQuery),
        )
        .map((category) => ({
          label: `${category.label} settings`,
          detail: category.description,
          category,
          isCategory: true,
        })),
    [normalizedQuery],
  );
  const searchResults: SearchResult[] = [
    ...matchingCategoryResults,
    ...matchingSettings.map((item) => ({
      label: item.label,
      detail: item.detail,
      category: item.category,
      targetId: item.targetId ?? settingId(item.label),
    })),
  ];
  const filteredCategories = normalizedQuery
    ? categories.filter(
        (category) =>
          matchingCategoryResults.some(
            (result) => result.category.id === category.id,
          ) ||
          matchingSettings.some((result) => result.category.id === category.id),
      )
    : categories;
  const category =
    categories.find((item) => item.id === categoryId) ?? categories[0];
  const activeCategory =
    (filteredCategories.some((item) => item.id === categoryId)
      ? category
      : filteredCategories[0]) ?? categories[0];
  const openSearchResult = (result: SearchResult) => {
    setCategoryId(result.category.id);
    setQuery("");
    if (result.targetId)
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const target = document.getElementById(result.targetId!);
          target?.scrollIntoView({ behavior: "smooth", block: "center" });
          target?.classList.add("setting-search-highlight");
          window.setTimeout(
            () => target?.classList.remove("setting-search-highlight"),
            1500,
          );
        }),
      );
  };
  return (
    <main
      className={`settings-page ${dark ? "settings-dark" : "settings-light"} accent-${accent}`}
      style={
        {
          "--accent": accentColors[accent].color,
          "--accent-soft": `color-mix(in srgb, ${accentColors[accent].color} 18%, transparent)`,
        } as React.CSSProperties
      }
    >
      <aside className="settings-nav">
        <div className="settings-nav-title">
          <span>SETTINGS</span>
          <button
            className="settings-nav-back"
            onClick={onClose}
            aria-label="Back to notes"
            title="Back to notes"
          >
            <Icon name="arrowLeft" size={14} />
            <span>Back</span>
          </button>
        </div>
        <label className="settings-search">
          <Icon name="search" size={16} />
          <input
            placeholder="Search settings and options"
            aria-label="Search settings and options"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <nav aria-label="Settings categories">
          {filteredCategories.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCategoryId(item.id);
                setQuery("");
              }}
              className={`settings-nav-item ${categoryId === item.id && !normalizedQuery ? "active" : ""}`}
            >
              <span className={`settings-category-icon category-${item.color}`}>
                <Icon name={item.icon} size={17} />
              </span>
              <span>{item.label}</span>
            </button>
          ))}
          {filteredCategories.length === 0 && (
            <span className="settings-no-results">No matching settings</span>
          )}
        </nav>
        <div className="settings-nav-footer">
          <button onClick={onClose}>
            <Icon name="note" size={15} /> Back to notes
          </button>
          <span>Scribe · Preview</span>
        </div>
      </aside>
      <section className="settings-content">
        <header className="settings-page-header">
          <div className="settings-heading-copy">
            <div className={`settings-kicker category-${activeCategory.color}`}>
              <Icon name={activeCategory.icon} size={15} />
              {normalizedQuery ? "Search results" : activeCategory.label}
            </div>
            <h1>
              {normalizedQuery
                ? `Results for “${query.trim()}”`
                : activeCategory.label}
            </h1>
            <p>
              {normalizedQuery
                ? `${searchResults.length} matching ${searchResults.length === 1 ? "setting" : "settings"} across your preferences.`
                : activeCategory.description}
            </p>
          </div>
        </header>
        <div className="settings-content-scroll">
          {normalizedQuery ? (
            <SettingsSearchResults
              results={searchResults}
              onOpen={openSearchResult}
            />
          ) : (
            <CategoryContent
              key={activeCategory.id}
              category={activeCategory}
              dark={dark}
              setDark={onToggleTheme}
              accent={accent}
              onAccentChange={onAccentChange}
              shortcuts={shortcuts}
              onShortcutsChange={onShortcutsChange}
              storageMetrics={storageMetrics}
              profile={profile}
            />
          )}
        </div>
      </section>
    </main>
  );
}
