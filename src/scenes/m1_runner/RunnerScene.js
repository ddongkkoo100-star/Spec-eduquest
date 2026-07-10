// M-1 구구단 러너 — 횡스크롤 런 + 4지선다/키패드
import Phaser from 'phaser';
import * as router from '../../router.js';
import * as store from '../../store.js';
import * as sfx from '../../sfx.js';
import { attachJuice, showStageClear, showLevelUp } from '../../juice.js';
import {
  makeProblem, timeSec, starsFor, nextWeight, PROBLEMS_PER_STAGE,
} from '../../curriculum/math_gen.js';
import { W, H, label, makeHud, makeCharacter, choiceRow, keypad, showRetry } from '../common.js';

const GROUND_Y = 620;
const CHAR_X = 300;

export default class RunnerScene extends Phaser.Scene {
  constructor() {
    super({ key: 'm1' });
  }

  init(data) {
    this.level = data.level || 1;
  }

  async create() {
    this.juice = attachJuice(this);
    this.juice.fadeIn();

    // 배경: 하늘 그라데이션 + 언덕 + 땅
    this.add.rectangle(W / 2, H / 2, W, H, 0x1e2a52);
    this.hills = [];
    for (let i = 0; i < 5; i++) {
      this.hills.push(this.add.ellipse(i * 340, 560, 420, 260, 0x27366a));
    }
    this.ground = this.add.rectangle(W / 2, GROUND_Y + 100, W, 200, 0x2e8b3a);
    this.add.rectangle(W / 2, GROUND_Y + 8, W, 16, 0x3aa94a);

    // 캐릭터 + 달리기 바운스
    this.char = makeCharacter(this, CHAR_X, GROUND_Y - 40, 80);
    this.runTween = this.tweens.add({
      targets: this.char, y: GROUND_Y - 60, duration: 260, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // 상태
    this.hearts = 3;
    this.solved = 0;
    this.correctCount = 0;
    this.coinsEarned = 0;
    this.answering = false;
    this.retryQueue = []; // 오답 문제 재출제 큐

    this.hud = makeHud(this, {
      level: this.level,
      total: PROBLEMS_PER_STAGE,
      onQuit: () => router.exitGame({ cleared: false, coins: 0 }),
    });
    this.hud.setHearts(this.hearts);

    // 약점 가중치 로드 (IndexedDB)
    this.weakness = {};
    try {
      const rows = await store.idbAll('weakness');
      rows.forEach((r) => (this.weakness[r.key] = r.weight));
    } catch { /* 비어 있으면 무시 */ }

    this.spawnObstacle();
  }

  // ---------- 장애물 & 문제 ----------
  spawnObstacle() {
    if (!this.sys || !this.sys.isActive()) return;
    this.answering = false;

    // 재출제 큐 우선 (오답 문제 잠시 후 다시)
    this.problem = this.retryQueue.length && this.solved < PROBLEMS_PER_STAGE - 1 && Math.random() < 0.5
      ? this.retryQueue.shift()
      : makeProblem(this.level, this.weakness);

    // 장애물 (바위) + 문제 텍스트
    this.obstacle = this.add.container(W + 120, GROUND_Y - 50);
    const rock = this.add.ellipse(0, 0, 120, 110, 0x6b7280).setStrokeStyle(5, 0x4b5563);
    const qBg = this.add.rectangle(0, -140, 340, 90, 0x111a33, 0.92).setStrokeStyle(4, 0xffd54f);
    const qText = label(this, 0, -140, this.problem.prompt, 40, '#ffd54f');
    this.obstacle.add([rock, qBg, qText]);

    // 접근 트윈: 질문 지점까지 이동
    this.tweens.add({
      targets: this.obstacle,
      x: 880,
      duration: 1400,
      ease: 'Linear',
      onComplete: () => this.askQuestion(),
    });
  }

  askQuestion() {
    if (!this.sys.isActive()) return;
    this.answering = true;
    // e2e 테스트 훅
    if (typeof window !== 'undefined' && window.__eq) window.__eq.problem = this.problem;

    // 제한시간 게이지
    const dur = timeSec(this.level) * 1000;
    this.gaugeBg = this.add.rectangle(W / 2, 120, 500, 26, 0x111a33).setStrokeStyle(3, 0xffffff);
    this.gauge = this.add.rectangle(W / 2 - 250, 120, 500, 20, 0x4ecb71).setOrigin(0, 0.5);
    this.gaugeTween = this.tweens.add({
      targets: this.gauge,
      scaleX: 0,
      duration: dur,
      ease: 'Linear',
      onUpdate: () => {
        if (this.gauge.scaleX < 0.3) this.gauge.fillColor = 0xe04545;
        else if (this.gauge.scaleX < 0.6) this.gauge.fillColor = 0xffb84d;
      },
      onComplete: () => this.onAnswer(null), // 시간 초과
    });

    // 입력 UI
    if (this.problem.input === 'keypad') {
      this.inputUi = keypad(this, (v) => this.onAnswer(v));
      this.inputUi.isKeypad = true;
    } else {
      this.inputUi = choiceRow(this, this.problem.choices, (v) => this.onAnswer(v));
    }
  }

  onAnswer(value) {
    if (!this.answering) return;
    this.answering = false;
    if (this.gaugeTween) this.gaugeTween.stop();
    [this.gauge, this.gaugeBg].forEach((g) => g && g.destroy());
    if (this.inputUi) {
      this.inputUi.destroy();
      this.inputUi = null;
    }

    const correctVal = this.problem.input === 'keypad' ? this.problem.answer : this.problem.choiceAnswer;
    const correct = value === correctVal;

    // 약점 가중치 갱신 + 저장
    const w = nextWeight(this.weakness[this.problem.key], correct);
    this.weakness[this.problem.key] = w;
    store.idbPut('weakness', { key: this.problem.key, weight: w }).catch(() => {});

    if (correct) this.onCorrect();
    else this.onWrong(value === null);
  }

  onCorrect() {
    this.correctCount += 1;
    this.coinsEarned += 10;

    // 타격 정지 프레임(2f ≈ 33ms) 후 격파
    this.time.timeScale = 0.01;
    setTimeout(() => {
      if (!this.sys || !this.sys.isActive()) return;
      this.time.timeScale = 1;

      const ox = this.obstacle.x;
      const oy = this.obstacle.y;
      this.obstacle.destroy();
      this.juice.correct(ox, oy, { coins: 10 });

      // 캐릭터 가속 연출: 앞으로 살짝 대시
      this.tweens.add({
        targets: this.char, x: CHAR_X + 90, duration: 180, yoyo: true, ease: 'Cubic.easeOut',
      });
      sfx.play('whoosh');
      this.advance();
    }, 33);
  }

  onWrong(isTimeout) {
    this.hearts -= 1;
    this.hud.setHearts(this.hearts);
    this.juice.incorrect(); // 셰이크 + 둔탁음 + 콤보 리셋

    // J8: 슬로우모션 0.3배속 400ms + 비틀거림
    this.juice.slowmo(0.3, 400);
    this.tweens.add({
      targets: this.char, angle: { from: -18, to: 18 }, duration: 90, yoyo: true, repeat: 3,
      onComplete: () => this.char.setAngle(0),
    });

    // 정답 잠깐 보여주기 (배움 기회)
    const answerShown = this.problem.input === 'keypad' ? this.problem.answer : this.problem.choiceAnswer;
    const reveal = label(this, this.obstacle.x, this.obstacle.y - 220, `정답: ${answerShown}`, 34, '#ff8a8a');

    // 같은 문제 유형 재출제 큐에 적재
    this.retryQueue.push({ ...this.problem });

    this.time.delayedCall(900, () => {
      reveal.destroy();
      if (this.obstacle) this.obstacle.destroy();
      if (this.hearts <= 0) {
        showRetry(this, {
          coins: this.coinsEarned,
          onRetry: () => this.scene.restart({ level: this.level }),
          onQuit: () => router.exitGame({ cleared: false, coins: this.coinsEarned, world: 'math', id: 'm1' }),
        });
      } else {
        this.advance(isTimeout);
      }
    });
  }

  advance() {
    this.solved += 1;
    this.hud.setProgress(Math.min(this.solved + 1, PROBLEMS_PER_STAGE));

    if (this.solved >= PROBLEMS_PER_STAGE) {
      this.stageClear();
      return;
    }
    // 배경 스크롤 느낌: 언덕 이동
    this.hills.forEach((h) => {
      this.tweens.add({ targets: h, x: h.x - 60 < -220 ? W + 200 : h.x - 60, duration: 400 });
    });
    this.time.delayedCall(450, () => this.spawnObstacle());
  }

  stageClear() {
    const stars = starsFor(this.hearts);
    const coins = this.coinsEarned + 50; // 클리어 보너스 +50
    const levelUp = stars >= 2;
    sfx.play('levelup');

    const finish = () => {
      router.exitGame({
        cleared: true, world: 'math', id: 'm1',
        stars, coins, levelUp,
      });
    };

    showStageClear(this, this.juice, {
      stars,
      coins,
      title: '스테이지 클리어!',
      onDone: () => {
        if (levelUp) showLevelUp(this, this.juice, this.level + 1, finish);
        else finish();
      },
    });
  }
}
