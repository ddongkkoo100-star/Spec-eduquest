// 부트스트랩: 진행도 로드 → 허브 렌더
import './style.css';
import * as store from './store.js';
import * as router from './router.js';
import * as sfx from './sfx.js';
import { el, btn } from './ui.js';

// Phase 1에서 실제 허브 화면으로 교체 예정 — 임시 타이틀
router.registerScreen('title', (root) => {
  const wrap = el('div', { class: 'eq-screen', style: 'justify-content:center;gap:24px;' });
  wrap.append(
    el('div', { class: 'eq-title breathe', text: '🚀 에듀퀘스트', style: 'font-size:56px;' }),
    btn('시작하기', () => {
      sfx.init();
      router.showScreen('title');
    }, 'big green')
  );
  root.append(wrap);
});

store.getProgress();
router.showScreen('title');
