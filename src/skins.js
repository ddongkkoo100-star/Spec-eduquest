// 상점 스킨 카탈로그 — 코스메틱 전용 (게임 유불리 없음)
export const SKINS = [
  { id: 'default', name: '기본 꼬마', emoji: '🙂', price: 0 },
  { id: 'cap_red', name: '빨간 모자', emoji: '🧢', price: 150 },
  { id: 'robot', name: '로봇 친구', emoji: '🤖', price: 300 },
  { id: 'cat', name: '멋쟁이 고양이', emoji: '🐱', price: 250 },
  // 구매 불가 — 7일 스트릭 보상 전용
  { id: 'flame_crown', name: '불꽃 왕관', emoji: '👑', price: null, reward: '7일 연속 도전 보상!' },
];

export function getSkin(id) {
  return SKINS.find((s) => s.id === id) || SKINS[0];
}
