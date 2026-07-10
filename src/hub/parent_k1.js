// 부모 모드 — 급수표 관리 / TTS 설정 / 받아쓰기 통계 섹션
import { el, btn, segmented, modal, toast } from '../ui.js';
import * as store from '../store.js';
import * as tts from '../tts.js';
import { registerParentSection } from './parent.js';
import { parseGugupyo, serializeDoc, CLAUDE_PROMPT_TEMPLATE } from '../curriculum/gugupyo_parser.js';
import { listMistakes, topMistakes } from '../curriculum/mistakes.js';

// ---------- 급수표 관리 ----------
function mountGugupyo(card) {
  const listWrap = el('div');
  card.append(listWrap);

  async function refresh() {
    listWrap.innerHTML = '';
    const docs = await store.idbAll('gugupyo');
    if (docs.length === 0) {
      listWrap.append(el('div', { text: '등록된 급수표가 없어요. 아래에서 추가해 주세요.', style: 'opacity:.8;margin-bottom:10px;font-size:18px;' }));
    }
    for (const doc of docs) {
      const count = doc.sets.reduce((n, s) => n + s.items.length, 0);
      const row = el(
        'div',
        { style: 'display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap;' },
        el('span', { text: `📘 ${doc.title} — ${doc.sets.length}개 급수, ${count}문장`, style: 'font-size:18px;flex:1;min-width:200px;' }),
        btn('편집', () => openEditor(doc), 'ghost'),
        btn('삭제', async () => {
          if (!confirm(`"${doc.title}" 급수표를 삭제할까요?`)) return;
          await store.idbDelete('gugupyo', doc.id);
          toast('삭제했어요.');
          refresh();
        }, 'ghost')
      );
      listWrap.append(row);
    }
  }

  // Claude 변환 요청문 복사
  card.append(
    el('div', { style: 'display:flex;gap:10px;flex-wrap:wrap;margin:12px 0;' },
      btn('📋 Claude 변환 요청문 복사', async () => {
        try {
          await navigator.clipboard.writeText(CLAUDE_PROMPT_TEMPLATE);
          toast('복사 완료! Claude 챗에 급수표 사진과 함께 붙여넣어 주세요.');
        } catch {
          prompt('아래 내용을 복사해 주세요:', CLAUDE_PROMPT_TEMPLATE);
        }
      }, 'ghost'),
      btn('➕ 새 급수표 등록', () => openEditor(null), 'green')
    )
  );

  card.append(el('div', {
    style: 'font-size:16px;opacity:.7;line-height:1.6;',
    text: '사용법: ① 위 버튼으로 요청문을 복사해 Claude 챗에 급수표 사진과 함께 보내기 ② 받은 JSON을 "새 급수표 등록"에 붙여넣기 ③ 검증 후 저장. 직접 한 줄씩 입력해도 돼요 (빈 줄 = 급수 구분, "1급" 헤더 지원).',
  }));

  function openEditor(doc) {
    const isNew = !doc;
    const content = el('div');
    content.append(el('div', { text: isNew ? '새 급수표 등록' : '급수표 편집', style: 'font-size:24px;font-weight:800;margin-bottom:12px;' }));

    const titleInput = el('input', { class: 'eq-input', value: doc ? doc.title : '', placeholder: '제목 (예: 2학기 받아쓰기)', style: 'margin-bottom:10px;' });
    const ta = el('textarea', { class: 'eq-input', placeholder: 'JSON 또는 줄 형식을 붙여넣어 주세요.\n\n줄 형식 예:\n1급\n바닷가에 갔어요.\n모래성을 쌓았어요.\n\n2급\n...', style: 'min-height:220px;margin-bottom:10px;' });
    if (doc) ta.value = serializeDoc(doc);

    const preview = el('div', { style: 'font-size:17px;margin-bottom:10px;min-height:24px;' });
    content.append(titleInput, ta, preview);

    let parsed = null;
    content.append(
      el('div', { style: 'display:flex;gap:10px;' },
        btn('검증하기', () => {
          const r = parseGugupyo(ta.value);
          if (!r.ok) {
            parsed = null;
            preview.textContent = `⚠️ ${r.error}`;
            preview.style.color = '#ff8a8a';
            return;
          }
          parsed = r.doc;
          const count = parsed.sets.reduce((n, s) => n + s.items.length, 0);
          preview.textContent = `✅ ${parsed.sets.length}개 급수, 총 ${count}문장 — 저장할 수 있어요.`;
          preview.style.color = '#8affa5';
        }, 'ghost'),
        btn('저장', async () => {
          if (!parsed) {
            const r = parseGugupyo(ta.value);
            if (!r.ok) {
              preview.textContent = `⚠️ ${r.error}`;
              preview.style.color = '#ff8a8a';
              return;
            }
            parsed = r.doc;
          }
          const title = titleInput.value.trim() || parsed.title;
          const record = { title, sets: parsed.sets };
          if (doc) record.id = doc.id;
          await store.idbPut('gugupyo', record);
          toast('저장했어요!');
          close();
          refresh();
        }, 'green')
      )
    );
    const close = modal(content);
  }

  refresh();
}

