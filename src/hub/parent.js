import { el, btn, segmented } from '../ui.js';
import * as store from '../store.js';
import * as sfx from '../sfx.js';
import * as router from '../router.js';

// 부모 모드 화면. 섹션은 페이즈 진행에 따라 추가된다.
// 확장 포인트: 다른 모듈이 등록한 섹션(급수표 관리, TTS 설정, 통계)을 순서대로 렌더.
const sections = [];
export function registerParentSection(title, mountFn) {
  sections.push({ title, mountFn });
}

export function mountParent(root) {
  const settings = store.getSettings();

  const top = el(
    'div',
    { class: 'eq-topbar' },
    btn('← 돌아가기', () => router.showScreen('worldmap'), 'ghost'),
    el('span', { class: 'spacer' }),
    el('span', { class: 'eq-chip', text: '⚙️ 부모 모드' })
  );

  // 공통 설정: 소리
  const soundCard = el(
    'div',
    { class: 'eq-card' },
    el('div', { text: '🔊 소리', style: 'font-size:23px;font-weight:800;margin-bottom:12px;' }),
    el(
      'div',
      { style: 'display:flex;align-items:center;gap:16px;' },
      el('span', { text: '효과음/배경음', style: 'font-size:19px;' }),
      segmented(
        [
          { label: '켜기', value: false },
          { label: '끄기', value: true },
        ],
        settings.muted,
        (muted) => {
          settings.muted = muted;
          store.saveSettings();
          sfx.setMuted(muted);
        }
      )
    )
  );

  const wrap = el('div', { class: 'eq-screen' }, top, el('div', { class: 'eq-title', text: '부모 설정' }), soundCard);

  for (const s of sections) {
    const card = el('div', { class: 'eq-card' }, el('div', { text: s.title, style: 'font-size:23px;font-weight:800;margin-bottom:12px;' }));
    s.mountFn(card);
    wrap.append(card);
  }

  // v2 예약: Anthropic API 비전 OCR 훅 (스펙 §5.1 — UI 미노출)
  // registerParentSection('📷 급수표 사진 인식(v2)', mountOcrSettings)

  root.append(wrap);
}
