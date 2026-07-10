// M-4 길이 다리 건설 — 단위 변환 계산기 + 문제 생성 (순수 함수)
// 레벨 곡선: cm 단독 → cm+m 혼합·단위 변환 → mm → 들이(L/mL)·무게(kg/g)
import { pick, shuffle } from './rng.js';

// 기준 단위: 길이 mm, 들이 mL, 무게 g
export const UNITS = {
  mm: { base: 1, family: 'length' },
  cm: { base: 10, family: 'length' },
  m: { base: 1000, family: 'length' },
  km: { base: 1000000, family: 'length' },
  mL: { base: 1, family: 'volume' },
  L: { base: 1000, family: 'volume' },
  g: { base: 1, family: 'weight' },
  kg: { base: 1000, family: 'weight' },
};

export function toBase(value, unit) {
  return value * UNITS[unit].base;
}

export function convert(value, from, to) {
  if (UNITS[from].family !== UNITS[to].family) throw new Error(`단위 계열 불일치: ${from}→${to}`);
  return (value * UNITS[from].base) / UNITS[to].base;
}

/** 기준값 → 한국어 표기: 1200mm = "1m 20cm", 1500mL = "1L 500mL" */
export function fmt(base, family) {
  if (family === 'length') {
    if (base >= 1000) {
      const m = Math.floor(base / 1000);
      const cm = Math.round((base % 1000) / 10);
      return cm > 0 ? `${m}m ${cm}cm` : `${m}m`;
    }
    if (base % 10 === 0) return `${base / 10}cm`;
    const cm = Math.floor(base / 10);
    const mm = base % 10;
    return cm > 0 ? `${cm}cm ${mm}mm` : `${mm}mm`;
  }
  const big = family === 'volume' ? 'L' : 'kg';
  const small = family === 'volume' ? 'mL' : 'g';
  if (base >= 1000) {
    const l = Math.floor(base / 1000);
    const rest = base % 1000;
    return rest > 0 ? `${l}${big} ${rest}${small}` : `${l}${big}`;
  }
  return `${base}${small}`;
}

export function sumStatus(currentBase, targetBase) {
  if (currentBase === targetBase) return 'exact';
  return currentBase < targetBase ? 'under' : 'over';
}

// 레벨 → 테마/조각 팔레트
export function lengthLevelSpec(level) {
  if (level <= 2) return { theme: 'bridge', family: 'length', palette: [100, 200, 300, 500], label: (b) => `${b / 10}cm` }; // 10~50cm
  if (level <= 5) return { theme: 'bridge', family: 'length', palette: [100, 200, 300, 500, 1000], label: (b) => fmt(b, 'length') }; // +1m
  if (level <= 7) return { theme: 'bridge', family: 'length', palette: [5, 30, 50, 100, 500], label: (b) => fmt(b, 'length') }; // mm 개념
  if (level <= 9) return { theme: 'water', family: 'volume', palette: [100, 200, 300, 500, 1000], label: (b) => fmt(b, 'volume') };
  return { theme: 'scale', family: 'weight', palette: [100, 200, 300, 500, 1000], label: (b) => fmt(b, 'weight') };
}

/**
 * 문제 생성: 팔레트에서 3~4조각을 뽑아 목표를 만들므로 항상 풀 수 있다.
 * @returns {{theme,family,targetBase,targetLabel,solution:number[],pieces:{base:number,label:string}[]}}
 */
export function makeLengthProblem(level, rand = Math.random) {
  const spec = lengthLevelSpec(level);
  const n = 3 + (rand() < 0.5 ? 1 : 0);
  const solution = [];
  for (let i = 0; i < n; i++) solution.push(pick(spec.palette, rand));
  const targetBase = solution.reduce((a, b) => a + b, 0);

  const themePrompt = {
    bridge: (t) => `다리 길이 ${t}가 필요해!`,
    water: (t) => `물통에 물 ${t}를 채워요!`,
    scale: (t) => `저울에 ${t}를 올려 균형을 맞춰요!`,
  };

  return {
    theme: spec.theme,
    family: spec.family,
    targetBase,
    targetLabel: fmt(targetBase, spec.family),
    prompt: themePrompt[spec.theme](fmt(targetBase, spec.family)),
    solution,
    pieces: shuffle(spec.palette, rand).map((b) => ({ base: b, label: spec.label(b) })),
  };
}
