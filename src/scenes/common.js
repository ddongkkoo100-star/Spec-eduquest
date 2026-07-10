// Phaser 게임 씬 공용 헬퍼 — HUD, 선택지 버튼, 키패드, 일시정지
import * as sfx from '../sfx.js';
import * as router from '../router.js';
import * as store from '../store.js';
import { getSkin } from '../skins.js';

export const W = 1280;
export const H = 800;

const FONT = 'Pretendard, sans-serif';

export function label(scene, x, y, text, size = 26, color = '#fff', style = {}) {
  return scene.add
    .text(x, y, text, {
      fontFamily: FONT, fontSize: `${size}px`, fontStyle: 'bold', color,
      stroke: style.stroke || null, strokeThickness: style.strokeThickness || 0,
      align: 'center', ...style,
    })
    .setOrigin(0.5);
}

/** 큰 터치 버튼 (Phaser 텍스트 기반, 눌림 scale 0.95 — J5) */
export function bigButton(scene, x, y, text, onTap, { size = 34, bg = '#2f6ae0', padX = 30, padY = 16, minW = 0 } = {}) {
  const t = scene.add
    .text(x, y, text, {
      fontFamily: FONT, fontSize: `${size}px`, fontStyle: 'bold', color: '#fff',
      backgroundColor: bg, padding: { x: padX, y: padY }, align: 'center',
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });
  if (minW && t.width < minW) t.setFixedSize(minW, t.height);
  t.on('pointerdown', () => t.setScale(0.95));
  t.on('pointerout', () => t.setScale(1));
  t.on('pointerup', () => {
    t.setScale(1);
    onTap(t);
  });
  return t;
}

/** 장착 스킨 이모지 캐릭터 + idle 숨쉬기 (J5) */
export function makeCharacter(scene, x, y, size = 72) {
  const emoji = getSkin(store.getProgress().equippedSkin).emoji;
  const c = scene.add.text(x, y, emoji, { fontSize: `${size}px` }).setOrigin(0.5);
  scene.tweens.add({
    targets: c, scaleX: 1.05, scaleY: 0.95, duration: 1100,
    yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  });
  return c;
}

/** 상단 HUD: 하트 + 진행도 + 레벨 + 일시정지 */
export function makeHud(scene, { level, total, onQuit }) {
  const hearts = scene.add.text(30, 24, '❤️❤️❤️', { fontSize: '34px' });
  const prog = label(scene, W / 2, 42, `1 / ${total}`, 28);
  const lv = label(scene, W - 200, 42, `Lv.${level}`, 26, '#ffd54f');

  bigButton(scene, W - 70, 42, '⏸', () => {
    sfx.play('click');
    showPause(scene, onQuit);
  }, { size: 26, bg: '#444c66', padX: 14, padY: 8 });

  return {
    setHearts(n) {
      hearts.setText('❤️'.repeat(Math.max(0, n)) + '🖤'.repeat(Math.max(0, 3 - n)));
    },
    setProgress(cur) {
      prog.setText(`${cur} / ${total}`);
    },
    setLevel(l) {
      lv.setText(`Lv.${l}`);
    },
  };
}

function showPause(scene, onQuit) {
  // 씬 pause는 입력까지 멈추므로 timeScale 0으로 "시간만 정지"
  scene.time.timeScale = 0;
  scene.tweens.timeScale = 0;
  const restore = () => {
    scene.time.timeScale = 1;
    scene.tweens.timeScale = 1;
  };
  const dim = scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.6).setDepth(1200).setInteractive();
  const objs = [dim];
  objs.push(label(scene, W / 2, H / 2 - 120, '잠깐 쉬어요', 44).setDepth(1201));
  objs.push(
    bigButton(scene, W / 2, H / 2, '▶️ 계속하기', () => {
      restore();
      objs.forEach((o) => o.destroy());
    }, { bg: '#2ea24f' }).setDepth(1201)
  );
  objs.push(
    bigButton(scene, W / 2, H / 2 + 110, '🏠 그만하기', () => {
      restore();
      objs.forEach((o) => o.destroy());
      onQuit();
    }, { bg: '#e04545' }).setDepth(1201)
  );
}

/** 4지선다 버튼 행 (하단). destroy()로 제거 */
export function choiceRow(scene, choices, onPick) {
  const btns = choices.map((c, i) => {
    const x = W / 2 + (i - (choices.length - 1) / 2) * 250;
    const b = bigButton(scene, x, H - 90, String(c), () => onPick(c, b), {
      size: 42, bg: '#2f6ae0', padX: 34, padY: 20, minW: 170,
    });
    b.setDepth(500);
    return b;
  });
  return {
    buttons: btns,
    disable() {
      btns.forEach((b) => b.disableInteractive());
    },
    destroy() {
      btns.forEach((b) => b.destroy());
    },
  };
}

/** 숫자 키패드 (두 자리 × 한 자리 입력용) */
export function keypad(scene, onSubmit) {
  const objs = [];
  let value = '';
  const display = label(scene, W - 200, H - 330, '', 46, '#fff', { backgroundColor: '#1a2340', padding: { x: 30, y: 10 } });
  display.setDepth(500);
  objs.push(display);

  const layout = ['789', '456', '123', 'C0✓'];
  layout.forEach((row, r) => {
    [...row].forEach((ch, c) => {
      const x = W - 320 + c * 120;
      const y = H - 250 + r * 78;
      const b = bigButton(scene, x, y, ch, () => {
        sfx.play('click');
        if (ch === 'C') value = '';
        else if (ch === '✓') {
          if (value.length) onSubmit(parseInt(value, 10));
          return;
        } else if (value.length < 3) value += ch;
        display.setText(value || ' ');
      }, { size: 34, bg: ch === '✓' ? '#2ea24f' : ch === 'C' ? '#e04545' : '#38487a', padX: 26, padY: 12, minW: 100 });
      b.setDepth(500);
      objs.push(b);
    });
  });

  return {
    clear() {
      value = '';
      display.setText(' ');
    },
    destroy() {
      objs.forEach((o) => o.destroy());
    },
  };
}

/** 게임오버(벌점 없음) — 즉시 재도전 제안 */
export function showRetry(scene, { coins, onRetry, onQuit }) {
  const dim = scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.6).setDepth(1200).setInteractive();
  const objs = [dim];
  objs.push(label(scene, W / 2, H / 2 - 150, '아쉬워요! 그래도 잘했어요 💪', 42).setDepth(1201));
  objs.push(label(scene, W / 2, H / 2 - 80, `모은 코인 🪙 ${coins}`, 32, '#ffd54f').setDepth(1201));
  objs.push(
    bigButton(scene, W / 2, H / 2 + 20, '🔄 다시 도전!', () => {
      objs.forEach((o) => o.destroy());
      onRetry();
    }, { bg: '#2ea24f', size: 40 }).setDepth(1201)
  );
  objs.push(
    bigButton(scene, W / 2, H / 2 + 140, '🏠 월드맵으로', () => {
      objs.forEach((o) => o.destroy());
      onQuit();
    }, { bg: '#444c66' }).setDepth(1201)
  );
}

/** 표준 종료: 클리어 결과를 허브에 전달 */
export function exitToHub(result) {
  router.exitGame(result);
}
