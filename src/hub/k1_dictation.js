// K-1 받아쓰기 스튜디오 (아이 모드) — DOM 기반.
// 플로우: 급수 선택 → 준비 → [낭독→받아쓰기→공개→자기채점]×N → 결과
import { el, btn, toast } from '../ui.js';
import * as store from '../store.js';
import * as sfx from '../sfx.js';
import * as tts from '../tts.js';
import * as router from '../router.js';
import { recordWrong, recordRetryResult, listMistakes } from '../curriculum/mistakes.js';

const RETRY_DOC_ID = '__retry__';

export function mountDictation(root) {
  renderSetSelect(root);
}

// ---------- 1. 급수 선택 ----------
async function renderSetSelect(root) {
  root.innerHTML = '';
  const wrap = el('div', { class: 'eq-screen' });
  wrap.append(
    el(
      'div',
      { class: 'eq-topbar' },
      btn('← 돌아가기', () => router.showScreen('worldmap'), 'ghost'),
      el('span', { class: 'spacer' }),
      el('span', { class: 'eq-chip', text: '🎙️ 받아쓰기 스튜디오' })
    )
  );

  const docs = await store.idbAll('gugupyo');
  const mistakes = await listMistakes();

  if (docs.length === 0 && mistakes.length === 0) {
    wrap.append(
      el('div', { class: 'eq-card', style: 'text-align:center;padding:40px;' },
        el('div', { text: '📋', style: 'font-size:64px;margin-bottom:12px;' }),
        el('div', { text: '아직 급수표가 없어요.', style: 'font-size:24px;font-weight:800;margin-bottom:8px;' }),
        el('div', { text: '부모님과 함께 ⚙️ 부모 모드에서 급수표를 등록해 주세요!', style: 'font-size:19px;opacity:.85;' }))
    );
    root.append(wrap);
    return;
  }

  // 오답노트 "다시 도전" 가상 급수
  if (mistakes.length > 0) {
    const retryCard = el('div', { class: 'eq-card', style: 'border:3px solid #ffd54f;' });
    retryCard.append(el('div', { text: `🔁 다시 도전! (틀렸던 문장 ${mistakes.length}개)`, style: 'font-size:23px;font-weight:800;margin-bottom:10px;' }));
    retryCard.append(
      btn('도전하기', () => {
        const items = mistakes.map((m) => m.text);
        startSession(root, { docId: RETRY_DOC_ID, docTitle: '다시 도전', level: 0, items, isRetry: true });
      }, 'green')
    );
    wrap.append(retryCard);
  }

  for (const doc of docs) {
    const card = el('div', { class: 'eq-card' });
    card.append(el('div', { text: `📘 ${doc.title}`, style: 'font-size:23px;font-weight:800;margin-bottom:12px;' }));
    const grid = el('div', { class: 'eq-grid cols3' });
    const done = store.getGame('korean', 'k1').completedSets || [];
    for (const set of doc.sets) {
      const key = `${doc.id}:${set.level}`;
      const b = btn(`${set.level}급 ${done.includes(key) ? '✅' : ''}`, () => {
        startSession(root, { docId: doc.id, docTitle: doc.title, level: set.level, items: set.items, isRetry: false });
      });
      grid.append(b);
    }
    card.append(grid);
    wrap.append(card);
  }

  root.append(wrap);
}

// ---------- 2. 준비 화면 ----------
function startSession(root, session) {
  root.innerHTML = '';
  tts.init(); // 사용자 제스처 컨텍스트에서 웜업
  const wrap = el('div', { class: 'eq-screen', style: 'justify-content:center;gap:20px;' });
  wrap.append(
    el('div', { text: '✏️', class: 'breathe', style: 'font-size:100px;' }),
    el('div', { text: '연필 준비!', style: 'font-size:44px;font-weight:800;' }),
    el('div', { text: `${session.docTitle} · ${session.isRetry ? '다시 도전' : session.level + '급'} · 문장 ${session.items.length}개`, style: 'font-size:22px;opacity:.85;' }),
    el('div', { text: '공책에 손으로 예쁘게 써 보세요.', style: 'font-size:20px;opacity:.75;' }),
    btn('시작!', () => runSentence(root, session, 0, { correct: 0, results: [] }), 'big green')
  );
  root.append(wrap);
}

