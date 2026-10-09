import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  FolderSyncConflictError,
  notesRepository,
  OfflineSyncConflictError,
} from "../features/notes/notesRepository";
import {
  offlineStore,
  type OutboxOperation,
} from "../features/notes/offlineStore";
import type {
  FolderColor,
  FolderIconName,
  Note,
  NoteFolder,
  NotePatch,
  NoteSection,
} from "../types/note";

const makeId = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const folderOrderStorageKey = (userId: string) =>
  `scribe-folder-order:${userId}`;
const unfiledOrderStorageKey = (userId: string) =>
  `scribe-unfiled-position:${userId}`;
function applyLocalFolderOrder(userId: string, folders: NoteFolder[]) {
  let savedIds: string[] = [];
  let savedUnfiledPosition: number | null = null;
  try {
    const saved = localStorage.getItem(folderOrderStorageKey(userId));
    const parsed: unknown = saved ? JSON.parse(saved) : [];
    if (Array.isArray(parsed))
      savedIds = parsed.filter((id): id is string => typeof id === "string");
    const position =
      localStorage.getItem(unfiledOrderStorageKey(userId)) ??
      localStorage.getItem("scribe-unfiled-position");
    if (position !== null && Number.isFinite(Number(position)))
      savedUnfiledPosition = Number(position);
  } catch {
    /* An unreadable local preference falls back to creation order. */
  }
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const ordered = savedIds
    .map((id) => byId.get(id))
    .filter((folder): folder is NoteFolder => Boolean(folder));
  const seen = new Set(ordered.map((folder) => folder.id));
  ordered.push(...folders.filter((folder) => !seen.has(folder.id)));
  const orderedFolders = ordered.map((folder, sortOrder) => ({
    ...folder,
    sortOrder,
  }));
  return {
    folders: orderedFolders,
    unfiledPosition: Math.max(
      0,
      Math.min(orderedFolders.length, savedUnfiledPosition ?? 0),
    ),
  };
}
function saveLocalFolderOrder(
  userId: string,
  folders: NoteFolder[],
  unfiledPosition: number,
) {
  try {
    localStorage.setItem(
      folderOrderStorageKey(userId),
      JSON.stringify(folders.map((folder) => folder.id)),
    );
    localStorage.setItem(
      unfiledOrderStorageKey(userId),
      String(unfiledPosition),
    );
  } catch {
    /* Keep the in-memory order if this device blocks local storage. */
  }
}
const UNFILED_ID = "system:unfiled";
function combinedFolderOrder(folders: NoteFolder[], unfiledPosition: number) {
  const order = folders.map((folder) => folder.id);
  order.splice(
    Math.max(0, Math.min(folders.length, unfiledPosition)),
    0,
    UNFILED_ID,
  );
  return order;
}
function applyCombinedFolderOrder(order: string[], folders: NoteFolder[]) {
  const known = new Map(folders.map((folder) => [folder.id, folder]));
  const customIds = order.filter((id) => id !== UNFILED_ID && known.has(id));
  for (const folder of folders)
    if (!customIds.includes(folder.id)) customIds.push(folder.id);
  const unfiledPosition = Math.max(0, order.indexOf(UNFILED_ID));
  return {
    folders: customIds.map((id, sortOrder) => ({
      ...known.get(id)!,
      sortOrder,
    })),
    unfiledPosition: Math.min(customIds.length, unfiledPosition),
  };
}
const messageFor = (error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : "The database request failed without an error message.";
  if (/relation .* does not exist|schema cache/i.test(message)) {
    return `${message}. The Scribe database migration has not been applied to this Supabase project yet.`;
  }
  return message;
};

