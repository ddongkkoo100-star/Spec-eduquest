// 받아쓰기 급수표 파서 — JSON 우선, 실패 시 줄 단위 폴백.
// 원칙: 문장 원문은 절대 수정하지 않는다 (번호 접두·양끝 공백 제거만 허용).

export const CLAUDE_PROMPT_TEMPLATE = `다음 받아쓰기 급수표 사진을 아래 JSON 형식으로 변환해줘. 문장 원문을 절대 수정하지 말 것.
{ "title": "1학기 받아쓰기", "sets": [ { "level": 1, "items": ["문장1", "문장2"] } ] }`;

/** 줄 앞 번호 제거: "1. " "2) " "(3) " "① " "- " */
export function stripNumbering(line) {
  return line
    .replace(/^\s*\(\d{1,2}\)\s*/, '')
    .replace(/^\s*\d{1,2}\s*[.)]\s*/, '')
    .replace(/^\s*[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮]\s*/, '')
    .replace(/^\s*-\s+/, '')
    .trim();
}

/** "1급" "제2급수" "3단계" "4회" 형태의 급수 헤더인지 판별 → 레벨 번호 또는 null */
export function parseSetHeader(line) {
  const m = line.trim().match(/^제?\s*(\d{1,2})\s*(급수?|단계|회)\s*$/);
  return m ? parseInt(m[1], 10) : null;
}

function fail(error) {
  return { ok: false, error };
}

function validateDoc(j) {
  if (!j || typeof j !== 'object' || Array.isArray(j)) return fail('JSON 최상위는 { } 객체여야 해요.');
  const title = typeof j.title === 'string' && j.title.trim() ? j.title.trim() : '받아쓰기';
  if (!Array.isArray(j.sets) || j.sets.length === 0) return fail('"sets" 목록이 비어 있어요.');
  const sets = [];
  for (let i = 0; i < j.sets.length; i++) {
    const s = j.sets[i];
    if (!s || typeof s !== 'object') return fail(`${i + 1}번째 급수 항목이 올바르지 않아요.`);
    const level = Number.isFinite(s.level) ? s.level : i + 1;
    if (!Array.isArray(s.items)) return fail(`${i + 1}번째 급수의 "items"가 목록이 아니에요.`);
    const items = s.items.filter((it) => typeof it === 'string').map((it) => it.trim()).filter((it) => it.length > 0);
    if (items.length === 0) return fail(`${i + 1}번째 급수에 문장이 없어요.`);
    sets.push({ level, items });
  }
  return { ok: true, doc: { title, sets } };
}

/** 줄 단위 폴백: 빈 줄로 급수 구분, "1급" 헤더 지원, 번호 접두 제거 */
function parseLines(text) {
  const lines = text.split(/\r?\n/);
  const sets = [];
  let cur = null;
  let nextLevel = 1;

  const flush = () => {
    if (cur && cur.items.length > 0) sets.push(cur);
    cur = null;
  };

  for (const raw of lines) {
    if (raw.trim() === '') {
      flush();
      continue;
    }
    const headerLevel = parseSetHeader(raw);
    if (headerLevel !== null) {
      flush();
      cur = { level: headerLevel, items: [] };
      nextLevel = headerLevel + 1;
      continue;
    }
    const item = stripNumbering(raw);
    if (!item) continue;
    if (!cur) {
      cur = { level: nextLevel, items: [] };
      nextLevel += 1;
    }
    cur.items.push(item);
  }
  flush();

  if (sets.length === 0) return fail('문장을 찾지 못했어요. 한 줄에 한 문장씩 입력해 주세요.');
  return { ok: true, doc: { title: '받아쓰기', sets } };
}

/**
 * 급수표 텍스트 파싱.
 * @returns {{ok:true, doc:{title:string, sets:{level:number, items:string[]}[]}} | {ok:false, error:string}}
 */
export function parseGugupyo(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return fail('내용이 비어 있어요.');

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return validateDoc(JSON.parse(trimmed));
    } catch (e) {
      return fail(`JSON 형식이 잘못되었어요. 붙여넣기가 중간에 잘리지 않았는지 확인해 주세요. (${e.message})`);
    }
  }
  return parseLines(trimmed);
}

/** 편집 화면용 직렬화: 파서(줄 형식)와 왕복 가능 */
export function serializeDoc(doc) {
  return doc.sets
    .map((s) => `${s.level}급\n${s.items.join('\n')}`)
    .join('\n\n');
}
