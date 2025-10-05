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
    // Create table if missing and ensure `language` column exists (migration for older installs)
    return new Promise((resolve, reject) => {
      sqliteDb.transaction((tx) => {
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS words (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word TEXT NOT NULL,
            translation TEXT,
            language TEXT DEFAULT 'default',
            created_at DATETIME DEFAULT (datetime('now'))
          );`,
          [],
          () => {
            // after ensuring table exists, check columns
            tx.executeSql('PRAGMA table_info(words);', [], (_, { rows }) => {
              const cols = rows._array || [];
              const hasLang = cols.some((c) => c.name === 'language');
              if (!hasLang) {
                tx.executeSql("ALTER TABLE words ADD COLUMN language TEXT DEFAULT 'default';", [], () => resolve(true), (_, err) => { console.warn('add col err', err); reject(err); return false; });
              } else resolve(true);
            }, (_, err) => { console.warn('pragma err', err); reject(err); return false; });
          },
          (_, err) => { console.warn('create table err', err); reject(err); return false; }
        );
      }, reject);
    });
  }

  // ensure key exists (no-op)
  try {
    if (useAsyncStorage) {
      const existing = await AsyncStorage.getItem(AS_KEY);
      if (!existing) {
        await AsyncStorage.setItem(AS_KEY, JSON.stringify([]));
        return true;
      }

      // Backfill missing `language` on older records so filtering works
      try {
        const arr = JSON.parse(existing || '[]');
        let changed = false;
        const newArr = arr.map((it) => {
          if (typeof it === 'object' && it !== null && !('language' in it)) {
            changed = true;
            return { ...it, language: 'default' };
          }
          return it;
        });
        if (changed) await AsyncStorage.setItem(AS_KEY, JSON.stringify(newArr));
      } catch (e) {
        console.warn('AsyncStorage backfill err', e);
      }

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

async function addWord(word, translation = null, language = 'default') {
  // Normalize for comparison
  const normalized = typeof word === 'string' ? word.trim() : word;

  if (useSQLite) {
    // Check duplicate
    return new Promise((resolve, reject) => {
      sqliteDb.transaction((tx) => {
        tx.executeSql(
          'SELECT id FROM words WHERE word = ? AND language = ? LIMIT 1;',
          [normalized, language],
          (_, { rows }) => {
            const existing = rows && rows._array && rows._array[0];
            if (existing && existing.id) {
              resolve(existing.id);
              return;
            }
            // insert
            tx.executeSql(
              'INSERT INTO words (word, translation, language) values (?, ?, ?);',
              [normalized, translation, language],
              (_, result) => resolve(result.insertId),
              (_, err) => { console.warn('insert err', err); reject(err); return false; }
            );
          },
          (_, err) => { console.warn('select err', err); reject(err); return false; }
        );
      }, reject);
    });
  }

  try {
    if (useAsyncStorage) {
      const raw = await AsyncStorage.getItem(AS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      const found = arr.find((r) => (r.language || 'default') === (language || 'default') && (typeof r.word === 'string' ? r.word.trim() === normalized : r.word === normalized));
      if (found && found.id) return found.id;
      const id = Date.now();
      arr.unshift({ id, word: normalized, translation, language, created_at: new Date().toISOString() });
      await AsyncStorage.setItem(AS_KEY, JSON.stringify(arr));
      return id;
    }

    // memory fallback
    const found = memoryStore.find((r) => (r.language || 'default') === (language || 'default') && (typeof r.word === 'string' ? r.word.trim() === normalized : r.word === normalized));
    if (found && found.id) return found.id;
    const id = Date.now();
    memoryStore.unshift({ id, word: normalized, translation, language, created_at: new Date().toISOString() });
    return id;
  } catch (e) {
    console.warn('async addWord err', e);
    throw e;
  }
}

async function listWords(language = null) {
  if (useSQLite) {
    return new Promise((resolve, reject) => {
      sqliteDb.transaction((tx) => {
        if (language) {
          tx.executeSql(
            'SELECT id, word, translation, language, created_at FROM words WHERE language = ? ORDER BY created_at DESC;',
            [language],
            (_, { rows }) => resolve(rows._array),
            (_, err) => { console.warn('select err', err); reject(err); return false; }
          );
        } else {
          tx.executeSql(
            'SELECT id, word, translation, language, created_at FROM words ORDER BY created_at DESC;',
            [],
            (_, { rows }) => resolve(rows._array),
            (_, err) => { console.warn('select err', err); reject(err); return false; }
          );
        }
      }, reject);
    });
  }

  try {
    if (useAsyncStorage) {
      const raw = await AsyncStorage.getItem(AS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return language ? arr.filter((r) => r.language === language) : arr;
    }

    // memory fallback
    return language ? memoryStore.filter((r) => r.language === language) : memoryStore;
  } catch (e) {
    console.warn('async listWords err', e);
    throw e;
  }
}

async function deleteWord(id, language = null) {
  if (useSQLite) {
    return new Promise((resolve, reject) => {
      sqliteDb.transaction((tx) => {
        if (language) {
          tx.executeSql('DELETE FROM words WHERE id = ? AND language = ?;', [id, language],
            () => resolve(true),
            (_, err) => { console.warn('delete err', err); reject(err); return false; }
          );
        } else {
          tx.executeSql('DELETE FROM words WHERE id = ?;', [id],
            () => resolve(true),
            (_, err) => { console.warn('delete err', err); reject(err); return false; }
          );
        }
      }, reject);
    });
  }

  try {
    if (useAsyncStorage) {
      const raw = await AsyncStorage.getItem(AS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      const filtered = arr.filter((r) => !(r.id === id && (language ? r.language === language : true)));
      await AsyncStorage.setItem(AS_KEY, JSON.stringify(filtered));
      return true;
    }

    // memory fallback
    memoryStore = memoryStore.filter((r) => !(r.id === id && (language ? r.language === language : true)));
    return true;
  } catch (e) {
    console.warn('async deleteWord err', e);
    throw e;
  }
}

export default { init, addWord, listWords, deleteWord };
