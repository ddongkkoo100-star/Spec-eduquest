import { describe, it, expect, beforeEach } from 'vitest';
import * as store from '../src/store.js';

beforeEach(() => {
  globalThis.localStorage.clear();
  store.__resetCache();
});

describe('진행도 저장/복원', () => {
  it('빈 저장소 → 기본값', () => {
    const p = store.getProgress();
    expect(p.coins).toBe(0);
    expect(p.unlockedSkins).toEqual(['default']);
    expect(p.equippedSkin).toBe('default');
  });

  it('저장 후 캐시 리셋해도 복원됨', () => {
    store.addCoins(120);
    store.__resetCache();
    expect(store.getProgress().coins).toBe(120);
  });

  it('오염된 JSON → 기본값 폴백 (크래시 없음)', () => {
    globalThis.localStorage.setItem('eduquest_progress', '{{{broken');
    expect(store.getProgress().coins).toBe(0);
  });

  it('스키마 버전 불일치 → 기본값 폴백', () => {
    globalThis.localStorage.setItem('eduquest_progress', JSON.stringify({ v: 99, data: { coins: 999 } }));
    expect(store.getProgress().coins).toBe(0);
  });

  it('필드 누락된 저장 데이터 → 기본값과 병합', () => {
    globalThis.localStorage.setItem('eduquest_progress', JSON.stringify({ v: 1, data: { coins: 50 } }));
    const p = store.getProgress();
    expect(p.coins).toBe(50);
    expect(p.unlockedSkins).toEqual(['default']);
  });
});

describe('코인 경제', () => {
  it('addCoins 누적', () => {
    store.addCoins(10);
    store.addCoins(25);
    expect(store.getProgress().coins).toBe(35);
  });

  it('spendCoins 성공 시 차감', () => {
    store.addCoins(100);
    expect(store.spendCoins(40)).toBe(true);
    expect(store.getProgress().coins).toBe(60);
  });

  it('잔액 부족 시 spendCoins 실패, 잔액 유지', () => {
    store.addCoins(30);
    expect(store.spendCoins(40)).toBe(false);
    expect(store.getProgress().coins).toBe(30);
  });
});

describe('스킨 구매 상태 머신', () => {
  it('구매 성공 → 코인 차감 + 소유 목록 추가', () => {
    store.addCoins(200);
    const r = store.buySkin('cap_red', 150);
    expect(r.ok).toBe(true);
    expect(store.getProgress().coins).toBe(50);
    expect(store.getProgress().unlockedSkins).toContain('cap_red');
  });

  it('중복 구매 거부', () => {
    store.addCoins(400);
    store.buySkin('cap_red', 150);
    const r = store.buySkin('cap_red', 150);
    expect(r).toEqual({ ok: false, reason: 'owned' });
    expect(store.getProgress().coins).toBe(250);
  });

  it('잔액 부족 구매 거부', () => {
    store.addCoins(100);
    const r = store.buySkin('cap_red', 150);
    expect(r).toEqual({ ok: false, reason: 'coins' });
  });

  it('미소유 스킨 장착 불가', () => {
    expect(store.equipSkin('cap_red')).toBe(false);
    expect(store.getProgress().equippedSkin).toBe('default');
  });

  it('소유 스킨 장착 성공', () => {
    store.addCoins(200);
    store.buySkin('cap_red', 150);
    expect(store.equipSkin('cap_red')).toBe(true);
    expect(store.getProgress().equippedSkin).toBe('cap_red');
  });
});

describe('게임 진행도 + 스테이지 클리어', () => {
  it('getGame은 없으면 기본 레코드 생성', () => {
    const g = store.getGame('math', 'm1');
    expect(g).toEqual({ level: 1, stars: 0 });
  });

  it('updateGame 패치 저장', () => {
    store.updateGame('math', 'm1', { level: 5 });
    store.__resetCache();
    expect(store.getGame('math', 'm1').level).toBe(5);
  });

  it('recordStageClear: 코인/별 누적 + 스트릭 시작', () => {
    const r = store.recordStageClear('math', 'm1', { stars: 3, coins: 50 });
    expect(r.coins).toBe(50);
    expect(r.streak.count).toBe(1);
    expect(store.getGame('math', 'm1').stars).toBe(3);
  });

  it('recordStageClear levelUp 시 레벨 증가', () => {
    store.recordStageClear('math', 'm1', { stars: 1, coins: 10, levelUp: true });
    expect(store.getGame('math', 'm1').level).toBe(2);
  });
});

describe('IndexedDB 래퍼', () => {
  it('put/get 라운드트립', async () => {
    await store.idbPut('weakness', { key: '7x8', weight: 3 });
    const v = await store.idbGet('weakness', '7x8');
    expect(v.weight).toBe(3);
  });

  it('getAll은 저장된 전부 반환, delete로 제거', async () => {
    await store.idbClear('mistakes');
    await store.idbPut('mistakes', { text: '문장 하나', wrong: 1 });
    await store.idbPut('mistakes', { text: '문장 둘', wrong: 2 });
    expect((await store.idbAll('mistakes')).length).toBe(2);
    await store.idbDelete('mistakes', '문장 하나');
    expect((await store.idbAll('mistakes')).length).toBe(1);
  });

  it('autoIncrement 스토어는 키를 발급', async () => {
    await store.idbClear('gugupyo');
    const id = await store.idbPut('gugupyo', { title: '1학기', sets: [] });
    expect(id).toBeTruthy();
    const doc = await store.idbGet('gugupyo', id);
    expect(doc.title).toBe('1학기');
  });

  it('clear로 전체 삭제', async () => {
    await store.idbPut('weakness', { key: 'a', weight: 1 });
    await store.idbClear('weakness');
    expect((await store.idbAll('weakness')).length).toBe(0);
  });
});
