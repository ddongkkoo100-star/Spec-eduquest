// WebAudio 신디사이저 효과음 — 외부 오디오 파일 없이 전 효과음 생성.
// PRESETS는 데이터로 분리해 단위 테스트 가능.

export const PRESETS = {
  // 코인: 상승 아르페지오
  coin:    { type: 'square',   notes: [880, 1174.7, 1568],        noteDur: 0.07, gain: 0.18 },
  // 오답: 낮은 사각파 둔탁음
  wrong:   { type: 'square',   notes: [196, 146.8],               noteDur: 0.16, gain: 0.22 },
  // 버튼/팝
  pop:     { type: 'sine',     notes: [523.3],  slideTo: 784,     noteDur: 0.09, gain: 0.2 },
  click:   { type: 'triangle', notes: [660],                      noteDur: 0.05, gain: 0.15 },
  // 별 등장 "팡!"
  star:    { type: 'triangle', notes: [1046.5], slideTo: 1568,    noteDur: 0.18, gain: 0.22 },
  // 레벨업 팡파르
  levelup: { type: 'square',   notes: [523.3, 659.3, 784, 1046.5], noteDur: 0.12, gain: 0.2 },
  // 시계 째깍 / 카운트다운
  tick:    { type: 'square',   notes: [1200],                     noteDur: 0.03, gain: 0.1 },
  // 휙 지나감 / 점프
  whoosh:  { type: 'sawtooth', notes: [300],    slideTo: 90,      noteDur: 0.22, gain: 0.12 },
  jump:    { type: 'sine',     notes: [400],    slideTo: 800,     noteDur: 0.15, gain: 0.18 },
  // 물 풍덩 (하강 + 노이즈 느낌의 낮은 삼각파)
  splash:  { type: 'triangle', notes: [220],    slideTo: 60,      noteDur: 0.3,  gain: 0.2 },
  // 참격
  slice:   { type: 'sawtooth', notes: [1800],   slideTo: 400,     noteDur: 0.1,  gain: 0.16 },
  // 합체/변신 반짝
  merge:   { type: 'sine',     notes: [523.3, 784, 1046.5, 1568], noteDur: 0.06, gain: 0.16 },
};

// 콤보 n회째 정답음 주파수 배율: 반음씩 상승, 12콤보에서 한 옥타브
export function comboPitchScale(combo) {
  const c = Math.max(0, Math.min(12, combo | 0));
  return Math.pow(2, c / 12);
}

let ctx = null;
let master = null;
let muted = false;

export function isMuted() {
  return muted;
}

export function setMuted(m) {
  muted = !!m;
  if (master) master.gain.value = muted ? 0 : 1;
  return muted;
}

/** 첫 사용자 제스처에서 호출 — AudioContext 생성/재개 */
export function init() {
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return false;
  if (!ctx) {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return true;
}

/**
 * 효과음 재생. @param {string} name PRESETS 키 @param {{combo?:number, detune?:number}} opts
 * @returns {boolean} 재생 여부 (컨텍스트 없음/음소거/알 수 없는 이름 → false)
 */
export function play(name, opts = {}) {
  const p = PRESETS[name];
  if (!p) return false;
  if (!ctx || muted) return false;
  const scale = opts.combo ? comboPitchScale(opts.combo) : 1;
  const t0 = ctx.currentTime;
  p.notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = p.type;
    const start = t0 + i * p.noteDur;
    const end = start + p.noteDur * (p.slideTo ? 1.4 : 1.1);
    osc.frequency.setValueAtTime(freq * scale, start);
    if (p.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, p.slideTo * scale), end);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(p.gain, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(g).connect(master);
    osc.start(start);
    osc.stop(end + 0.02);
  });
  return true;
}
