// Resilient DB: prefer expo-sqlite on native; fall back to AsyncStorage for web/dev
let useSQLite = false;
let sqliteDb = null;

try {
  // require at runtime so web bundlers that fail on import won't crash
  // eslint-disable-next-line global-require
  const SQLite = require('expo-sqlite');
  if (SQLite && typeof SQLite.openDatabase === 'function') {
    sqliteDb = SQLite.openDatabase('lingolens.db');
    useSQLite = true;
  }
} catch (e) {
  // not available (web or not installed)
  useSQLite = false;
}

// AsyncStorage fallback: require at runtime to avoid bundler errors if package isn't installed
let AsyncStorage = null;
let useAsyncStorage = false;
const AS_KEY = '@lingolens_words';
try {
  // eslint-disable-next-line global-require
  AsyncStorage = require('@react-native-async-storage/async-storage');
  if (AsyncStorage && typeof AsyncStorage.getItem === 'function') useAsyncStorage = true;
} catch (e) {
  useAsyncStorage = false;
}

// In-memory fallback (for web or when AsyncStorage not present)
let memoryStore = [];

// Which backend is active: 'sqlite' | 'async' | 'memory'
let storageBackend = 'memory';
if (useSQLite) storageBackend = 'sqlite';
else if (useAsyncStorage) storageBackend = 'async';
console.warn('DB backend selected:', storageBackend);

async function init() {
  if (useSQLite) {
    return new Promise((resolve, reject) => {
      sqliteDb.transaction((tx) => {
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS words (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word TEXT NOT NULL,
            translation TEXT,
            created_at DATETIME DEFAULT (datetime('now'))
          );`,
          [],
          () => resolve(true),
          (_, err) => { console.warn('create table err', err); reject(err); return false; }
        );
      }, reject);
    });
  }

  // ensure key exists (no-op)
  try {
    if (useAsyncStorage) {
      const existing = await AsyncStorage.getItem(AS_KEY);
      if (!existing) await AsyncStorage.setItem(AS_KEY, JSON.stringify([]));
      return true;
    }

    // AsyncStorage not present — ensure memory store initialized
    if (!Array.isArray(memoryStore)) memoryStore = [];
    return true;
  } catch (e) {
    console.warn('AsyncStorage init err', e);
    throw e;
  }
}

async function addWord(word, translation = null) {
  if (useSQLite) {
    return new Promise((resolve, reject) => {
      sqliteDb.transaction((tx) => {
        tx.executeSql(
          'INSERT INTO words (word, translation) values (?, ?);',
          [word, translation],
          (_, result) => resolve(result.insertId),
          (_, err) => { console.warn('insert err', err); reject(err); return false; }
        );
      }, reject);
    });
  }

  try {
    if (useAsyncStorage) {
      const raw = await AsyncStorage.getItem(AS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      const id = Date.now();
      arr.unshift({ id, word, translation, created_at: new Date().toISOString() });
      await AsyncStorage.setItem(AS_KEY, JSON.stringify(arr));
      return id;
    }

    // memory fallback
    const id = Date.now();
    memoryStore.unshift({ id, word, translation, created_at: new Date().toISOString() });
    return id;
  } catch (e) {
    console.warn('async addWord err', e);
    throw e;
  }
}

async function listWords() {
  if (useSQLite) {
    return new Promise((resolve, reject) => {
      sqliteDb.transaction((tx) => {
        tx.executeSql(
          'SELECT id, word, translation, created_at FROM words ORDER BY created_at DESC;',
          [],
          (_, { rows }) => resolve(rows._array),
          (_, err) => { console.warn('select err', err); reject(err); return false; }
        );
      }, reject);
    });
  }

  try {
    if (useAsyncStorage) {
      const raw = await AsyncStorage.getItem(AS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return arr;
    }

    // memory fallback
    return memoryStore;
  } catch (e) {
    console.warn('async listWords err', e);
    throw e;
  }
}

async function deleteWord(id) {
  if (useSQLite) {
    return new Promise((resolve, reject) => {
      sqliteDb.transaction((tx) => {
        tx.executeSql('DELETE FROM words WHERE id = ?;', [id],
          () => resolve(true),
          (_, err) => { console.warn('delete err', err); reject(err); return false; }
        );
      }, reject);
    });
  }

  try {
    if (useAsyncStorage) {
      const raw = await AsyncStorage.getItem(AS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      const filtered = arr.filter((r) => r.id !== id);
      await AsyncStorage.setItem(AS_KEY, JSON.stringify(filtered));
      return true;
    }

    // memory fallback
    memoryStore = memoryStore.filter((r) => r.id !== id);
    return true;
  } catch (e) {
    console.warn('async deleteWord err', e);
    throw e;
  }
}

export default { init, addWord, listWords, deleteWord };