// ---------- 3. 문장 진행 ----------
function runSentence(root, session, idx, acc) {
  if (idx >= session.items.length) {
    return renderResult(root, session, acc);
  }
  root.innerHTML = '';
  const settings = store.getSettings().tts;
  const sentence = session.items[idx];
  const abort = new AbortController();

  const wrap = el('div', { class: 'eq-screen', style: 'justify-content:center;gap:22px;' });
  const speaker = el('div', { text: '🔊', style: 'font-size:96px;transition:transform .2s;' });
  const status = el('div', { text: '잘 들어 보세요…', style: 'font-size:26px;font-weight:700;opacity:.9;' });
  const counter = el('div', { class: 'eq-chip', text: `${idx + 1} / ${session.items.length} 문장` });

  const listenBtn = btn('🔊 다시 듣기', async () => {
    speaker.classList.add('breathe');
    await tts.speak(sentence, { rate: settings.rate, voiceURI: settings.voiceURI });
    speaker.classList.remove('breathe');
  }, '');

  const doneBtn = btn('다 썼어요!', () => {
    abort.abort();
    tts.stop();
    renderReveal(root, session, idx, acc);
  }, 'big green');

  // TTS 미지원 폴백: 부모가 읽어주기 카드
  if (!tts.isSupported()) {
    status.textContent = '소리를 지원하지 않는 기기예요 — 부모님이 읽어주세요';
    const card = el('div', { class: 'eq-card', style: 'text-align:center;' });
    const hidden = el('div', { text: '(부모님만 보기) 👆 눌러서 확인', style: 'font-size:22px;padding:20px;cursor:pointer;' });
    let shown = false;
    hidden.addEventListener('click', () => {
      shown = !shown;
      hidden.textContent = shown ? sentence : '(부모님만 보기) 👆 눌러서 확인';
    });
    card.append(hidden);
    wrap.append(counter, status, card, doneBtn);
    root.append(wrap);
    return;
  }

  wrap.append(counter, speaker, status, el('div', { style: 'display:flex;gap:16px;' }, listenBtn, doneBtn));

  // 자동 진행 카운트다운 표시
  const autoInfo = el('div', { text: '', style: 'font-size:18px;opacity:.6;' });
  wrap.append(autoInfo);
  root.append(wrap);

  // 자동 낭독 (설정 횟수, 간격 2초) → 휴지 → 자동 공개(또는 수동)
  (async () => {
    speaker.classList.add('breathe');
    status.textContent = '잘 들어 보세요…';
    await tts.speakRepeated(sentence, {
      times: settings.repeats,
      gapMs: 2000,
      rate: settings.rate,
      voiceURI: settings.voiceURI,
      signal: abort.signal,
    });
    if (abort.signal.aborted) return;
    speaker.classList.remove('breathe');
    status.textContent = '공책에 써 보세요 ✏️';

    if (!settings.manualAdvance) {
      let remain = settings.pauseSec;
      autoInfo.textContent = `${remain}초 뒤에 정답이 나와요`;
      const iv = setInterval(() => {
        if (abort.signal.aborted) return clearInterval(iv);
        remain -= 1;
        if (remain <= 0) {
          clearInterval(iv);
          renderReveal(root, session, idx, acc);
        } else {
          autoInfo.textContent = `${remain}초 뒤에 정답이 나와요`;
        }
      }, 1000);
      abort.signal.addEventListener('abort', () => clearInterval(iv));
    }
  })();
}

