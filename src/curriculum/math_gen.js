// M-1 구구단 러너 문제 생성기 — 순수 함수 (Phaser 의존 없음)
// 레벨 곡선 (스펙 §4 M-1):
//   1~4  : 2, 5, 3, 4단 순차 도입   5~8  : 6, 7, 8, 9단 순차 도입
//   9~11 : 전체 랜덤 + 역방향(? × 7 = 56)
//   12~14: 두 자리 × 한 자리 (키패드 입력)   15+ : 전체 혼합 + 시간 단축
import { pick, shuffle, weightedPick } from './rng.js';

const INTRO_ORDER = [2, 5, 3, 4, 6, 7, 8, 9];
export const PROBLEMS_PER_STAGE = 10;

export function tablesFor(level) {
  const n = Math.min(Math.max(1, level), 8);
  return { focus: level <= 8 ? INTRO_ORDER[n - 1] : null, pool: INTRO_ORDER.slice(0, n) };
}

export function modeFor(level) {
  if (level <= 8) return 'tables';
  if (level <= 11) return 'mixed';
  if (level <= 14) return 'twodigit';
  return 'all';
}

/** 제한시간(초): 레벨 따라 6→3초 */
export function timeSec(level) {
  const base = 6 - 0.2 * (level - 1);
  return Math.max(3, Math.min(6, Math.round(base * 10) / 10));
}

/** 오답 후 가중치 갱신: 오답=3배, 정답 시 1까지 감쇠 */
export function nextWeight(current, correct) {
  const w = current || 1;
  return correct ? Math.max(1, w - 1) : 3;
}

/** 근접 오답지 3개 + 정답 → 4지선다 (전부 유일, 양수) */
export function makeChoices(answer, a, b, rand = Math.random) {
  const cands = [
    (a + 1) * b, (a - 1) * b, a * (b + 1), a * (b - 1),
    answer + a, answer - a, answer + b, answer - b,
    answer + 10, answer - 10, answer + 1, answer - 1,
  ];
  const uniq = [...new Set(cands)].filter((v) => v > 0 && v !== answer);
  const picked = shuffle(uniq, rand).slice(0, 3);
  let filler = answer + 2;
  while (picked.length < 3) {
    if (!picked.includes(filler) && filler !== answer && filler > 0) picked.push(filler);
    filler += 3;
  }
  return shuffle([answer, ...picked], rand);
}

/** 역방향(? × b = c)의 선택지: 빠진 인수 근처 값 */
export function makeFactorChoices(a, rand = Math.random) {
  const cands = [a - 2, a - 1, a + 1, a + 2, a + 3].filter((v) => v >= 1 && v <= 12 && v !== a);
  const picked = shuffle(cands, rand).slice(0, 3);
  return shuffle([a, ...picked], rand);
}

/**
 * 레벨과 약점 가중치에 따라 문제 1개 생성.
 * @param {number} level
 * @param {Record<string, number>} weakness key 'AxB' → weight
 * @param {Function} rand
 * @returns {{kind:string,a:number,b:number,answer:number,key:string,prompt:string,input:'choices'|'keypad',choices:number[]|null}}
 */
export function makeProblem(level, weakness = {}, rand = Math.random) {
  const mode = modeFor(level);
  let kind;
  if (mode === 'tables') kind = 'gugudan';
  else if (mode === 'mixed') kind = rand() < 0.4 ? 'reverse' : 'gugudan';
  else if (mode === 'twodigit') kind = 'twodigit';
  else kind = pick(['gugudan', 'reverse', 'twodigit'], rand);

  if (kind === 'twodigit') {
    const a = 11 + Math.floor(rand() * 89); // 11~99
    const b = 2 + Math.floor(rand() * 8); // 2~9
    const answer = a * b;
    return {
      kind, a, b, answer, key: `${a}x${b}`,
      prompt: `${a} × ${b} = ?`,
      input: 'keypad', choices: null,
    };
  }

  // 구구단 후보쌍: 도입된 단 전체 × 2~9, 약점 가중 샘플링 (오답 문제 3배 재등장)
  const { focus, pool } = tablesFor(level);
  const pairs = [];
  for (const t of pool) {
    for (let b = 2; b <= 9; b++) {
      // 도입 레벨(1~8)에서는 새 단(focus)에 기본 가중 2배를 줘 집중 연습
      const base = focus === t ? 2 : 1;
      pairs.push({ a: t, b, base });
    }
  }
  const chosen = weightedPick(pairs, (p) => p.base * (weakness[`${p.a}x${p.b}`] || 1), rand);
  const { a, b } = chosen;
  const answer = a * b;

  if (kind === 'reverse') {
    return {
      kind, a, b, answer, key: `${a}x${b}`,
      prompt: `? × ${b} = ${answer}`,
      input: 'choices',
      choices: makeFactorChoices(a, rand),
      choiceAnswer: a, // 역방향은 빠진 인수를 고른다
    };
  }

  return {
    kind: 'gugudan', a, b, answer, key: `${a}x${b}`,
    prompt: `${a} × ${b} = ?`,
    input: 'choices',
    choices: makeChoices(answer, a, b, rand),
    choiceAnswer: answer,
  };
}

/** 별 계산: 남은 하트 기준 (벌점 아님 — 최소 1별 보장) */
export function starsFor(hearts) {
  if (hearts >= 3) return 3;
  if (hearts === 2) return 2;
  return 1;
}
