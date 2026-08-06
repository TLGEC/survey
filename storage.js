(function () {
  'use strict';

  const DB_NAME = 'lg-survey-pro-v2';
  const DB_VERSION = 2;
  const ACTIVE_SURVEY_KEY = 'lg-v2-active-survey-id';
  let databasePromise;

  function requestResult(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Local database request failed'));
    });
  }

  function open() {
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
        if (!db.objectStoreNames.contains('analytics')) {
          const analytics = db.createObjectStore('analytics', { keyPath: 'id' });
          analytics.createIndex('surveyId', 'surveyId', { unique: false });
          analytics.createIndex('type', 'type', { unique: false });
          analytics.createIndex('createdAt', 'createdAt', { unique: false });
        }
        if (!db.objectStoreNames.contains('queue')) {
          const queue = db.createObjectStore('queue', { keyPath: 'id' });
          queue.createIndex('surveyId', 'surveyId', { unique: false });
          queue.createIndex('status', 'status', { unique: false });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
      request.onerror = () => reject(request.error || new Error('Could not open local survey storage'));
      request.onblocked = () => reject(new Error('Local storage update is blocked by another open app tab'));
    });
    return databasePromise;
  }

  async function store(name, mode = 'readonly') {
    const db = await open();
    return db.transaction(name, mode).objectStore(name);
  }

  async function putSurvey(survey) {
    const target = await store('surveys', 'readwrite');
    await requestResult(target.put(survey));
    localStorage.setItem(ACTIVE_SURVEY_KEY, survey.id);
    return survey;
  }

  async function getSurvey(id) {
    if (!id) return null;
    return requestResult((await store('surveys')).get(id));
  }

  async function getSurveys() {
    const surveys = await requestResult((await store('surveys')).getAll());
    return surveys.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  }

  async function deleteSurvey(id) {
    const media = await getMedia(id);
    const mediaStore = await store('media', 'readwrite');
    for (const item of media) await requestResult(mediaStore.delete(item.id));
    await requestResult((await store('surveys', 'readwrite')).delete(id));
    if (localStorage.getItem(ACTIVE_SURVEY_KEY) === id) localStorage.removeItem(ACTIVE_SURVEY_KEY);
  }

  async function putMedia(item) {
    await requestResult((await store('media', 'readwrite')).put(item));
    return item;
  }

  async function getMedia(surveyId) {
    if (!surveyId) return [];
    const items = await requestResult((await store('media')).index('surveyId').getAll(surveyId));
    return items.sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
  }

  async function deleteMedia(id) {
    return requestResult((await store('media', 'readwrite')).delete(id));
  }

  async function putEvent(event) {
    return requestResult((await store('analytics', 'readwrite')).put(event));
  }

  async function getEvents() {
    return requestResult((await store('analytics')).getAll());
  }

  async function putQueueItem(item) {
    return requestResult((await store('queue', 'readwrite')).put(item));
  }

  async function getQueueItems() {
    return requestResult((await store('queue')).getAll());
  }

  async function deleteQueueItem(id) {
    return requestResult((await store('queue', 'readwrite')).delete(id));
  }

  window.LGV3Store = {
    DB_NAME,
    DB_VERSION,
    ACTIVE_SURVEY_KEY,
    open,
    putSurvey,
    getSurvey,
    getSurveys,
    deleteSurvey,
    putMedia,
    getMedia,
    deleteMedia,
    putEvent,
    getEvents,
    putQueueItem,
    getQueueItems,
    deleteQueueItem
  };
})();
