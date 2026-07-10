// 받아쓰기 오답노트 — 등록/채점/졸업(2회 연속 ⭕) 로직.
// 순수 로직과 IndexedDB 저장을 분리해 순수 부분을 단위 테스트한다.
import { idbPut, idbGet, idbAll, idbDelete } from '../store.js';

export const GRADUATE_STREAK = 2;

/** 새 오답 항목 */
export function newMistake(text, meta = {}) {
  return { text, wrongCount: 1, consecutiveCorrect: 0, ...meta };
}

/**
 * 오답노트 항목 채점 결과 반영 (순수 함수).
 * @returns {{entry:object, graduated:boolean}}
 */
export function applyGrade(entry, correct) {
  if (correct) {
    const consecutiveCorrect = entry.consecutiveCorrect + 1;
    return {
      entry: { ...entry, consecutiveCorrect },
      graduated: consecutiveCorrect >= GRADUATE_STREAK,
    };
  }
  return {
    entry: { ...entry, wrongCount: entry.wrongCount + 1, consecutiveCorrect: 0 },
    graduated: false,
  };
}

/** 자주 틀리는 문장 Top N (부모 통계) */
export function topMistakes(entries, n = 5) {
  return [...entries].sort((a, b) => b.wrongCount - a.wrongCount).slice(0, n);
}

// ---------- IndexedDB 연동 ----------

/** ❌ 채점 시 호출: 신규 등록 또는 오답 횟수 증가 */
export async function recordWrong(text, meta = {}) {
  const existing = await idbGet('mistakes', text);
  const entry = existing ? applyGrade(existing, false).entry : newMistake(text, meta);
  await idbPut('mistakes', entry);
  return entry;
}

/** "다시 도전"에서 ⭕ 채점 시 호출. 졸업하면 노트에서 제거 */
export async function recordRetryResult(text, correct) {
  const existing = await idbGet('mistakes', text);
  if (!existing) return { graduated: false, entry: null };
  const { entry, graduated } = applyGrade(existing, correct);
  if (graduated) await idbDelete('mistakes', text);
  else await idbPut('mistakes', entry);
  return { graduated, entry };
}

export async function listMistakes() {
  return idbAll('mistakes');
}
