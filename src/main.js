// 부트스트랩: 진행도/설정 로드 → 화면 등록 → 타이틀
import './style.css';
import * as store from './store.js';
import * as router from './router.js';
import * as sfx from './sfx.js';
import { toast } from './ui.js';
import { mountTitle } from './hub/title.js';
import { mountWorldMap } from './hub/worldmap.js';
import { mountShop } from './hub/shop.js';
import { mountParent } from './hub/parent.js';

router.registerScreen('title', mountTitle);
router.registerScreen('worldmap', mountWorldMap);
router.registerScreen('shop', mountShop);
router.registerScreen('parent', mountParent);

// 게임 종료 → 보상 반영 → 월드맵 복귀
router.onGameExit((result) => {
  if (result && result.world && result.id) {
    const r = store.recordStageClear(result.world, result.id, result);
    if (r.streakReward) {
      toast('🔥 7일 연속 달성! 특별 스킨 "불꽃 왕관"을 받았어요! 👑');
      sfx.play('levelup');
    }
  }
  router.showScreen('worldmap');
});

// 설정 반영
sfx.setMuted(store.getSettings().muted);
store.getProgress();
router.showScreen('title');

// PWA 서비스워커 (Phase 6에서 sw.js 생성 — 프로덕션 빌드에만 존재)
if ('serviceWorker' in navigator && !import.meta.env.DEV) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
