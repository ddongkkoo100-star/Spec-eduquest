// DOM 공용 위젯 — pointer 이벤트 전용, 터치 타겟 48px 이상 (style.css의 .eq-btn 참조)
import * as sfx from './sfx.js';

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of children) {
    if (c == null) continue;
    node.append(c);
  }
  return node;
}

export function btn(label, onTap, cls = '') {
  const b = el('button', { class: `eq-btn ${cls}`, text: label });
  b.addEventListener('pointerdown', () => b.classList.add('pressed'));
  b.addEventListener('pointerup', () => b.classList.remove('pressed'));
  b.addEventListener('pointerleave', () => b.classList.remove('pressed'));
  b.addEventListener('click', (e) => {
    sfx.init();
    sfx.play('click');
    onTap(e);
  });
  return b;
}

/** 세그먼트 선택 (설정용) */
export function segmented(options, current, onChange) {
  const wrap = el('div', { class: 'seg' });
  const buttons = options.map((opt) => {
    const b = el('button', { text: opt.label });
    if (opt.value === current) b.classList.add('on');
    b.addEventListener('click', () => {
      buttons.forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      sfx.play('click');
      onChange(opt.value);
    });
    wrap.append(b);
    return b;
  });
  return wrap;
}

/**
 * 부모 모드 잠금: 3초 길게 누르기. 진행 링 표시.
 * @returns {Function} 정리 함수
 */
export function longPress(target, ms, onComplete) {
  let timer = null;
  let ring = null;
  const start = (e) => {
    e.preventDefault();
    ring = el('div', {
      style:
        'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:110px;height:110px;border-radius:50%;border:8px solid #4f8cff;border-top-color:#ffd54f;animation:eq-spin 1s linear infinite;z-index:200;pointer-events:none;',
    });
    if (!document.getElementById('eq-spin-style')) {
      const st = el('style', { id: 'eq-spin-style', text: '@keyframes eq-spin{to{transform:translate(-50%,-50%) rotate(360deg)}}' });
      document.head.append(st);
    }
    document.body.append(ring);
    timer = setTimeout(() => {
      cancel();
      onComplete();
    }, ms);
  };
  const cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    if (ring) ring.remove();
    ring = null;
  };
  target.addEventListener('pointerdown', start);
  target.addEventListener('pointerup', cancel);
  target.addEventListener('pointerleave', cancel);
  return () => {
    cancel();
    target.removeEventListener('pointerdown', start);
    target.removeEventListener('pointerup', cancel);
    target.removeEventListener('pointerleave', cancel);
  };
}

/** 모달. 반환된 close()로 닫음 */
export function modal(contentEl) {
  const bg = el('div', { class: 'eq-modal-bg' });
  const box = el('div', { class: 'eq-modal pop-in' });
  box.append(contentEl);
  bg.append(box);
  bg.addEventListener('click', (e) => {
    if (e.target === bg) close();
  });
  document.body.append(bg);
  function close() {
    bg.remove();
  }
  return close;
}

/** DOM 화면용 간단 토스트 */
export function toast(msg, ms = 1800) {
  const t = el('div', {
    class: 'pop-in',
    text: msg,
    style:
      'position:fixed;left:50%;bottom:40px;transform:translateX(-50%);background:rgba(0,0,0,.8);color:#fff;padding:14px 26px;border-radius:999px;font-size:20px;font-weight:700;z-index:300;',
  });
  document.body.append(t);
  setTimeout(() => t.remove(), ms);
}
