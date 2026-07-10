// M-2 시계 폭탄 해제 — 우주선 수리 미션. 분침 드래그(시침 기어비 연동), 스냅.
import Phaser from 'phaser';
import * as router from '../../router.js';
import * as sfx from '../../sfx.js';
import { attachJuice, showStageClear, showLevelUp } from '../../juice.js';
import {
  handAngles, timeOf, snapMinutes, applyDrag, checkTime, makeClockProblem, normMinutes, digital,
} from '../../curriculum/clock_logic.js';
import { starsFor } from '../../curriculum/math_gen.js';
import { W, H, label, makeHud, bigButton, showRetry } from '../common.js';

const CX = 430;
const CY = 440;
const R = 250;
const PROBLEMS = 5;
const FUSE_MS = 45000;

export default class ClockScene extends Phaser.Scene {
  constructor() {
    super({ key: 'm2' });
  }
  init(data) {
    this.level = data.level || 1;
  }

  create() {
    this.juice = attachJuice(this);
    this.juice.fadeIn();

    // 우주 배경
    this.add.rectangle(W / 2, H / 2, W, H, 0x0d1330);
    for (let i = 0; i < 60; i++) {
      const s = this.add.circle(Math.random() * W, Math.random() * H, Math.random() * 2 + 1, 0xffffff, 0.7);
      this.tweens.add({ targets: s, alpha: 0.2, duration: 800 + Math.random() * 1500, yoyo: true, repeat: -1 });
    }
    this.ship = this.add.text(W - 190, 180, '🛸', { fontSize: '90px' }).setOrigin(0.5);
    this.tweens.add({ targets: this.ship, y: 165, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.hearts = 3;
    this.solved = 0;
    this.coinsEarned = 0;
    this.hud = makeHud(this, {
      level: this.level,
      total: PROBLEMS,
      onQuit: () => router.exitGame({ cleared: false, coins: this.coinsEarned, world: 'math', id: 'm2' }),
    });

    this.drawClockFace();
    this.hourHand = this.makeHand(R * 0.5, 18, 0xffb84d);
    this.minuteHand = this.makeHand(R * 0.78, 10, 0x4f8cff);
    this.add.circle(CX, CY, 14, 0xffffff);

    this.setupDrag();
    this.nextProblem();
  }

  drawClockFace() {
    const g = this.add.graphics();
    g.fillStyle(0xf4f0e6, 1).fillCircle(CX, CY, R + 26);
    g.fillStyle(0x1a2340, 1).fillCircle(CX, CY, R + 10);
    g.fillStyle(0xfffdf5, 1).fillCircle(CX, CY, R);
    for (let i = 0; i < 60; i++) {
      const a = Phaser.Math.DegToRad(i * 6 - 90);
      const long = i % 5 === 0;
      const r1 = R - (long ? 26 : 14);
      g.lineStyle(long ? 6 : 2, 0x1a2340, 1);
      g.beginPath();
      g.moveTo(CX + Math.cos(a) * r1, CY + Math.sin(a) * r1);
      g.lineTo(CX + Math.cos(a) * (R - 6), CY + Math.sin(a) * (R - 6));
      g.strokePath();
    }
    for (let n = 1; n <= 12; n++) {
      const a = Phaser.Math.DegToRad(n * 30 - 90);
      label(this, CX + Math.cos(a) * (R - 54), CY + Math.sin(a) * (R - 54), String(n), 34, '#1a2340');
    }
  }

  makeHand(len, width, color) {
    const c = this.add.container(CX, CY);
    c.add(this.add.rectangle(0, -len / 2, width, len, color).setOrigin(0.5, 1).setY(0));
    return c;
  }

  setHands(totalMinutes) {
    this.totalMinutes = normMinutes(totalMinutes);
    const t = timeOf(this.totalMinutes);
    const { hourDeg, minuteDeg } = handAngles(t.h, t.m);
    this.hourHand.setAngle(hourDeg);
    this.minuteHand.setAngle(minuteDeg);
    if (this.readout) this.readout.setText(digital(t.h, t.m));
  }

  pointerDeg(p) {
    return (Phaser.Math.RadToDeg(Math.atan2(p.y - CY, p.x - CX)) + 90 + 360) % 360;
  }

  setupDrag() {
    const zone = this.add.circle(CX, CY, R + 30, 0x000000, 0.001).setInteractive();
    let dragging = false;
    let prev = 0;
    zone.on('pointerdown', (p) => {
      dragging = true;
      prev = this.pointerDeg(p);
      sfx.play('tick');
    });
    this.input.on('pointermove', (p) => {
      if (!dragging) return;
      const cur = this.pointerDeg(p);
      this.setHands(applyDrag(this.totalMinutes, prev, cur));
      prev = cur;
    });
    this.input.on('pointerup', () => {
      if (!dragging) return;
      dragging = false;
      // 릴리즈 스냅 (레벨별 5분/1분)
      this.setHands(snapMinutes(this.totalMinutes, this.problem ? Math.min(this.problem.snap, 5) : 5));
      sfx.play('tick');
    });
  }

  nextProblem() {
    if (this.solved >= PROBLEMS) return this.stageClear();

    this.problem = makeClockProblem(this.level);
    this.setHands(this.problem.startTotal !== null ? this.problem.startTotal : 0);

    if (this.promptObjs) this.promptObjs.forEach((o) => o.destroy());
    const px = W - 250;
    const panel = this.add.rectangle(px, 420, 420, 330, 0x1e2a52, 1).setStrokeStyle(4, 0x4f8cff);
    const bomb = this.add.text(px, 320, '💣', { fontSize: '76px' }).setOrigin(0.5);
    this.tweens.add({ targets: bomb, scale: 1.08, duration: 500, yoyo: true, repeat: -1 });
    const prompt = label(this, px, 420, this.problem.prompt, 30, '#fff', { wordWrap: { width: 380 } });
    this.readout = label(this, px, 480, '', 30, '#8affa5');
    const t = timeOf(this.totalMinutes);
    this.readout.setText(digital(t.h, t.m));

    // 도화선 게이지
    const fuseBg = this.add.rectangle(px, 530, 340, 18, 0x111a33).setStrokeStyle(2, 0xffffff);
    const fuse = this.add.rectangle(px - 170, 530, 340, 12, 0xffb84d).setOrigin(0, 0.5);
    this.fuseTween = this.tweens.add({
      targets: fuse, scaleX: 0, duration: FUSE_MS, ease: 'Linear',
      onComplete: () => this.onFuseOut(),
    });

    const check = bigButton(this, px, 610, '✅ 다 맞췄어요!', () => this.onCheck(bomb), { bg: '#2ea24f', size: 30 });
    this.promptObjs = [panel, bomb, prompt, this.readout, fuseBg, fuse, check];
  }

  onCheck(bomb) {
    const ok = checkTime(this.totalMinutes, this.problem.targetH, this.problem.targetM, this.problem.snap);
    if (ok) {
      this.fuseTween.stop();
      this.solved += 1;
      this.coinsEarned += 10;
      this.hud.setProgress(Math.min(this.solved + 1, PROBLEMS));
      // 폭탄 → 선물상자 변신
      bomb.setText('🎁');
      this.tweens.add({ targets: bomb, scale: 1.5, duration: 250, yoyo: true, ease: 'Back.easeOut' });
      this.juice.correct(bomb.x, bomb.y, { coins: 10 });
      this.time.delayedCall(900, () => this.nextProblem());
    } else {
      this.juice.incorrect();
      const t = timeOf(this.totalMinutes);
      this.juice.floatText(CX, CY - R - 40, `지금은 ${t.h}시 ${t.m}분이에요. 다시 도전!`, { color: '#ff8a8a', size: 28 });
    }
  }

  onFuseOut() {
    this.hearts -= 1;
    this.hud.setHearts(this.hearts);
    this.juice.incorrect();
    this.juice.slowmo(0.3, 400);
    // 정답 시각을 보여주고 넘어감 (배움 기회)
    this.setHands((this.problem.targetH % 12) * 60 + this.problem.targetM);
    this.juice.floatText(CX, CY - R - 40, `정답은 ${this.problem.targetH}시 ${this.problem.targetM}분!`, { color: '#ff8a8a', size: 28 });
    this.time.delayedCall(1400, () => {
      if (this.hearts <= 0) {
        showRetry(this, {
          coins: this.coinsEarned,
          onRetry: () => this.scene.restart({ level: this.level }),
          onQuit: () => router.exitGame({ cleared: false, coins: this.coinsEarned, world: 'math', id: 'm2' }),
        });
      } else {
        this.solved += 1; // 문제는 소모
        this.nextProblem();
      }
    });
  }

  stageClear() {
    if (this.promptObjs) this.promptObjs.forEach((o) => o.destroy());
    // 우주선 발진!
    sfx.play('whoosh');
    this.tweens.add({ targets: this.ship, y: -150, x: this.ship.x + 60, duration: 1200, ease: 'Cubic.easeIn' });

    const stars = starsFor(this.hearts);
    const coins = this.coinsEarned + 50;
    const levelUp = stars >= 2;
    const finish = () => router.exitGame({ cleared: true, world: 'math', id: 'm2', stars, coins, levelUp });

    this.time.delayedCall(900, () => {
      showStageClear(this, this.juice, {
        stars, coins, title: '수리 완료! 발진!',
        onDone: () => (levelUp ? showLevelUp(this, this.juice, this.level + 1, finish) : finish()),
      });
    });
  }
}
