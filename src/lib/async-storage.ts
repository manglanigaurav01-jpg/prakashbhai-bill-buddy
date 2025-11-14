// Minimal async IndexedDB helper - keeps API small to avoid new deps
// Provides getItem, setItem, removeItem, keys, and a convenience snapshot/restore
const DB_NAME = 'prakash_billbuddy_db_v1';
const STORE_NAME = 'keyval';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, cb: (store: IDBObjectStore) => Promise<T> | T): Promise<T> {
  const db = await openDB();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    Promise.resolve(cb(store)).then(result => {
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
    }).catch(err => reject(err));
  });
}

export const asyncSetItem = async (key: string, value: any): Promise<void> => {
  await withStore('readwrite', store => {
    store.put(JSON.stringify(value), key);
  });
};

export const asyncGetItem = async <T = any>(key: string): Promise<T | null> => {
  return withStore('readonly', store => new Promise<T | null>((resolve, reject) => {
    const req = store.get(key);
    req.onsuccess = () => {
      const raw = req.result;
      if (raw == null) return resolve(null);
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        // if value wasn't stringified JSON, return as-is
        resolve(raw as T);
      }
    };
    req.onerror = () => reject(req.error);
  }));
};

export const asyncRemoveItem = async (key: string): Promise<void> => {
  await withStore('readwrite', store => {
    store.delete(key);
  });
};

export const asyncKeys = async (): Promise<string[]> => {
  return withStore('readonly', store => new Promise<string[]>((resolve, reject) => {
    const keys: string[] = [];
    const req = store.openCursor();
    req.onsuccess = (ev) => {
      const cursor = (ev.target as IDBRequest).result as IDBCursorWithValue | null;
      if (!cursor) return resolve(keys);
      keys.push(cursor.key as string);
      cursor.continue();
    };
    req.onerror = () => reject(req.error);
  }));
};

export const asyncGetAll = async (): Promise<Record<string, any>> => {
  const out: Record<string, any> = {};
  await withStore('readonly', store => new Promise<void>((resolve, reject) => {
    const req = store.openCursor();
    req.onsuccess = (ev) => {
      const cursor = (ev.target as IDBRequest).result as IDBCursorWithValue | null;
      if (!cursor) return resolve();
      try {
        out[cursor.key as string] = JSON.parse(cursor.value);
      } catch (e) {
        out[cursor.key as string] = cursor.value;
      }
      cursor.continue();
    };
    req.onerror = () => reject(req.error);
  }));
  return out;
};

export const asyncClear = async (): Promise<void> => {
  await withStore('readwrite', store => {
    store.clear();
  });
};

// Convenience: snapshot all keys used by the app (fallbacks to localStorage
export const takeSnapshot = async (keys: string[]): Promise<Record<string, any>> => {
  const snapshot: Record<string, any> = {};
  for (const key of keys) {
    const v = await asyncGetItem(key);
    if (v !== null) snapshot[key] = v;
    else {
      try {
        const raw = localStorage.getItem(key);
        if (raw) snapshot[key] = JSON.parse(raw);
      } catch {
        const raw = localStorage.getItem(key);
        if (raw) snapshot[key] = raw;
      }
    }
  }
  return snapshot;
};

// Restore snapshot object (map of key->value) into IndexedDB (and localStorage for compat)
export const restoreSnapshot = async (data: Record<string, any>): Promise<void> => {
  for (const k of Object.keys(data)) {
    await asyncSetItem(k, data[k]);
    try { localStorage.setItem(k, JSON.stringify(data[k])); } catch { /* ignore */ }
  }
};
