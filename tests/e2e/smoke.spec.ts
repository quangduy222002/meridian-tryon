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
  { path: 'room/', name: 'room planner', ready: '#viewer.ready' },
  { path: 'studio/', name: 'floor plan import', ready: '#viewer.ready' },
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
  for (const href of ['watch/', 'chair/', 'box/', 'assembly/', 'room/', 'studio/', 'store/']) {
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

test('room planner edits the plan in 2D and keeps undo', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('room/');
  await expect(page.locator('#viewer.ready')).toBeAttached({ timeout: 60_000 });
  const plan = page.locator('#plan');
  const box = (await plan.boundingBox())!;
  // Plan metres → canvas pixels, mirroring the editor's fit() for the 10 × 7.6 m sample flat.
  const scale = Math.min((box.width - 112) / 10, (box.height - 112) / 7.6);
  const at = (x: number, z: number) => ({
    x: box.width / 2 + (x - 5) * scale,
    y: box.height / 2 + (z - 3.8) * scale,
  });
  // An empty spot of bedroom floor selects the room; pick a walnut floor.
  await plan.click({ position: at(7.3, 2.7) });
  await expect(page.locator('#inspector')).toBeVisible();
  await expect(page.locator('#inspector h2')).toContainText('m²');
  await page.locator('#inspector [data-floor=walnut]').click();
  await expect(page.locator('#inspector [data-floor=walnut]')).toHaveAttribute('aria-pressed', 'true');
  // Place a plant from the catalogue.
  await page.locator('#furnBtn').click();
  await page.locator('#catGrid [data-type=plant]').click();
  await expect(page.locator('#hint')).toContainText('plant');
  await plan.click({ position: at(7.3, 2.7) });
  await expect(page.locator('#inspector h2')).toContainText('Plant');
  await page.locator('#inspector [data-act=rotr]').click();
  // Draw a free-standing wall, then undo it.
  await page.locator('[data-tool=wall]').click();
  await plan.click({ position: at(2, 8.6) });
  await plan.click({ position: at(5, 8.6) });
  await plan.press('Enter');
  await page.locator('[data-tool=select]').click();
  await page.locator('#undoBtn').click();
  await expect(page.locator('#undoBtn')).toHaveAttribute('aria-disabled', 'false');
  expect(errors).toEqual([]);
});

test('room planner walks, estimates and shares', async ({ page, context }, info) => {
  const errors = watchErrors(page);
  await page.goto('room/');
  await expect(page.locator('#viewer.ready')).toBeAttached({ timeout: 60_000 });
  // Estimate
  await page.locator('#estimateBtn').click();
  await expect(page.locator('#estimate')).toBeVisible();
  await expect(page.locator('#estBody')).toContainText('Bathroom');
  await expect(page.locator('#estBody .est-totals')).toContainText('76.0 m²');
  await page.keyboard.press('Escape');
  // Walk through the 3D view and leave again
  if (info.project.name === 'mobile') await page.locator('[data-show=three]').click();
  await page.locator('[data-view=walk]').click();
  await expect(page.locator('#viewer')).toHaveClass(/walking/);
  await page.locator('[data-view=dollhouse]').click();
  await expect(page.locator('#viewer')).not.toHaveClass(/walking/);
  // Share copies a link that reopens the same plan
  if (info.project.name !== 'mobile') {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.locator('#shareBtn').click();
    await expect(page.locator('.share-tip')).toHaveText('Link copied');
    const url = await page.evaluate(() => navigator.clipboard.readText());
    expect(url).toContain('#p=');
    await page.goto(url);
    await expect(page.locator('#viewer.ready')).toBeAttached({ timeout: 60_000 });
    await page.locator('#estimateBtn').click();
    await expect(page.locator('#estBody .est-totals')).toContainText('76.0 m²');
  }
  expect(errors).toEqual([]);
});

