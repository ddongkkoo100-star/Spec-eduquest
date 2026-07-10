import { el, btn, toast } from '../ui.js';
import * as store from '../store.js';
import * as sfx from '../sfx.js';
import * as router from '../router.js';
import { SKINS } from '../skins.js';

export function mountShop(root) {
  const p = store.getProgress();

  const top = el(
    'div',
    { class: 'eq-topbar' },
    btn('← 돌아가기', () => router.showScreen('worldmap'), 'ghost'),
    el('span', { class: 'spacer' }),
    el('span', { class: 'eq-chip', text: `🪙 ${p.coins}` })
  );

  const grid = el('div', { class: 'eq-grid cols3' });
  for (const skin of SKINS) {
    const owned = p.unlockedSkins.includes(skin.id);
    const equipped = p.equippedSkin === skin.id;
    const card = el(
      'div',
      { class: 'eq-card', style: 'display:flex;flex-direction:column;align-items:center;gap:10px;margin:0;' },
      el('div', { text: skin.emoji, class: equipped ? 'breathe' : '', style: 'font-size:64px;' }),
      el('div', { text: skin.name, style: 'font-size:21px;font-weight:800;' })
    );
    if (equipped) {
      card.append(el('div', { class: 'eq-chip', text: '착용 중 ✅' }));
      card.style.outline = '3px solid #ffd54f';
    } else if (owned) {
      card.append(
        btn('착용하기', () => {
          store.equipSkin(skin.id);
          sfx.play('pop');
          rerender();
        }, 'green')
      );
    } else if (skin.price === null) {
      card.append(el('div', { class: 'eq-chip', text: `🎁 ${skin.reward}` }));
    } else {
      card.append(
        btn(`🪙 ${skin.price}`, () => {
          const r = store.buySkin(skin.id, skin.price);
          if (r.ok) {
            store.equipSkin(skin.id);
            sfx.play('levelup');
            toast(`${skin.name} 획득! 멋져요 ✨`);
            rerender();
          } else if (r.reason === 'coins') {
            sfx.play('wrong');
            toast('코인이 부족해요! 게임에서 코인을 모아보세요 🪙');
          }
        })
      );
    }
    grid.append(card);
  }

  const wrap = el(
    'div',
    { class: 'eq-screen' },
    top,
    el('div', { class: 'eq-title', text: '🏪 꾸미기 상점' }),
    grid
  );
  root.append(wrap);

  function rerender() {
    root.innerHTML = '';
    mountShop(root);
  }
}
