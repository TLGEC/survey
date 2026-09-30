const DB_NAME = 'lg-survey-pro-v2';
const DB_VERSION = 3;
const ACTIVE_KEY = 'lg-v4-active-survey-id';
let databasePromise;

function result(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Local database request failed'));
  });
}

export function openStore() {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('surveys')) db.createObjectStore('surveys', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('media')) {
        const media = db.createObjectStore('media', { keyPath: 'id' });
        media.createIndex('surveyId', 'surveyId', { unique: false });
        media.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('analytics')) db.createObjectStore('analytics', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('queue')) db.createObjectStore('queue', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('snapshots')) {
        const snapshots = db.createObjectStore('snapshots', { keyPath: 'id' });
        snapshots.createIndex('surveyId', 'surveyId', { unique: false });
        snapshots.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
    request.onerror = () => reject(request.error || new Error('Could not open local survey storage'));
    request.onblocked = () => reject(new Error('Close any other open LG Survey tabs, then reload.'));
  });
  return databasePromise;
}

async function transaction(names, mode, operation) {
  const db = await openStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(names, mode);
    let value;
    tx.oncomplete = () => resolve(value);
    tx.onerror = () => reject(tx.error || new Error('Local save failed'));
    tx.onabort = () => reject(tx.error || new Error('Local save was interrupted'));
    try { value = operation(tx); } catch (error) { tx.abort(); reject(error); }
  });
}

export async function putSurvey(survey, { checkpoint = false } = {}) {
  survey.updatedAt = new Date().toISOString();
  await transaction(checkpoint ? ['surveys', 'snapshots'] : ['surveys'], 'readwrite', tx => {
    tx.objectStore('surveys').put(structuredClone(survey));
    if (checkpoint) tx.objectStore('snapshots').put({
      id: `${survey.id}:${Date.now()}`, surveyId: survey.id, createdAt: survey.updatedAt, survey: structuredClone(survey)
    });
  });
  localStorage.setItem(ACTIVE_KEY, survey.id);
  if (checkpoint) await trimSnapshots(survey.id);
  return survey;
}

export async function getSurvey(id) {
  if (!id) return null;
  const db = await openStore();
  return result(db.transaction('surveys').objectStore('surveys').get(id));
}

export async function getSurveys() {
  const db = await openStore();
  const records = await result(db.transaction('surveys').objectStore('surveys').getAll());
  return records.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
}

export function getActiveId() { return localStorage.getItem(ACTIVE_KEY); }
export function clearActiveId() { localStorage.removeItem(ACTIVE_KEY); }

export async function putMedia(item) {
  if (!item?.surveyId) throw new Error('Media cannot be saved without a customer record.');
  await transaction(['media'], 'readwrite', tx => tx.objectStore('media').put(item));
  return item;
}

export async function getMedia(surveyId) {
  if (!surveyId) return [];
  const db = await openStore();
  const items = await result(db.transaction('media').objectStore('media').index('surveyId').getAll(surveyId));
  return items.filter(item => item.surveyId === surveyId).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

export async function updateMedia(id, changes, surveyId) {
  const db = await openStore();
  const existing = await result(db.transaction('media').objectStore('media').get(id));
  if (!existing || existing.surveyId !== surveyId) throw new Error('That media item does not belong to this visit.');
  return putMedia({ ...existing, ...changes, surveyId });
}

export async function deleteMedia(id, surveyId) {
  const db = await openStore();
  const existing = await result(db.transaction('media').objectStore('media').get(id));
  if (!existing || existing.surveyId !== surveyId) throw new Error('That media item does not belong to this visit.');
  await transaction(['media'], 'readwrite', tx => tx.objectStore('media').delete(id));
}

export async function deleteSurvey(id) {
  const media = await getMedia(id);
  await transaction(['surveys', 'media', 'snapshots'], 'readwrite', tx => {
    tx.objectStore('surveys').delete(id);
    for (const item of media) tx.objectStore('media').delete(item.id);
    const snapshotIndex = tx.objectStore('snapshots').index('surveyId');
    const cursor = snapshotIndex.openCursor(IDBKeyRange.only(id));
    cursor.onsuccess = () => { const current = cursor.result; if (current) { current.delete(); current.continue(); } };
  });
  if (getActiveId() === id) clearActiveId();
}

export async function getLatestSnapshot(surveyId) {
  const db = await openStore();
  const items = await result(db.transaction('snapshots').objectStore('snapshots').index('surveyId').getAll(surveyId));
  return items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0] || null;
}

async function trimSnapshots(surveyId) {
  const db = await openStore();
  const items = await result(db.transaction('snapshots').objectStore('snapshots').index('surveyId').getAll(surveyId));
  const remove = items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(8);
  if (!remove.length) return;
  await transaction(['snapshots'], 'readwrite', tx => remove.forEach(item => tx.objectStore('snapshots').delete(item.id)));
}

export async function requestPersistentStorage() {
  if (!navigator.storage?.persist) return false;
  try { return await navigator.storage.persist(); } catch { return false; }
}

export { DB_NAME, DB_VERSION, ACTIVE_KEY };
