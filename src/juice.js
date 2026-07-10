// 게임 주스(J1~J10) 공용 유틸.
// Phaser를 import하지 않는다 — scene 객체를 덕타이핑으로 사용 (로직 부분은 노드 환경에서 테스트 가능).
import * as sfx from './sfx.js';

// ---------- 순수 로직 (테스트 대상) ----------

/** 콤보 칭찬 배너 문구 (3콤보부터) */
export function bannerFor(count) {
  if (count >= 10) return '전설이야!!!';
  if (count >= 7) return '최고야!!!';
  if (count >= 5) return '대단해!!';
  if (count >= 3) return '굉장해!';
  return null;
}

export class ComboTracker {
  constructor() {
    this.count = 0;
    this.best = 0;
  }
  hit() {
    this.count += 1;
    this.best = Math.max(this.best, this.count);
    return { count: this.count, banner: bannerFor(this.count) };
  }
  reset() {
    this.count = 0;
  }
}

/** J10: 전 씬 공유 파티클 예산 — 동시 상한 100개 */
export class ParticleBudget {
  constructor(max = 100) {
    this.max = max;
    this.active = 0;
  }
  request(n) {
    const granted = Math.max(0, Math.min(n, this.max - this.active));
    this.active += granted;
    return granted;
  }
  release(n) {
    this.active = Math.max(0, this.active - n);
  }
}

export const particleBudget = new ParticleBudget(100);

// ---------- Phaser 씬 헬퍼 ----------

export const SPARK_KEY = 'eq-spark';

/** Boot 씬에서 1회 호출: 파티클/공용 텍스처 생성 */
export function ensureTextures(scene) {
  if (scene.textures.exists(SPARK_KEY)) return;
  const g = scene.add.graphics();
  g.fillStyle(0xffffff, 1);
  g.fillCircle(6, 6, 6);
  g.generateTexture(SPARK_KEY, 12, 12);
  g.destroy();
}

/**
 * 씬에 juice API 부착. create()에서 호출.
 * 반환 api: burst, floatText, shake, slowmo, combo(hit/reset 시 배너·사운드 포함), fadeIn, fadeOutTo
 */
export function attachJuice(scene) {
  ensureTextures(scene);

  const emitter = scene.add.particles(0, 0, SPARK_KEY, {
    speed: { min: 120, max: 380 },
    angle: { min: 0, max: 360 },
    scale: { start: 1, end: 0 },
    lifespan: { min: 350, max: 700 },
    gravityY: 500,
    emitting: false,
  });
  emitter.setDepth(1000);

  const combo = new ComboTracker();
  let banner = null;

  const api = {
    combo,

    /** J1: 파티클 버스트 (예산 가드 포함) */
    burst(x, y, { count = 22, tint = 0xffd54f } = {}) {
      const granted = particleBudget.request(count);
      if (granted <= 0) return;
      emitter.particleTint = tint;
      emitter.explode(granted, x, y);
      scene.time.delayedCall(750, () => particleBudget.release(granted));
    },

    /** J1: 플로팅 텍스트 (+10 등) */
    floatText(x, y, str, { color = '#ffd54f', size = 34 } = {}) {
      const t = scene.add
        .text(x, y, str, {
          fontFamily: 'Pretendard, sans-serif',
          fontSize: `${size}px`,
          fontStyle: 'bold',
          color,
          stroke: '#000',
          strokeThickness: 5,
        })
        .setOrigin(0.5)
        .setDepth(1001);
      scene.tweens.add({
        targets: t,
        y: y - 80,
        alpha: 0,
        duration: 750,
        ease: 'Cubic.easeOut',
        onComplete: () => t.destroy(),
      });
      return t;
    },

    /** J3: 화면 흔들림 */
    shake(ms = 150, intensity = 0.012) {
      scene.cameras.main.shake(ms, intensity);
    },

    /** J8: 슬로우모션 — 0.3배속 400ms 후 복귀 (실시간 기준) */
    slowmo(scale = 0.3, realMs = 400) {
      scene.time.timeScale = scale;
      scene.tweens.timeScale = scale;
      if (scene.physics && scene.physics.world) scene.physics.world.timeScale = 1 / scale;
      setTimeout(() => {
        if (!scene.sys || scene.sys.isDestroyed) return;
        scene.time.timeScale = 1;
        scene.tweens.timeScale = 1;
        if (scene.physics && scene.physics.world) scene.physics.world.timeScale = 1;
      }, realMs);
    },

    /** J1+J2: 정답 한 방 처리 — 버스트+코인 텍스트+콤보 배너+피치 상승음 */
    correct(x, y, { coins = 10 } = {}) {
      const { count, banner: msg } = combo.hit();
      api.burst(x, y, { count: 18 + Math.min(12, count * 2) });
      api.floatText(x, y - 30, `+${coins}`, { color: '#ffd54f' });
      sfx.play('coin', { combo: count });
      if (msg) api.showBanner(`${count}콤보! ${msg}`);
      return count;
    },

    /** J3: 오답 한 방 처리 — 셰이크+둔탁음+콤보 리셋 */
    incorrect() {
      combo.reset();
      api.shake();
      sfx.play('wrong');
      api.hideBanner();
    },

    /** J2: 콤보 배너 */
    showBanner(msg) {
      api.hideBanner();
      const w = scene.scale.width;
      banner = scene.add
        .text(w / 2, 70, msg, {
          fontFamily: 'Pretendard, sans-serif',
          fontSize: '40px',
          fontStyle: 'bold',
          color: '#fff176',
          stroke: '#e65100',
          strokeThickness: 8,
        })
        .setOrigin(0.5)
        .setDepth(1002)
        .setScale(0.3);
      scene.tweens.add({ targets: banner, scale: 1, duration: 250, ease: 'Back.easeOut' });
      const ref = banner;
      scene.time.delayedCall(1100, () => {
        if (ref && ref.active) {
          scene.tweens.add({ targets: ref, alpha: 0, duration: 250, onComplete: () => ref.destroy() });
        }
      });
    },

    hideBanner() {
      if (banner && banner.active) banner.destroy();
      banner = null;
    },

    /** J4: 페이드 인 (씬 시작 시) */
    fadeIn(ms = 300) {
      scene.cameras.main.fadeIn(ms, 26, 35, 64);
    },

    /** J4: 페이드 아웃 후 콜백 */
    fadeOutTo(cb, ms = 300) {
      scene.cameras.main.fadeOut(ms, 26, 35, 64);
      scene.cameras.main.once('camerafadeoutcomplete', cb);
    },
  };

  return api;
}

