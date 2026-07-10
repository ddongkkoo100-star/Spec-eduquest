import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../src/curriculum/rng.js';
import {
  handAngles, timeOf, snapMinutes, angleDeltaDeg, applyDrag,
  checkTime, digital, clockLevelSpec, makeClockProblem, normMinutes,
} from '../src/curriculum/clock_logic.js';

describe('기어비 — 분침 360° = 시침 30°', () => {
  it('3시 정각: 시침 90°, 분침 0°', () => {
    expect(handAngles(3, 0)).toEqual({ hourDeg: 90, minuteDeg: 0 });
  });

  it('6시 30분: 분침 180°, 시침은 6과 7 사이(195°)', () => {
    expect(handAngles(6, 30)).toEqual({ hourDeg: 195, minuteDeg: 180 });
  });

  it('분침 한 바퀴(60분)에 시침 정확히 30° 이동', () => {
    const a = handAngles(2, 0).hourDeg;
    const b = handAngles(3, 0).hourDeg;
    expect(b - a).toBe(30);
  });

  it('12시는 0분으로 정규화 (h=12 → 0°)', () => {
    expect(handAngles(12, 0)).toEqual({ hourDeg: 0, minuteDeg: 0 });
  });
});

describe('스냅과 시각 변환', () => {
  it('5분 스냅: 3시 43분 → 3시 45분', () => {
    expect(snapMinutes(3 * 60 + 43, 5)).toBe(3 * 60 + 45);
  });

  it('30분 스냅: 7시 14분 → 7시 정각', () => {
    expect(snapMinutes(7 * 60 + 14, 30)).toBe(7 * 60);
  });

  it('timeOf: 0분 → 12시, 719분 → 11시 59분', () => {
    expect(timeOf(0)).toEqual({ h: 12, m: 0 });
    expect(timeOf(719)).toEqual({ h: 11, m: 59 });
  });

  it('normMinutes: 음수·초과 랩', () => {
    expect(normMinutes(-10)).toBe(710);
    expect(normMinutes(730)).toBe(10);
  });
});

describe('드래그 랩어라운드 (12시 경계)', () => {
  it('각도 최단 차: 350°→10°는 +20° (경계 통과)', () => {
    expect(angleDeltaDeg(350, 10)).toBe(20);
  });

  it('각도 최단 차: 10°→350°는 -20°', () => {
    expect(angleDeltaDeg(10, 350)).toBe(-20);
  });

  it('11시 55분에서 +10분 드래그 → 12시 5분 (시간 누적 유지)', () => {
    const total = 11 * 60 + 55;
    const next = applyDrag(total, 330, 30); // 분침 330°→30° = +60° = +10분
    expect(timeOf(next)).toEqual({ h: 12, m: 5 });
  });

  it('역방향 드래그로 12시 경계 되돌아가기', () => {
    const next = applyDrag(2, 12, 348); // 12시 2분에서 -4분
    expect(timeOf(next)).toEqual({ h: 11, m: 58 });
  });
});

describe('정답 판정', () => {
  it('스냅 후 목표와 일치하면 정답', () => {
    expect(checkTime(3 * 60 + 43, 3, 45, 5)).toBe(true);
    expect(checkTime(3 * 60 + 42, 3, 45, 5)).toBe(false);
  });

  it('digital 표기: 3:05', () => {
    expect(digital(3, 5)).toBe('3:05');
  });
});

describe('레벨 곡선 (L1~3 정각·30분 → 5분 → 1분 → 시간 계산)', () => {
  const rng = mulberry32(7);

  it('L1~3: 30분 스냅, set만', () => {
    expect(clockLevelSpec(2)).toEqual({ snap: 30, kinds: ['set'] });
    for (let i = 0; i < 30; i++) {
      const p = makeClockProblem(2, rng);
      expect([0, 30]).toContain(p.targetM);
    }
  });

  it('L4~6: 5분 단위', () => {
    for (let i = 0; i < 30; i++) {
      const p = makeClockProblem(5, rng);
      expect(p.targetM % 5).toBe(0);
    }
  });

  it('L7~9: 1분 단위 허용', () => {
    const seen = new Set();
    for (let i = 0; i < 200; i++) seen.add(makeClockProblem(8, rng).targetM % 5);
    expect([...seen].some((v) => v !== 0)).toBe(true);
  });

  it('L10+: 시간 계산(add) 문제 출현, 목표가 정확히 delta 뒤', () => {
    let p;
    do {
      p = makeClockProblem(12, rng);
    } while (p.kind !== 'add');
    expect(p.startTotal).not.toBeNull();
    expect(p.prompt).toContain('분 뒤로');
    // 목표 시각 검증: prompt의 시작 시각 + delta = target
    const target = normMinutes((p.targetH % 12) * 60 + p.targetM);
    const delta = normMinutes(target - p.startTotal);
    expect([10, 20, 30, 40, 60]).toContain(delta);
  });

  it('시간 계산: 시 경계를 넘는 덧셈 (3:40 + 30 = 4:10 형태) 정합성', () => {
    for (let i = 0; i < 100; i++) {
      const p = makeClockProblem(12, rng);
      if (p.kind !== 'add') continue;
      expect(p.targetM).toBeGreaterThanOrEqual(0);
      expect(p.targetM).toBeLessThan(60);
      expect(p.targetH).toBeGreaterThanOrEqual(1);
      expect(p.targetH).toBeLessThanOrEqual(12);
    }
  });
});
