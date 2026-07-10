import { describe, it, expect } from 'vitest';
import { mulberry32, weightedPick, shuffle } from '../src/curriculum/rng.js';
import {
  tablesFor, modeFor, timeSec, nextWeight, makeChoices, makeFactorChoices,
  makeProblem, starsFor, PROBLEMS_PER_STAGE,
} from '../src/curriculum/math_gen.js';

const rng = (seed = 42) => mulberry32(seed);

describe('레벨→출제 범위 매핑 (스펙 §4 M-1)', () => {
  it('레벨 1은 2단만', () => {
    expect(tablesFor(1).pool).toEqual([2]);
  });

  it('레벨 1~4는 2,5,3,4단 순차 도입', () => {
    expect(tablesFor(4).pool).toEqual([2, 5, 3, 4]);
    expect(tablesFor(3).focus).toBe(3);
  });

  it('레벨 5~8은 6,7,8,9단 순차 도입', () => {
    expect(tablesFor(5).focus).toBe(6);
    expect(tablesFor(8).pool).toEqual([2, 5, 3, 4, 6, 7, 8, 9]);
  });

  it('레벨 9+는 전체 풀, focus 없음', () => {
    expect(tablesFor(9).focus).toBeNull();
    expect(tablesFor(9).pool.length).toBe(8);
  });

  it('모드 전환: 1~8 tables, 9~11 mixed, 12~14 twodigit, 15+ all', () => {
    expect(modeFor(8)).toBe('tables');
    expect(modeFor(9)).toBe('mixed');
    expect(modeFor(12)).toBe('twodigit');
    expect(modeFor(15)).toBe('all');
  });
});

describe('제한시간 곡선 (6→3초)', () => {
  it('레벨 1은 6초', () => {
    expect(timeSec(1)).toBe(6);
  });
  it('레벨이 오르면 단조 감소', () => {
    let prev = timeSec(1);
    for (let l = 2; l <= 20; l++) {
      expect(timeSec(l)).toBeLessThanOrEqual(prev);
      prev = timeSec(l);
    }
  });
  it('하한 3초', () => {
    expect(timeSec(50)).toBe(3);
  });
});

describe('문제 생성 — 범위 준수', () => {
  it('레벨 1 문제는 전부 2단', () => {
    const r = rng(1);
    for (let i = 0; i < 50; i++) {
      const p = makeProblem(1, {}, r);
      expect(p.a).toBe(2);
      expect(p.answer).toBe(p.a * p.b);
    }
  });

  it('레벨 8 문제는 도입된 단(2~9)에서만', () => {
    const r = rng(2);
    for (let i = 0; i < 100; i++) {
      const p = makeProblem(8, {}, r);
      expect([2, 3, 4, 5, 6, 7, 8, 9]).toContain(p.a);
      expect(p.b).toBeGreaterThanOrEqual(2);
      expect(p.b).toBeLessThanOrEqual(9);
    }
  });

  it('레벨 9~11에서 역방향 문제 출현', () => {
    const r = rng(3);
    const kinds = new Set();
    for (let i = 0; i < 100; i++) kinds.add(makeProblem(10, {}, r).kind);
    expect(kinds.has('reverse')).toBe(true);
    expect(kinds.has('gugudan')).toBe(true);
  });

  it('역방향 문제 형식: "? × b = 답", 선택 정답은 빠진 인수', () => {
    const r = rng(4);
    let p;
    do {
      p = makeProblem(10, {}, r);
    } while (p.kind !== 'reverse');
    expect(p.prompt).toBe(`? × ${p.b} = ${p.answer}`);
    expect(p.choiceAnswer).toBe(p.a);
    expect(p.choices).toContain(p.a);
  });

  it('레벨 12~14: 두 자리 × 한 자리, 키패드 입력', () => {
    const r = rng(5);
    for (let i = 0; i < 50; i++) {
      const p = makeProblem(13, {}, r);
      expect(p.kind).toBe('twodigit');
      expect(p.a).toBeGreaterThanOrEqual(10);
      expect(p.a).toBeLessThanOrEqual(99);
      expect(p.b).toBeGreaterThanOrEqual(2);
      expect(p.b).toBeLessThanOrEqual(9);
      expect(p.input).toBe('keypad');
      expect(p.choices).toBeNull();
    }
  });

  it('레벨 15+: 세 종류 혼합 출제', () => {
    const r = rng(6);
    const kinds = new Set();
    for (let i = 0; i < 200; i++) kinds.add(makeProblem(15, {}, r).kind);
    expect(kinds).toEqual(new Set(['gugudan', 'reverse', 'twodigit']));
  });
});

