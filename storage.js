import { initialState } from './model.js';

let database;
const storeName = 'journal';
const key = 'state';

export function openStorage() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('podhod-training-diary', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(storeName).put(initialState(), key);
    };
    request.onsuccess = () => {
      database = request.result;
      database.onversionchange = () => database.close();
      resolve();
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Закройте другие окна дневника и обновите страницу.'));
  });
}

export function readState() {
  return new Promise((resolve, reject) => {
    const request = database.transaction(storeName).objectStore(storeName).get(key);
    request.onsuccess = () => request.result
      ? resolve(request.result)
      : reject(new Error('Не удалось прочитать дневник.'));
    request.onerror = () => reject(request.error);
  });
}

export function changeState(change) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    let next;
    let error;
    const request = store.get(key);
    request.onsuccess = () => {
      try {
        next = request.result;
        if (!next) throw new Error('Не удалось прочитать дневник.');
        change(next);
        next.revision += 1;
        store.put(next, key);
      } catch (cause) {
        error = cause;
        transaction.abort();
      }
    };
    transaction.oncomplete = () => resolve(next);
    transaction.onabort = () => reject(error || transaction.error || new Error('Запись прервана.'));
  });
}
