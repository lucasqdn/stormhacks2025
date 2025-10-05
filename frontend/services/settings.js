// Lightweight settings store with AsyncStorage fallback and in-memory storage
let AsyncStorage = null;
let useAsyncStorage = false;
try {
  // eslint-disable-next-line global-require
  AsyncStorage = require('@react-native-async-storage/async-storage');
  if (AsyncStorage && typeof AsyncStorage.getItem === 'function') useAsyncStorage = true;
} catch (e) {
  useAsyncStorage = false;
}

const KEY = '@lingolens_settings';
let memory = { targetLang: 'ko' };
const subscribers = new Set();

async function getAll() {
  if (useAsyncStorage) {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : memory;
    } catch (e) {
      console.warn('settings getAll err', e);
      return memory;
    }
  }
  return memory;
}

async function setAll(obj) {
  memory = { ...memory, ...obj };
  if (useAsyncStorage) {
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(memory));
    } catch (e) {
      console.warn('settings setAll err', e);
    }
  }
  subscribers.forEach((fn) => {
    try { fn(memory); } catch (e) { console.warn('settings sub err', e); }
  });
}

async function getTargetLang() {
  const all = await getAll();
  return all.targetLang || 'ko';
}

async function setTargetLang(lang) {
  await setAll({ targetLang: lang });
}

function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export default { getAll, setAll, getTargetLang, setTargetLang, subscribe };