describe('오답지(4지선다) 생성', () => {
  it('선택지는 4개, 전부 유일, 정답 포함', () => {
    const r = rng(7);
    for (let i = 0; i < 100; i++) {
      const p = makeProblem(6, {}, r);
      if (p.input !== 'choices') continue;
      expect(p.choices.length).toBe(4);
      expect(new Set(p.choices).size).toBe(4);
      expect(p.choices).toContain(p.choiceAnswer);
    }
  });

  it('오답지는 전부 양수', () => {
    const r = rng(8);
    for (let i = 0; i < 100; i++) {
      const c = makeChoices(4, 2, 2, r); // 2×2 같은 작은 정답도 음수 없이
      c.forEach((v) => expect(v).toBeGreaterThan(0));
    }
  });

  it('오답지는 근접값 (정답에서 ±20 이내)', () => {
    const r = rng(9);
    for (let i = 0; i < 100; i++) {
      const c = makeChoices(56, 7, 8, r);
      c.forEach((v) => expect(Math.abs(v - 56)).toBeLessThanOrEqual(20));
    }
  });

  it('역방향 선택지는 1~12 범위의 인수 후보', () => {
    const r = rng(10);
    const c = makeFactorChoices(7, r);
    expect(c.length).toBe(4);
    expect(new Set(c).size).toBe(4);
    c.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(12);
    });
    expect(c).toContain(7);
  });
});

describe('적응 출제 — 약점 가중치', () => {
  it('오답 시 가중치 3, 정답 시 1까지 감쇠', () => {
    expect(nextWeight(undefined, false)).toBe(3);
    expect(nextWeight(3, true)).toBe(2);
    expect(nextWeight(2, true)).toBe(1);
    expect(nextWeight(1, true)).toBe(1);
  });

  it('가중치 3인 문제가 약 3배 더 자주 출제된다', () => {
    const r = rng(11);
    // 레벨 4(풀: 2,5,3,4단)에서 7x?는 안 나오므로 3x4를 약점으로
    const weakness = { '3x4': 3 };
    let target = 0;
    const N = 12000;
    for (let i = 0; i < N; i++) {
      const p = makeProblem(4, weakness, r);
      if (p.key === '3x4') target += 1;
    }
    // 풀 크기 4단×8 = 32쌍(포커스 4단은 기본 2배). 기준 확률 대비 ~3배인지 확인
    const baseline = N / (4 * 8 + 8 + 2); // 대략치
    expect(target).toBeGreaterThan(baseline * 2);
    expect(target).toBeLessThan(baseline * 4.5);
  });

  it('weightedPick: 가중치 0뿐이면 폴백으로 아무거나 선택', () => {
    const r = rng(12);
    const v = weightedPick([1, 2, 3], () => 0, r);
    expect([1, 2, 3]).toContain(v);
  });
});

describe('스테이지 규칙', () => {
  it('별 계산: 하트 3=3별, 2=2별, 그 외 최소 1별(벌점 금지)', () => {
    expect(starsFor(3)).toBe(3);
    expect(starsFor(2)).toBe(2);
    expect(starsFor(1)).toBe(1);
    expect(starsFor(0)).toBe(1);
  });

  it('스테이지당 문제 수는 10', () => {
    expect(PROBLEMS_PER_STAGE).toBe(10);
  });

  it('mulberry32는 시드 고정 시 결정론적', () => {
    const a = mulberry32(99);
    const b = mulberry32(99);
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
  });

  it('shuffle은 원본을 보존하고 같은 원소를 유지', () => {
    const src = [1, 2, 3, 4, 5];
    const out = shuffle(src, rng(13));
    expect(src).toEqual([1, 2, 3, 4, 5]);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
