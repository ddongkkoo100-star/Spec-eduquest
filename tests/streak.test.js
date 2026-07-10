import { describe, it, expect } from 'vitest';
import { applyStreak, dayDiff, todayStr, STREAK_REWARD_DAYS } from '../src/streak.js';

describe('streak 날짜 로직', () => {
  it('최초 클리어 → count 1', () => {
    const r = applyStreak({ count: 0, lastDate: null }, '2026-07-10');
    expect(r.streak).toEqual({ count: 1, lastDate: '2026-07-10' });
    expect(r.changed).toBe(true);
  });

  it('같은 날 중복 클리어 → 변화 없음', () => {
    const r = applyStreak({ count: 3, lastDate: '2026-07-10' }, '2026-07-10');
    expect(r.streak.count).toBe(3);
    expect(r.changed).toBe(false);
  });

  it('다음 날 클리어 → count 증가', () => {
    const r = applyStreak({ count: 3, lastDate: '2026-07-10' }, '2026-07-11');
    expect(r.streak.count).toBe(4);
  });

  it('하루 건너뜀 → 1로 리셋', () => {
    const r = applyStreak({ count: 6, lastDate: '2026-07-10' }, '2026-07-12');
    expect(r.streak.count).toBe(1);
    expect(r.rewardEarned).toBe(false);
  });

  it('7일 달성 시 보상 플래그', () => {
    const r = applyStreak({ count: 6, lastDate: '2026-07-10' }, '2026-07-11');
    expect(r.streak.count).toBe(STREAK_REWARD_DAYS);
    expect(r.rewardEarned).toBe(true);
  });

  it('8일째에는 보상 플래그 없음(중복 지급 방지)', () => {
    const r = applyStreak({ count: 7, lastDate: '2026-07-10' }, '2026-07-11');
    expect(r.streak.count).toBe(8);
    expect(r.rewardEarned).toBe(false);
  });

  it('월 경계를 넘는 다음 날 계산 (7/31 → 8/1)', () => {
    const r = applyStreak({ count: 2, lastDate: '2026-07-31' }, '2026-08-01');
    expect(r.streak.count).toBe(3);
  });

  it('연 경계를 넘는 다음 날 계산 (12/31 → 1/1)', () => {
    expect(dayDiff('2026-12-31', '2027-01-01')).toBe(1);
  });

  it('기기 시계 역행 → 리셋 (크래시 없음)', () => {
    const r = applyStreak({ count: 5, lastDate: '2026-07-10' }, '2026-07-08');
    expect(r.streak.count).toBe(1);
  });

  it('todayStr는 YYYY-MM-DD 형식(로컬 날짜)', () => {
    const s = todayStr(new Date(2026, 0, 5)); // 2026년 1월 5일
    expect(s).toBe('2026-01-05');
  });
});
