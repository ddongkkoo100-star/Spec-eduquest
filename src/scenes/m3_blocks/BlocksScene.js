// M-3 블록 연산 — 받아올림/내림을 블록 합체·분해 애니메이션으로 시각화.
// 핵심 연출: 나무 10개 → 다이아 1개 합체(400ms 이징), 다이아 → 나무 10개 분해.
import Phaser from 'phaser';
import * as router from '../../router.js';
import * as sfx from '../../sfx.js';
import { attachJuice, showStageClear, showLevelUp } from '../../juice.js';
import {
  initAdd, canMerge, merge10, isResolved, initSub, needsBorrow, split10, applySub,
  makeBlockProblem, valueOf,
} from '../../curriculum/carry_machine.js';
import { starsFor } from '../../curriculum/math_gen.js';
import { W, H, label, makeHud, bigButton, keypad, showRetry } from '../common.js';

const PROBLEMS = 5;
const COL_X = { hundreds: 200, tens: 460, ones: 720 };
const COL_EMOJI = { hundreds: '📦', tens: '💎', ones: '🪵' };
const COL_NAME = { hundreds: '백', tens: '십', ones: '일' };
const BLOCKS_TOP = 300;

export default class BlocksScene extends Phaser.Scene {
  constructor() {
    super({ key: 'm3' });
  }
  init(data) {
    this.level = data.level || 1;
  }

  create() {
    this.juice = attachJuice(this);
    this.juice.fadeIn();

    // 동굴/인벤토리 배경
    this.add.rectangle(W / 2, H / 2, W, H, 0x2b2117);
    this.add.rectangle(W / 2, 60, W, 120, 0x1c150e);
    for (const c of ['hundreds', 'tens', 'ones']) {
      this.add.rectangle(COL_X[c], 430, 230, 460, 0x3a2d1e).setStrokeStyle(4, 0x5c4630);
      label(this, COL_X[c], 220, `${COL_EMOJI[c]} ${COL_NAME[c]}의 자리`, 24, '#d8c9a8');
    }

    this.hearts = 3;
    this.solved = 0;
    this.coinsEarned = 0;
    this.hud = makeHud(this, {
      level: this.level,
      total: PROBLEMS,
      onQuit: () => router.exitGame({ cleared: false, coins: this.coinsEarned, world: 'math', id: 'm3' }),
    });

    this.nextProblem();
  }

  // ---------- 블록 렌더링 ----------
  blockPos(col, index) {
    const perRow = 5;
    const x = COL_X[col] - 88 + (index % perRow) * 44;
    const y = BLOCKS_TOP + Math.floor(index / perRow) * 46;
    return { x, y };
  }

  renderBlocks() {
    if (this.blockObjs) Object.values(this.blockObjs).flat().forEach((o) => o.destroy());
    this.blockObjs = { hundreds: [], tens: [], ones: [] };
    for (const col of ['hundreds', 'tens', 'ones']) {
      for (let i = 0; i < this.state.cols[col]; i++) {
        const { x, y } = this.blockPos(col, i);
        const b = this.add.text(x, y, COL_EMOJI[col], { fontSize: '34px' }).setOrigin(0.5);
        this.blockObjs[col].push(b);
      }
    }
  }

  /** 핵심 연출 1: 나무 10개 → 다이아 1개 합체 (400ms 이징) */
  playMerge(col, onDone) {
    const upper = col === 'ones' ? 'tens' : 'hundreds';
    const movers = this.blockObjs[col].slice(-10);
    const target = this.blockPos(upper, this.state.cols[upper]);
    sfx.play('merge');
    movers.forEach((b, i) => {
      this.tweens.add({
        targets: b, x: target.x, y: target.y, scale: 0.4, alpha: 0.7,
        duration: 400, ease: 'Cubic.easeInOut', delay: i * 18,
      });
    });
    this.time.delayedCall(400 + 10 * 18 + 60, () => {
      movers.forEach((b) => b.destroy());
      this.state = merge10(this.state, col);
      this.renderBlocks();
      // 새 다이아 팡!
      const nb = this.blockObjs[upper][this.blockObjs[upper].length - 1];
      if (nb) {
        nb.setScale(0);
        this.tweens.add({ targets: nb, scale: 1.4, duration: 220, ease: 'Back.easeOut', yoyo: true });
        this.juice.burst(nb.x, nb.y, { count: 16, tint: 0x7ce8ff });
      }
      sfx.play('star');
      onDone();
    });
  }