/**
 * J6: 스테이지 클리어 오버레이 — 별 순차 등장 + 코인 롤링 + 폭죽. 전 게임 공유.
 * @param {{stars:number, coins:number, title?:string, onDone:Function}} opts
 */
export function showStageClear(scene, juice, { stars = 3, coins = 50, title = '스테이지 클리어!', onDone }) {
  const w = scene.scale.width;
  const h = scene.scale.height;
  const cx = w / 2;

  const dim = scene.add.rectangle(cx, h / 2, w, h, 0x000000, 0.55).setDepth(1100);
  const panel = scene.add.rectangle(cx, h / 2, 560, 420, 0x26305a, 1).setDepth(1101);
  panel.setStrokeStyle(6, 0x4f8cff);
  const titleT = scene.add
    .text(cx, h / 2 - 150, title, {
      fontFamily: 'Pretendard, sans-serif', fontSize: '44px', fontStyle: 'bold', color: '#fff',
    })
    .setOrigin(0.5)
    .setDepth(1102);

  const objs = [dim, panel, titleT];

  // 별 1~3개 순차 등장
  const starObjs = [];
  for (let i = 0; i < 3; i++) {
    const s = scene.add
      .text(cx + (i - 1) * 110, h / 2 - 55, '⭐', { fontSize: '72px' })
      .setOrigin(0.5)
      .setDepth(1102)
      .setScale(0)
      .setAlpha(i < stars ? 1 : 0.22);
    starObjs.push(s);
    objs.push(s);
    scene.time.delayedCall(300 + i * 350, () => {
      scene.tweens.add({ targets: s, scale: 1, duration: 280, ease: 'Back.easeOut' });
      if (i < stars) {
        sfx.play('star');
        juice.burst(s.x, s.y, { count: 14 });
      }
    });
  }

  // 코인 카운트업 롤링
  const coinT = scene.add
    .text(cx, h / 2 + 45, '🪙 +0', {
      fontFamily: 'Pretendard, sans-serif', fontSize: '40px', fontStyle: 'bold', color: '#ffd54f',
    })
    .setOrigin(0.5)
    .setDepth(1102);
  objs.push(coinT);
  scene.tweens.addCounter({
    from: 0,
    to: coins,
    duration: 800,
    delay: 1400,
    onUpdate: (tw) => coinT.setText(`🪙 +${Math.round(tw.getValue())}`),
    onComplete: () => sfx.play('coin'),
  });

  // 폭죽
  scene.time.delayedCall(1500, () => {
    juice.burst(cx - 180, h / 2 - 190, { count: 25 });
    juice.burst(cx + 180, h / 2 - 190, { count: 25 });
  });

  // 확인 버튼
  scene.time.delayedCall(2300, () => {
    const btn = scene.add
      .text(cx, h / 2 + 140, '  확인  ', {
        fontFamily: 'Pretendard, sans-serif', fontSize: '34px', fontStyle: 'bold',
        color: '#fff', backgroundColor: '#2ea24f', padding: { x: 26, y: 14 },
      })
      .setOrigin(0.5)
      .setDepth(1102)
      .setInteractive({ useHandCursor: true });
    objs.push(btn);
    btn.on('pointerdown', () => btn.setScale(0.95));
    btn.on('pointerup', () => {
      sfx.play('pop');
      objs.forEach((o) => o.destroy());
      if (onDone) onDone();
    });
  });
}

/** J9: 레벨업 팝업 + 광선 이펙트 */
export function showLevelUp(scene, juice, level, onDone) {
  const w = scene.scale.width;
  const h = scene.scale.height;
  const cx = w / 2;
  const cy = h / 2;

  const rays = [];
  for (let i = 0; i < 10; i++) {
    const ray = scene.add
      .rectangle(cx, cy, 900, 26, 0xfff176, 0.35)
      .setDepth(1099)
      .setRotation((Math.PI * 2 * i) / 10);
    rays.push(ray);
  }
  scene.tweens.add({ targets: rays, rotation: '+=0.9', duration: 1600, ease: 'Linear' });

  const t = scene.add
    .text(cx, cy, `레벨 업!\nLv.${level}`, {
      fontFamily: 'Pretendard, sans-serif', fontSize: '60px', fontStyle: 'bold',
      color: '#fff176', stroke: '#e65100', strokeThickness: 10, align: 'center',
    })
    .setOrigin(0.5)
    .setDepth(1100)
    .setScale(0.2);
  scene.tweens.add({ targets: t, scale: 1, duration: 400, ease: 'Back.easeOut' });
  sfx.play('levelup');
  juice.burst(cx, cy - 100, { count: 30 });

  scene.time.delayedCall(1700, () => {
    rays.forEach((r) => r.destroy());
    t.destroy();
    if (onDone) onDone();
  });
}
