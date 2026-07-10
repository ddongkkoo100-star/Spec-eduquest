// K-1 받아쓰기 스모크: 부모모드 급수표 등록 → 아이모드 받아쓰기 2문장 → 결과
import { chromium } from '@playwright/test';

const base = process.env.BASE_URL || 'http://localhost:41730';
const SHOT_DIR = process.env.SHOT_DIR || '/tmp/claude-0/-home-user-Spec-eduquest/f85e4141-b8d4-54e3-9485-262aeda849b9/scratchpad';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => m.type() === 'error' && errors.push('CONSOLE: ' + m.text()));
page.on('dialog', (d) => d.accept());

await page.goto(base, { waitUntil: 'networkidle' });
await page.getByText('모험 시작!').click();

// 부모 모드: 3초 길게 누르기
const gear = page.locator('button', { hasText: '⚙️' }).first();
await gear.dispatchEvent('pointerdown', { pointerId: 1 });
await page.waitForTimeout(3200);
console.log('parent visible:', await page.getByText('부모 설정').isVisible());

// 급수표 등록
await page.getByText('➕ 새 급수표 등록').click();
await page.locator('input.eq-input').fill('스모크 급수표');
await page.locator('textarea.eq-input').fill('1급\n1. 바닷가에 갔어요.\n2. 모래성을 쌓았어요.');
await page.getByText('검증하기').click();
console.log('validate:', await page.locator('.eq-modal div').filter({ hasText: '✅' }).first().textContent());
await page.locator('.eq-modal').getByText('저장', { exact: true }).click();
await page.waitForTimeout(400);

// 아이 모드: 받아쓰기
await page.getByText('← 돌아가기').click();
await page.getByText('받아쓰기 스튜디오').click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${SHOT_DIR}/k1-select.png` });
await page.getByText('1급').click();
await page.getByText('시작!').click();
await page.waitForTimeout(600);
await page.screenshot({ path: `${SHOT_DIR}/k1-listen.png` });

for (let i = 0; i < 2; i++) {
  await page.getByText('다 썼어요!').click();
  await page.waitForTimeout(300);
  if (i === 0) {
    await page.screenshot({ path: `${SHOT_DIR}/k1-reveal.png` });
    await page.getByText('⭕ 맞았어요').click();
  } else {
    await page.getByText('❌ 틀렸어요').click();
  }
  await page.waitForTimeout(400);
}
await page.screenshot({ path: `${SHOT_DIR}/k1-result.png` });
console.log('result visible:', await page.getByText('받아쓰기 끝!').isVisible());

// 오답노트 반영 확인: 월드맵 → 받아쓰기 재진입 → 다시 도전 노출
await page.getByText('확인', { exact: true }).click();
await page.getByText('받아쓰기 스튜디오').click();
await page.waitForTimeout(400);
console.log('retry set visible:', await page.getByText('다시 도전!').first().isVisible());
await page.screenshot({ path: `${SHOT_DIR}/k1-retry.png` });

console.log('errors:', errors.length ? errors : 'none');
await browser.close();
process.exit(errors.length ? 1 : 0);
