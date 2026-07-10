// M-2 시계 / M-3 블록 스모크: 진입 + 렌더 + 기본 상호작용
import { chromium } from '@playwright/test';

const base = process.env.BASE_URL || 'http://localhost:41730';
const SHOT_DIR = process.env.SHOT_DIR || '/tmp/claude-0/-home-user-Spec-eduquest/f85e4141-b8d4-54e3-9485-262aeda849b9/scratchpad';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => m.type() === 'error' && errors.push('CONSOLE: ' + m.text()));

await page.goto(base, { waitUntil: 'networkidle' });
await page.getByText('모험 시작!').click();

// M-2 시계
await page.getByText('시계 폭탄 해제').click();
await page.waitForTimeout(3500);
await page.screenshot({ path: `${SHOT_DIR}/m2.png` });
// 분침 드래그 시도 (시계 중심 430,440 → 위쪽에서 오른쪽으로)
await page.mouse.move(430, 250);
await page.mouse.down();
for (let a = 0; a <= 90; a += 15) {
  const rad = ((a - 90) * Math.PI) / 180;
  await page.mouse.move(430 + Math.cos(rad) * 190, 440 + Math.sin(rad) * 190);
  await page.waitForTimeout(30);
}
await page.mouse.up();
await page.waitForTimeout(300);
await page.screenshot({ path: `${SHOT_DIR}/m2-drag.png` });

// 뒤로: 일시정지 → 그만하기
await page.mouse.click(1210, 42);
await page.waitForTimeout(400);
await page.getByText('그만하기').isVisible().catch(() => {});
await page.mouse.click(640, 400 + 110); // 그만하기 버튼 위치
await page.waitForTimeout(600);

// M-3 블록
await page.getByText('블록 연산', { exact: false }).click();
await page.waitForTimeout(2500);
await page.screenshot({ path: `${SHOT_DIR}/m3.png` });

console.log('errors:', errors.length ? errors : 'none');
await browser.close();
process.exit(errors.length ? 1 : 0);
