import { describe, it, expect } from 'vitest';
import { SKINS, getSkin } from '../src/skins.js';
import { GAMES, getGameDef } from '../src/games.js';
import { STREAK_REWARD_SKIN } from '../src/streak.js';

describe('스킨 카탈로그', () => {
  it('id 중복 없음', () => {
    const ids = SKINS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('구매 가능 스킨 3종 이상 (Phase 1 게이트)', () => {
    expect(SKINS.filter((s) => typeof s.price === 'number' && s.price > 0).length).toBeGreaterThanOrEqual(3);
  });

  it('기본 스킨 존재, 미지의 id는 기본 스킨으로 폴백', () => {
    expect(getSkin('default').id).toBe('default');
    expect(getSkin('없는스킨').id).toBe('default');
  });

  it('스트릭 보상 스킨이 카탈로그에 있고 구매 불가', () => {
    const s = SKINS.find((x) => x.id === STREAK_REWARD_SKIN);
    expect(s).toBeTruthy();
    expect(s.price).toBeNull();
  });
});

describe('게임 카탈로그', () => {
  it('수학 4종 + 국어 3종', () => {
    expect(GAMES.filter((g) => g.world === 'math').length).toBe(4);
    expect(GAMES.filter((g) => g.world === 'korean').length).toBe(3);
  });

  it('id/씬 키 중복 없음', () => {
    const ids = GAMES.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('모든 게임은 한국어 이름과 아이콘을 가짐', () => {
    for (const g of GAMES) {
      expect(g.name.length).toBeGreaterThan(0);
      expect(/[가-힣]/.test(g.name)).toBe(true);
      expect(g.icon.length).toBeGreaterThan(0);
    }
  });

  it('getGameDef 조회', () => {
    expect(getGameDef('m1').name).toBe('구구단 러너');
  });
});
