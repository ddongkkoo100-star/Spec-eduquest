import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../src/curriculum/rng.js';
import {
  toBase, convert, fmt, sumStatus, lengthLevelSpec, makeLengthProblem,
} from '../src/curriculum/length_logic.js';

describe('단위 변환 계산기', () => {
  it('1m = 100cm = 1000mm', () => {
    expect(convert(1, 'm', 'cm')).toBe(100);
    expect(convert(1, 'm', 'mm')).toBe(1000);
    expect(convert(1, 'km', 'm')).toBe(1000);
  });

  it('왕복 변환 보존', () => {
    expect(convert(convert(35, 'cm', 'mm'), 'mm', 'cm')).toBe(35);
  });

  it('들이/무게: 1L=1000mL, 1kg=1000g', () => {
    expect(convert(1, 'L', 'mL')).toBe(1000);
    expect(convert(2500, 'g', 'kg')).toBe(2.5);
  });

  it('계열이 다른 변환은 에러 (cm→mL 금지)', () => {
    expect(() => convert(1, 'cm', 'mL')).toThrow();
  });

  it('toBase: cm→mm 기준', () => {
    expect(toBase(120, 'cm')).toBe(1200);
  });
});

describe('한국어 표기', () => {
  it('1200mm → "1m 20cm"', () => {
    expect(fmt(1200, 'length')).toBe('1m 20cm');
  });
  it('1000mm → "1m", 300mm → "30cm"', () => {
    expect(fmt(1000, 'length')).toBe('1m');
    expect(fmt(300, 'length')).toBe('30cm');
  });
  it('53mm → "5cm 3mm"', () => {
    expect(fmt(53, 'length')).toBe('5cm 3mm');
  });
  it('1500mL → "1L 500mL", 700g → "700g"', () => {
    expect(fmt(1500, 'volume')).toBe('1L 500mL');
    expect(fmt(700, 'weight')).toBe('700g');
  });
});

describe('합산 판정', () => {
  it('부족/정확/초과', () => {
    expect(sumStatus(900, 1200)).toBe('under');
    expect(sumStatus(1200, 1200)).toBe('exact');
    expect(sumStatus(1300, 1200)).toBe('over');
  });
});

describe('레벨 곡선과 문제 생성', () => {
  const rng = mulberry32(31);

  it('L1~2: cm 단독(다리), L3~5: m 포함', () => {
    expect(lengthLevelSpec(1).palette.every((b) => b < 1000)).toBe(true);
    expect(lengthLevelSpec(4).palette).toContain(1000);
  });

  it('L6~7: mm 개념 등장', () => {
    expect(lengthLevelSpec(6).palette).toContain(5);
  });

  it('L8~9 들이(물통), L10+ 무게(저울)로 소재 확장', () => {
    expect(lengthLevelSpec(8).theme).toBe('water');
    expect(lengthLevelSpec(11).theme).toBe('scale');
  });

  it('문제는 항상 풀 수 있다 (해답 조각 합 = 목표)', () => {
    for (let lvl of [1, 3, 6, 8, 11]) {
      for (let i = 0; i < 30; i++) {
        const p = makeLengthProblem(lvl, rng);
        expect(p.solution.reduce((a, b) => a + b, 0)).toBe(p.targetBase);
        // 해답 조각은 모두 팔레트에 존재
        p.solution.forEach((s) => expect(p.pieces.map((x) => x.base)).toContain(s));
      }
    }
  });

  it('조각 라벨과 목표 라벨은 비어 있지 않은 한국식 표기', () => {
    const p = makeLengthProblem(3, rng);
    expect(p.targetLabel.length).toBeGreaterThan(0);
    expect(p.prompt).toContain(p.targetLabel);
    p.pieces.forEach((pc) => expect(pc.label.length).toBeGreaterThan(0));
  });
});
