// M-4 길이 다리 건설 — 판자 조합으로 목표 길이 맞추기 (들이/무게 변형 포함)
import Phaser from 'phaser';
import * as router from '../../router.js';
import * as sfx from '../../sfx.js';
import { attachJuice, showStageClear, showLevelUp } from '../../juice.js';
import { makeLengthProblem, sumStatus, fmt } from '../../curriculum/length_logic.js';
import { starsFor } from '../../curriculum/math_gen.js';
import { W, H, label, makeHud, bigButton, makeCharacter, showRetry } from '../common.js';

const PROBLEMS = 5;
const THEME_ICON = { bridge: '🌉', water: '🚰', scale: '⚖️' };

export default class BridgeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'm4' });
  }
  init(data) {
    this.level = data.level || 1;
  }

  create() {
    this.juice = attachJuice(this);
    this.juice.fadeIn();

    this.add.rectangle(W / 2, H / 2, W, H, 0x16324a);
    // 강/땅
    this.add.rectangle(W / 2, 640, W, 320, 0x2277aa); // 물
    this.add.rectangle(140, 560, 280, 220, 0x3aa94a); // 왼쪽 언덕
    this.add.rectangle(W - 140, 560, 280, 220, 0x3aa94a); // 오른쪽 언덕

    this.char = makeCharacter(this, 120, 420, 64);

    this.hearts = 3;
    this.solved = 0;
    this.coinsEarned = 0;
    this.hud = makeHud(this, {
      level: this.level,
      total: PROBLEMS,
      onQuit: () => router.exitGame({ cleared: false, coins: this.coinsEarned, world: 'math', id: 'm4' }),
    });

    this.nextProblem();
  }

  nextProblem() {
    if (this.solved >= PROBLEMS) return this.stageClear();
    if (this.objs) this.objs.forEach((o) => o.destroy());
    this.objs = [];
    this.placed = []; // {base, obj}
    this.wrongTries = 0;
    this.problem = makeLengthProblem(this.level);
    this.char.setPosition(120, 420).setAngle(0);

    const icon = THEME_ICON[this.problem.theme];
    this.objs.push(label(this, W / 2, 120, `${icon} ${this.problem.prompt}`, 38, '#ffd54f', { stroke: '#000', strokeThickness: 6 }));
    this.sumLabel = label(this, W / 2, 180, '지금: 0', 30, '#8affa5');
    this.objs.push(this.sumLabel);

    // 조각 팔레트 (아래) — 탭하면 추가
    this.problem.pieces.forEach((pc, i) => {
      const x = 190 + i * 190;
      const b = bigButton(this, x, H - 80, `🪵 ${pc.label}`, () => this.addPiece(pc), { size: 26, bg: '#7a5230' });
      this.objs.push(b);
    });

    // 완료 버튼
    this.goBtn = bigButton(this, W - 150, H - 170, this.problem.theme === 'bridge' ? '🚶 건너가기!' : '✅ 확인!', () => this.onCheck(), { size: 28, bg: '#2ea24f' });
    this.objs.push(this.goBtn);
  }

  currentSum() {
    return this.placed.reduce((a, p) => a + p.base, 0);
  }

  addPiece(pc) {
    // 다리 위(또는 물통/저울)에 조각 배치
    const idx = this.placed.length;
    const x = 300 + idx * 130;
    const plank = this.add.container(x, 500);
    const rect = this.add.rectangle(0, 0, 120, 34, 0xa0713d).setStrokeStyle(3, 0x6b4a26);
    const txt = label(this, 0, 0, pc.label, 18, '#fff');
    plank.add([rect, txt]);
    plank.setScale(0);
    this.tweens.add({ targets: plank, scale: 1, duration: 200, ease: 'Back.easeOut' });
    sfx.play('pop');

    const entry = { base: pc.base, obj: plank };
    this.placed.push(entry);
    // 탭하면 제거
    rect.setInteractive({ useHandCursor: true });
    rect.on('pointerup', () => {
      this.placed = this.placed.filter((p) => p !== entry);
      plank.destroy();
      this.relayout();
      sfx.play('whoosh');
      this.updateSum();
    });
    this.updateSum();
  }

  relayout() {
    this.placed.forEach((p, i) => {
      this.tweens.add({ targets: p.obj, x: 300 + i * 130, duration: 180 });
    });
  }

  updateSum() {
    this.sumLabel.setText(`지금: ${this.currentSum() === 0 ? '0' : fmt(this.currentSum(), this.problem.family)}`);
  }

  onCheck() {
    const st = sumStatus(this.currentSum(), this.problem.targetBase);
    if (st === 'exact') {
      this.solved += 1;
      this.coinsEarned += 10;
      this.hud.setProgress(Math.min(this.solved + 1, PROBLEMS));
      this.juice.correct(W / 2, 400, { coins: 10 });
      // 캐릭터가 다리를 건너감
      sfx.play('jump');
      this.tweens.add({
        targets: this.char, x: W - 130, duration: 1100, ease: 'Sine.easeInOut',
        onComplete: () => {
          this.juice.burst(this.char.x, this.char.y, { count: 18 });
          this.time.delayedCall(500, () => this.nextProblem());
        },
      });
    } else {
      // 익살 연출: 다리가 기울고 캐릭터 허둥지둥 (공포 아님)
      this.wrongTries += 1;
      this.juice.incorrect();
      const dir = st === 'under' ? 1 : -1;
      this.placed.forEach((p) => {
        this.tweens.add({ targets: p.obj, angle: dir * 12, y: p.obj.y + 16, duration: 220, yoyo: true });
      });
      this.tweens.add({ targets: this.char, angle: { from: -14, to: 14 }, duration: 90, yoyo: true, repeat: 3, onComplete: () => this.char.setAngle(0) });
      this.juice.floatText(W / 2, 320, st === 'under' ? '조금 부족해요!' : '너무 길어요!', { color: '#ff8a8a', size: 32 });

      if (this.wrongTries >= 3) {
        this.hearts -= 1;
        this.hud.setHearts(this.hearts);
        this.juice.floatText(W / 2, 260, `정답 예: ${this.problem.solution.map((b) => fmt(b, this.problem.family)).join(' + ')}`, { color: '#ffd54f', size: 26 });
        this.time.delayedCall(1500, () => {
          if (this.hearts <= 0) {
            showRetry(this, {
              coins: this.coinsEarned,
              onRetry: () => this.scene.restart({ level: this.level }),
              onQuit: () => router.exitGame({ cleared: false, coins: this.coinsEarned, world: 'math', id: 'm4' }),
            });
          } else {
            this.solved += 1;
            this.nextProblem();
          }
        });
      }
    }
  }

  stageClear() {
    const stars = starsFor(this.hearts);
    const coins = this.coinsEarned + 50;
    const levelUp = stars >= 2;
    const finish = () => router.exitGame({ cleared: true, world: 'math', id: 'm4', stars, coins, levelUp });
    showStageClear(this, this.juice, {
      stars, coins, title: '건설 완료!',
      onDone: () => (levelUp ? showLevelUp(this, this.juice, this.level + 1, finish) : finish()),
    });
  }
}
