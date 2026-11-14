// IndexedDB helpers for SPIKE-001 (throwaway).
export const DB_NAME = 'spike-pwa-check';
export const DB_VERSION = 1;
export const STORES = ['meta', 'items', 'opens'];

let dbPromise;

export function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
        if (!db.objectStoreNames.contains('items')) db.createObjectStore('items', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('opens')) db.createObjectStore('opens', { keyPath: 'at' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function done(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function getAll(store) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(store).objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function get(store, key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(store).objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putAll(store, records) {
  const db = await openDb();
  const tx = db.transaction(store, 'readwrite');
  const os = tx.objectStore(store);
  for (const r of records) os.put(r);
  return done(tx);
}

export async function clearAll() {
  const db = await openDb();
  const tx = db.transaction(STORES, 'readwrite');
  for (const s of STORES) tx.objectStore(s).clear();
  return done(tx);
}

export async function dumpAll() {
  const out = {};
  for (const s of STORES) out[s] = await getAll(s);
  return out;
}

// SHA-256 over the durable test data (seed meta + items), sorted by key.
// The opens log is excluded because it changes on every open.
export async function checksum(data) {
  const meta = (data.meta || []).filter((m) => m.key === 'seed');
  const items = [...(data.items || [])].sort((a, b) => a.id - b.id);
  const text = JSON.stringify({ meta, items });
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function makeSeed(now = new Date()) {
  const items = [];
  for (let i = 1; i <= 50; i++) {
    const history = [];
    for (let h = 0; h < (i % 4) + 1; h++) {
      history.push({ at: new Date(now.getTime() - (h + 1) * 86400000).toISOString(), grade: (i + h) % 4 });
    }
    items.push({
      id: i,
      question: `Dummy question ${i}?`,
      answer: `Dummy answer ${i}`,
      history,
      due: new Date(now.getTime() + (i % 7) * 86400000).toISOString().slice(0, 10),
    });
  }
  return { meta: [{ key: 'seed', seededAt: now.toISOString() }], items };
}
