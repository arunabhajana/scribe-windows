import type { Note, NoteFolder } from "../../types/note";

export type OutboxOperation = {
  key: [string, "note" | "folder", string];
  userId: string;
  entity: "note" | "folder";
  entityId: string;
  kind: "upsert" | "delete";
  snapshot?: Note | NoteFolder;
  /** null means this row was created locally and has no cloud version yet. */
  baseUpdatedAt: string | null;
  queuedUpdatedAt: string;
  revisionId: string;
  sequence: number;
};

type CacheNote = Note & { key: string; userId: string };
type CacheFolder = NoteFolder & { key: string; userId: string };

const databaseName = "scribe-offline-v1";
const databaseVersion = 2;
let databasePromise: Promise<IDBDatabase> | undefined;

function ensureStore(
  db: IDBDatabase,
  transaction: IDBTransaction,
  name: string,
  options: IDBObjectStoreParameters,
) {
  return db.objectStoreNames.contains(name)
    ? transaction.objectStore(name)
    : db.createObjectStore(name, options);
}

function openDatabase() {
  if (databasePromise) return databasePromise;
  const promise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion);
    request.onupgradeneeded = () => {
      const db = request.result;
      const transaction = request.transaction;
      if (!transaction) return;
      const notes = ensureStore(db, transaction, "notes", { keyPath: "key" });
      if (notes && !notes.indexNames.contains("userId"))
        notes.createIndex("userId", "userId");
      const folders = ensureStore(db, transaction, "folders", {
        keyPath: "key",
      });
      if (folders && !folders.indexNames.contains("userId"))
        folders.createIndex("userId", "userId");
      const outbox = ensureStore(db, transaction, "outbox", { keyPath: "key" });
      if (outbox) {
        if (!outbox.indexNames.contains("userId"))
          outbox.createIndex("userId", "userId");
        if (!outbox.indexNames.contains("sequence"))
          outbox.createIndex("sequence", "sequence");
      }
      ensureStore(db, transaction, "syncLeases", { keyPath: "userId" });
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        databasePromise = undefined;
      };
      resolve(db);
    };
    request.onerror = () =>
      reject(request.error ?? new Error("Could not open local notes storage."));
    request.onblocked = () => undefined;
  }).catch((error: unknown) => {
    databasePromise = undefined;
    throw error;
  });
  databasePromise = promise;
  return promise;
}

const rowKey = (userId: string, id: string) => `${userId}:${id}`;
function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = transaction.onerror = () =>
      reject(transaction.error ?? new Error("Local notes transaction failed."));
  });
}

