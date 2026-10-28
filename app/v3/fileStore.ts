// Fichiers importés dans « Mes schémas » (images, PDF) : IndexedDB du
// navigateur, persistant sur ce poste, sans envoi au serveur.
const DB = 'ds-v3-files';
const STORE = 'files';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(req.error ?? new Error('Stockage indisponible.'));
  });
}
async function run<T>(
  mode: IDBTransactionMode,
  op: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = op(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () =>
      reject(req.error ?? new Error('Stockage indisponible.'));
  });
}
export const putFile = (id: string, file: Blob) =>
  run<IDBValidKey>('readwrite', (s) => s.put(file, id));
export const getFile = (id: string) =>
  run<Blob | undefined>('readonly', (s) => s.get(id));
export const deleteFile = (id: string) =>
  run<undefined>('readwrite', (s) => s.delete(id));
