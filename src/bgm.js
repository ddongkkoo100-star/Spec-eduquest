// WebAudio 신디 BGM — 외부 오디오 파일 없이 루프 시퀀서로 생성 (J7).
// 마스터 게인은 sfx와 공유하므로 음소거 토글이 함께 적용된다.
import { getBus } from './sfx.js';

// 음계 주파수 (C4 기준)
const N = {
  C4: 261.6, D4: 293.7, E4: 329.6, F4: 349.2, G4: 392, A4: 440, B4: 493.9,
  C5: 523.3, D5: 587.3, E5: 659.3, F5: 698.5, G5: 784, A5: 880,
  C3: 130.8, F3: 174.6, G3: 196, A3: 220,
  R: 0, // 쉼표
};

// 트랙: [멜로디, 베이스] 16스텝 패턴 (스텝당 1/8박)
export const TRACKS = {
  map: {
    bpm: 96,
    melody: [N.C5, N.R, N.E5, N.R, N.G5, N.R, N.E5, N.R, N.F5, N.R, N.E5, N.D5, N.C5, N.R, N.R, N.R],
    bass: [N.C3, N.R, N.G3, N.R, N.A3, N.R, N.G3, N.R, N.F3, N.R, N.G3, N.R, N.C3, N.R, N.G3, N.R],
  },
  game: {
    bpm: 122,
    melody: [N.E5, N.G5, N.A5, N.G5, N.E5, N.R, N.C5, N.R, N.D5, N.F5, N.G5, N.F5, N.D5, N.R, N.G4, N.R],
    bass: [N.A3, N.A3, N.R, N.A3, N.F3, N.F3, N.R, N.F3, N.G3, N.G3, N.R, N.G3, N.C3, N.R, N.G3, N.R],
  },
};

let timer = null;
let current = null;
let gain = null;

function playNote(ctx, dest, freq, t, dur, type, vol) {
  if (!freq) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export function start(trackName) {
  const bus = getBus();
  if (!bus) return false;
  if (current === trackName) return true;
  stop();
  const track = TRACKS[trackName];
  if (!track) return false;
  current = trackName;

  gain = bus.ctx.createGain();
  gain.gain.value = 0.5; // BGM은 효과음보다 낮게
  gain.connect(bus.master);

  const stepDur = 60 / track.bpm / 2; // 1/8박
  let step = 0;
  let nextT = bus.ctx.currentTime + 0.05;

  // 룩어헤드 스케줄러 (200ms 간격, 400ms 선행)
  timer = setInterval(() => {
    while (nextT < bus.ctx.currentTime + 0.4) {
      const i = step % 16;
      playNote(bus.ctx, gain, track.melody[i], nextT, stepDur * 0.9, 'triangle', 0.12);
      playNote(bus.ctx, gain, track.bass[i], nextT, stepDur * 0.95, 'square', 0.06);
      nextT += stepDur;
      step += 1;
    }
  }, 200);
  return true;
}

export function stop() {
  if (timer) clearInterval(timer);
  timer = null;
  current = null;
  if (gain) {
    gain.disconnect();
    gain = null;
  }
}

export function playing() {
  return current;
}