// ---------- 4. 정답 공개 + 자기채점 ----------
function renderReveal(root, session, idx, acc) {
  root.innerHTML = '';
  tts.stop();
  const sentence = session.items[idx];

  const wrap = el('div', { class: 'eq-screen', style: 'justify-content:center;gap:26px;' });
  wrap.append(
    el('div', { class: 'eq-chip', text: `${idx + 1} / ${session.items.length} 문장` }),
    el('div', { text: '정답을 확인해 보세요!', style: 'font-size:24px;opacity:.85;' }),
    el('div', {
      class: 'eq-card pop-in',
      text: sentence,
      style: 'font-size:40px;font-weight:800;text-align:center;padding:44px;line-height:1.5;max-width:1000px;',
    }),
    el('div', { text: '내가 쓴 글씨와 똑같은가요?', style: 'font-size:22px;opacity:.85;' }),
    el(
      'div',
      { style: 'display:flex;gap:24px;' },
      btn('⭕ 맞았어요', async () => {
        sfx.play('coin');
        await gradeSentence(session, sentence, true);
        acc.correct += 1;
        acc.results.push({ sentence, correct: true });
        runSentence(root, session, idx + 1, acc);
      }, 'big green'),
      btn('❌ 틀렸어요', async () => {
        sfx.play('pop'); // 벌점 느낌 없는 가벼운 소리
        const { graduatedInfo } = await gradeSentence(session, sentence, false);
        acc.results.push({ sentence, correct: false });
        if (!graduatedInfo) toast('괜찮아요! 오답노트에 담아뒀어요 📝');
        runSentence(root, session, idx + 1, acc);
      }, 'big red')
    )
  );
  root.append(wrap);
}

async function gradeSentence(session, sentence, correct) {
  if (session.isRetry) {
    const { graduated } = await recordRetryResult(sentence, correct);
    if (graduated) {
      sfx.play('levelup');
      toast(`🎓 "${sentence}" 졸업! 이제 완벽해요!`);
      return { graduatedInfo: true };
    }
    return { graduatedInfo: false };
  }
  if (!correct) await recordWrong(sentence, { docId: session.docId, level: session.level });
  return { graduatedInfo: false };
}

// ---------- 5. 결과 ----------
async function renderResult(root, session, acc) {
  root.innerHTML = '';
  const total = session.items.length;
  const ratio = total ? acc.correct / total : 0;
  const stars = ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : 1;
  const coins = acc.correct * 10 + 50;

  // 통계 누적 (부모 모드용)
  if (!session.isRetry) {
    const key = `${session.docId}:${session.level}`;
    try {
      const prev = (await store.idbGet('stats', key)) || { key, total: 0, correct: 0, runs: 0 };
      prev.total += total;
      prev.correct += acc.correct;
      prev.runs += 1;
      await store.idbPut('stats', prev);
    } catch { /* 통계 실패는 치명적이지 않음 */ }

    // 완료 회차 기록
    const g = store.getGame('korean', 'k1');
    const done = g.completedSets || [];
    const key2 = `${session.docId}:${session.level}`;
    if (!done.includes(key2)) done.push(key2);
    store.updateGame('korean', 'k1', { completedSets: done });
  }

  const r = store.recordStageClear('korean', 'k1', { stars, coins, levelUp: false });

  const wrap = el('div', { class: 'eq-screen', style: 'justify-content:center;gap:18px;' });
  wrap.append(
    el('div', { text: '🎉 받아쓰기 끝!', class: 'pop-in', style: 'font-size:48px;font-weight:800;' }),
    el('div', { text: '⭐'.repeat(stars) + '☆'.repeat(3 - stars), class: 'pop-in', style: 'font-size:64px;' }),
    el('div', { text: `${total}문장 중 ${acc.correct}개 맞았어요!`, style: 'font-size:28px;font-weight:700;' }),
    el('div', { class: 'eq-chip', text: `🪙 +${coins}  (모두 ${r.coins})`, style: 'font-size:24px;' })
  );
  if (r.streakReward) {
    wrap.append(el('div', { text: '🔥 7일 연속 달성! 특별 스킨 획득! 👑', style: 'font-size:22px;color:#ffd54f;' }));
  }
  const wrongList = acc.results.filter((x) => !x.correct);
  if (wrongList.length > 0 && !session.isRetry) {
    wrap.append(el('div', { text: `틀린 ${wrongList.length}문장은 "다시 도전"에서 연습할 수 있어요 💪`, style: 'font-size:20px;opacity:.85;' }));
  }
  wrap.append(btn('확인', () => router.showScreen('worldmap'), 'big green'));
  root.append(wrap);
  sfx.play('levelup');
}
