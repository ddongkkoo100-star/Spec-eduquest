// M-2 시계 로직 — 순수 함수.
// 시계 상태는 "12시 기준 경과 분"(0~719)으로 표현한다.
// 기어비: 분침 360° = 시침 30° (분침 6°/분, 시침 0.5°/분)
import { pick } from './rng.js';

export const MIN_PER_TURN = 720; // 12시간

export function normMinutes(total) {
  return ((total % MIN_PER_TURN) + MIN_PER_TURN) % MIN_PER_TURN;
}

/** 시각 → 바늘 각도(0°=12시 방향, 시계방향) */
export function handAngles(h, m) {
  const total = normMinutes((h % 12) * 60 + m);
  return {
    minuteDeg: (total % 60) * 6,
    hourDeg: total * 0.5,
  };
}

/** 경과 분 → {h(1~12), m} */
export function timeOf(total) {
  const t = normMinutes(total);
  const h24 = Math.floor(t / 60);
  return { h: h24 === 0 ? 12 : h24, m: t % 60 };
}

/** 분 스냅 (5분/1분 단위) */
export function snapMinutes(total, snap) {
  return normMinutes(Math.round(total / snap) * snap);
}

/** 두 각도 사이 최단 부호 있는 차 (-180~180] — 12시 경계 랩어라운드 처리 */
export function angleDeltaDeg(prevDeg, nextDeg) {
  let d = (nextDeg - prevDeg) % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}

/** 분침 드래그: 이전/현재 포인터 각도로 경과 분 누적 (시침 자동 연동은 handAngles로) */
export function applyDrag(totalMinutes, prevPointerDeg, nextPointerDeg) {
  const deltaMin = angleDeltaDeg(prevPointerDeg, nextPointerDeg) / 6;
  return normMinutes(totalMinutes + deltaMin);
}

/** 정답 판정: 스냅 후 목표 시각과 일치 */
export function checkTime(totalMinutes, targetH, targetM, snap = 1) {
  const snapped = snapMinutes(totalMinutes, snap);
  return snapped === normMinutes((targetH % 12) * 60 + targetM);
}

/** 디지털 표기 "3:05" */
export function digital(h, m) {
  return `${h}:${String(m).padStart(2, '0')}`;
}

// ---------- 레벨 곡선 (스펙 §4 M-2) ----------
// L1~3 정각·30분 → L4~6 5분 단위 → L7~9 1분 단위 → L10+ 시간 계산·디지털 변환
export function clockLevelSpec(level) {
  if (level <= 3) return { snap: 30, kinds: ['set'] };
  if (level <= 6) return { snap: 5, kinds: ['set', 'digital'] };
  if (level <= 9) return { snap: 1, kinds: ['set', 'digital'] };
  return { snap: 5, kinds: ['set', 'digital', 'add'] };
}

/**
 * 문제 생성.
 * kind 'set'    : "3시 30분으로 맞춰요"
 * kind 'digital': 디지털 표기를 보고 아날로그로 맞추기
 * kind 'add'    : "지금 3시 40분, 30분 뒤는?" (시간 계산 — 3학년)
 */
export function makeClockProblem(level, rand = Math.random) {
  const spec = clockLevelSpec(level);
  const kind = pick(spec.kinds, rand);
  const h = 1 + Math.floor(rand() * 12);
  const m = spec.snap === 30 ? pick([0, 30], rand) : Math.floor(rand() * (60 / spec.snap)) * spec.snap;

  if (kind === 'add') {
    const delta = pick([10, 20, 30, 40, 60], rand);
    const baseTotal = (h % 12) * 60 + m;
    const t = timeOf(baseTotal + delta);
    return {
      kind, snap: spec.snap,
      targetH: t.h, targetM: t.m,
      prompt: `지금은 ${h}시 ${m}분! ${delta}분 뒤로 맞춰요`,
      startTotal: normMinutes(baseTotal),
    };
  }
  if (kind === 'digital') {
    return {
      kind, snap: spec.snap, targetH: h, targetM: m,
      prompt: `⌚ ${digital(h, m)} 으로 맞춰요`,
      startTotal: null,
    };
  }
  return {
    kind, snap: spec.snap, targetH: h, targetM: m,
    prompt: m === 0 ? `${h}시 정각으로 맞춰요` : `${h}시 ${m}분으로 맞춰요`,
    startTotal: null,
  };
}