// ---------- TTS 설정 ----------
function mountTtsSettings(card) {
  const s = store.getSettings();

  const row = (labelText, control) =>
    el('div', { style: 'display:flex;align-items:center;gap:14px;margin-bottom:12px;flex-wrap:wrap;' },
      el('span', { text: labelText, style: 'font-size:19px;min-width:110px;' }), control);

  card.append(
    row('속도', segmented(
      [{ label: '느리게', value: 0.7 }, { label: '보통', value: 0.85 }, { label: '빠르게', value: 1.0 }],
      s.tts.rate,
      (v) => { s.tts.rate = v; store.saveSettings(); }
    )),
    row('반복 횟수', segmented(
      [{ label: '2회', value: 2 }, { label: '3회', value: 3 }],
      s.tts.repeats,
      (v) => { s.tts.repeats = v; store.saveSettings(); }
    )),
    row('휴지 시간', segmented(
      [{ label: '5초', value: 5 }, { label: '10초', value: 10 }, { label: '15초', value: 15 }],
      s.tts.pauseSec,
      (v) => { s.tts.pauseSec = v; s.tts.manualAdvance = false; store.saveSettings(); }
    )),
    row('진행 방식', segmented(
      [{ label: '자동', value: false }, { label: '수동', value: true }],
      s.tts.manualAdvance,
      (v) => { s.tts.manualAdvance = v; store.saveSettings(); }
    ))
  );

  // 목소리 선택 (비동기 로딩)
  const voiceRow = el('div', { style: 'display:flex;align-items:center;gap:14px;margin-bottom:12px;flex-wrap:wrap;' });
  voiceRow.append(el('span', { text: '목소리', style: 'font-size:19px;min-width:110px;' }));
  const sel = el('select', { class: 'eq-input', style: 'max-width:340px;' });
  voiceRow.append(sel);
  card.append(voiceRow);

  if (!tts.isSupported()) {
    sel.replaceWith(el('span', { text: '이 기기는 음성을 지원하지 않아요.', style: 'opacity:.7;' }));
  } else {
    tts.getKoreanVoices().then((voices) => {
      sel.innerHTML = '';
      sel.append(el('option', { value: '', text: '기본 목소리' }));
      voices.forEach((v) => sel.append(el('option', { value: v.voiceURI, text: v.name })));
      if (s.tts.voiceURI) sel.value = s.tts.voiceURI;
      sel.addEventListener('change', () => {
        s.tts.voiceURI = sel.value || null;
        store.saveSettings();
      });
    });
    card.append(
      btn('🔊 미리 듣기', () => {
        tts.init();
        tts.speak('안녕하세요. 받아쓰기를 시작하겠습니다.', { rate: s.tts.rate, voiceURI: s.tts.voiceURI });
      }, 'ghost')
    );
  }
}

// ---------- 통계 ----------
function mountStats(card) {
  (async () => {
    const stats = await store.idbAll('stats');
    const docs = await store.idbAll('gugupyo');
    const titleOf = (docId) => (docs.find((d) => String(d.id) === String(docId)) || {}).title || '삭제된 급수표';

    if (stats.length === 0) {
      card.append(el('div', { text: '아직 받아쓰기 기록이 없어요.', style: 'opacity:.8;font-size:18px;' }));
    } else {
      const table = el('div', { style: 'font-size:18px;line-height:1.9;' });
      for (const st of stats) {
        const [docId, level] = st.key.split(':');
        const pct = st.total ? Math.round((st.correct / st.total) * 100) : 0;
        table.append(el('div', { text: `${titleOf(docId)} ${level}급 — 정답률 ${pct}% (${st.correct}/${st.total}, ${st.runs}회 도전)` }));
      }
      card.append(table);
    }

    const mistakes = await listMistakes();
    if (mistakes.length > 0) {
      card.append(el('div', { text: '자주 틀리는 문장 Top 5', style: 'font-size:20px;font-weight:800;margin:14px 0 6px;' }));
      const list = el('div', { style: 'font-size:18px;line-height:1.9;' });
      topMistakes(mistakes, 5).forEach((m, i) => {
        list.append(el('div', { text: `${i + 1}. "${m.text}" — ${m.wrongCount}번 틀림` }));
      });
      card.append(list);
    }
  })();
}

registerParentSection('📚 받아쓰기 급수표 관리', mountGugupyo);
registerParentSection('🗣️ 받아쓰기 음성(TTS) 설정', mountTtsSettings);
registerParentSection('📊 받아쓰기 통계', mountStats);
