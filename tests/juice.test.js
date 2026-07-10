import { describe, it, expect } from 'vitest';
import { ComboTracker, ParticleBudget, bannerFor } from '../src/juice.js';

describe('콤보 트래커 (J2)', () => {
  it('연속 정답 시 카운트 증가, 최고 기록 유지', () => {
    const c = new ComboTracker();
    c.hit();
    c.hit();
    const r = c.hit();
    expect(r.count).toBe(3);
    c.reset();
    expect(c.count).toBe(0);
    expect(c.best).toBe(3);
  });

  it('배너 임계값: 2는 없음, 3="굉장해!", 5="대단해!!", 7="최고야!!!"', () => {
    expect(bannerFor(2)).toBeNull();
    expect(bannerFor(3)).toBe('굉장해!');
    expect(bannerFor(5)).toBe('대단해!!');
    expect(bannerFor(7)).toBe('최고야!!!');
  });

  it('오답 후 재시작하면 1부터', () => {
    const c = new ComboTracker();
    c.hit();
    c.hit();
    c.reset();
    expect(c.hit().count).toBe(1);
  });
});

describe('파티클 예산 (J10 — 동시 상한 100)', () => {
  it('상한 내에서는 요청량 전부 승인', () => {
    const b = new ParticleBudget(100);
    expect(b.request(30)).toBe(30);
    expect(b.active).toBe(30);
  });

  it('상한 초과 요청은 잔여량만 승인', () => {
    const b = new ParticleBudget(100);
    b.request(90);
    expect(b.request(30)).toBe(10);
    expect(b.active).toBe(100);
  });

  it('가득 찼을 때는 0 승인 (음수 금지)', () => {
    const b = new ParticleBudget(100);
    b.request(100);
    expect(b.request(20)).toBe(0);
  });

  it('release로 예산 반환, 과잉 반환해도 0 미만 불가', () => {
    const b = new ParticleBudget(100);
    b.request(50);
    b.release(30);
    expect(b.active).toBe(20);
    b.release(999);
    expect(b.active).toBe(0);
  });
});