export function useNotes(
  user: User | null,
  configured: boolean,
  offlineMode = false,
) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [unfiledPosition, setUnfiledPosition] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [section, setSection] = useState<NoteSection>("all");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loadedForUser, setLoadedForUser] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingWrites, setPendingWrites] = useState(0);
  const [online, setOnline] = useState(true);
  const [hasPendingSync, setHasPendingSync] = useState(false);
  const [outboxRevision, setOutboxRevision] = useState(0);
  const [notesForUser, setNotesForUser] = useState<string | null>(null);
  const syncLock = useRef(false);
  const syncOwnerId = useRef(makeId());
  const refreshingRef = useRef(false);
  const flushOutboxRef = useRef<() => void>(() => undefined);
  const syncOperationRef = useRef<
    (owner: User, operation: OutboxOperation) => Promise<void>
  >(async () => undefined);
  const noteConflictRef = useRef<
    (
      userId: string,
      operation: OutboxOperation,
      remote: Note | null,
    ) => Promise<void>
  >(async () => undefined);
  const folderConflictRef = useRef<
    (
      userId: string,
      operation: OutboxOperation,
      remote: NoteFolder | null,
    ) => Promise<void>
  >(async () => undefined);
  const noteSyncTimers = useRef(
    new Map<string, ReturnType<typeof setTimeout>>(),
  );
  const notesRef = useRef(notes);
  const foldersRef = useRef(folders);
  useEffect(() => {
    notesRef.current = notes;
    foldersRef.current = folders;
  }, [notes, folders]);
  const loading = Boolean(
    user && configured && loadedForUser !== user.id && !error,
  );
  const syncStatus: "on-device" | "syncing" | "synced" | "offline" | "error" =
    !user || !configured
      ? "on-device"
      : offlineMode || !online
        ? "offline"
        : loading || pendingWrites > 0
          ? "syncing"
          : error
            ? "error"
            : hasPendingSync
              ? "syncing"
              : "synced";
  const clearError = useCallback(() => setError(null), []);
  const showError = useCallback((message: string) => setError(message), []);
  const beginWrite = useCallback(() => {
    setPendingWrites((count) => count + 1);
    let ended = false;
    return () => {
      if (ended) return;
      ended = true;
      setPendingWrites((count) => Math.max(0, count - 1));
    };
  }, []);

  const flushOutbox = useCallback(async () => {
    if (
      !user ||
      !configured ||
      offlineMode ||
      !online ||
      !navigator.onLine ||
      syncLock.current ||
      refreshingRef.current ||
      notesForUser !== user.id
    )
      return;
    syncLock.current = true;
    const finishWrite = beginWrite();
    let hasLease = false;
    try {
      hasLease = await offlineStore.acquireSyncLease(
        user.id,
        syncOwnerId.current,
      );
      if (!hasLease) return;
      let operations = await offlineStore.listOutbox(user.id);
      setHasPendingSync(operations.length > 0);
      for (const operation of operations) {
        if (offlineMode || !navigator.onLine) break;
        try {
          await syncOperationRef.current(user, operation);
        } catch (cause) {
          if (cause instanceof OfflineSyncConflictError) {
            await noteConflictRef.current(user.id, operation, cause.remote);
            continue;
          }
          if (cause instanceof FolderSyncConflictError) {
            await folderConflictRef.current(user.id, operation, cause.remote);
            continue;
          }
          setError(`Could not sync offline changes: ${messageFor(cause)}`);
          break;
        }
      }
      operations = await offlineStore.listOutbox(user.id);
      setHasPendingSync(operations.length > 0);
      if (!operations.length) setError(null);
    } catch (cause) {
      setError(`Could not access offline changes: ${messageFor(cause)}`);
    } finally {
      if (hasLease)
        await offlineStore
          .releaseSyncLease(user!.id, syncOwnerId.current)
          .catch(() => undefined);
      syncLock.current = false;
      finishWrite();
    }
  }, [user, configured, offlineMode, online, notesForUser, beginWrite]);
  const syncOperation = useCallback(
    async (owner: User, operation: OutboxOperation) => {
      if (operation.entity === "note") {
        if (operation.kind === "delete") {
          await notesRepository.permanentlyDeleteNote(
            owner,
            operation.entityId,
            operation.baseUpdatedAt ?? undefined,
          );
          await offlineStore.resolveOperation(operation);
          return;
        }
        const note = operation.snapshot as Note;
        const saved = operation.baseUpdatedAt
          ? await notesRepository.updateNote(
              owner,
              note.id,
              note,
              operation.baseUpdatedAt,
            )
          : await notesRepository.createNote(owner, note);
        if (!saved) throw new Error("The cloud did not confirm the note save.");
        const resolved = await offlineStore.resolveOperation(
          operation,
          saved.updatedAt,
        );
        if (resolved) {
          setNotes((items) =>
            items.map((item) => (item.id === note.id ? saved : item)),
          );
          await offlineStore.cacheNote(owner.id, saved);
        }
        return;
      }

      if (operation.kind === "delete") {
        await notesRepository.deleteFolder(
          owner,
          operation.entityId,
          operation.baseUpdatedAt ?? undefined,
        );
        await offlineStore.resolveOperation(operation);
        return;
      }
      const folder = operation.snapshot as NoteFolder;
      const saved = operation.baseUpdatedAt
        ? await notesRepository.updateFolder(
            owner,
            folder,
            operation.baseUpdatedAt,
          )
        : await notesRepository.createFolder(owner, folder);
      const resolved = await offlineStore.resolveOperation(
        operation,
        saved.updatedAt,
      );
      if (resolved) {
        setFolders((items) =>
          items.map((item) =>
            item.id === folder.id
              ? { ...saved, sortOrder: item.sortOrder }
              : item,
          ),
        );
        const localFolder = foldersRef.current.find(
          (item) => item.id === folder.id,
        );
        await offlineStore.cacheFolder(owner.id, {
          ...saved,
          sortOrder: localFolder?.sortOrder ?? folder.sortOrder,
        });
      }
    },
    [],
  );
  const handleNoteConflict = useCallback(
    async (userId: string, operation: OutboxOperation, remote: Note | null) => {
      const latest = (await offlineStore.takeOperation(operation)) ?? operation;
      if (latest.kind === "delete") {
        const nextNotes = notesRef.current.filter(
          (note) => note.id !== latest.entityId,
        );
        if (remote) nextNotes.unshift(remote);
        setNotes(nextNotes);
        if (remote) await offlineStore.cacheNote(userId, remote);
        else await offlineStore.removeCached(userId, "note", latest.entityId);
        setError(
          "A note changed in the cloud while this device was offline, so the permanent delete was canceled and the cloud version was restored.",
        );
        return;
      }
      const local = latest.snapshot as Note;
      const copy: Note = {
        ...local,
        id: makeId(),
        title: `${local.title || "Untitled note"} (offline copy)`,
        createdAt: now(),
        updatedAt: now(),
        deletedAt: null,
      };
      const nextNotes = notesRef.current.filter((note) => note.id !== local.id);
      if (remote) nextNotes.unshift(remote);
      nextNotes.unshift(copy);
      setNotes(nextNotes);
      if (remote) await offlineStore.cacheNote(userId, remote);
      else await offlineStore.removeCached(userId, "note", local.id);
      await offlineStore.cacheNote(userId, copy);
      await offlineStore.putNote(userId, copy, null, true);
      setOutboxRevision((revision) => revision + 1);
      setError(
        "A cloud note changed while this device was offline. Your edits were kept in a separate offline copy.",
      );
    },
    [],
  );
  const handleFolderConflict = useCallback(
    async (
      userId: string,
      operation: OutboxOperation,
      remote: NoteFolder | null,
    ) => {
      const latest = (await offlineStore.takeOperation(operation)) ?? operation;
      if (latest.kind === "delete") {
        if (remote) {
          setFolders((items) =>
            items.map((folder) =>
              folder.id === remote.id
                ? { ...remote, sortOrder: folder.sortOrder }
                : folder,
            ),
          );
          await offlineStore.cacheFolder(userId, remote);
          setError(
            "A folder changed in the cloud while this device was offline, so its deletion was canceled. Notes moved out while offline stay unfiled.",
          );
        } else {
          setFolders((items) =>
            items.filter((folder) => folder.id !== latest.entityId),
          );
          await offlineStore.removeCached(userId, "folder", latest.entityId);
        }
        return;
      }
      const local = latest.snapshot as NoteFolder;
      if (!remote) {
        setFolders((items) => items.filter((folder) => folder.id !== local.id));
        await offlineStore.removeCached(userId, "folder", local.id);
        setError(
          "A folder changed or was deleted in the cloud while this device was offline. The local change was not applied.",
        );
        return;
      }
      const copy: NoteFolder = {
        ...local,
        id: makeId(),
        name: `${local.name} (offline copy)`,
        createdAt: now(),
        updatedAt: now(),
        sortOrder: foldersRef.current.length,
      };
      const nextFolders = foldersRef.current
        .map((folder) => (folder.id === local.id ? remote : folder))
        .concat(copy);
      setFolders(nextFolders);
      await offlineStore.cacheFolder(userId, remote);
      await offlineStore.cacheFolder(userId, copy);
      await offlineStore.putFolder(userId, copy, null, true);
      setError(
        "A folder changed in the cloud while this device was offline. Your folder settings were kept in a separate copy.",
      );
    },
    [],
  );
  useEffect(() => {
    syncOperationRef.current = syncOperation;
    noteConflictRef.current = handleNoteConflict;
    folderConflictRef.current = handleFolderConflict;
  }, [syncOperation, handleNoteConflict, handleFolderConflict]);
  useEffect(() => {
    flushOutboxRef.current = () => {
      void flushOutbox();
    };
  }, [flushOutbox]);
  useEffect(
    () => () => {
      for (const timer of noteSyncTimers.current.values()) clearTimeout(timer);
    },
    [],
  );

  useEffect(() => {
    const updateOnlineStatus = () => setOnline(navigator.onLine);
    updateOnlineStatus();
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    let active = true;
    let localStoreAvailable = true;
    refreshingRef.current = Boolean(
      user && configured && online && !offlineMode,
    );
    if (!user || !configured) {
      refreshingRef.current = false;
      return () => {
        active = false;
      };
    }
    void (async () => {
      try {
        const local = await offlineStore.load(user.id);
        if (!active) return;
        const localNotesById = new Map(
          local.notes.map((note) => [note.id, note]),
        );
        const localFoldersById = new Map(
          local.folders.map((folder) => [folder.id, folder]),
        );
        for (const operation of local.outbox) {
          if (operation.entity === "note") {
            if (operation.kind === "delete")
              localNotesById.delete(operation.entityId);
            else
              localNotesById.set(
                operation.entityId,
                operation.snapshot as Note,
              );
          } else if (operation.kind === "delete")
            localFoldersById.delete(operation.entityId);
          else
            localFoldersById.set(
              operation.entityId,
              operation.snapshot as NoteFolder,
            );
        }
        const localNotes = [...localNotesById.values()].sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt),
        );
        setNotes(localNotes);
        const localOrder = applyLocalFolderOrder(user.id, [
          ...localFoldersById.values(),
        ]);
        setFolders(localOrder.folders);
        setUnfiledPosition(localOrder.unfiledPosition);
        setHasPendingSync(local.outbox.length > 0);
        setNotesForUser(user.id);
        if (offlineMode || !online) setLoadedForUser(user.id);
        setSelectedId((current) =>
          current && localNotes.some((note) => note.id === current)
            ? current
            : (localNotes.find((note) => !note.deletedAt)?.id ?? null),
        );
      } catch (cause) {
        if (!active) return;
        localStoreAvailable = false;
        setError(`Could not open local notes storage: ${messageFor(cause)}`);
        setNotesForUser(user.id);
        if (offlineMode || !online) {
          setLoadedForUser(user.id);
          return;
        }
      }
      if (!active || offlineMode || !online) return;
      try {
        const cloud = await notesRepository.load(user);
        if (!active) return;
        const latestOutbox = localStoreAvailable
          ? await offlineStore.listOutbox(user.id)
          : [];
        if (!active) return;
        const cloudNotes = new Map(cloud.notes.map((note) => [note.id, note]));
        const cloudFolders = new Map(
          cloud.folders.map((folder) => [folder.id, folder]),
        );
        for (const operation of latestOutbox) {
          if (operation.entity === "note") {
            if (operation.kind === "delete")
              cloudNotes.delete(operation.entityId);
            else cloudNotes.set(operation.entityId, operation.snapshot as Note);
          } else if (operation.kind === "delete")
            cloudFolders.delete(operation.entityId);
          else
            cloudFolders.set(
              operation.entityId,
              operation.snapshot as NoteFolder,
            );
        }
        const mergedNotes = [...cloudNotes.values()].sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt),
        );
        const mergedOrder = applyLocalFolderOrder(user.id, [
          ...cloudFolders.values(),
        ]);
        const mergedFolders = mergedOrder.folders;
        setNotes(mergedNotes);
        setFolders(mergedFolders);
        setUnfiledPosition(mergedOrder.unfiledPosition);
        setHasPendingSync(latestOutbox.length > 0);
        if (localStoreAvailable)
          await offlineStore.replaceCache(user.id, mergedNotes, mergedFolders);
        saveLocalFolderOrder(
          user.id,
          mergedFolders,
          mergedOrder.unfiledPosition,
        );
        setSelectedId((current) =>
          current && mergedNotes.some((note) => note.id === current)
            ? current
            : (mergedNotes.find((note) => !note.deletedAt)?.id ?? null),
        );
        if (localStoreAvailable) setError(null);
        else
          setError(
            "Local offline storage is unavailable. Your cloud notes loaded, but changes cannot be saved on this device.",
          );
        setLoadedForUser(user.id);
        refreshingRef.current = false;
        setOutboxRevision((revision) => revision + 1);
      } catch (cause) {
        if (active) {
          setError(
            `Could not refresh cloud notes. Your local notes are still available: ${messageFor(cause)}`,
          );
          setLoadedForUser(user.id);
          refreshingRef.current = false;
          setOutboxRevision((revision) => revision + 1);
        }
      }
    })();

    return () => {
      active = false;
      refreshingRef.current = false;
    };
  }, [user, configured, offlineMode, online]);

  useEffect(() => {
    if (loadedForUser === user?.id && !offlineMode && online)
      flushOutboxRef.current();
  }, [outboxRevision, loadedForUser, user, offlineMode, online]);

  const clearUserData = useCallback(() => {
    setNotes([]);
    setFolders([]);
    setSelectedId(null);
    setLoadedForUser(null);
    setNotesForUser(null);
    setHasPendingSync(false);
    setSection("all");
    setFolderId(null);
    setSearch("");
  }, []);

  const selectedNote =
    notes.find(
      (note) =>
        note.id === selectedId &&
        (section === "trash" ? Boolean(note.deletedAt) : !note.deletedAt),
    ) ?? null;
  const visibleNotes = useMemo(
    () =>
      notes.filter((note) => {
        if (section === "trash") return note.deletedAt !== null;
        if (note.deletedAt) return false;
        if (section === "drafts" && !note.isDraft) return false;
        if (section === "pinned" && !note.pinned) return false;
        if (section === "unfiled" && note.folderId !== null) return false;
        if (section === "all" && folderId && note.folderId !== folderId)
          return false;
        const query = search.toLowerCase();
        return (
          !query ||
          note.title.toLowerCase().includes(query) ||
          note.body.toLowerCase().includes(query)
        );
      }),
    [notes, section, folderId, search],
  );

  const updateNote = useCallback(
    (id: string, patch: NotePatch) => {
      const previous = notes.find((note) => note.id === id);
      if (!previous) return;
      const updated = { ...previous, ...patch, updatedAt: now() };
      setNotes((current) =>
        current.map((note) => (note.id === id ? updated : note)),
      );
      if (!user || !configured) return;
      const isTextEdit = patch.title !== undefined || patch.body !== undefined;
      void offlineStore
        .putNote(user.id, updated, previous.updatedAt)
        .then(() => {
          setHasPendingSync(true);
          if (!isTextEdit) setOutboxRevision((revision) => revision + 1);
        })
        .catch((cause: unknown) =>
          setError(`Could not save note locally: ${messageFor(cause)}`),
        );
      const oldTimer = noteSyncTimers.current.get(id);
      if (oldTimer) clearTimeout(oldTimer);
      if (isTextEdit) {
        noteSyncTimers.current.set(
          id,
          setTimeout(() => {
            setOutboxRevision((revision) => revision + 1);
            flushOutboxRef.current();
          }, 650),
        );
      } else {
        flushOutboxRef.current();
      }
    },
    [notes, user, configured],
  );

  const createNote = useCallback(
    (
      draft: Partial<
        Pick<Note, "title" | "body" | "folderId" | "pinned" | "isDraft">
      > = {},
    ) => {
      const timestamp = now();
      const note: Note = {
        id: makeId(),
        title: draft.title?.trim() ?? "",
        body: draft.body ?? "",
        folderId: draft.folderId ?? folderId,
        pinned: draft.pinned ?? false,
        createdAt: timestamp,
        updatedAt: timestamp,
        deletedAt: null,
        isDraft: draft.isDraft ?? false,
      };
      setNotes((current) => [note, ...current]);
      setSection("all");
      setSelectedId(note.id);
      if (user && configured) {
        void offlineStore
          .putNote(user.id, note, null, true)
          .then(() => {
            setHasPendingSync(true);
            setOutboxRevision((revision) => revision + 1);
          })
          .catch((cause: unknown) =>
            setError(`Could not save note locally: ${messageFor(cause)}`),
          );
      }
      return note.id;
    },
    [folderId, user, configured],
  );

  const togglePinned = useCallback(
    (id: string) => {
      const note = notes.find((item) => item.id === id);
      if (note) updateNote(id, { pinned: !note.pinned });
    },
    [notes, updateNote],
  );

  const moveToTrash = useCallback(
    (id: string) => updateNote(id, { deletedAt: now() }),
    [updateNote],
  );
  const restoreFromTrash = useCallback(
    (id: string) => updateNote(id, { deletedAt: null }),
    [updateNote],
  );

  const permanentlyDelete = useCallback(
    (id: string) => {
      const previous = notes.find((note) => note.id === id);
      setNotes((current) => current.filter((note) => note.id !== id));
      if (user && configured) {
        const oldTimer = noteSyncTimers.current.get(id);
        if (oldTimer) clearTimeout(oldTimer);
        noteSyncTimers.current.delete(id);
        void offlineStore
          .deleteEntity(user.id, "note", id, previous?.updatedAt ?? null)
          .then(() => {
            setHasPendingSync(true);
            setOutboxRevision((revision) => revision + 1);
          })
          .catch((cause: unknown) =>
            setError(`Could not delete note locally: ${messageFor(cause)}`),
          );
      }
    },
    [notes, user, configured],
  );

  const createFolder = useCallback(
    (name: string, icon: FolderIconName, color: FolderColor) => {
      const normalizedName = name.trim();
      if (
        !normalizedName ||
        folders.some(
          (item) => item.name.toLowerCase() === normalizedName.toLowerCase(),
        )
      )
        return false;
      const timestamp = now();
      const folder: NoteFolder = {
        id: makeId(),
        name: normalizedName,
        icon,
        color,
        sortOrder: folders.length,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      setFolders((current) => [...current, folder]);
      if (user)
        saveLocalFolderOrder(user.id, [...folders, folder], unfiledPosition);
      setFolderId(folder.id);
      setSection("all");
      if (user && configured) {
        void offlineStore
          .putFolder(user.id, folder, null, true)
          .then(() => {
            setHasPendingSync(true);
            setOutboxRevision((revision) => revision + 1);
          })
          .catch((cause: unknown) =>
            setError(`Could not save folder locally: ${messageFor(cause)}`),
          );
      }
      return true;
    },
    [folders, user, configured, unfiledPosition],
  );

  const updateFolder = useCallback(
    (id: string, name: string, icon: FolderIconName, color: FolderColor) => {
      const normalizedName = name.trim();
      const previous = folders.find((item) => item.id === id);
      if (
        !previous ||
        !normalizedName ||
        folders.some(
          (item) =>
            item.id !== id &&
            item.name.toLowerCase() === normalizedName.toLowerCase(),
        )
      )
        return false;
      const updated = {
        ...previous,
        name: normalizedName,
        icon,
        color,
        updatedAt: now(),
      };
      setFolders((current) =>
        current.map((item) => (item.id === id ? updated : item)),
      );
      if (user && configured) {
        void offlineStore
          .putFolder(user.id, updated, previous.updatedAt)
          .then(() => {
            setHasPendingSync(true);
            setOutboxRevision((revision) => revision + 1);
            flushOutboxRef.current();
          })
          .catch((cause: unknown) =>
            setError(`Could not save folder locally: ${messageFor(cause)}`),
          );
      }
      return true;
    },
    [folders, user, configured],
  );

  const deleteFolder = useCallback(
    (id: string) => {
      const previous = folders.find((item) => item.id === id);
      const detachedNotes = notes
        .filter((note) => note.folderId === id)
        .map((note) => ({ ...note, folderId: null, updatedAt: now() }));
      setFolders((current) => current.filter((item) => item.id !== id));
      const nextFolders = folders.filter((item) => item.id !== id);
      const nextUnfiledPosition = Math.max(
        0,
        Math.min(
          nextFolders.length,
          unfiledPosition -
            (folders.findIndex((item) => item.id === id) < unfiledPosition
              ? 1
              : 0),
        ),
      );
      setUnfiledPosition(nextUnfiledPosition);
      if (user) saveLocalFolderOrder(user.id, nextFolders, nextUnfiledPosition);
      setNotes((current) =>
        current.map(
          (note) =>
            detachedNotes.find((detached) => detached.id === note.id) ?? note,
        ),
      );
      setFolderId((current) => (current === id ? null : current));
      if (user && configured) {
        void Promise.all(
          detachedNotes.map((note) =>
            offlineStore.putNote(
              user.id,
              note,
              notes.find((item) => item.id === note.id)?.updatedAt ?? null,
            ),
          ),
        )
          .then(() =>
            offlineStore.deleteEntity(
              user.id,
              "folder",
              id,
              previous?.updatedAt ?? null,
            ),
          )
          .then(async () => {
            await offlineStore.replaceCache(
              user.id,
              notes.map(
                (note) =>
                  detachedNotes.find((detached) => detached.id === note.id) ??
                  note,
              ),
              folders.filter((folder) => folder.id !== id),
            );
            setHasPendingSync(true);
            setOutboxRevision((revision) => revision + 1);
          })
          .catch((cause: unknown) =>
            setError(
              `Could not save folder deletion locally: ${messageFor(cause)}`,
            ),
          );
      }
    },
    [folders, notes, user, configured, unfiledPosition],
  );

  const moveFolder = useCallback(
    (id: string, offset: -1 | 1) => {
      const order = combinedFolderOrder(folders, unfiledPosition);
      const index = order.indexOf(id);
      const nextIndex = index + offset;
      if (index < 0 || nextIndex < 0 || nextIndex >= order.length) return;
      [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
      const next = applyCombinedFolderOrder(order, folders);
      setFolders(next.folders);
      setUnfiledPosition(next.unfiledPosition);
      if (user)
        saveLocalFolderOrder(user.id, next.folders, next.unfiledPosition);
    },
    [folders, unfiledPosition, user],
  );

  const reorderFolders = useCallback(
    (sourceId: string, targetId: string) => {
      if (sourceId === targetId) return;
      const order = combinedFolderOrder(folders, unfiledPosition);
      const sourceIndex = order.indexOf(sourceId);
      const targetIndex = order.indexOf(targetId);
      if (sourceIndex < 0 || targetIndex < 0) return;
      order.splice(sourceIndex, 1);
      order.splice(
        sourceIndex < targetIndex ? targetIndex - 1 : targetIndex,
        0,
        sourceId,
      );
      const next = applyCombinedFolderOrder(order, folders);
      setFolders(next.folders);
      setUnfiledPosition(next.unfiledPosition);
      if (user)
        saveLocalFolderOrder(user.id, next.folders, next.unfiledPosition);
    },
    [folders, unfiledPosition, user],
  );

  const selectSection = useCallback((nextSection: NoteSection) => {
    setSection(nextSection);
    setFolderId(null);
  }, []);
  const selectFolder = useCallback((nextId: string) => {
    if (nextId === "system:unfiled") {
      setSection("unfiled");
      setFolderId(null);
      return;
    }
    setSection("all");
    setFolderId((current) => (current === nextId ? null : nextId));
  }, []);

  return {
    notes,
    visibleNotes,
    selectedNote,
    selectedId,
    setSelectedId,
    section,
    folderId,
    folder: folders.find((item) => item.id === folderId)?.name ?? "",
    clearError,
    syncStatus,
    showError,
    search,
    setSearch,
    folders,
    loading,
    error,
    createNote,
    updateNote,
    togglePinned,
    moveToTrash,
    restoreFromTrash,
    permanentlyDelete,
    createFolder,
    updateFolder,
    deleteFolder,
    moveFolder,
    reorderFolders,
    unfiledPosition,
    selectSection,
    selectFolder,
    clearUserData,
  };
}
