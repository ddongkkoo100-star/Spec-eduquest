// 미니게임 카탈로그 — 페이즈 진행에 따라 ready를 켠다.
export const GAMES = [
  { world: 'math', id: 'm1', name: '구구단 러너', icon: '🏃', grad: 'linear-gradient(160deg,#ff8a5c,#e0522f)', kind: 'phaser', scene: 'm1', ready: true },
  { world: 'math', id: 'm2', name: '시계 폭탄 해제', icon: '⏰', grad: 'linear-gradient(160deg,#7c6cff,#4a3ad1)', kind: 'phaser', scene: 'm2', ready: true },
  { world: 'math', id: 'm3', name: '블록 연산', icon: '⛏️', grad: 'linear-gradient(160deg,#5cb85c,#2e8b3a)', kind: 'phaser', scene: 'm3', ready: true },
  { world: 'math', id: 'm4', name: '길이 다리 건설', icon: '🌉', grad: 'linear-gradient(160deg,#37b6d9,#1f7fa8)', kind: 'phaser', scene: 'm4', ready: true },
  { world: 'korean', id: 'k1', name: '받아쓰기 스튜디오', icon: '🎙️', grad: 'linear-gradient(160deg,#ff6f9c,#d13a6a)', kind: 'dom', scene: 'k1', ready: true },
  { world: 'korean', id: 'k2', name: '띄어쓰기 슬래시', icon: '⚔️', grad: 'linear-gradient(160deg,#ffb84d,#e0812f)', kind: 'phaser', scene: 'k2', ready: true },
  { world: 'korean', id: 'k3', name: '겹받침 징검다리', icon: '🐸', grad: 'linear-gradient(160deg,#4dd0a6,#2a9d76)', kind: 'phaser', scene: 'k3', ready: true },
];

export function getGameDef(id) {
  return GAMES.find((g) => g.id === id);
}
