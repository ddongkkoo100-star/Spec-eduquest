// ko-KR TTS 래퍼 — 갤럭시탭 크롬 방어 코드 포함.
// * 첫 발화는 반드시 사용자 제스처 이후 (init을 버튼 핸들러에서 호출)
// * getVoices() 비동기 로딩: voiceschanged + 폴링 이중 대기
// * 장문 끊김 버그: 문장 단위 발화 + onend 미발화 타임아웃 폴백

let warmed = false;

export function isSupported() {
  return typeof globalThis.speechSynthesis !== 'undefined' && typeof globalThis.SpeechSynthesisUtterance !== 'undefined';
}

/** 사용자 제스처 안에서 호출 — 무음 발화로 엔진 웜업 */
export function init() {
  if (!isSupported() || warmed) return;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    speechSynthesis.speak(u);
    speechSynthesis.cancel();
    warmed = true;
  } catch { /* 무시 */ }
}

/** ko-KR 목소리 목록 (비동기 로딩 대응: 이벤트 + 폴링) */
export function getKoreanVoices(timeoutMs = 5000) {
  if (!isSupported()) return Promise.resolve([]);
  return new Promise((resolve) => {
    const filter = (vs) => vs.filter((v) => (v.lang || '').toLowerCase().startsWith('ko'));
    const now = filter(speechSynthesis.getVoices());
    if (now.length) return resolve(now);

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearInterval(poll);
      clearTimeout(giveUp);
      resolve(filter(speechSynthesis.getVoices()));
    };
    speechSynthesis.addEventListener('voiceschanged', finish, { once: true });
    const poll = setInterval(() => {
      if (filter(speechSynthesis.getVoices()).length) finish();
    }, 200);
    const giveUp = setTimeout(finish, timeoutMs);
  });
}

export function stop() {
  if (isSupported()) speechSynthesis.cancel();
}

/**
 * 문장 1개 발화. onend 미발화 대비 타임아웃 폴백 포함.
 * @returns {Promise<void>}
 */
export function speak(text, { rate = 0.85, voiceURI = null } = {}) {
  if (!isSupported()) return Promise.resolve();
  return new Promise((resolve) => {
    speechSynthesis.cancel(); // 큐 청소
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    u.rate = rate;
    if (voiceURI) {
      const v = speechSynthesis.getVoices().find((x) => x.voiceURI === voiceURI);
      if (v) u.voice = v;
    }
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(fallback);
      resolve();
    };
    u.onend = finish;
    u.onerror = finish;
    // 예상 발화 시간의 2배 + 2초 후 강제 종료 처리 (onend 미발화 버그 대비)
    const estMs = Math.max(1500, (text.length / 3) * 1000 * (1 / rate));
    const fallback = setTimeout(() => {
      speechSynthesis.cancel();
      finish();
    }, estMs * 2 + 2000);
    speechSynthesis.speak(u);
  });
}

/**
 * 반복 낭독 (반복 사이 간격, AbortSignal로 중단 가능).
 */
export async function speakRepeated(text, { times = 2, gapMs = 2000, rate = 0.85, voiceURI = null, signal = null } = {}) {
  for (let i = 0; i < times; i++) {
    if (signal && signal.aborted) return;
    await speak(text, { rate, voiceURI });
    if (i < times - 1) {
      await new Promise((r) => setTimeout(r, gapMs));
    }
  }
}
