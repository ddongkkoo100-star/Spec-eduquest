// Phaser 게임 인스턴스 생성 — 미니게임 첫 진입 시 1회만 실행.
import Phaser from 'phaser';
import Boot from './Boot.js';
import RunnerScene from './m1_runner/RunnerScene.js';
import ClockScene from './m2_clock/ClockScene.js';
import BlocksScene from './m3_blocks/BlocksScene.js';
import BridgeScene from './m4_bridge/BridgeScene.js';
import SlashScene from './k2_slash/SlashScene.js';
import StonesScene from './k3_stones/StonesScene.js';

// 각 페이즈에서 게임 씬을 여기에 추가한다.
const GAME_SCENES = [RunnerScene, ClockScene, BlocksScene, BridgeScene, SlashScene, StonesScene];

export async function createGame(parent) {
  return new Promise((resolve) => {
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width: 1280,
      height: 800,
      backgroundColor: '#1a2340',
      roundPixels: true,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      input: { activePointers: 2 },
      scene: [Boot, ...GAME_SCENES],
      callbacks: {
        postBoot: () => resolve(game),
      },
    });
  });
}

export function registerSceneClass(cls) {
  GAME_SCENES.push(cls);
}