  /** 핵심 연출 2: 다이아 1개 → 나무 10개 분해 (400ms 이징) */
  playSplit(col, onDone) {
    const upper = col === 'ones' ? 'tens' : 'hundreds';
    const diamond = this.blockObjs[upper][this.blockObjs[upper].length - 1];
    const startCount = this.state.cols[col];
    sfx.play('merge');
    this.tweens.add({
      targets: diamond,
      x: COL_X[col], y: BLOCKS_TOP + 60, scale: 1.6,
      duration: 260, ease: 'Cubic.easeIn',
      onComplete: () => {
        this.juice.burst(diamond.x, diamond.y, { count: 20, tint: 0xffd54f });
        diamond.destroy();
        this.state = split10(this.state, col);
        this.renderBlocks();
        // 새 나무 10개가 순차 팡팡
        const news = this.blockObjs[col].slice(startCount);
        news.forEach((b, i) => {
          b.setScale(0);
          this.tweens.add({ targets: b, scale: 1, duration: 140, delay: i * 35, ease: 'Back.easeOut' });
        });
        sfx.play('pop');
        this.time.delayedCall(140 + 10 * 35, onDone);
      },
    });
  }

  // ---------- 문제 진행 ----------
  nextProblem() {
    if (this.solved >= PROBLEMS) return this.stageClear();
    if (this.uiObjs) this.uiObjs.forEach((o) => o.destroy());
    if (this.inputUi) {
      this.inputUi.destroy();
      this.inputUi = null;
    }
    this.uiObjs = [];

    this.problem = makeBlockProblem(this.level);
    // ①블록 조작 모드(앞 3문제) ②세로셈 모드(뒤 2문제, 블록은 힌트)
    this.blockMode = this.solved < 3;
    this.wrongTries = 0;

    const prompt = label(this, W / 2, 130, this.problem.prompt, 46, '#ffd54f', { stroke: '#000', strokeThickness: 6 });
    this.uiObjs.push(prompt);

    if (this.problem.op === 'div') {
      this.state = null;
      this.setupDivBlocks();
    } else if (this.problem.op === 'add') {
      this.state = initAdd(this.problem.a, this.problem.b);
    } else {
      this.state = initSub(this.problem.a, this.problem.b);
    }

    if (this.state) {
      if (this.blockMode) {
        this.renderBlocks();
        this.time.delayedCall(500, () => this.resolveStep());
      } else {
        // 세로셈 모드: 블록 숨김 + 힌트 버튼
        if (this.blockObjs) Object.values(this.blockObjs).flat().forEach((o) => o.destroy());
        this.blockObjs = null;
        const hint = bigButton(this, 200, 700, '💡 블록 힌트 보기', () => {
          hint.destroy();
          this.blockMode = true;
          this.renderBlocks();
          this.time.delayedCall(300, () => this.resolveStep());
        }, { size: 24, bg: '#5c4630' });
        this.uiObjs.push(hint);
        this.showKeypad();
      }
    }
  }

  setupDivBlocks() {
    // 나눗셈: 나무 a개 + 접시 b개 시각화
    if (this.blockObjs) Object.values(this.blockObjs).flat().forEach((o) => o.destroy());
    this.blockObjs = { hundreds: [], tens: [], ones: [] };
    for (let i = 0; i < this.problem.a; i++) {
      const x = 180 + (i % 12) * 52;
      const y = BLOCKS_TOP + Math.floor(i / 12) * 52;
      this.blockObjs.ones.push(this.add.text(x, y, '🪵', { fontSize: '36px' }).setOrigin(0.5));
    }
    for (let i = 0; i < this.problem.b; i++) {
      this.blockObjs.tens.push(this.add.text(220 + i * 90, 620, '🍽️', { fontSize: '44px' }).setOrigin(0.5));
    }
    this.showKeypad();
  }

