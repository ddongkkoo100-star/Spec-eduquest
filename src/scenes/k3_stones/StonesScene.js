// K-3 겹받침 징검다리 — 2지선다 돌 건너기, 연속 정답 배수 코인
import Phaser from 'phaser';
import * as router from '../../router.js';
import * as sfx from '../../sfx.js';
import { attachJuice, showStageClear, showLevelUp } from '../../juice.js';
import { makeStoneProblem } from '../../curriculum/korean_db.js';
import { starsFor } from '../../curriculum/math_gen.js';
import { W, H, label, makeHud, makeCharacter, showRetry } from '../common.js';

const STONES = 8;
const CHAR_HOME = { x: 170, y: 470 };

export default class StonesScene extends Phaser.Scene {
  constructor() {
    super({ key: 'k3' });
  }
  init(data) {
    this.level = data.level || 1;
  }

  create() {
    this.juice = attachJuice(this);
    this.juice.fadeIn();

    // 개울 배경
    this.add.rectangle(W / 2, H / 2, W, H, 0x14322a);
    this.add.rectangle(W / 2, 520, W, 360, 0x1d6fa8); // 개울
    for (let i = 0; i < 8; i++) {
      const w = this.add.ellipse(100 + i * 170, 460 + (i % 3) * 80, 60, 10, 0xffffff, 0.25);
      this.tweens.add({ targets: w, x: w.x + 40, duration: 2200 + i * 300, yoyo: true, repeat: -1 });
    }
    this.add.rectangle(120, 620, 240, 300, 0x3aa94a); // 출발 언덕
    this.add.rectangle(W - 120, 620, 240, 300, 0x3aa94a); // 도착 언덕
    this.add.text(W - 120, 430, '🏁', { fontSize: '60px' }).setOrigin(0.5);

    this.char = makeCharacter(this, CHAR_HOME.x, CHAR_HOME.y, 64);

    this.hearts = 3;
    this.solved = 0;
    this.coinsEarned = 0;
    this.hud = makeHud(this, {
      level: this.level,
      total: STONES,
      onQuit: () => router.exitGame({ cleared: false, coins: this.coinsEarned, world: 'korean', id: 'k3' }),
    });

    this.nextStone();
  }

  nextStone() {
    if (this.solved >= STONES) return this.stageClear();
    if (this.objs) this.objs.forEach((o) => o.destroy());
    this.objs = [];
    this.problem = makeStoneProblem();
    this.answering = true;

    this.objs.push(label(this, W / 2, 150, `"${this.problem.hint} ____"`, 36, '#ffd54f', { stroke: '#000', strokeThickness: 5 }));
    this.objs.push(label(this, W / 2, 210, '올바른 말이 적힌 돌을 밟아요!', 22, '#bfe8ff'));

    // 돌 2개 (위/아래)
    this.problem.options.forEach((word, i) => {
      const x = W / 2 + 60;
      const y = i === 0 ? 400 : 580;
      const stone = this.add.container(x, y);
      const rock = this.add.ellipse(0, 0, 300, 120, 0x8a8f98).setStrokeStyle(5, 0x5d626b);
      const txt = label(this, 0, 0, word, 40, '#1a2340');
      stone.add([rock, txt]);
      rock.setInteractive({ useHandCursor: true });
      rock.on('pointerup', () => this.onPick(stone, word));
      this.tweens.add({ targets: stone, y: y + 8, duration: 1300 + i * 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.objs.push(stone);
    });
  }

  onPick(stone, word) {
    if (!this.answering) return;
    this.answering = false;

    if (word === this.problem.answer) {
      // 폴짝 점프!
      sfx.play('jump');
      this.tweens.add({
        targets: this.char,
        x: stone.x - 90, y: stone.y - 60,
        duration: 450,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.solved += 1;
          // 징검다리 콤보: 연속 정답 = 배수 코인 (10 × 콤보)
          const comboBefore = this.juice.combo.count;
          const coins = 10 * Math.min(5, comboBefore + 1);
          this.coinsEarned += coins;
          this.juice.correct(this.char.x, this.char.y - 40, { coins });
          this.hud.setProgress(Math.min(this.solved + 1, STONES));
          this.time.delayedCall(700, () => {
            // 다음 문제를 위해 캐릭터는 출발점으로 살짝 이동 (화면상 연속감)
            this.tweens.add({ targets: this.char, x: CHAR_HOME.x, y: CHAR_HOME.y, duration: 350 });
            this.time.delayedCall(360, () => this.nextStone());
          });
        },
      });
    } else {
      // 돌이 가라앉고 풍덩! → 구조 튜브로 복귀 (익살)
      this.juice.incorrect();
      this.hearts -= 1;
      this.hud.setHearts(this.hearts);
      this.tweens.add({ targets: stone, y: stone.y + 140, alpha: 0.2, duration: 500, ease: 'Quad.easeIn' });
      sfx.play('splash');
      this.tweens.add({
        targets: this.char,
        x: stone.x - 90, y: stone.y + 60, angle: 180,
        duration: 500,
        onComplete: () => {
          // 물보라
          this.juice.burst(this.char.x, this.char.y, { count: 16, tint: 0x7cc7ff });
          const tube = this.add.text(this.char.x, this.char.y, '🛟', { fontSize: '58px' }).setOrigin(0.5);
          this.tweens.add({
            targets: [this.char, tube],
            x: CHAR_HOME.x, y: CHAR_HOME.y,
            duration: 800, delay: 350, ease: 'Sine.easeInOut',
            onComplete: () => {
              tube.destroy();
              this.char.setAngle(0);
              const correct = label(this, W / 2, 280, `정답은 "${this.problem.answer}"!`, 32, '#ff8a8a');
              this.time.delayedCall(1100, () => {
                correct.destroy();
                if (this.hearts <= 0) {
                  showRetry(this, {
                    coins: this.coinsEarned,
                    onRetry: () => this.scene.restart({ level: this.level }),
                    onQuit: () => router.exitGame({ cleared: false, coins: this.coinsEarned, world: 'korean', id: 'k3' }),
                  });
                } else {
                  this.nextStone(); // 같은 유형 재도전 (문제 소모 없음)
                }
              });
            },
          });
        },
      });
    }
  }

  stageClear() {
    // 도착 언덕으로 마지막 점프
    this.tweens.add({ targets: this.char, x: W - 130, y: 440, duration: 600, ease: 'Quad.easeOut' });
    const stars = starsFor(this.hearts);
    const coins = this.coinsEarned + 50;
    const levelUp = stars >= 2;
    const finish = () => router.exitGame({ cleared: true, world: 'korean', id: 'k3', stars, coins, levelUp });
    this.time.delayedCall(700, () => {
      showStageClear(this, this.juice, {
        stars, coins, title: '개울 건너기 성공!',
        onDone: () => (levelUp ? showLevelUp(this, this.juice, this.level + 1, finish) : finish()),
      });
    });
  }
}
