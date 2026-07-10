import { describe, it, expect } from 'vitest';
import { PRESETS, comboPitchScale, play, setMuted, isMuted } from '../src/sfx.js';

describe('sfx 신디사이저 프리셋', () => {
  it('효과음 최소 8종 (J7)', () => {
    expect(Object.keys(PRESETS).length).toBeGreaterThanOrEqual(8);
  });

  it('필수 프리셋 존재: coin, wrong, star, levelup', () => {
    for (const name of ['coin', 'wrong', 'star', 'levelup']) {
      expect(PRESETS[name]).toBeTruthy();
    }
  });

  it('모든 프리셋은 유효한 파형/노트/길이를 가짐', () => {
    const validTypes = ['sine', 'square', 'triangle', 'sawtooth'];
    for (const [name, p] of Object.entries(PRESETS)) {
      expect(validTypes, name).toContain(p.type);
      expect(p.notes.length, name).toBeGreaterThan(0);
      p.notes.forEach((f) => expect(f).toBeGreaterThan(20));
      expect(p.noteDur, name).toBeGreaterThan(0);
      expect(p.gain, name).toBeGreaterThan(0);
      expect(p.gain, name).toBeLessThanOrEqual(0.5); // 아이 청력 보호 상한
    }
  });

  it('coin은 상승 아르페지오 (노트가 단조 증가)', () => {
    const n = PRESETS.coin.notes;
    for (let i = 1; i < n.length; i++) expect(n[i]).toBeGreaterThan(n[i - 1]);
  });

  it('wrong은 낮은 주파수 (300Hz 미만)', () => {
    PRESETS.wrong.notes.forEach((f) => expect(f).toBeLessThan(300));
  });
});

describe('콤보 피치 상승', () => {
  it('콤보가 오르면 피치 배율 단조 증가', () => {
    let prev = 0;
    for (let c = 0; c <= 12; c++) {
      const s = comboPitchScale(c);
      expect(s).toBeGreaterThan(prev);
      prev = s;
    }
  });

  it('12콤보에서 정확히 한 옥타브(×2), 이후 상한 유지', () => {
    expect(comboPitchScale(12)).toBeCloseTo(2);
    expect(comboPitchScale(30)).toBeCloseTo(2);
  });
});

describe('재생 가드', () => {
  it('알 수 없는 이름 → false (크래시 없음)', () => {
    expect(play('없는소리')).toBe(false);
  });

  it('AudioContext 없는 환경에서도 play는 false 반환', () => {
    expect(play('coin')).toBe(false);
  });

  it('음소거 토글 상태 유지', () => {
    setMuted(true);
    expect(isMuted()).toBe(true);
    setMuted(false);
    expect(isMuted()).toBe(false);
  });
});
