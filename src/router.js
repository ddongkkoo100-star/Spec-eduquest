// 허브(DOM) ↔ 미니게임(Phaser) 라우터.
// Phaser.Game 인스턴스는 앱 수명 동안 1개만 유지 (WebGL 컨텍스트 재생성 방지).

const screens = new Map();
let game = null;
let exitHandler = null;

const hubEl = () => document.getElementById('hub');
const gameEl = () => document.getElementById('game');

export function registerScreen(name, mount) {
  screens.set(name, mount);
}

export function showScreen(name, params = {}) {
  const mount = screens.get(name);
  if (!mount) throw new Error(`unknown screen: ${name}`);
  const el = hubEl();
  el.innerHTML = '';
  el.hidden = false;
  el.style.pointerEvents = 'auto';
  gameEl().hidden = true;
  mount(el, params);
}

export async function launchGame(sceneKey, data = {}) {
  const { createGame } = await import('./scenes/index.js');
  if (!game) game = await createGame(gameEl());
  hubEl().hidden = true;
  hubEl().style.pointerEvents = 'none';
  gameEl().hidden = false;
  // 실행 중인 다른 게임 씬 정지 후 대상 씬 시작
  game.scene.getScenes(true).forEach((s) => s.scene.stop());
  game.scene.start(sceneKey, data);
}

/** 게임 씬에서 종료 시 호출. result: {world, id, stars, coins, levelUp} */
export function exitGame(result = {}) {
  if (game) game.scene.getScenes(true).forEach((s) => s.scene.stop());
  gameEl().hidden = true;
  hubEl().hidden = false;
  hubEl().style.pointerEvents = 'auto';
  if (exitHandler) exitHandler(result);
}

export function onGameExit(cb) {
  exitHandler = cb;
}
