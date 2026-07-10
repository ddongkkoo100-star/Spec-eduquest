import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../src/curriculum/rng.js';
import {
  makeSlashProblem, judgeCut, isVerticalSwipe, eojeolCount, slashLevelSpec, sentencesForLevel,
} from '../src/curriculum/slash_logic.js';

describe('경계 계산', () => {
  it('"아기 곰" → display "아기곰", 경계 [2]', () => {
    const p = makeSlashProblem('아기 곰');
    expect(p.display).toBe('아기곰');
    expect(p.boundaries).toEqual([2]);
  });

  it('3어절: "친구와 같이 놀아요" → 경계 2개', () => {
    const p = makeSlashProblem('친구와 같이 놀아요');
    expect(p.display).toBe('친구와같이놀아요');
    expect(p.boundaries).toEqual([3, 5]);
  });

  it('여러 공백·양끝 공백 정리', () => {
    const p = makeSlashProblem('  밥을   먹어요  ');
    expect(p.display).toBe('밥을먹어요');
    expect(p.boundaries).toEqual([2]);
  });

  it('문장부호 보존', () => {
    const p = makeSlashProblem('와! 신난다');
    expect(p.display).toBe('와!신난다');
    expect(p.boundaries).toEqual([2]);
  });

  it('급수표 문장 재활용: 공백만 제거하면 그대로 문제가 된다', () => {
    const p = makeSlashProblem('바닷가에 갔어요.');
    expect(p.display).toBe('바닷가에갔어요.');
    expect(p.original).toBe('바닷가에 갔어요.');
  });
});

describe('베기 판정 기하 (±글자폭 40%)', () => {
  // 경계 1개(인덱스 2), startX=100, charW=50 → 경계 x=200
  const B = [2];

  it('경계 정중앙 명중', () => {
    expect(judgeCut(200, 100, 50, B)).toBe(0);
  });

  it('±39%는 성공, ±41%는 실패', () => {
    expect(judgeCut(200 + 50 * 0.39, 100, 50, B)).toBe(0);
    expect(judgeCut(200 - 50 * 0.39, 100, 50, B)).toBe(0);
    expect(judgeCut(200 + 50 * 0.41, 100, 50, B)).toBe(-1);
    expect(judgeCut(200 - 50 * 0.41, 100, 50, B)).toBe(-1);
  });

  it('여러 경계 중 가장 가까운 것 선택', () => {
    const bs = [2, 4]; // x=200, 300
    expect(judgeCut(210, 100, 50, bs)).toBe(0);
    expect(judgeCut(295, 100, 50, bs)).toBe(1);
  });

  it('경계가 아닌 위치(글자 한가운데) 베기 → 실패', () => {
    expect(judgeCut(225, 100, 50, B)).toBe(-1); // 경계에서 25px = 50%
  });

  it('세로 베기 인식: 수직이면 참, 대각선·수평이면 거짓', () => {
    expect(isVerticalSwipe(5, 80)).toBe(true);
    expect(isVerticalSwipe(0, -70)).toBe(true); // 아래→위
    expect(isVerticalSwipe(90, 80)).toBe(false);
    expect(isVerticalSwipe(3, 20)).toBe(false); // 너무 짧음
  });
});

describe('레벨 곡선과 출제', () => {
  const rng = mulberry32(41);

  it('어절 수 세기', () => {
    expect(eojeolCount('학교에 가요')).toBe(2);
    expect(eojeolCount('나는 사과를 좋아해요')).toBe(3);
  });

  it('L1~2는 2어절만 출제', () => {
    const list = sentencesForLevel(1, [], rng);
    expect(list.length).toBeGreaterThan(0);
    list.forEach((s) => expect(eojeolCount(s)).toBe(2));
  });

  it('L3~4는 3~4어절', () => {
    const list = sentencesForLevel(3, [], rng);
    list.forEach((s) => {
      expect(eojeolCount(s)).toBeGreaterThanOrEqual(3);
      expect(eojeolCount(s)).toBeLessThanOrEqual(4);
    });
  });

  it('레벨이 오르면 속도 상승', () => {
    expect(slashLevelSpec(7).speed).toBeGreaterThan(slashLevelSpec(1).speed);
    expect(slashLevelSpec(9).speed).toBeGreaterThan(slashLevelSpec(7).speed);
  });

  it('급수표 문장(extra)이 조건에 맞으면 출제 풀에 포함', () => {
    const list = sentencesForLevel(3, ['우리 집에 놀러 와'], rng);
    expect(list).toContain('우리 집에 놀러 와');
  });
});