export const offlineStore = {
  async load(
    userId: string,
  ): Promise<{
    notes: Note[];
    folders: NoteFolder[];
    outbox: OutboxOperation[];
  }> {
    const db = await openDatabase();
    const tx = db.transaction(["notes", "folders", "outbox"], "readonly");
    const done = transactionDone(tx);
    const notesRequest = tx
      .objectStore("notes")
      .index("userId")
      .getAll(userId) as IDBRequest<CacheNote[]>;
    const foldersRequest = tx
      .objectStore("folders")
      .index("userId")
      .getAll(userId) as IDBRequest<CacheFolder[]>;
    const outboxRequest = tx
      .objectStore("outbox")
      .index("userId")
      .getAll(userId) as IDBRequest<OutboxOperation[]>;
    const [notes, folders, outbox] = await Promise.all([
      new Promise<CacheNote[]>((resolve, reject) => {
        notesRequest.onsuccess = () => resolve(notesRequest.result);
        notesRequest.onerror = () => reject(notesRequest.error);
      }),
      new Promise<CacheFolder[]>((resolve, reject) => {
        foldersRequest.onsuccess = () => resolve(foldersRequest.result);
        foldersRequest.onerror = () => reject(foldersRequest.error);
      }),
      new Promise<OutboxOperation[]>((resolve, reject) => {
        outboxRequest.onsuccess = () => resolve(outboxRequest.result);
        outboxRequest.onerror = () => reject(outboxRequest.error);
      }),
    ]);
    await done;
    return {
      notes: notes.map((row) => {
        const note = { ...row } as Partial<CacheNote>;
        delete note.key;
        delete note.userId;
        return note as Note;
      }),
      folders: folders.map((row) => {
        const folder = { ...row } as Partial<CacheFolder>;
        delete folder.key;
        delete folder.userId;
        return folder as NoteFolder;
      }),
      outbox: outbox.sort((a, b) => a.sequence - b.sequence),
    };
  },

  async replaceCache(userId: string, notes: Note[], folders: NoteFolder[]) {
    const db = await openDatabase();
    const tx = db.transaction(["notes", "folders"], "readwrite");
    const noteStore = tx.objectStore("notes");
    const folderStore = tx.objectStore("folders");
    let cursorsRemaining = 2;
    const putRows = () => {
      cursorsRemaining--;
      if (cursorsRemaining !== 0) return;
      for (const note of notes)
        noteStore.put({
          ...note,
          userId,
          key: rowKey(userId, note.id),
        } satisfies CacheNote);
      for (const folder of folders)
        folderStore.put({
          ...folder,
          userId,
          key: rowKey(userId, folder.id),
        } satisfies CacheFolder);
    };
    for (const store of [noteStore, folderStore]) {
      const request = store
        .index("userId")
        .openKeyCursor(IDBKeyRange.only(userId));
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        } else putRows();
      };
    }
    await transactionDone(tx);
  },

  async cacheNote(userId: string, note: Note) {
    const db = await openDatabase();
    const tx = db.transaction("notes", "readwrite");
    tx.objectStore("notes").put({
      ...note,
      userId,
      key: rowKey(userId, note.id),
    } satisfies CacheNote);
    await transactionDone(tx);
  },

  async cacheFolder(userId: string, folder: NoteFolder) {
    const db = await openDatabase();
    const tx = db.transaction("folders", "readwrite");
    tx.objectStore("folders").put({
      ...folder,
      userId,
      key: rowKey(userId, folder.id),
    } satisfies CacheFolder);
    await transactionDone(tx);
  },

  async removeCached(userId: string, entity: "note" | "folder", id: string) {
    const db = await openDatabase();
    const tx = db.transaction(
      entity === "note" ? "notes" : "folders",
      "readwrite",
    );
    tx.objectStore(entity === "note" ? "notes" : "folders").delete(
      rowKey(userId, id),
    );
    await transactionDone(tx);
  },

  async putNote(
    userId: string,
    note: Note,
    baseUpdatedAt: string | null,
    created = false,
  ) {
    const db = await openDatabase();
    const tx = db.transaction(["notes", "outbox"], "readwrite");
    tx.objectStore("notes").put({
      ...note,
      userId,
      key: rowKey(userId, note.id),
    } satisfies CacheNote);
    const store = tx.objectStore("outbox");
    const key: OutboxOperation["key"] = [userId, "note", note.id];
    const get = store.get(key) as IDBRequest<OutboxOperation | undefined>;
    get.onsuccess = () => {
      const previous = get.result;
      store.put({
        key,
        userId,
        entity: "note",
        entityId: note.id,
        kind: "upsert",
        snapshot: note,
        baseUpdatedAt:
          previous?.baseUpdatedAt ?? (created ? null : baseUpdatedAt),
        queuedUpdatedAt: note.updatedAt,
        revisionId: crypto.randomUUID(),
        sequence: previous?.sequence ?? Date.now(),
      } satisfies OutboxOperation);
    };
    await transactionDone(tx);
  },

  async putFolder(
    userId: string,
    folder: NoteFolder,
    baseUpdatedAt: string | null,
    created = false,
  ) {
    const db = await openDatabase();
    const tx = db.transaction(["folders", "outbox"], "readwrite");
    tx.objectStore("folders").put({
      ...folder,
      userId,
      key: rowKey(userId, folder.id),
    } satisfies CacheFolder);
    const store = tx.objectStore("outbox");
    const key: OutboxOperation["key"] = [userId, "folder", folder.id];
    const get = store.get(key) as IDBRequest<OutboxOperation | undefined>;
    get.onsuccess = () => {
      const previous = get.result;
      store.put({
        key,
        userId,
        entity: "folder",
        entityId: folder.id,
        kind: "upsert",
        snapshot: folder,
        baseUpdatedAt:
          previous?.baseUpdatedAt ?? (created ? null : baseUpdatedAt),
        queuedUpdatedAt: folder.updatedAt,
        revisionId: crypto.randomUUID(),
        sequence: previous?.sequence ?? Date.now(),
      } satisfies OutboxOperation);
    };
    await transactionDone(tx);
  },

  async deleteEntity(
    userId: string,
    entity: OutboxOperation["entity"],
    entityId: string,
    baseUpdatedAt: string | null,
  ) {
    const db = await openDatabase();
    const cacheName = entity === "note" ? "notes" : "folders";
    const tx = db.transaction([cacheName, "outbox"], "readwrite");
    tx.objectStore(cacheName).delete(rowKey(userId, entityId));
    const store = tx.objectStore("outbox");
    const key: OutboxOperation["key"] = [userId, entity, entityId];
    const get = store.get(key) as IDBRequest<OutboxOperation | undefined>;
    get.onsuccess = () => {
      if (get.result?.kind === "upsert" && get.result.baseUpdatedAt === null)
        store.delete(key);
      else
        store.put({
          key,
          userId,
          entity,
          entityId,
          kind: "delete",
          baseUpdatedAt: get.result?.baseUpdatedAt ?? baseUpdatedAt,
          queuedUpdatedAt: new Date().toISOString(),
          revisionId: crypto.randomUUID(),
          sequence: get.result?.sequence ?? Date.now(),
        } satisfies OutboxOperation);
    };
    await transactionDone(tx);
  },

  async resolveOperation(operation: OutboxOperation, serverUpdatedAt?: string) {
    const db = await openDatabase();
    const tx = db.transaction("outbox", "readwrite");
    const store = tx.objectStore("outbox");
    const get = store.get(operation.key) as IDBRequest<
      OutboxOperation | undefined
    >;
    let resolved = false;
    get.onsuccess = () => {
      const current = get.result;
      if (!current) return;
      if (current.revisionId === operation.revisionId) {
        store.delete(operation.key);
        resolved = true;
      } else if (serverUpdatedAt)
        store.put({ ...current, baseUpdatedAt: serverUpdatedAt });
    };
    await transactionDone(tx);
    return resolved;
  },

  async discardOperation(operation: OutboxOperation) {
    const db = await openDatabase();
    const tx = db.transaction("outbox", "readwrite");
    const store = tx.objectStore("outbox");
    const get = store.get(operation.key) as IDBRequest<
      OutboxOperation | undefined
    >;
    get.onsuccess = () => {
      if (get.result?.revisionId === operation.revisionId)
        store.delete(operation.key);
    };
    await transactionDone(tx);
  },

  async takeOperation(operation: OutboxOperation) {
    const db = await openDatabase();
    const tx = db.transaction("outbox", "readwrite");
    const store = tx.objectStore("outbox");
    const get = store.get(operation.key) as IDBRequest<
      OutboxOperation | undefined
    >;
    const done = transactionDone(tx);
    const current = await new Promise<OutboxOperation | undefined>(
      (resolve, reject) => {
        get.onsuccess = () => {
          const value = get.result;
          if (value) store.delete(operation.key);
          resolve(value);
        };
        get.onerror = () => reject(get.error);
      },
    );
    await done;
    return current;
  },

  async listOutbox(userId: string) {
    const db = await openDatabase();
    const tx = db.transaction("outbox", "readonly");
    const done = transactionDone(tx);
    const request = tx
      .objectStore("outbox")
      .index("userId")
      .getAll(userId) as IDBRequest<OutboxOperation[]>;
    const result = await new Promise<OutboxOperation[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await done;
    return result.sort((a, b) => a.sequence - b.sequence);
  },

  async acquireSyncLease(userId: string, ownerId: string, durationMs = 30_000) {
    const db = await openDatabase();
    const tx = db.transaction("syncLeases", "readwrite");
    const store = tx.objectStore("syncLeases");
    const get = store.get(userId) as IDBRequest<
      { userId: string; ownerId: string; expiresAt: number } | undefined
    >;
    let acquired = false;
    get.onsuccess = () => {
      const lease = get.result;
      const now = Date.now();
      if (!lease || lease.expiresAt <= now || lease.ownerId === ownerId) {
        store.put({ userId, ownerId, expiresAt: now + durationMs });
        acquired = true;
      }
    };
    await transactionDone(tx);
    return acquired;
  },

  async releaseSyncLease(userId: string, ownerId: string) {
    const db = await openDatabase();
    const tx = db.transaction("syncLeases", "readwrite");
    const store = tx.objectStore("syncLeases");
    const get = store.get(userId) as IDBRequest<
      { userId: string; ownerId: string } | undefined
    >;
    get.onsuccess = () => {
      if (get.result?.ownerId === ownerId) store.delete(userId);
    };
    await transactionDone(tx);
  },

  async removeOperation(operation: OutboxOperation) {
    const db = await openDatabase();
    const tx = db.transaction("outbox", "readwrite");
    tx.objectStore("outbox").delete(operation.key);
    await transactionDone(tx);
  },
};
