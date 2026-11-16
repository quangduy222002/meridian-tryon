import { expect, test, type Page } from '@playwright/test';

/** Collects page errors, console errors and failed same-origin requests. */
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const text = m.text();
    // Software-rendered WebGL and the external demo API (mock.shop) are not our errors.
    if (/GL Driver|GPU stall|mock\.shop|Failed to load resource/.test(text)) return;
    errors.push(`console: ${text}`);
  });
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().startsWith('http://localhost')) errors.push(`HTTP ${r.status()} ${r.url()}`);
  });
  return errors;
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, 'page should not scroll sideways').toBeLessThanOrEqual(1);
}

const pages3d = [
  { path: '', name: 'portfolio', ready: 'body.gl-ready' },
  { path: 'watch/', name: 'watch story', ready: 'body.gl-ready' },
  { path: 'chair/', name: 'chair configurator', ready: '#viewer.ready' },
  { path: 'box/', name: 'box studio', ready: '#viewer.ready' },
  { path: 'assembly/', name: 'build guide', ready: '#viewer.ready' },
];

for (const p of pages3d) {
  test(`${p.name} renders its 3D scene without errors`, async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(p.path);
    await expect(page).toHaveTitle(/.+/);
    await expect(page.locator('h1').first()).toBeAttached();
    await expect(page.locator(p.ready)).toBeAttached({ timeout: 60_000 });
    await expectNoHorizontalScroll(page);
    expect(errors).toEqual([]);
  });
}

test('portfolio links to every live demo', async ({ page }) => {
  await page.goto('');
  for (const href of ['watch/', 'chair/', 'box/', 'assembly/', 'store/']) {
    await expect(page.locator(`a[href$="/${href}"]`).first()).toBeAttached();
  }
});

test('watch configurator updates the price', async ({ page }) => {
  await page.goto('watch/#configure');
  // #finalPrice updates at once; #price animates its digits.
  const price = page.locator('#finalPrice');
  await expect(price).toHaveText('$389');
  await page.getByRole('button', { name: 'Champagne Gold' }).click();
  await expect(price).toHaveText('$539');
  await expect(page.locator('#summary')).toHaveText('Gold · Midnight');
});

test('box studio shows the dieline and the whole order', async ({ page }) => {
  await page.goto('box/');
  await expect(page.locator('#viewer.ready')).toBeAttached({ timeout: 60_000 });
  await page.locator('#flatBtn').click();
  await expect(page.locator('#dimW')).toHaveText('W 24 cm');
  await page.locator('[data-mode=order]').click();
  await expect(page.locator('#palletInfo')).toContainText('per pallet');
});

test('chair configurator switches setting and updates the price', async ({ page }) => {
  await page.goto('chair/');
  await expect(page.locator('#viewer.ready')).toBeAttached({ timeout: 60_000 });
  await page.locator('[data-scene=room]').click();
  await page.locator('[data-value=walnut]').click();
  await expect(page.locator('#price')).toHaveText('$289');
  await expect(page.locator('#pins')).toContainText('walnut');
});

test('build guide steps through the guide and edits it in the studio', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('assembly/');
  await expect(page.locator('#viewer.ready')).toBeAttached({ timeout: 60_000 });
  await expect(page.locator('#stepTitle')).toHaveText('Prepare the case');
  await page.locator('#nextBtn').click();
  await expect(page.locator('#stepTitle')).toHaveText('Install the power supply');
  await expect(page.locator('#stepNo')).toHaveText('02');
  // Parts list jumps to the step that installs a part.
  await page.locator('#bomBtn').click();
  await page.locator('#bomList li[data-part=gpu] button').click();
  await expect(page.locator('#stepTitle')).toHaveText('Install the graphics card');
  if (await page.locator('#bom[open]').count()) await page.locator('#bomClose').click();
  // Studio: rename the step and add a new one; the guide picks the change up.
  await page.locator('[data-mode=studio]').click();
  await expect(page.locator('#stTitle')).toHaveValue('Install the graphics card', { timeout: 30_000 });
  await page.locator('#stTitle').fill('Fit the GPU');
  await page.locator('#stAdd').click();
  await expect(page.locator('#stCount')).toHaveText('12');
  await page.locator('[data-mode=guide]').click();
  await page.locator('#prevBtn').click();
  await expect(page.locator('#stepTitle')).toHaveText('Fit the GPU');
  expect(errors).toEqual([]);
});

test('studio edits both ends of a move and builds a step with AI', async ({ page }) => {
  const errors = watchErrors(page);
  // Stand-in for the Anthropic API: the AI builder calls it from the browser with the visitor's key.
  let sentKey = '';
  await page.route('https://api.anthropic.com/**', async (route) => {
    const cors = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
    };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    sentKey = (await route.request().allHeaders())['authorization'] ?? '';
    const step = {
      title: 'Take the side panel off again',
      body: 'Unscrew the thumbscrews and set the glass aside.',
      warning: 'Glass is fragile.',
      tools: ['hands'],
      moves: [
        {
          part: 'glass',
          from: 'previous position',
          to: 'set aside',
          distance_cm: 0,
          turn_at_start_deg: { x: 0, y: 0, z: 0 },
          scale_at_start: 1,
          hidden_at_start: false,
          hidden_at_end: true,
        },
      ],
      camera: 'wide',
    };
    await route.fulfill({
      status: 200,
      headers: { ...cors, 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'msg_test',
        type: 'message',
        role: 'assistant',
        model: 'claude-opus-5-5',
        content: [{ type: 'text', text: JSON.stringify(step) }],
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 1, output_tokens: 1 },
      }),
    });
  });
  await page.goto('assembly/?studio');
  await expect(page.locator('#stCount')).toHaveText('11', { timeout: 60_000 });
  // Step 1 moves the glass from on the case (A) to beside it (B).
  await page.locator('.st-sel[data-i="0"]').click();
  await page.locator('#stParts [data-part=glass]').click();
  await page.locator('[data-end=B]').click();
  await expect(page.locator('[data-end=B]')).toHaveClass(/on/);
  await page.locator('#stDirs [data-dir=installed]').click();
  await expect(page.locator('#stOffset')).toContainText('B: installed');
  // Rotate, scale and hide the B end, then put it back.
  await page.locator('[data-turn="1"]').click();
  await expect(page.locator('#stOffset')).toContainText('turned 0° / 90° / 0°');
  await page.locator('#stHidden').check();
  await expect(page.locator('#stOffset')).toContainText('hidden');
  await page.locator('[data-gizmo=scale]').click();
  await expect(page.locator('[data-gizmo=scale]')).toHaveClass(/on/);
  await page.locator('[data-reset=rot]').click();
  await page.locator('#stHidden').uncheck();
  await expect(page.locator('#stOffset')).not.toContainText('turned');
  // AI builder
  await page.locator('#aiPrompt').fill('Take the glass off again and put it aside');
  await page.locator('#aiGo').click();
  await expect(page.locator('#aiKeyBox')).toBeVisible();
  await page.locator('#aiKeyIn').fill('sk-ant-test');
  await page.locator('#aiKeySave').click();
  await page.locator('#aiGo').click();
  await expect(page.locator('#aiStatus')).toContainText('Added step 2', { timeout: 30_000 });
  expect(sentKey).toBe('Bearer sk-ant-test');
  await expect(page.locator('#stCount')).toHaveText('12');
  await expect(page.locator('#stTitle')).toHaveValue('Take the side panel off again');
  expect(errors).toEqual([]);
});

test('storefront boots', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('store/');
  await expect(page.locator('#root header')).toBeVisible();
  expect(errors).toEqual([]);
});
