// 개발 중 빠른 스모크: 타이틀 → 월드맵 → m1 진입 → 문제 2개 풀기(정답/오답)
import { chromium } from '@playwright/test';

const base = process.env.BASE_URL || 'http://localhost:41730';
const SHOT_DIR = process.env.SHOT_DIR || '/tmp/claude-0/-home-user-Spec-eduquest/f85e4141-b8d4-54e3-9485-262aeda849b9/scratchpad';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('CONSOLE: ' + m.text());
});

await page.goto(base, { waitUntil: 'networkidle' });
await page.getByText('모험 시작!').click();
await page.getByText('구구단 러너').click();
await page.waitForFunction(() => window.__eq && window.__eq.problem, null, { timeout: 15000 });

// 문제 1: 정답 클릭 (선택지 버튼은 y=H-90, x=W/2+(i-1.5)*250)
const prob = await page.evaluate(() => window.__eq.problem);
console.log('problem:', prob.prompt, 'choices:', prob.choices);
const idx = prob.choices.indexOf(prob.choiceAnswer);
await page.mouse.click(640 + (idx - 1.5) * 250, 800 - 90);
await page.waitForTimeout(600);
await page.screenshot({ path: `${SHOT_DIR}/m1-correct.png` });

// 문제 2: 오답 클릭
await page.evaluate(() => (window.__eq.problem = null));
await page.waitForFunction(() => window.__eq.problem, null, { timeout: 10000 });
const prob2 = await page.evaluate(() => window.__eq.problem);
const wrongIdx = prob2.choices.findIndex((c) => c !== prob2.choiceAnswer);
await page.mouse.click(640 + (wrongIdx - 1.5) * 250, 800 - 90);
await page.waitForTimeout(500);
await page.screenshot({ path: `${SHOT_DIR}/m1-wrong.png` });

console.log('errors:', errors.length ? errors : 'none');
await browser.close();
process.exit(errors.length ? 1 : 0);
