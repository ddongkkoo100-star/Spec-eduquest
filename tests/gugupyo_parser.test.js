import { describe, it, expect } from 'vitest';
import { parseGugupyo, stripNumbering, parseSetHeader, serializeDoc } from '../src/curriculum/gugupyo_parser.js';

describe('급수표 파서 — JSON 경로', () => {
  it('정상 JSON 파싱', () => {
    const r = parseGugupyo(JSON.stringify({
      title: '1학기 받아쓰기',
      sets: [{ level: 1, items: ['바닷가에 갔어요.', '모래성을 쌓았어요.'] }],
    }));
    expect(r.ok).toBe(true);
    expect(r.doc.title).toBe('1학기 받아쓰기');
    expect(r.doc.sets[0].items.length).toBe(2);
  });

  it('title 없으면 기본 제목', () => {
    const r = parseGugupyo(JSON.stringify({ sets: [{ level: 1, items: ['안녕'] }] }));
    expect(r.ok).toBe(true);
    expect(r.doc.title).toBe('받아쓰기');
  });

  it('level 없으면 순번 자동 부여', () => {
    const r = parseGugupyo(JSON.stringify({ sets: [{ items: ['가'] }, { items: ['나'] }] }));
    expect(r.doc.sets.map((s) => s.level)).toEqual([1, 2]);
  });

  it('sets 누락 → 한국어 에러', () => {
    const r = parseGugupyo('{"title":"x"}');
    expect(r.ok).toBe(false);
    expect(r.error).toContain('sets');
  });

  it('items가 배열이 아니면 에러', () => {
    const r = parseGugupyo(JSON.stringify({ sets: [{ level: 1, items: '문장' }] }));
    expect(r.ok).toBe(false);
  });

  it('빈 items 급수 → 에러', () => {
    const r = parseGugupyo(JSON.stringify({ sets: [{ level: 1, items: [] }] }));
    expect(r.ok).toBe(false);
  });

  it('깨진 JSON({로 시작) → JSON 안내 에러', () => {
    const r = parseGugupyo('{"title": "받아쓰기", "sets": [ {broken');
    expect(r.ok).toBe(false);
    expect(r.error).toContain('JSON');
  });

  it('문장 원문은 수정하지 않음 (내부 공백·문장부호 보존)', () => {
    const s = '아기 곰이  "안녕!" 하고 인사했어요.';
    const r = parseGugupyo(JSON.stringify({ sets: [{ level: 1, items: [s] }] }));
    expect(r.doc.sets[0].items[0]).toBe(s);
  });
});

describe('급수표 파서 — 줄 단위 폴백', () => {
  it('한 줄에 한 문장, 단일 급수', () => {
    const r = parseGugupyo('바닷가에 갔어요.\n모래성을 쌓았어요.');
    expect(r.ok).toBe(true);
    expect(r.doc.sets.length).toBe(1);
    expect(r.doc.sets[0].items).toEqual(['바닷가에 갔어요.', '모래성을 쌓았어요.']);
  });

  it('빈 줄로 급수 구분', () => {
    const r = parseGugupyo('가나다\n라마바\n\n사아자\n차카타');
    expect(r.doc.sets.length).toBe(2);
    expect(r.doc.sets[1].items).toEqual(['사아자', '차카타']);
  });

  it('"1." "2)" "(3)" "①" 번호 접두 제거', () => {
    expect(stripNumbering('1. 학교에 가요.')).toBe('학교에 가요.');
    expect(stripNumbering('2) 밥을 먹어요.')).toBe('밥을 먹어요.');
    expect(stripNumbering('(3) 잠을 자요.')).toBe('잠을 자요.');
    expect(stripNumbering('① 노래해요.')).toBe('노래해요.');
  });

  it('문장 안의 숫자는 지우지 않음', () => {
    expect(stripNumbering('사과 3개를 먹었어요.')).toBe('사과 3개를 먹었어요.');
    expect(stripNumbering('1. 사과 3개를 먹었어요.')).toBe('사과 3개를 먹었어요.');
  });

  it('"1급" "제2급수" "3단계" 헤더 인식', () => {
    expect(parseSetHeader('1급')).toBe(1);
    expect(parseSetHeader('제2급수')).toBe(2);
    expect(parseSetHeader('3 단계')).toBe(3);
    expect(parseSetHeader('학교에 가요')).toBeNull();
  });

  it('급수 헤더로 레벨 지정', () => {
    const r = parseGugupyo('3급\n첫 문장\n\n5급\n둘째 문장');
    expect(r.doc.sets.map((s) => s.level)).toEqual([3, 5]);
  });

  it('연속 빈 줄·양끝 공백·CRLF 오염 허용', () => {
    const r = parseGugupyo('\r\n\r\n  첫 문장  \r\n\r\n\r\n둘째 문장\r\n');
    expect(r.ok).toBe(true);
    expect(r.doc.sets.length).toBe(2);
    expect(r.doc.sets[0].items).toEqual(['첫 문장']);
  });

  it('빈 입력 → 한국어 에러', () => {
    expect(parseGugupyo('').ok).toBe(false);
    expect(parseGugupyo('   \n  ').ok).toBe(false);
  });

  it('번호만 있는 줄은 무시', () => {
    const r = parseGugupyo('1.\n2. 진짜 문장');
    expect(r.doc.sets[0].items).toEqual(['진짜 문장']);
  });
});

describe('직렬화 왕복', () => {
  it('serializeDoc → parseGugupyo 왕복 보존', () => {
    const doc = {
      title: '받아쓰기',
      sets: [
        { level: 1, items: ['첫 문장이에요.', '둘째 문장이에요.'] },
        { level: 2, items: ['셋째 문장이에요.'] },
      ],
    };
    const r = parseGugupyo(serializeDoc(doc));
    expect(r.ok).toBe(true);
    expect(r.doc.sets).toEqual(doc.sets);
  });
});
