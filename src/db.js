import { openDB } from 'idb';

const dbPromise = openDB('pee-and-bruise-tracker', 2, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('peeEntries')) {
      db.createObjectStore('peeEntries', { keyPath: 'id' });
    }

    if (!db.objectStoreNames.contains('bruiseEntries')) {
      db.createObjectStore('bruiseEntries', { keyPath: 'id' });
    }

    if (!db.objectStoreNames.contains('bmEntries')) {
      db.createObjectStore('bmEntries', { keyPath: 'id' });
    }
  },
});

async function getEntries(storeName) {
  const db = await dbPromise;
  return db.getAll(storeName);
}

export async function getAllData() {
  const [peeEntries, bruiseEntries, bmEntries] = await Promise.all([
    getEntries('peeEntries'),
    getEntries('bruiseEntries'),
    getEntries('bmEntries'),
  ]);

  return { peeEntries, bruiseEntries, bmEntries };
}

export async function saveEntry(storeName, entry) {
  const db = await dbPromise;
  await db.put(storeName, entry);
}

export async function saveEntries(storeName, entries) {
  const db = await dbPromise;
  const tx = db.transaction(storeName, 'readwrite');
  await Promise.all(entries.map((entry) => tx.store.put(entry)));
  await tx.done;
}

export async function deleteEntry(storeName, id) {
  const db = await dbPromise;
  await db.delete(storeName, id);
}

export async function clearStore(storeName) {
  const db = await dbPromise;
  await db.clear(storeName);
}
