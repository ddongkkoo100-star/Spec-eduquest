import { el, btn } from '../ui.js';
import * as sfx from '../sfx.js';
import * as router from '../router.js';

export function mountTitle(root) {
  const wrap = el('div', { class: 'eq-screen', style: 'justify-content:center;gap:14px;background:radial-gradient(ellipse at 50% 30%, #2c3a6e 0%, #1a2340 70%);' });
  wrap.append(
    el('div', { text: '🚀', class: 'breathe', style: 'font-size:110px;' }),
    el('div', { class: 'eq-title', text: '에듀퀘스트', style: 'font-size:64px;letter-spacing:4px;' }),
    el('div', { text: '수학과 국어의 모험 세계로!', style: 'font-size:22px;opacity:.85;margin-bottom:26px;' }),
    btn('모험 시작!', () => {
      sfx.init(); // 첫 제스처: 오디오 웜업
      sfx.play('levelup');
      router.showScreen('worldmap');
    }, 'big green')
  );
  root.append(wrap);
}
