import { describe, it, expect } from 'vitest';
import {
  newMistake, applyGrade, topMistakes, GRADUATE_STREAK,
  recordWrong, recordRetryResult, listMistakes,
} from '../src/curriculum/mistakes.js';
import { idbClear } from '../src/store.js';

describe('오답노트 순수 로직', () => {
  it('신규 오답 항목 기본값', () => {
    const m = newMistake('학교에 가요.');
    expect(m.wrongCount).toBe(1);
    expect(m.consecutiveCorrect).toBe(0);
  });

  it('또 틀리면 wrongCount 증가 + 연속 정답 리셋', () => {
    const m = { text: 'x', wrongCount: 1, consecutiveCorrect: 1 };
    const { entry, graduated } = applyGrade(m, false);
    expect(entry.wrongCount).toBe(2);
    expect(entry.consecutiveCorrect).toBe(0);
    expect(graduated).toBe(false);
  });

  it('1회 정답으로는 졸업 아님', () => {
    const { graduated, entry } = applyGrade(newMistake('x'), true);
    expect(graduated).toBe(false);
    expect(entry.consecutiveCorrect).toBe(1);
  });

  it('2회 연속 정답 → 졸업', () => {
    const once = applyGrade(newMistake('x'), true).entry;
    const { graduated } = applyGrade(once, true);
    expect(graduated).toBe(true);
    expect(GRADUATE_STREAK).toBe(2);
  });

  it('⭕→❌→⭕ 는 졸업 아님 (연속이어야 함)', () => {
    let e = applyGrade(newMistake('x'), true).entry;
    e = applyGrade(e, false).entry;
    const { graduated } = applyGrade(e, true);
    expect(graduated).toBe(false);
  });

  it('Top5는 틀린 횟수 내림차순', () => {
    const entries = [
      { text: 'a', wrongCount: 2 },
      { text: 'b', wrongCount: 7 },
      { text: 'c', wrongCount: 4 },
    ];
    expect(topMistakes(entries, 2).map((m) => m.text)).toEqual(['b', 'c']);
  });
});

describe('오답노트 IndexedDB 연동', () => {
  it('recordWrong: 신규 등록 후 재오답 시 누적', async () => {
    await idbClear('mistakes');
    await recordWrong('바닷가에 갔어요.');
    const again = await recordWrong('바닷가에 갔어요.');
    expect(again.wrongCount).toBe(2);
    expect((await listMistakes()).length).toBe(1);
  });

  it('recordRetryResult: 2연속 정답 시 노트에서 제거 + 졸업 연출 플래그', async () => {
    await idbClear('mistakes');
    await recordWrong('모래성을 쌓았어요.');
    expect((await recordRetryResult('모래성을 쌓았어요.', true)).graduated).toBe(false);
    const r2 = await recordRetryResult('모래성을 쌓았어요.', true);
    expect(r2.graduated).toBe(true);
    expect((await listMistakes()).length).toBe(0);
  });

  it('recordRetryResult: 틀리면 연속 카운터 리셋되어 계속 남음', async () => {
    await idbClear('mistakes');
    await recordWrong('하늘이 파래요.');
    await recordRetryResult('하늘이 파래요.', true);
    await recordRetryResult('하늘이 파래요.', false);
    const r = await recordRetryResult('하늘이 파래요.', true);
    expect(r.graduated).toBe(false);
    expect((await listMistakes()).length).toBe(1);
  });

  it('없는 문장 채점은 무해', async () => {
    const r = await recordRetryResult('등록 안 된 문장', true);
    expect(r.graduated).toBe(false);
    expect(r.entry).toBeNull();
  });
});
