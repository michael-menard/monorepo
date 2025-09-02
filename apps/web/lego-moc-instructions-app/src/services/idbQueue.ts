/**
 * Minimal IndexedDB adapter for offline queue and metadata.
 * No external dependencies; uses window.indexedDB directly.
 * Schema:
 *  - DB: 'offline-db' v1
 *  - Stores:
 *    - 'offline_actions' (keyPath: 'id')
 *    - 'offline_data' (keyPath: 'key') — for metadata like lastSync, version, etc.
 */

export type IDBValue = any;

export interface IDBAction {
  id: string;
  // Keep the shape generic: consumer (offlineManager) validates specifics
  [k: string]: any;
}

const DB_NAME = 'offline-db';
const DB_VERSION = 1;
const STORE_ACTIONS = 'offline_actions';
const STORE_DATA = 'offline_data';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_ACTIONS)) {
        db.createObjectStore(STORE_ACTIONS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_DATA)) {
        db.createObjectStore(STORE_DATA, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db: IDBDatabase, store: string, mode: IDBTransactionMode) {
  return db.transaction(store, mode).objectStore(store);
}

/* Actions store operations */

export async function idbAddAction(action: IDBAction): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const store = tx(db, STORE_ACTIONS, 'readwrite');
    const req = store.add(action);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  db.close();
}

export async function idbGetAllActions(): Promise<Array<IDBAction>> {
  const db = await openDB();
  const result = await new Promise<Array<IDBAction>>((resolve, reject) => {
    const store = tx(db, STORE_ACTIONS, 'readonly');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as Array<IDBAction>);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

export async function idbSetActions(actions: Array<IDBAction>): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const store = tx(db, STORE_ACTIONS, 'readwrite');
    const clearReq = store.clear();
    clearReq.onsuccess = () => {
      let pending = actions.length;
      if (pending === 0) return resolve();
      actions.forEach((a) => {
        const putReq = store.put(a);
        putReq.onsuccess = () => {
          pending -= 1;
          if (pending === 0) resolve();
        };
        putReq.onerror = () => reject(putReq.error);
      });
    };
    clearReq.onerror = () => reject(clearReq.error);
  });
  db.close();
}

export async function idbClearActions(): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const store = tx(db, STORE_ACTIONS, 'readwrite');
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  db.close();
}

/* Data (metadata) store operations */

export async function idbGetData<T = IDBValue>(key: string): Promise<T | null> {
  const db = await openDB();
  const result = await new Promise<T | null>((resolve, reject) => {
    const store = tx(db, STORE_DATA, 'readonly');
    const req = store.get(key);
    req.onsuccess = () => {
      const anyResult = req.result as unknown;
      const rec = (anyResult && typeof anyResult === 'object' && (anyResult as { key?: string; value?: T }).hasOwnProperty('value'))
        ? (anyResult as { key: string; value: T })
        : undefined;
      resolve(rec ? rec.value : null);
    };
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

export async function idbSetData<T = IDBValue>(key: string, value: T): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const store = tx(db, STORE_DATA, 'readwrite');
    const req = store.put({ key, value });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  db.close();
}

export async function idbDeleteData(key: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const store = tx(db, STORE_DATA, 'readwrite');
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  db.close();
}

/* Helpers */

export function isIDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * Convenience wrapper to set lastSync timestamp.
 */
export async function idbSetLastSync(ts: number): Promise<void> {
  await idbSetData('lastSync', ts);
}

export async function idbGetLastSync(): Promise<number | null> {
  const v = await idbGetData<number>('lastSync');
  return typeof v === 'number' ? v : null;
}
