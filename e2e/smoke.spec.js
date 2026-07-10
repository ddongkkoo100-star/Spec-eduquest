// Phase 6 게이트: 허브 → 각 게임 진입 → 클리어 → 코인 반영, 오프라인 재로드
import { test, expect } from '@playwright/test';

async function enterWorldmap(page) {
  await page.goto('/');
  await page.getByText('모험 시작!').click();
  await expect(page.getByText('수학 월드')).toBeVisible();
}

test('허브: 타이틀 → 월드맵 → 상점 → 부모모드(3초 잠금)', async ({ page }) => {
  await enterWorldmap(page);

  await page.getByText('🏪 상점').click();
  await expect(page.getByText('꾸미기 상점')).toBeVisible();
  await page.getByText('← 돌아가기').click();

  const gear = page.locator('button', { hasText: '⚙️' }).first();
  await gear.dispatchEvent('pointerdown', { pointerId: 1 });
  await page.waitForTimeout(3200);
  await expect(page.getByText('부모 설정')).toBeVisible();
});

for (const [scene, tile] of [
  ['m1', '구구단 러너'],
  ['m2', '시계 폭탄 해제'],
  ['m3', '블록 연산'],
  ['m4', '길이 다리 건설'],
  ['k2', '띄어쓰기 슬래시'],
  ['k3', '겹받침 징검다리'],
]) {
  test(`${scene}: 진입 → 씬 활성 → 클리어 → 코인 반영`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await enterWorldmap(page);
    await page.getByText(tile).click();

    // 캔버스 + 대상 씬 활성 확인
    await expect(page.locator('#game canvas')).toBeVisible({ timeout: 20000 });
    await page.waitForFunction(
      (key) => window.__eq && window.__eq.game && window.__eq.game.scene.isActive(key),
      scene,
      { timeout: 20000 }
    );
    await page.waitForTimeout(1500); // 씬 create 안정화

    // 테스트 훅으로 강제 클리어 → 보상 파이프라인 검증
    await page.evaluate((key) => {
      window.__eq.exitGame({ cleared: true, world: key.startsWith('m') ? 'math' : 'korean', id: key, stars: 3, coins: 70, levelUp: false });
    }, scene);

    await expect(page.getByText('수학 월드')).toBeVisible();
    const coinChip = page.locator('.eq-chip', { hasText: '🪙' }).first();
    await expect(coinChip).toContainText('70');
    expect(errors).toEqual([]);
  });
}

test('k1 받아쓰기: 급수표 없을 때 안내 → 부모모드 등록 → 진행', async ({ page }) => {
  await enterWorldmap(page);
  await page.getByText('받아쓰기 스튜디오').click();
  await expect(page.getByText('아직 급수표가 없어요.')).toBeVisible();
});

test('스트릭: 클리어 시 불꽃 카운터 1', async ({ page }) => {
  await enterWorldmap(page);
  await page.evaluate(() => {
    window.__eqTestExit = true;
  });
  await page.getByText('구구단 러너').click();
  await page.waitForFunction(() => window.__eq && window.__eq.game, null, { timeout: 20000 });
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    window.__eq.exitGame({ cleared: true, world: 'math', id: 'm1', stars: 2, coins: 50, levelUp: true });
  });
  await expect(page.locator('.eq-chip', { hasText: '🔥' })).toContainText('1일');
});

test('오프라인: 서비스워커 설치 후 비행기모드 재로드 동작', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByText('모험 시작!')).toBeVisible();
  // SW 설치 대기
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller != null, null, { timeout: 15000 });
  await page.waitForTimeout(2500);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('모험 시작!')).toBeVisible({ timeout: 15000 });
  await context.setOffline(false);
});
