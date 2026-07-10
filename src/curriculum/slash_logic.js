// K-2 띄어쓰기 슬래시 — 경계 계산과 베기 판정 기하 (순수 함수)
import { shuffle } from './rng.js';
import { SENTENCES } from './korean_db.js';

/**
 * 문장 → 슬래시 문제: 공백 제거 표시 문자열 + 정답 경계 인덱스.
 * 경계 인덱스 b = "표시 문자열에서 b번째 글자 뒤"를 벤다.
 * 예: "아기 곰" → display "아기곰", boundaries [2]
 */
export function makeSlashProblem(sentence) {
  const display = [];
  const boundaries = [];
  let prevWasSpace = false;
  for (const ch of sentence.trim()) {
    if (ch === ' ') {
      prevWasSpace = true;
      continue;
    }
    if (prevWasSpace && display.length > 0) boundaries.push(display.length);
    prevWasSpace = false;
    display.push(ch);
  }
  return { original: sentence.trim(), display: display.join(''), boundaries };
}

/**
 * 베기 판정: 베기 x좌표가 어느 경계에 명중했는지.
 * 경계 b의 x = startX + b * charW. 허용 오차 = 글자폭의 40% (스펙 §5 K-2).
 * @returns {number} 명중한 경계 인덱스(불변 배열 기준) 또는 -1
 */
export function judgeCut(cutX, startX, charW, boundaries, tolerance = 0.4) {
  let best = -1;
  let bestDist = Infinity;
  for (let i = 0; i < boundaries.length; i++) {
    const bx = startX + boundaries[i] * charW;
    const d = Math.abs(cutX - bx);
    if (d <= charW * tolerance && d < bestDist) {
      best = i;
      bestDist = d;
    }
  }
  return best;
}

/** 세로 베기 인식: 포인터 궤적이 충분히 수직인가 */
export function isVerticalSwipe(dx, dy, minDy = 50, maxRatio = 0.7) {
  return Math.abs(dy) >= minDy && Math.abs(dx) <= Math.abs(dy) * maxRatio;
}

export function eojeolCount(sentence) {
  return sentence.trim().split(/\s+/).length;
}

/** 레벨 → 어절 수/속도 (2어절 → 3~4어절 → 속도 상승) */
export function slashLevelSpec(level) {
  if (level <= 2) return { minWords: 2, maxWords: 2, speed: 70 };
  if (level <= 4) return { minWords: 3, maxWords: 4, speed: 80 };
  if (level <= 6) return { minWords: 2, maxWords: 4, speed: 100 };
  return { minWords: 2, maxWords: 4, speed: 115 + (level - 7) * 10 };
}

/**
 * 레벨에 맞는 출제 문장 목록. extra(급수표 문장 재활용)를 합쳐 필터링.
 */
export function sentencesForLevel(level, extra = [], rand = Math.random) {
  const spec = slashLevelSpec(level);
  const pool = [...SENTENCES, ...extra].filter((s) => {
    const n = eojeolCount(s);
    return n >= spec.minWords && n <= spec.maxWords;
  });
  return shuffle(pool.length ? pool : SENTENCES.filter((s) => eojeolCount(s) === 2), rand);
}