  /** 블록 모드: 합체/분해가 필요한 만큼 아이 터치로 진행 */
  resolveStep() {
    const s = this.state;
    if (s.op === 'add') {
      const col = canMerge(s, 'ones') ? 'ones' : canMerge(s, 'tens') ? 'tens' : null;
      if (col) {
        const btn = bigButton(this, COL_X[col], 700, `✨ ${COL_EMOJI[col]} 10개 합치기!`, () => {
          btn.destroy();
          this.playMerge(col, () => this.resolveStep());
        }, { size: 26, bg: '#2ea24f' });
        this.tweens.add({ targets: btn, scale: 1.06, duration: 400, yoyo: true, repeat: -1 });
        this.uiObjs.push(btn);
        return;
      }
      this.showKeypad();
      return;
    }
    // 뺄셈
    if (needsBorrow(s, 'ones') || needsBorrow(s, 'tens')) {
      const col = needsBorrow(s, 'ones') ? 'ones' : 'tens';
      const needTxt = label(this, W / 2, 190, `빼야 해요: ${this.problem.b} — ${COL_NAME[col]}의 자리가 부족해요!`, 26, '#ff8a8a');
      this.uiObjs.push(needTxt);
      const btn = bigButton(this, COL_X[col], 700, `💥 💎 쪼개기!`, () => {
        btn.destroy();
        needTxt.destroy();
        this.playSplit(col, () => this.resolveStep());
      }, { size: 26, bg: '#e07b2f' });
      this.tweens.add({ targets: btn, scale: 1.06, duration: 400, yoyo: true, repeat: -1 });
      this.uiObjs.push(btn);
      return;
    }
    // 빼기 실행 애니메이션: need만큼 페이드 아웃
    const btn = bigButton(this, W / 2, 700, `➖ ${this.problem.b} 빼기!`, () => {
      btn.destroy();
      for (const col of ['hundreds', 'tens', 'ones']) {
        const takers = this.blockObjs[col].slice(-this.state.need[col]);
        takers.forEach((b, i) => {
          this.tweens.add({ targets: b, y: b.y + 120, alpha: 0, duration: 350, delay: i * 40 });
        });
      }
      sfx.play('whoosh');
      this.time.delayedCall(700, () => {
        this.state = applySub(this.state);
        this.renderBlocks();
        this.showKeypad();
      });
    }, { size: 28, bg: '#2ea24f' });
    this.uiObjs.push(btn);
  }

  showKeypad() {
    const ask = label(this, W - 200, H - 400, '답을 눌러요!', 28, '#8affa5');
    this.uiObjs.push(ask);
    if (this.inputUi) this.inputUi.destroy();
    this.inputUi = keypad(this, (v) => this.onAnswer(v));
  }

  onAnswer(v) {
    if (v === this.problem.answer) {
      this.solved += 1;
      this.coinsEarned += 10;
      this.hud.setProgress(Math.min(this.solved + 1, PROBLEMS));
      this.juice.correct(W / 2, 400, { coins: 10 });
      if (this.inputUi) {
        this.inputUi.destroy();
        this.inputUi = null;
      }
      this.time.delayedCall(800, () => this.nextProblem());
    } else {
      this.wrongTries += 1;
      this.juice.incorrect();
      this.inputUi.clear();
      if (this.wrongTries >= 2) {
        this.hearts -= 1;
        this.hud.setHearts(this.hearts);
        this.juice.floatText(W / 2, 400, `정답: ${this.problem.answer}`, { color: '#ff8a8a', size: 40 });
        if (this.inputUi) {
          this.inputUi.destroy();
          this.inputUi = null;
        }
        this.time.delayedCall(1300, () => {
          if (this.hearts <= 0) {
            showRetry(this, {
              coins: this.coinsEarned,
              onRetry: () => this.scene.restart({ level: this.level }),
              onQuit: () => router.exitGame({ cleared: false, coins: this.coinsEarned, world: 'math', id: 'm3' }),
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
    const finish = () => router.exitGame({ cleared: true, world: 'math', id: 'm3', stars, coins, levelUp });
    showStageClear(this, this.juice, {
      stars, coins, title: '블록 마스터!',
      onDone: () => (levelUp ? showLevelUp(this, this.juice, this.level + 1, finish) : finish()),
    });
  }
}
