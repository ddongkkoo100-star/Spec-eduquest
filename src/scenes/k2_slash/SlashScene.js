// K-2 띄어쓰기 슬래시 — 흐르는 문장의 글자 사이를 세로로 베기
import Phaser from 'phaser';
import * as router from '../../router.js';
import * as store from '../../store.js';
import * as sfx from '../../sfx.js';
import { attachJuice, showStageClear, showLevelUp } from '../../juice.js';
import {
  makeSlashProblem, judgeCut, isVerticalSwipe, slashLevelSpec, sentencesForLevel,
} from '../../curriculum/slash_logic.js';
import { starsFor } from '../../curriculum/math_gen.js';
import { W, H, label, makeHud, showRetry } from '../common.js';

const SENTENCES_PER_STAGE = 6;
const CHAR_W = 53; // 글꼴 폭에 밀착 — 붙어 보여야 띄어쓰기 문제가 성립
const LINE_Y = 400;

export default class SlashScene extends Phaser.Scene {
  constructor() {
    super({ key: 'k2' });
  }
  init(data) {
    this.level = data.level || 1;
  }

  async create() {
    this.juice = attachJuice(this);
    this.juice.fadeIn();

    // 도장(道場) 느낌 배경
    this.add.rectangle(W / 2, H / 2, W, H, 0x2a1e33);
    this.add.rectangle(W / 2, LINE_Y, W, 160, 0x1c1424, 0.8);
    label(this, W / 2, 190, '글자 사이를 위아래로 쓱! 베어 띄어쓰기를 만들어요', 24, '#cfa8ff');

    this.hearts = 3;
    this.solved = 0;
    this.coinsEarned = 0;
    this.hud = makeHud(this, {
      level: this.level,
      total: SENTENCES_PER_STAGE,
      onQuit: () => router.exitGame({ cleared: false, coins: this.coinsEarned, world: 'korean', id: 'k2' }),
    });

    // 급수표 문장 재활용 (킬러 기능): 등록된 급수표 문장을 출제 풀에 합류
    let extra = [];
    try {
      const docs = await store.idbAll('gugupyo');
      extra = docs.flatMap((d) => d.sets.flatMap((s) => s.items));
    } catch { /* 없으면 기본 예문만 */ }
    this.queue = sentencesForLevel(this.level, extra);
    this.qi = 0;

    this.setupSwipe();
    this.nextSentence();
  }

  nextSentence() {
    if (this.solved >= SENTENCES_PER_STAGE) return this.stageClear();
    if (this.qi >= this.queue.length) this.qi = 0;

    this.problem = makeSlashProblem(this.queue[this.qi++]);
    this.found = new Set();

    // 글자별 텍스트를 컨테이너에 담아 흘려보냄
    this.line = this.add.container(W + 80, LINE_Y);
    this.chars = [...this.problem.display].map((ch, i) => {
      const t = label(this, i * CHAR_W + CHAR_W / 2, 0, ch, 52, '#fff');
      this.line.add(t);
      return t;
    });
    const totalW = this.problem.display.length * CHAR_W;

    const speed = slashLevelSpec(this.level).speed; // px/s
    const dist = W + 160 + totalW;
    this.lineTween = this.tweens.add({
      targets: this.line,
      x: -totalW - 80,
      duration: (dist / speed) * 1000,
      ease: 'Linear',
      onComplete: () => this.onEscape(),
    });
  }

  setupSwipe() {
    let start = null;
    this.input.on('pointerdown', (p) => {
      start = { x: p.x, y: p.y };
    });
    this.input.on('pointerup', (p) => {
      if (!start) return;
      const dx = p.x - start.x;
      const dy = p.y - start.y;
      const sx = (start.x + p.x) / 2;
      const s = start;
      start = null;
      if (!isVerticalSwipe(dx, dy)) return;
      if (Math.abs((s.y + p.y) / 2 - LINE_Y) > 160) return; // 문장 근처에서만
      this.onSlash(sx);
    });
  }

  onSlash(cutX) {
    if (!this.line || !this.line.active) return;
    // 참격 이펙트 (성공/실패 공통 — 손맛)
    const fx = this.add.rectangle(cutX, LINE_Y, 6, 200, 0xffffff, 0.9).setDepth(900);
    this.tweens.add({ targets: fx, alpha: 0, scaleY: 1.4, duration: 180, onComplete: () => fx.destroy() });
    sfx.play('slice');

    const startX = this.line.x; // 첫 글자 왼쪽 경계
    // 이미 벤 곳은 글자가 34px씩 밀려 있으므로 경계 좌표를 보정해서 판정
    const adjusted = this.problem.boundaries.map((b, i) => {
      const shifts = this.problem.boundaries.filter((ob, oi) => this.found.has(oi) && ob <= b).length;
      return b + (shifts * 34) / CHAR_W;
    });
    const bi = judgeCut(cutX, startX, CHAR_W, adjusted);
    if (bi >= 0 && !this.found.has(bi)) {
      this.found.add(bi);
      const b = this.problem.boundaries[bi];
      // 문장이 쩍 갈라짐: 경계 오른쪽 글자들을 밀어냄
      this.chars.forEach((t, i) => {
        if (i >= b) this.tweens.add({ targets: t, x: t.x + 34, duration: 160, ease: 'Cubic.easeOut' });
      });
      this.juice.correct(cutX, LINE_Y - 90, { coins: 10 });
      this.coinsEarned += 10;

      if (this.found.size === this.problem.boundaries.length) {
        // 문장 완성!
        this.lineTween.stop();
        this.solved += 1;
        this.hud.setProgress(Math.min(this.solved + 1, SENTENCES_PER_STAGE));
        const done = label(this, W / 2, 280, `"${this.problem.original}" 완성!`, 30, '#8affa5');
        this.tweens.add({ targets: this.line, alpha: 0, y: LINE_Y + 60, duration: 500, delay: 400 });
        this.time.delayedCall(1000, () => {
          done.destroy();
          this.line.destroy();
          this.nextSentence();
        });
      }
    } else if (bi === -1) {
      // 오답 위치: 문장이 꿈틀하며 튕겨냄 (하트 유지 — 시간이 벌점)
      this.juice.incorrect();
      this.tweens.add({ targets: this.line, y: LINE_Y - 26, duration: 90, yoyo: true, ease: 'Bounce.easeOut' });
    }
  }

  onEscape() {
    // 문장을 다 베지 못하고 지나감
    this.hearts -= 1;
    this.hud.setHearts(this.hearts);
    this.juice.incorrect();
    this.juice.floatText(W / 2, LINE_Y, `정답: ${this.problem.original}`, { color: '#ff8a8a', size: 32 });
    this.line.destroy();
    this.time.delayedCall(1100, () => {
      if (this.hearts <= 0) {
        showRetry(this, {
          coins: this.coinsEarned,
          onRetry: () => this.scene.restart({ level: this.level }),
          onQuit: () => router.exitGame({ cleared: false, coins: this.coinsEarned, world: 'korean', id: 'k2' }),
        });
      } else {
        this.solved += 1; // 문장 소모
        this.nextSentence();
      }
    });
  }

  stageClear() {
    const stars = starsFor(this.hearts);
    const coins = this.coinsEarned + 50;
    const levelUp = stars >= 2;
    const finish = () => router.exitGame({ cleared: true, world: 'korean', id: 'k2', stars, coins, levelUp });
    showStageClear(this, this.juice, {
      stars, coins, title: '띄어쓰기 달인!',
      onDone: () => (levelUp ? showLevelUp(this, this.juice, this.level + 1, finish) : finish()),
    });
  }
}
