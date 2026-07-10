// localStorage(진행도·설정) + IndexedDB(급수표·오답노트·약점) 래퍼.
// 원칙: 어떤 오염된 데이터에도 크래시하지 않고 기본값으로 폴백한다.
import { applyStreak, todayStr, STREAK_REWARD_SKIN } from './streak.js';

const PROGRESS_KEY = 'eduquest_progress';
const SETTINGS_KEY = 'eduquest_settings';
const SCHEMA_V = 1;

// ---------- 기본값 ----------
export function defaultProgress() {
  return {
    coins: 0,
    streak: { count: 0, lastDate: null },
    unlockedSkins: ['default'],
    equippedSkin: 'default',
    worlds: { math: {}, korean: {} },
  };
}

export function defaultSettings() {
  return {
    muted: false,
    tts: { rate: 0.85, repeats: 2, pauseSec: 10, voiceURI: null, manualAdvance: false },
  };
}

// ---------- localStorage 계층 ----------
function readEnvelope(key, defaults) {
  try {
    const raw = globalThis.localStorage.getItem(key);
    if (!raw) return defaults();
    const env = JSON.parse(raw);
    if (!env || typeof env !== 'object' || env.v !== SCHEMA_V || typeof env.data !== 'object' || env.data === null) {
      return defaults();
    }
    // 필드 누락 대비: 기본값 위에 얕은 병합
    return { ...defaults(), ...env.data };
  } catch {
    return defaults();
  }
}

function writeEnvelope(key, data) {
  try {
    globalThis.localStorage.setItem(key, JSON.stringify({ v: SCHEMA_V, data }));
  } catch {
    // 저장 실패(용량 등)해도 앱은 계속 동작
  }
}

let _progress = null;
let _settings = null;

export function getProgress() {
  if (!_progress) _progress = readEnvelope(PROGRESS_KEY, defaultProgress);
  return _progress;
}
export function saveProgress() {
  writeEnvelope(PROGRESS_KEY, getProgress());
}
export function getSettings() {
  if (!_settings) _settings = readEnvelope(SETTINGS_KEY, defaultSettings);
  return _settings;
}
export function saveSettings() {
  writeEnvelope(SETTINGS_KEY, getSettings());
}

/** 테스트/리셋용: 메모리 캐시 무효화 */
export function __resetCache() {
  _progress = null;
  _settings = null;
}

// ---------- 경제 ----------
export function addCoins(n) {
  const p = getProgress();
  p.coins = Math.max(0, p.coins + Math.round(n));
  saveProgress();
  return p.coins;
}

export function spendCoins(n) {
  const p = getProgress();
  if (p.coins < n) return false;
  p.coins -= n;
  saveProgress();
  return true;
}

/** @returns {{ok:boolean, reason?:'owned'|'coins'}} */
export function buySkin(id, price) {
  const p = getProgress();
  if (p.unlockedSkins.includes(id)) return { ok: false, reason: 'owned' };
  if (p.coins < price) return { ok: false, reason: 'coins' };
  p.coins -= price;
  p.unlockedSkins.push(id);
  saveProgress();
  return { ok: true };
}

export function grantSkin(id) {
  const p = getProgress();
  if (!p.unlockedSkins.includes(id)) {
    p.unlockedSkins.push(id);
    saveProgress();
    return true;
  }
  return false;
}

export function equipSkin(id) {
  const p = getProgress();
  if (!p.unlockedSkins.includes(id)) return false;
  p.equippedSkin = id;
  saveProgress();
  return true;
}

// ---------- 게임 진행도 ----------
export function getGame(world, id) {
  const p = getProgress();
  if (!p.worlds[world]) p.worlds[world] = {};
  if (!p.worlds[world][id]) p.worlds[world][id] = { level: 1, stars: 0 };
  return p.worlds[world][id];
}

export function updateGame(world, id, patch) {
  const g = getGame(world, id);
  Object.assign(g, patch);
  saveProgress();
  return g;
}

/**
 * 스테이지 클리어 공통 처리: 코인 지급 + 별 누적 + 스트릭 갱신.
 * @returns {{coins:number, streak:object, streakReward:boolean}}
 */
export function recordStageClear(world, id, { stars = 0, coins = 0, levelUp = false } = {}) {
  const p = getProgress();
  const g = getGame(world, id);
  g.stars += stars;
  if (levelUp) g.level += 1;
  p.coins += coins;
  const res = applyStreak(p.streak, todayStr());
  p.streak = res.streak;
  let streakReward = false;
  if (res.rewardEarned && !p.unlockedSkins.includes(STREAK_REWARD_SKIN)) {
    p.unlockedSkins.push(STREAK_REWARD_SKIN);
    streakReward = true;
  }
  saveProgress();
  return { coins: p.coins, streak: p.streak, streakReward };
}

// ---------- IndexedDB 계층 ----------
const DB_NAME = 'eduquest';
const DB_V = 1;
export const IDB_STORES = {
  gugupyo: { keyPath: 'id', autoIncrement: true }, // 급수표 문서
  mistakes: { keyPath: 'text' },                   // 받아쓰기 오답노트 (문장 원문이 키)
  weakness: { keyPath: 'key' },                    // 수학 약점 가중치
};

let _dbPromise = null;
// indexedDB가 없는 환경 폴백(비상용 인메모리)
const _mem = new Map();
function memStore(name) {
  if (!_mem.has(name)) _mem.set(name, new Map());
  return _mem.get(name);
}
let _memAutoId = 1;

function hasIDB() {
  return typeof globalThis.indexedDB !== 'undefined' && globalThis.indexedDB !== null;
}

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = globalThis.indexedDB.open(DB_NAME, DB_V);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const [name, opts] of Object.entries(IDB_STORES)) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, opts);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

function tx(storeName, mode, fn) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(storeName, mode);
        const os = t.objectStore(storeName);
        const req = fn(os);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

export async function idbPut(store, value) {
  if (!hasIDB()) {
    const m = memStore(store);
    const kp = IDB_STORES[store].keyPath;
    let key = value[kp];
    if (key == null && IDB_STORES[store].autoIncrement) {
      key = _memAutoId++;
      value = { ...value, [kp]: key };
    }
    m.set(key, value);
    return key;
  }
  return tx(store, 'readwrite', (os) => os.put(value));
}

export async function idbGet(store, key) {
  if (!hasIDB()) return memStore(store).get(key);
  return tx(store, 'readonly', (os) => os.get(key));
}

export async function idbAll(store) {
  if (!hasIDB()) return [...memStore(store).values()];
  return tx(store, 'readonly', (os) => os.getAll());
}

export async function idbDelete(store, key) {
  if (!hasIDB()) return void memStore(store).delete(key);
  return tx(store, 'readwrite', (os) => os.delete(key));
}

export async function idbClear(store) {
  if (!hasIDB()) return void memStore(store).clear();
  return tx(store, 'readwrite', (os) => os.clear());
}
