import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../src/curriculum/rng.js';
import {
  initAdd, canMerge, merge10, isResolved, valueOf,
  initSub, needsBorrow, split10, applySub,
  blockTier, makeBlockProblem,
} from '../src/curriculum/carry_machine.js';

describe('덧셈 — 받아올림 상태 머신', () => {
  it('47+25: 일의 자리 12개 → 합체 필요', () => {
    const s = initAdd(47, 25);
    expect(s.cols).toEqual({ ones: 12, tens: 6, hundreds: 0 });
    expect(canMerge(s, 'ones')).toBe(true);
    expect(isResolved(s)).toBe(false);
  });

  it('merge10: 나무 10개 → 다이아 1개 (값 보존)', () => {
    const s = initAdd(47, 25);
    const m = merge10(s, 'ones');
    expect(m.cols).toEqual({ ones: 2, tens: 7, hundreds: 0 });
    expect(valueOf(m.cols)).toBe(72);
    expect(isResolved(m)).toBe(true);
  });

  it('받아올림 없는 덧셈은 바로 정리 완료', () => {
    const s = initAdd(23, 45);
    expect(isResolved(s)).toBe(true);
    expect(valueOf(s.cols)).toBe(68);
  });

  it('합체 불가능할 때 merge10은 null', () => {
    const s = initAdd(23, 45);
    expect(merge10(s, 'ones')).toBeNull();
  });

  it('십의 자리 받아올림 → 백의 자리 (86+45)', () => {
    let s = initAdd(86, 45);
    s = merge10(s, 'ones');
    expect(canMerge(s, 'tens')).toBe(true);
    s = merge10(s, 'tens');
    expect(valueOf(s.cols)).toBe(131);
    expect(isResolved(s)).toBe(true);
  });
});

describe('뺄셈 — 받아내림 상태 머신', () => {
  it('52-27: 일의 자리 부족 → 받아내림 필요', () => {
    const s = initSub(52, 27);
    expect(needsBorrow(s, 'ones')).toBe(true);
  });

  it('split10: 다이아 1개 → 나무 10개 (값 보존)', () => {
    const s = initSub(52, 27);
    const b = split10(s, 'ones');
    expect(b.cols).toEqual({ ones: 12, tens: 4, hundreds: 0 });
    expect(valueOf(b.cols)).toBe(52);
    expect(needsBorrow(b, 'ones')).toBe(false);
  });

  it('받아내림 후 빼기 실행 → 정답', () => {
    let s = initSub(52, 27);
    s = split10(s, 'ones');
    const r = applySub(s);
    expect(valueOf(r.cols)).toBe(25);
    expect(r.answer).toBe(25);
  });

  it('부족한 상태에서 applySub는 null (강제 진행 금지)', () => {
    expect(applySub(initSub(52, 27))).toBeNull();
  });

  it('윗자리가 없으면 split10 불가', () => {
    const s = initSub(7, 3); // 십의 자리 0
    expect(split10(s, 'ones')).toBeNull();
  });
});

describe('레벨 곡선과 문제 생성', () => {
  const rng = mulberry32(21);

  it('티어 매핑: 받아올림 없음→받아올림→받아내림→세 자리→나눗셈', () => {
    expect(blockTier(1)).toBe('add-nocarry');
    expect(blockTier(3)).toBe('add-carry');
    expect(blockTier(5)).toBe('sub-borrow');
    expect(blockTier(7)).toBe('three-digit');
    expect(blockTier(9)).toBe('divide');
  });

  it('add-nocarry: 두 자리 + 두 자리, 어느 자리도 10 미만', () => {
    for (let i = 0; i < 50; i++) {
      const p = makeBlockProblem(1, rng);
      expect(p.a % 10 + p.b % 10).toBeLessThan(10);
      expect(Math.floor(p.a / 10) + Math.floor(p.b / 10)).toBeLessThan(10);
      expect(p.answer).toBe(p.a + p.b);
    }
  });

  it('add-carry: 일의 자리 합이 반드시 10 이상, 결과 100 미만', () => {
    for (let i = 0; i < 50; i++) {
      const p = makeBlockProblem(3, rng);
      expect(p.a % 10 + p.b % 10).toBeGreaterThanOrEqual(10);
      expect(p.answer).toBeLessThan(100);
    }
  });

  it('sub-borrow: 일의 자리가 부족한 뺄셈, 결과는 양수', () => {
    for (let i = 0; i < 50; i++) {
      const p = makeBlockProblem(5, rng);
      expect(p.a % 10).toBeLessThan(p.b % 10);
      expect(p.answer).toBeGreaterThan(0);
      expect(p.answer).toBe(p.a - p.b);
    }
  });

  it('three-digit: 세 자리 범위, 뺄셈은 음수 금지', () => {
    for (let i = 0; i < 50; i++) {
      const p = makeBlockProblem(7, rng);
      expect(p.a).toBeGreaterThanOrEqual(100);
      expect(p.answer).toBeGreaterThan(0);
      if (p.op === 'add') expect(p.answer).toBeLessThan(1000);
    }
  });

  it('divide: 나머지 없이 똑같이 나누기, 몫 2~9', () => {
    for (let i = 0; i < 50; i++) {
      const p = makeBlockProblem(9, rng);
      expect(p.a % p.b).toBe(0);
      expect(p.answer).toBeGreaterThanOrEqual(2);
      expect(p.answer).toBeLessThanOrEqual(9);
    }
  });
});
