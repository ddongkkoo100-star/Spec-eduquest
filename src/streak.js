// 일일 스트릭 날짜 로직 — 순수 함수 (단위 테스트 대상)
export const STREAK_REWARD_DAYS = 7;
export const STREAK_REWARD_SKIN = 'flame_crown';

export function todayStr(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

function parseDay(s) {
  const [y, m, d] = String(s).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

// b - a 일수 차이 (양수 = b가 미래)
export function dayDiff(a, b) {
  return Math.round((parseDay(b) - parseDay(a)) / 86400000);
}

/**
 * 스테이지 클리어 시 스트릭 갱신.
 * @param {{count:number,lastDate:string|null}} streak
 * @param {string} today 'YYYY-MM-DD'
 * @returns {{streak:{count:number,lastDate:string}, changed:boolean, rewardEarned:boolean}}
 */
export function applyStreak(streak, today) {
  const cur = streak && streak.lastDate ? streak : null;
  if (!cur) {
    return { streak: { count: 1, lastDate: today }, changed: true, rewardEarned: false };
  }
  const diff = dayDiff(cur.lastDate, today);
  if (diff === 0) {
    return { streak: { ...cur }, changed: false, rewardEarned: false };
  }
  if (diff === 1) {
    const count = cur.count + 1;
    return { streak: { count, lastDate: today }, changed: true, rewardEarned: count === STREAK_REWARD_DAYS };
  }
  // 하루 이상 건너뜀 또는 기기 시계 역행 → 1부터 다시
  return { streak: { count: 1, lastDate: today }, changed: true, rewardEarned: false };
}
