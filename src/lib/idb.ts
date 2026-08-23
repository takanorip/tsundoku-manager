const DB_NAME = "tsundoku-shelf";
const DB_VERSION = 1;

export const BOOK_STORE = "books";
export const META_STORE = "meta";

type MetaRecord = { key: string; value: unknown };

let connection: IDBDatabase | null = null;
let opening: Promise<IDBDatabase> | null = null;

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(BOOK_STORE)) {
        const store = db.createObjectStore(BOOK_STORE, { keyPath: "id" });
        store.createIndex("isbn13", "isbn13", { unique: false });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("source", "source", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB を開けませんでした"));
  });
}

export async function getDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    throw new Error("このブラウザでは本棚データを保存できません");
  }
  if (connection) return connection;
  if (!opening) {
    opening = openDatabase()
      .then((db) => {
        db.onclose = () => {
          connection = null;
          opening = null;
        };
        connection = db;
        return db;
      })
      .catch((error) => {
        opening = null;
        throw error;
      });
  }
  return opening;
}

export async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => T | Promise<T>,
): Promise<T> {
  const db = await getDb();
  const tx = db.transaction(storeName, mode);
  const result = await work(tx.objectStore(storeName));
  await transactionDone(tx);
  return result;
}

export async function getAllBooksFromStore<T>(): Promise<T[]> {
  return withStore(BOOK_STORE, "readonly", (store) => requestToPromise(store.getAll()) as Promise<T[]>);
}

export async function getBookFromStore<T>(id: string): Promise<T | undefined> {
  return withStore(BOOK_STORE, "readonly", (store) => requestToPromise(store.get(id)) as Promise<T | undefined>);
}

export async function putBookInStore<T>(book: T): Promise<void> {
  await withStore(BOOK_STORE, "readwrite", (store) => requestToPromise(store.put(book)));
}

export async function deleteBookFromStore(id: string): Promise<void> {
  await withStore(BOOK_STORE, "readwrite", (store) => requestToPromise(store.delete(id)));
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const record = await withStore(META_STORE, "readonly", (store) =>
    requestToPromise(store.get(key)),
  );
  return (record as MetaRecord | undefined)?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await withStore(META_STORE, "readwrite", (store) =>
    requestToPromise(store.put({ key, value } satisfies MetaRecord)),
  );
}

export async function resetShelfDatabase(): Promise<void> {
  if (connection) {
    connection.close();
    connection = null;
  }
  opening = null;
  if (typeof indexedDB === "undefined") return;
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("IndexedDB を削除できませんでした"));
    request.onblocked = () => resolve();
  });
}

export { requestToPromise };
