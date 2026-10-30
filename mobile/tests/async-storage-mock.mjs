const memory = new Map();

const mockAsyncStorage = {
  getItem: async (key) => memory.get(key) ?? null,
  setItem: async (key, value) => { memory.set(key, String(value)); },
  removeItem: async (key) => { memory.delete(key); },
  clear: async () => { memory.clear(); },
  getAllKeys: async () => [...memory.keys()],
  multiGet: async (keys) => keys.map((k) => [k, memory.get(k) ?? null]),
  multiSet: async (pairs) => { for (const [k, v] of pairs) memory.set(k, String(v)); },
  multiRemove: async (keys) => { for (const k of keys) memory.delete(k); },
};

export default mockAsyncStorage;
export const getItem = mockAsyncStorage.getItem;
export const setItem = mockAsyncStorage.setItem;
export const removeItem = mockAsyncStorage.removeItem;
export const clear = mockAsyncStorage.clear;
export const getAllKeys = mockAsyncStorage.getAllKeys;
export const multiGet = mockAsyncStorage.multiGet;
export const multiSet = mockAsyncStorage.multiSet;
export const multiRemove = mockAsyncStorage.multiRemove;
