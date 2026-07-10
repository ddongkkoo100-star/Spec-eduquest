import { el, btn, longPress, toast } from '../ui.js';
import * as store from '../store.js';
import * as router from '../router.js';
import { GAMES } from '../games.js';
import { getSkin } from '../skins.js';

function gameTile(g) {
  const prog = store.getGame(g.world, g.id);
  const tile = el(
    'button',
    { class: `game-tile ${g.ready ? '' : 'locked'}`, style: `background:${g.grad};` },
    el('div', { class: 'icon', text: g.icon }),
    el('div', { text: g.name }),
    g.ready
      ? el('div', { class: 'stars', text: `Lv.${prog.level}  ⭐ ${prog.stars}` })
      : el('div', { class: 'stars', text: '🔒 공사중' })
  );
  tile.addEventListener('click', () => {
    if (!g.ready) {
      toast('아직 준비 중이에요! 곧 열릴 거예요 🛠️');
      return;
    }
    if (g.kind === 'dom') router.showScreen(g.scene);
    else router.launchGame(g.scene, { level: prog.level });
  });
  return tile;
}

export function mountWorldMap(root) {
  const p = store.getProgress();
  const skin = getSkin(p.equippedSkin);

  const top = el(
    'div',
    { class: 'eq-topbar' },
    el('span', { class: 'eq-chip', text: `${skin.emoji} ${skin.name}` }),
    el('span', { class: 'eq-chip', text: `🪙 ${p.coins}` }),
    el('span', { class: 'eq-chip', text: `🔥 ${p.streak.count}일` }),
    el('span', { class: 'spacer' }),
    btn('🏪 상점', () => router.showScreen('shop'), 'ghost')
  );

  // 부모 모드: 3초 길게 누르기
  const parentBtn = el('button', { class: 'eq-btn ghost', text: '⚙️', title: '부모 모드 (3초 길게 누르기)' });
  longPress(parentBtn, 3000, () => router.showScreen('parent'));
  top.append(parentBtn);

  const mathCard = el('div', { class: 'eq-card' }, el('div', { text: '🧮 수학 월드', style: 'font-size:26px;font-weight:800;margin-bottom:12px;' }));
  const mathGrid = el('div', { class: 'eq-grid cols2' });
  GAMES.filter((g) => g.world === 'math').forEach((g) => mathGrid.append(gameTile(g)));
  mathCard.append(mathGrid);

  const koCard = el('div', { class: 'eq-card' }, el('div', { text: '✍️ 국어 월드', style: 'font-size:26px;font-weight:800;margin-bottom:12px;' }));
  const koGrid = el('div', { class: 'eq-grid cols3' });
  GAMES.filter((g) => g.world === 'korean').forEach((g) => koGrid.append(gameTile(g)));
  koCard.append(koGrid);

  const wrap = el('div', { class: 'eq-screen' }, top, mathCard, koCard);
  root.append(wrap);
}
