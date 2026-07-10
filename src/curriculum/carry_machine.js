// M-3 블록 연산 — 받아올림/받아내림 상태 머신 (순수 함수).
// 나무블록(일) 10개 = 다이아(십) 1개 = ... 의 합체/분해가 핵심 메커닉.
import { pick } from './rng.js';

export const COLS = ['ones', 'tens', 'hundreds'];

const digitsOf = (n) => ({
  ones: n % 10,
  tens: Math.floor(n / 10) % 10,
  hundreds: Math.floor(n / 100) % 10,
});

/** 열 상태의 총값 */
export function valueOf(cols) {
  return cols.ones + cols.tens * 10 + (cols.hundreds || 0) * 100;
}

// ---------- 덧셈 (받아올림) ----------
export function initAdd(a, b) {
  const da = digitsOf(a);
  const db = digitsOf(b);
  return {
    op: 'add', a, b, answer: a + b,
    cols: {
      ones: da.ones + db.ones,
      tens: da.tens + db.tens,
      hundreds: da.hundreds + db.hundreds,
    },
  };
}

/** 해당 열이 10개 이상이면 합체 가능 (받아올림) */
export function canMerge(state, col) {
  return col !== 'hundreds' && state.cols[col] >= 10;
}

/** 10개 합체 → 윗자리 1개. 불가능하면 null */
export function merge10(state, col) {
  if (!canMerge(state, col)) return null;
  const idx = COLS.indexOf(col);
  const upper = COLS[idx + 1];
  const cols = { ...state.cols, [col]: state.cols[col] - 10, [upper]: state.cols[upper] + 1 };
  return { ...state, cols };
}

/** 모든 열이 0~9 → 정리 완료 (읽을 수 있는 상태) */
export function isResolved(state) {
  return COLS.every((c) => state.cols[c] >= 0 && state.cols[c] <= 9);
}

// ---------- 뺄셈 (받아내림) ----------
export function initSub(a, b) {
  const da = digitsOf(a);
  const db = digitsOf(b);
  return {
    op: 'sub', a, b, answer: a - b,
    cols: { ...da },     // 가진 블록
    need: { ...db },     // 빼야 할 블록
  };
}

/** 해당 열에서 빼기에 부족하면 받아내림 필요 */
export function needsBorrow(state, col) {
  return state.op === 'sub' && state.cols[col] < state.need[col];
}

/** 윗자리 1개 → 이 열 10개로 분해 (받아내림). 불가능하면 null */
export function split10(state, col) {
  const idx = COLS.indexOf(col);
  const upper = COLS[idx + 1];
  if (!upper || state.cols[upper] <= 0) return null;
  const cols = { ...state.cols, [col]: state.cols[col] + 10, [upper]: state.cols[upper] - 1 };
  return { ...state, cols };
}

/** 모든 열이 충분해졌을 때 빼기 실행 → 결과 열 상태. 부족하면 null */
export function applySub(state) {
  if (COLS.some((c) => state.cols[c] < state.need[c])) return null;
  const cols = {};
  for (const c of COLS) cols[c] = state.cols[c] - state.need[c];
  return { ...state, cols, need: { ones: 0, tens: 0, hundreds: 0 } };
}

// ---------- 레벨 곡선 (스펙 §4 M-3) ----------
// 받아올림 없는 두 자리 → 받아올림 1회 → 받아내림 → 세 자리(3학년) → 나눗셈 기초
export function blockTier(level) {
  if (level <= 2) return 'add-nocarry';
  if (level <= 4) return 'add-carry';
  if (level <= 6) return 'sub-borrow';
  if (level <= 8) return 'three-digit';
  return 'divide';
}

export function makeBlockProblem(level, rand = Math.random) {
  const tier = blockTier(level);
  const ri = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

  if (tier === 'add-nocarry') {
    // 일의 자리 합 < 10, 십의 자리 합 < 10
    const o1 = ri(1, 8);
    const o2 = ri(1, 9 - o1);
    const t1 = ri(1, 7);
    const t2 = ri(1, 8 - t1);
    const a = t1 * 10 + o1;
    const b = t2 * 10 + o2;
    return { tier, op: 'add', a, b, answer: a + b, prompt: `${a} + ${b} = ?` };
  }
  if (tier === 'add-carry') {
    // 일의 자리 합 ≥ 10 (받아올림 1회), 결과 < 100
    const o1 = ri(2, 9);
    const o2 = ri(10 - o1, 9);
    const t1 = ri(1, 7);
    const t2 = ri(1, 8 - t1); // 십의 자리 합 + 1 ≤ 9
    const a = t1 * 10 + o1;
    const b = t2 * 10 + o2;
    return { tier, op: 'add', a, b, answer: a + b, prompt: `${a} + ${b} = ?` };
  }
  if (tier === 'sub-borrow') {
    // 일의 자리 부족 → 받아내림 1회
    const o1 = ri(0, 8);
    const o2 = ri(o1 + 1, 9);
    const t1 = ri(2, 9);
    const t2 = ri(1, t1 - 1);
    const a = t1 * 10 + o1;
    const b = t2 * 10 + o2;
    return { tier, op: 'sub', a, b, answer: a - b, prompt: `${a} − ${b} = ?` };
  }
  if (tier === 'three-digit') {
    const isAdd = rand() < 0.5;
    if (isAdd) {
      const a = ri(120, 780);
      const b = ri(110, 990 - a > 110 ? 990 - a : 110);
      return { tier, op: 'add', a, b, answer: a + b, prompt: `${a} + ${b} = ?` };
    }
    const a = ri(300, 980);
    const b = ri(110, a - 110);
    return { tier, op: 'sub', a, b, answer: a - b, prompt: `${a} − ${b} = ?` };
  }
  // divide: 블록 똑같이 나누기 (나머지 0)
  const q = ri(2, 9);
  const d = pick([2, 3, 4, 5], rand);
  const a = q * d;
  return { tier, op: 'div', a, b: d, answer: q, prompt: `${a}개를 ${d}명이 똑같이 나누면 한 명에 몇 개?` };
}