test('room planner furnishes a room with AI', async ({ page }) => {
  const errors = watchErrors(page);
  // Stand-in for the Anthropic API, which the page calls from the browser with the visitor's key.
  await page.route('https://api.anthropic.com/**', async (route) => {
    const cors = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
    };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const layout = {
      items: [
        { type: 'bed', x: 8.2, z: 1.15, rot: 0, color: '#e7dfd2' },
        { type: 'desk', x: 9.62, z: 3.2, rot: 90, color: '#a87a4c' },
      ],
      summary: 'A bed against the top wall and a desk by the side wall.',
    };
    await route.fulfill({
      status: 200,
      headers: { ...cors, 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'msg_test',
        type: 'message',
        role: 'assistant',
        model: 'claude-opus-5-5',
        content: [{ type: 'text', text: JSON.stringify(layout) }],
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 1, output_tokens: 1 },
      }),
    });
  });
  await page.goto('room/');
  await expect(page.locator('#viewer.ready')).toBeAttached({ timeout: 60_000 });
  await page.locator('#aiBtn').click();
  await page.locator('#aiRoom').selectOption({ label: 'Bedroom · 15.1 m²' });
  await page.locator('#aiPrompt').fill('A bedroom for two with a desk');
  await page.locator('#aiGo').click();
  await expect(page.locator('#aiKeyBox')).toBeVisible();
  await page.locator('#aiKeyIn').fill('sk-ant-test');
  await page.locator('#aiKeyBox button[type=submit]').click();
  await page.locator('#aiGo').click();
  await expect(page.locator('#aiDlg')).not.toBeVisible({ timeout: 30_000 });
  await page.locator('#estimateBtn').click();
  // The bedroom's nightstands, wardrobe, chair and old desk were replaced: one bed, one desk left there.
  await expect(page.locator('#estBody')).not.toContainText('Nightstand');
  expect(errors).toEqual([]);
});

/** Drags a selection box on the import sheet, in drawing units (y up). */
/** Page coordinates of a point on the sheet, in drawing units. */
async function sheetPoint(page: Page, x: number, y: number) {
  const sheet = page.locator('#sheet');
  await expect(sheet).toHaveAttribute('data-view', /\d/);
  const [s, ox, oy] = (await sheet.getAttribute('data-view'))!.split(' ').map(Number) as [number, number, number];
  const bb = (await sheet.boundingBox())!;
  return [bb.x + x * s + ox, bb.y - y * s + oy] as const;
}

async function boxOnSheet(page: Page, x0: number, y0: number, x1: number, y1: number) {
  const sheet = page.locator('#sheet');
  await expect(sheet).toHaveAttribute('data-view', /\d/);
  const [s, ox, oy] = (await sheet.getAttribute('data-view'))!.split(' ').map(Number) as [number, number, number];
  const bb = (await sheet.boundingBox())!;
  const at = (x: number, y: number) => [bb.x + x * s + ox, bb.y - y * s + oy] as const;
  await page.mouse.move(...at(x0, y1));
  await page.mouse.down();
  await page.mouse.move(...at((x0 + x1) / 2, (y0 + y1) / 2), { steps: 4 });
  await page.mouse.move(...at(x1, y0), { steps: 4 });
  await page.mouse.up();
}

test('floor plan import reads the sample PDF and builds walls from the selected flat', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await page.goto('studio/');
  await expect(page.locator('#viewer.ready')).toBeAttached({ timeout: 60_000 });
  await page.locator('#sampleBtn').click();
  // Two sheets: pick the first, which holds the wall plan.
  await page.locator('#pages .page').first().click({ timeout: 60_000 });
  await expect(page.locator('#stepSelect')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('#detectBtn')).toHaveAttribute('aria-disabled', 'true');
  // The flat sits at roughly x 55–455, y 90–485 pt on the sheet.
  await boxOnSheet(page, 55, 90, 455, 485);
  await expect(page.locator('#scaleOut')).toContainText('dimensions in your box');
  await page.locator('#detectBtn').click();
  await expect(page.locator('#app')).toHaveAttribute('data-stage', 'workspace');
  await expect(page.locator('.toast')).toContainText(/Found 1\d walls/);
  await page.locator('#drawingBtn').click();
  await expect(page.locator('#drawingBtn')).toHaveAttribute('aria-pressed', 'false');
  await expectNoHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test('floor plan import reads a DXF in millimetres', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('studio/');
  await expect(page.locator('#viewer.ready')).toBeAttached({ timeout: 60_000 });
  // A 6 × 4 m room drawn as 200 mm double-line walls on a WALL layer.
  const rect = (x0: number, y0: number, x1: number, y1: number) =>
    [
      [x0, y0, x1, y0],
      [x1, y0, x1, y1],
      [x1, y1, x0, y1],
      [x0, y1, x0, y0],
    ].flatMap(([a, b, c, d]) => ['0', 'LINE', '8', 'WALL', '10', a, '20', b, '11', c, '21', d]);
  const dxf = [
    ...['0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', '4', '0', 'ENDSEC'],
    ...['0', 'SECTION', '2', 'ENTITIES'],
    ...rect(0, 0, 6000, 4000),
    ...rect(200, 200, 5800, 3800),
    ...['0', 'ENDSEC', '0', 'EOF'],
  ].join('\n');
  await page
    .locator('#file')
    .setInputFiles({ name: 'room.dxf', mimeType: 'application/dxf', buffer: Buffer.from(dxf) });
  await expect(page.locator('#stepSelect')).toBeVisible();
  await expect(page.locator('#scaleOut')).toContainText('millimetres');
  await boxOnSheet(page, -50, -50, 6050, 4050);
  await page.locator('#detectBtn').click();
  await expect(page.locator('.toast')).toContainText('Found 4 walls');
  await expect(page.locator('.toast')).toContainText('1 closed room —');
  expect(errors).toEqual([]);
});

