import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../src/curriculum/rng.js';
import { PAIRS, SENTENCES, validateDb, makeStoneProblem } from '../src/curriculum/korean_db.js';

describe('국어 DB 무결성 (Phase 5 게이트)', () => {
  it('겹받침·맞춤법 쌍 최소 80개', () => {
    expect(PAIRS.length).toBeGreaterThanOrEqual(80);
  });

  it('기본 예문 100문장', () => {
    expect(SENTENCES.length).toBeGreaterThanOrEqual(100);
  });

  it('validateDb: 중복/빈 필드/정답=오답/어절 수 위반 없음', () => {
    const r = validateDb();
    expect(r.problems).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('모든 쌍은 정답≠오답이고 힌트가 있다', () => {
    for (const p of PAIRS) {
      expect(p.c).not.toBe(p.w);
      expect(p.hint.length).toBeGreaterThan(0);
    }
  });

  it('모든 예문은 2~4어절', () => {
    for (const s of SENTENCES) {
      const n = s.split(' ').length;
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(4);
    }
  });

  it('핵심 겹받침 단어 포함 (닭, 흙, 넓다, 값, 여덟)', () => {
    const words = PAIRS.map((p) => p.c);
    for (const w of ['닭', '흙', '넓다', '값', '여덟']) expect(words).toContain(w);
  });

  it('자주 틀리는 맞춤법 포함 (돼요, 왠지, 낳다/낫다 양방향)', () => {
    const words = PAIRS.map((p) => p.c);
    expect(words).toContain('돼요');
    expect(words).toContain('왠지');
    expect(words).toContain('낳다');
    expect(words).toContain('낫다');
  });
});

describe('징검다리 문제 생성', () => {
  it('선택지 2개에 정답 포함, 좌우 배치 랜덤', () => {
    const rng = mulberry32(51);
    const firstPositions = new Set();
    for (let i = 0; i < 100; i++) {
      const p = makeStoneProblem(rng);
      expect(p.options.length).toBe(2);
      expect(p.options).toContain(p.answer);
      firstPositions.add(p.options[0] === p.answer);
    }
    expect(firstPositions.size).toBe(2); // 정답이 왼쪽/오른쪽 모두 등장
  });
});