test('floor plan import keeps a hand-set scale, selects by keyboard and goes back to the plan', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('studio/');
  await expect(page.locator('#viewer.ready')).toBeAttached({ timeout: 60_000 });
  // A 6 × 4 m room on a WALL layer, drawn in centimetres but saved without units (so it's read as millimetres).
  const rect = (x0: number, y0: number, x1: number, y1: number) =>
    [
      [x0, y0, x1, y0],
      [x1, y0, x1, y1],
      [x1, y1, x0, y1],
      [x0, y1, x0, y0],
    ].flatMap(([a, b, c, d]) => ['0', 'LINE', '8', 'WALL', '10', a, '20', b, '11', c, '21', d]);
  const dxf = [
    ...['0', 'SECTION', '2', 'ENTITIES'],
    ...rect(0, 0, 600, 400),
    ...rect(20, 20, 580, 380),
    ...['0', 'ENDSEC', '0', 'EOF'],
  ].join('\n');
  await page.locator('#file').setInputFiles({ name: 'cm.dxf', mimeType: 'application/dxf', buffer: Buffer.from(dxf) });
  await expect(page.locator('#stepSelect')).toBeVisible();

  // Calibration can be cancelled with Escape.
  const cal = page.locator('#calibrateBtn');
  await cal.click();
  await expect(cal).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#sheet').press('Escape');
  await expect(cal).toHaveAttribute('aria-pressed', 'false');

  // Set the scale from the 600-unit top edge = 6000 mm (the zoom buttons sit over the bottom-right corner).
  await cal.click();
  await page.mouse.click(...(await sheetPoint(page, 0, 400)));
  await expect(page.locator('#selectStatus')).toContainText('other end');
  await page.mouse.click(...(await sheetPoint(page, 600, 400)));
  await page.locator('#calMm').fill('6000');
  await page.locator('#calForm button[value=ok]').click();
  await expect(page.locator('#scaleOut')).toContainText('set by you');

  // Enter takes what is in view; a new box afterwards keeps the hand-set scale.
  await page.locator('#sheetFit').click();
  await page.locator('#sheet').press('Enter');
  await expect(page.locator('#detectBtn')).toHaveAttribute('aria-disabled', 'false');
  await boxOnSheet(page, -5, -5, 605, 405);
  await expect(page.locator('#scaleOut')).toContainText('set by you');

  await page.locator('#detectBtn').click();
  await expect(page.locator('.toast')).toContainText('Found 4 walls');
  await expect(page.locator('#drawingBtn')).toBeEnabled();

  // Import again, then go back to the open plan as it was.
  await page.locator('#reimportBtn').click();
  await expect(page.locator('#resumeBtn')).toHaveText('Back to your plan');
  await page.locator('#resumeBtn').click();
  await expect(page.locator('#app')).toHaveAttribute('data-stage', 'workspace');
  await expect(page.locator('#drawingBtn')).toBeEnabled();
  expect(errors).toEqual([]);
});

test('storefront boots', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('store/');
  await expect(page.locator('#root header')).toBeVisible();
  expect(errors).toEqual([]);
});
