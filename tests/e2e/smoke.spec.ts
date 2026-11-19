import { readFile } from 'node:fs/promises';
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
  // The whole flat sits at roughly x 52–530, y 85–488 pt on the sheet.
  await boxOnSheet(page, 52, 85, 530, 488);
  await expect(page.locator('#scaleOut')).toContainText('dimensions in your box');
  await page.locator('#detectBtn').click();
  await expect(page.locator('#app')).toHaveAttribute('data-stage', 'workspace');
  // The outline must close: living space, bathroom, service shaft and balcony. The concrete blocks (sparse hatch),
  // the window at the top of the facade and the steps where the facade changes thickness all have to be found.
  await expect(page.locator('.toast')).toContainText(/Found 2\d walls, 9 doors and windows, 3 closed rooms/);
  // No label on this sheet: the balcony is recognised by being reached through glazing only.
  await expect(page.locator('.toast')).toContainText('named: Balcony');
  // The service shaft (a crossed-out box with no opening) is a duct in the bathroom's corner: its thin sides go, and the
  // room behind one door that now holds it is the bathroom.
  await expect(page.locator('.toast')).toContainText('Balcony, Bathroom');
  // The orientation readout names the way the balcony looks out: east on this sheet (north is up).
  await expect(page.locator('#northLabel')).toHaveText('Balcony');
  await expect(page.locator('#northOut')).toHaveText('E');
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('floorwise.plan') ?? ''))
    .toContain('"name":"Balcony"');
  // Its open front is a railing, not a wall.
  expect(
    await page.evaluate(
      () =>
        (JSON.parse(localStorage.getItem('floorwise.plan') ?? '{}').walls ?? []).filter(
          (w: { rail?: boolean }) => w.rail,
        ).length,
    ),
  ).toBe(1);
  // You step onto it through a sliding glass door (one tall opening), not a window.
  expect(
    await page.evaluate(
      () =>
        (JSON.parse(localStorage.getItem('floorwise.plan') ?? '{}').openings ?? []).filter(
          (o: { tall?: boolean }) => o.tall,
        ).length,
    ),
  ).toBe(1);
  await page.locator('#drawingBtn').click();
  await expect(page.locator('#drawingBtn')).toHaveAttribute('aria-pressed', 'false');
  await expectNoHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test('floor plan exports DXF, SVG and PNG, and reads its own DXF back', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('studio/');
  await expect(page.locator('#viewer.ready')).toBeAttached({ timeout: 60_000 });
  await page.locator('#sampleBtn').click();
  await page.locator('#pages .page').first().click();
  await expect(page.locator('#stepSelect')).toBeVisible({ timeout: 30_000 });
  await boxOnSheet(page, 52, 85, 530, 488);
  await page.locator('#detectBtn').click();
  await expect(page.locator('#app')).toHaveAttribute('data-stage', 'workspace');

  const save = async (kind: string) => {
    await page.locator('#exportBtn').click();
    const [file] = await Promise.all([page.waitForEvent('download'), page.locator(`[data-export="${kind}"]`).click()]);
    return file;
  };
  const dxf = await save('dxf');
  expect(dxf.suggestedFilename()).toMatch(/\.dxf$/);
  const text = (await readFile((await dxf.path())!, 'utf8')).toString();
  for (const layer of ['A-WALL', 'A-DOOR', 'A-GLAZ', 'A-WALL-RAIL', 'A-ROOM']) expect(text).toContain(layer);
  expect(text).toContain('Bathroom');
  const svg = await save('svg');
  expect(await readFile((await svg.path())!, 'utf8')).toContain('<svg');
  const png = await save('png');
  expect((await readFile((await png.path())!)).subarray(1, 4).toString()).toBe('PNG');

  // The exported DXF goes back in exactly: Floorwise reads the plan it carries instead of detecting walls again.
  const before = await page.evaluate(() => localStorage.getItem('floorwise.plan'));
  await page.locator('#reimportBtn').click();
  await page
    .locator('#file')
    .setInputFiles({ name: 'plan.dxf', mimeType: 'application/dxf', buffer: Buffer.from(text) });
  await expect(page.locator('#app')).toHaveAttribute('data-stage', 'workspace');
  await expect(page.locator('.toast')).toContainText('Opened the Floorwise plan');
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('floorwise.plan') ?? '{}'));
  expect(after.walls).toEqual(JSON.parse(before ?? '{}').walls);
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
    // A room label, as Vietnamese plans write it.
    ...['0', 'TEXT', '8', 'TEXT', '10', '2600', '20', '2000', '40', '250', '1', 'P. NGỦ'],
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
  await expect(page.locator('.toast')).toContainText('1 closed room · named: Bedroom');
  expect(errors).toEqual([]);
});

test('floor plan import reads door and fixture symbols', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('studio/');
  await expect(page.locator('#viewer.ready')).toBeAttached({ timeout: 60_000 });
  type V = number | string;
  const line = (layer: string, x1: V, y1: V, x2: V, y2: V) => [
    '0',
    'LINE',
    '8',
    layer,
    '10',
    x1,
    '20',
    y1,
    '11',
    x2,
    '21',
    y2,
  ];
  const poly = (layer: string, pts: [number, number, number?][]) => [
    ...['0', 'LWPOLYLINE', '8', layer, '90', pts.length, '70', '1'],
    ...pts.flatMap(([x, y, bulge]) => ['10', x, '20', y, ...(bulge ? ['42', bulge] : [])]),
  ];
  const rect = (layer: string, x0: number, y0: number, x1: number, y1: number) =>
    poly(layer, [
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
    ]);
  const block = (name: string, ents: V[]) => [
    ...['0', 'BLOCK', '8', '0', '2', name, '70', '0', '10', '0', '20', '0', '30', '0', '3', name],
    ...ents,
    ...['0', 'ENDBLK', '8', '0'],
  ];
  const insert = (name: string, x: number, y: number) => ['0', 'INSERT', '8', 'FURNITURE', '2', name, '10', x, '20', y];
  // An 8 × 5 m flat (200 mm walls on a WALL layer) split in two by a wall at x 3000–3200.
  const W = (x1: V, y1: V, x2: V, y2: V) => line('WALL', x1, y1, x2, y2);
  const dxf = [
    ...['0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', '4', '0', 'ENDSEC'],
    ...['0', 'SECTION', '2', 'BLOCKS'],
    ...block('LAVABO', [
      ...rect('0', -250, -200, 250, 200),
      '0',
      'CIRCLE',
      '8',
      '0',
      '10',
      '0',
      '20',
      '0',
      '40',
      '150',
    ]),
    ...block('GIUONG DOI 1800', [...rect('0', 0, 0, 1800, 2000), ...rect('0', 150, 1600, 850, 1900)]),
    ...['0', 'ENDSEC'],
    ...['0', 'SECTION', '2', 'ENTITIES'],
    // Outer walls; the bottom one has a 1.6 m sliding door at x 5000–6600.
    ...W(0, 0, 5000, 0),
    ...W(6600, 0, 8000, 0),
    ...W(200, 200, 3000, 200),
    ...W(3200, 200, 5000, 200),
    ...W(6600, 200, 7800, 200),
    ...W(5000, 0, 5000, 200),
    ...W(6600, 0, 6600, 200),
    ...W(8000, 0, 8000, 5000),
    ...W(7800, 200, 7800, 4800),
    ...W(8000, 5000, 0, 5000),
    ...W(7800, 4800, 3200, 4800),
    ...W(3000, 4800, 200, 4800),
    ...W(0, 5000, 0, 0),
    ...W(200, 4800, 200, 200),
    // Sliding door: two panels on offset tracks, overlapping in the middle.
    ...line('DOOR', 5000, 80, 5900, 80),
    ...line('DOOR', 5700, 120, 6600, 120),
    // Dividing wall with a 1.6 m double door at y 1000–2600: two 800 mm swings, one from each jamb.
    ...W(3000, 200, 3000, 1000),
    ...W(3200, 200, 3200, 1000),
    ...W(3000, 2600, 3000, 4800),
    ...W(3200, 2600, 3200, 4800),
    ...W(3000, 1000, 3200, 1000),
    ...W(3000, 2600, 3200, 2600),
    ...['0', 'ARC', '8', 'DOOR', '10', '3200', '20', '1000', '40', '800', '50', '0', '51', '90'],
    ...['0', 'ARC', '8', 'DOOR', '10', '3200', '20', '2600', '40', '800', '50', '270', '51', '360'],
    ...line('DOOR', 3200, 1000, 4000, 1000),
    ...line('DOOR', 3200, 2600, 4000, 2600),
    // Drawn, not named: a WC (oval bowl, cistern behind it) and a bathtub (rounded outline).
    ...['0', 'ELLIPSE', '8', 'SANITARY', '10', '800', '20', '4300', '30', '0', '11', '0', '21', '250', '31', '0'],
    ...['40', '0.72', '41', '0', '42', String(Math.PI * 2)],
    ...rect('SANITARY', 550, 4600, 1050, 4780),
    ...poly('SANITARY', [
      [1150, 1200],
      [2050, 1200, 1],
      [2050, 1900],
      [1150, 1900, 1],
    ]),
    // Named blocks: a basin and a double bed.
    ...insert('LAVABO', 2200, 4400),
    ...insert('GIUONG DOI 1800', 5000, 2500),
    ...['0', 'ENDSEC', '0', 'EOF'],
  ].join('\n');
  await page
    .locator('#file')
    .setInputFiles({ name: 'flat.dxf', mimeType: 'application/dxf', buffer: Buffer.from(dxf) });
  await expect(page.locator('#stepSelect')).toBeVisible();
  await boxOnSheet(page, -50, -50, 8050, 5050);
  await page.locator('#detectBtn').click();
  await expect(page.locator('.toast')).toContainText('2 doors and windows, 2 closed rooms, 4 fixtures');
  await expect(page.locator('.toast')).toContainText(/named: (Bathroom, Bedroom|Bedroom, Bathroom)/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('floorwise.plan') ?? '')).toContain('"leaves"');
  const plan = await page.evaluate(() => JSON.parse(localStorage.getItem('floorwise.plan') ?? '{}'));
  const kinds = (plan.openings as { kind: string; leaves?: number; tall?: boolean }[])
    .map((o) => (o.leaves === 2 ? 'double door' : o.tall ? 'sliding door' : o.kind))
    .sort();
  expect(kinds).toEqual(['double door', 'sliding door']);
  expect((plan.items as { type: string }[]).map((i) => i.type).sort()).toEqual(['bathtub', 'bed', 'sink', 'toilet']);
  // The WC stands with its cistern to the wall behind it (front facing down the plan).
  expect((plan.items as { type: string; rot: number }[]).find((i) => i.type === 'toilet')?.rot).toBe(0);
  expect(errors).toEqual([]);
});

test('floor plan import builds a two-storey home from one drawing', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('studio/');
  await expect(page.locator('#viewer.ready')).toBeAttached({ timeout: 60_000 });
  // Two 8 × 6 m floors side by side on one sheet, each titled as Vietnamese drawings do.
  const rect = (x0: number, y0: number, x1: number, y1: number) =>
    [
      [x0, y0, x1, y0],
      [x1, y0, x1, y1],
      [x1, y1, x0, y1],
      [x0, y1, x0, y0],
    ].flatMap(([a, b, c, d]) => ['0', 'LINE', '8', 'WALL', '10', a, '20', b, '11', c, '21', d]);
  const floor = (ox: number, label: string) => [
    ...rect(ox, 0, ox + 8000, 6000),
    ...rect(ox + 200, 200, ox + 7800, 5800),
    ...['0', 'TEXT', '8', 'TEXT', '10', ox + 2500, '20', -900, '40', '350', '1', label],
  ];
  const dxf = [
    ...['0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', '4', '0', 'ENDSEC'],
    ...['0', 'SECTION', '2', 'ENTITIES'],
    ...floor(0, 'MẶT BẰNG TẦNG 1'),
    ...floor(12000, 'MẶT BẰNG TẦNG 2'),
    ...['0', 'ENDSEC', '0', 'EOF'],
  ].join('\n');
  await page
    .locator('#file')
    .setInputFiles({ name: 'villa.dxf', mimeType: 'application/dxf', buffer: Buffer.from(dxf) });
  await expect(page.locator('#stepSelect')).toBeVisible();
  await boxOnSheet(page, -300, -1500, 8300, 6300);
  await page.locator('#detectBtn').click();
  await expect(page.locator('#app')).toHaveAttribute('data-stage', 'workspace');
  // The next floor comes from the same sheet.
  await page.locator('[data-act="floor-drawing"]').click();
  await expect(page.locator('#detectBtn')).toHaveText('Add as a new floor');
  await boxOnSheet(page, 11700, -1500, 20300, 6300);
  await page.locator('#detectBtn').click();
  await expect(page.locator('#storeys [data-storey]')).toHaveText(['Tầng 1', 'Tầng 2']);
  await expect(page.locator('#storeys [aria-pressed="true"]')).toHaveText('Tầng 2');
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('floorwise.plan') ?? '{}').storeys?.length ?? 0))
    .toBe(2);
  // Switching floors keeps both.
  await page.locator('#storeys [data-storey="0"]').click();
  await expect(page.locator('#storeys [aria-pressed="true"]')).toHaveText('Tầng 1');
  // A stair on the ground floor opens the floor above (a stairwell with railings in 3D).
  await page.locator('#furnBtn').click();
  await page.locator('[data-type="stairsL"]').click();
  const plan2d = (await page.locator('#plan').boundingBox())!;
  await page.mouse.click(plan2d.x + plan2d.width * 0.6, plan2d.y + plan2d.height * 0.5);
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('floorwise.plan') ?? ''))
    .toContain('"type":"stairsL"');
  await page.locator('#storeys [data-storey="1"]').click();
  await expect(page.locator('#storeys [aria-pressed="true"]')).toHaveText('Tầng 2');
  expect(errors).toEqual([]);
});

test('floor plan import closes rooms at plain doorways and short partitions', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('studio/');
  await expect(page.locator('#viewer.ready')).toBeAttached({ timeout: 60_000 });
  const line = (x1: number, y1: number, x2: number, y2: number) => [
    '0',
    'LINE',
    '8',
    'WALL',
    '10',
    x1,
    '20',
    y1,
    '11',
    x2,
    '21',
    y2,
  ];
  const rect = (x0: number, y0: number, x1: number, y1: number) => [
    ...line(x0, y0, x1, y0),
    ...line(x1, y0, x1, y1),
    ...line(x1, y1, x0, y1),
    ...line(x0, y1, x0, y0),
  ];
  // An 8 × 5 m flat split in two by a 100 mm partition. The partition has a 900 mm doorway drawn as a plain gap (no
  // swing, as permit drawings often leave it), and one of its faces stops 800 mm short of the facade, where a
  // cupboard was drawn against it.
  const dxf = [
    ...['0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', '4', '0', 'ENDSEC'],
    ...['0', 'SECTION', '2', 'ENTITIES'],
    ...rect(0, 0, 8000, 5000),
    ...rect(200, 200, 7800, 4800),
    ...line(4000, 200, 4000, 2000),
    ...line(4100, 200, 4100, 2000),
    ...line(4000, 2900, 4000, 4800),
    ...line(4100, 2900, 4100, 4000),
    ...['0', 'ENDSEC', '0', 'EOF'],
  ].join('\n');
  await page
    .locator('#file')
    .setInputFiles({ name: 'flat.dxf', mimeType: 'application/dxf', buffer: Buffer.from(dxf) });
  await expect(page.locator('#stepSelect')).toBeVisible();
  await boxOnSheet(page, -100, -100, 8100, 5100);
  await page.locator('#detectBtn').click();
  await expect(page.locator('.toast')).toContainText('1 door');
  await expect(page.locator('.toast')).toContainText('2 closed rooms');
  expect(errors).toEqual([]);
});

test('floor plan import builds a curved wall from two concentric arcs', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('studio/');
  await expect(page.locator('#viewer.ready')).toBeAttached({ timeout: 60_000 });
  const line = (x1: number, y1: number, x2: number, y2: number) => [
    '0',
    'LINE',
    '8',
    'WALL',
    '10',
    x1,
    '20',
    y1,
    '11',
    x2,
    '21',
    y2,
  ];
  const arc = (r: number, a0: number, a1: number) => [
    '0',
    'ARC',
    '8',
    'WALL',
    '10',
    3000,
    '20',
    4000,
    '40',
    r,
    '50',
    a0,
    '51',
    a1,
  ];
  // A 6 m wide room whose front is a 200 mm wall bowed outwards: two arcs about one centre, 5 m and 4.8 m across.
  const deg = (x: number, y: number) => (Math.atan2(y, x) * 180) / Math.PI + 360;
  const inner = Math.sqrt(4800 ** 2 - 2800 ** 2);
  const dxf = [
    ...['0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', '4', '0', 'ENDSEC'],
    ...['0', 'SECTION', '2', 'ENTITIES'],
    ...line(0, 0, 0, 4000),
    ...line(200, 101, 200, 3800),
    ...line(0, 4000, 6000, 4000),
    ...line(200, 3800, 5800, 3800),
    ...line(6000, 4000, 6000, 0),
    ...line(5800, 3800, 5800, 101),
    ...arc(5000, deg(-3000, -4000), deg(3000, -4000)),
    ...arc(4800, deg(-2800, -inner), deg(2800, -inner)),
    ...['0', 'ENDSEC', '0', 'EOF'],
  ].join('\n');
  await page.locator('#file').setInputFiles({ name: 'bay.dxf', mimeType: 'application/dxf', buffer: Buffer.from(dxf) });
  await expect(page.locator('#stepSelect')).toBeVisible();
  await boxOnSheet(page, -50, -1050, 6050, 4050);
  await page.locator('#detectBtn').click();
  await expect(page.locator('.toast')).toContainText('1 closed room');
  // The bowed front is a run of short walls along the curve, not one straight chord.
  await expect
    .poll(() => page.evaluate(() => (JSON.parse(localStorage.getItem('floorwise.plan') ?? '{}').walls ?? []).length))
    .toBeGreaterThan(6);
  expect(errors).toEqual([]);
});

test('floor plan import finds each floor on a sheet and builds them all', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('studio/');
  await expect(page.locator('#viewer.ready')).toBeAttached({ timeout: 60_000 });
  const line = (x1: number, y1: number, x2: number, y2: number) => [
    '0',
    'LINE',
    '8',
    'WALL',
    '10',
    x1,
    '20',
    y1,
    '11',
    x2,
    '21',
    y2,
  ];
  const rect = (x0: number, y0: number, x1: number, y1: number) => [
    ...line(x0, y0, x1, y0),
    ...line(x1, y0, x1, y1),
    ...line(x1, y1, x0, y1),
    ...line(x0, y1, x0, y0),
  ];
  const text = (x: number, y: number, h: number, s: string) => [
    '0',
    'TEXT',
    '8',
    'TEXT',
    '10',
    x,
    '20',
    y,
    '40',
    h,
    '1',
    s,
  ];
  const floor = (ox: number, title: string) => [
    ...rect(ox, 0, ox + 8000, 6000),
    ...rect(ox + 200, 200, ox + 7800, 5800),
    ...line(ox + 4000, 200, ox + 4000, 5800),
    ...line(ox + 4100, 200, ox + 4100, 5800),
    ...text(ox + 1500, 3000, 150, 'P. NGỦ'),
    ...text(ox + 5500, 3000, 150, 'P. KHÁCH'),
    ...text(ox, -900, 400, title),
  ];
  // Upper floor first in the file, a section beside them: the floors still come out bottom up, without the section.
  const dxf = [
    ...['0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', '4', '0', 'ENDSEC'],
    ...['0', 'SECTION', '2', 'ENTITIES'],
    ...floor(12000, 'MẶT BẰNG TẦNG 2 TL 1/100'),
    ...floor(0, 'MẶT BẰNG TẦNG 1 TL 1/100'),
    ...rect(26000, 0, 32000, 6000),
    ...line(26000, 3000, 32000, 3000),
    ...text(26000, -900, 400, 'MẶT CẮT A-A TL 1/100'),
    ...['0', 'ENDSEC', '0', 'EOF'],
  ].join('\n');
  await page
    .locator('#file')
    .setInputFiles({ name: 'house.dxf', mimeType: 'application/dxf', buffer: Buffer.from(dxf) });
  await expect(page.locator('#stepSelect')).toBeVisible();
  await expect(page.locator('#viewChips .view-chip')).toHaveText([/Tầng 1/, /Tầng 2/]);
  await page.locator('#buildAll').click();
  await expect(page.locator('#app')).toHaveAttribute('data-stage', 'workspace');
  await expect(page.locator('#storeys')).toContainText('Tầng 1');
  await expect(page.locator('#storeys')).toContainText('Tầng 2');
  await expect
    .poll(() => page.evaluate(() => (JSON.parse(localStorage.getItem('floorwise.plan') ?? '{}').storeys ?? []).length))
    .toBe(2);
  expect(errors).toEqual([]);
});

test('floor plan import ignores annotation and erased areas', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('studio/');
  await expect(page.locator('#viewer.ready')).toBeAttached({ timeout: 60_000 });
  const rect = (layer: string, x0: number, y0: number, x1: number, y1: number) =>
    [
      [x0, y0, x1, y0],
      [x1, y0, x1, y1],
      [x1, y1, x0, y1],
      [x0, y1, x0, y0],
    ].flatMap(([a, b, c, d]) => ['0', 'LINE', '8', layer, '10', a, '20', b, '11', c, '21', d]);
  const dxf = [
    ...['0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', '4', '0', 'ENDSEC'],
    ...['0', 'SECTION', '2', 'ENTITIES'],
    // The flat: a 6 × 4 m room with 200 mm walls.
    ...rect('WALL', 0, 0, 6000, 4000),
    ...rect('WALL', 200, 200, 5800, 3800),
    // Dimension and grid layers drawn as double lines: never walls.
    ...rect('DIM', -800, -800, 6800, 4800),
    ...rect('DIM', -600, -600, 6600, 4600),
    ...rect('TRUC', 3000, -1200, 3150, 5200),
    // A legend frame drawn on the wall layer beside the flat: erased by hand.
    ...rect('WALL', 7500, 0, 11500, 3000),
    ...rect('WALL', 7700, 200, 11300, 2800),
    ...['0', 'ENDSEC', '0', 'EOF'],
  ].join('\n');
  await page
    .locator('#file')
    .setInputFiles({ name: 'noisy.dxf', mimeType: 'application/dxf', buffer: Buffer.from(dxf) });
  await expect(page.locator('#stepSelect')).toBeVisible();
  await page.locator('#eraseBtn').click();
  await expect(page.locator('#eraseBtn')).toHaveAttribute('aria-pressed', 'true');
  await boxOnSheet(page, 7300, -200, 11700, 3200);
  await expect(page.locator('#clearErase')).not.toHaveAttribute('hidden', '');
  await page.locator('#eraseBtn').click();
  await boxOnSheet(page, -1000, -1500, 12000, 5300);
  await page.locator('#detectBtn').click();
  await expect(page.locator('.toast')).toContainText('Found 4 walls');
  await expect(page.locator('.toast')).toContainText('1 closed room');
  expect(errors).toEqual([]);
});

test('Claude reads the drawing, asks, and models objects the library lacks', async ({ page }) => {
  const errors = watchErrors(page);
  // Stand-in for the claude.ai host: the page asks the viewer's own Claude through window.claude.
  await page.addInitScript(() => {
    const spiral = {
      name: 'Spiral staircase',
      w: 1.6,
      d: 1.6,
      h: 3.3,
      opensAbove: true,
      parts: [
        { shape: 'cylinder', r: 0.06, h: 3.3, x: 0, y: 1.65, z: 0, material: 'metal', color: '#2b2d31' },
        {
          shape: 'box',
          w: 0.68,
          h: 0.04,
          d: 0.3,
          x: 0.4,
          y: 0.18,
          z: 0,
          material: 'wood',
          color: '#b58a5a',
          repeat: { count: 18, dy: 0.183, ry: 22, pivot: [0, 0] },
        },
      ],
    };
    const w = window as unknown as { claude: unknown; __images: number };
    w.__images = 0;
    w.claude = {
      use: async (name: string) =>
        name !== 'sample'
          ? null
          : {
              json: async (prompt: string, opts?: { images?: Blob[] }) => {
                w.__images += opts?.images?.length ?? 0;
                if (prompt.includes('3D modeller'))
                  return prompt.includes('Already answered')
                    ? { object: { ...spiral, name: 'Round coffee table' } }
                    : { question: 'How tall is it?', options: ['45 cm', '60 cm'] };
                if (prompt.includes('reading a floor plan'))
                  return prompt.includes("client's answers")
                    ? {
                        items: [
                          { label: 'Spiral staircase', type: 'custom:sp', x: 4.5, z: 1.5, rot: 0 },
                          { label: 'Toilet', type: 'toilet', x: 1, z: 1, rot: 0 },
                        ],
                        customs: { sp: spiral },
                      }
                    : {
                        questions: [
                          {
                            text: 'Is the circle a spiral stair or a round table?',
                            options: ['Spiral stair', 'Table'],
                          },
                        ],
                      };
                return { items: [] };
              },
            },
    };
  });
  await page.goto('studio/');
  await expect(page.locator('#viewer.ready')).toBeAttached({ timeout: 60_000 });
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
    ...['0', 'CIRCLE', '8', 'STAIR', '10', '4500', '20', '2500', '40', '800'],
    ...['0', 'ENDSEC', '0', 'EOF'],
  ].join('\n');
  await page
    .locator('#file')
    .setInputFiles({ name: 'room.dxf', mimeType: 'application/dxf', buffer: Buffer.from(dxf) });
  await expect(page.locator('#stepSelect')).toBeVisible();
  await boxOnSheet(page, -50, -50, 6050, 4050);
  await page.locator('#detectBtn').click();
  await expect(page.locator('.toast')).toContainText('Found 4 walls');

  // Read the drawing: Claude sees a picture of it, asks first, then lists what it found.
  await page.locator('#readBtn').click();
  await expect(page.locator('#readAsk legend')).toContainText('spiral stair or a round table');
  await page.locator('#readAsk [data-opt]').first().click();
  await page.locator('#readAsk [data-act="answer"]').click();
  await expect(page.locator('#readList')).toContainText('Spiral staircase');
  await expect(page.locator('#readList')).toContainText('new object');
  await page.locator('#readAdd').click();
  await expect(page.locator('#readDlg')).not.toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __images: number }).__images)).toBeGreaterThan(0);

  // Create an object the library doesn't have.
  await page.locator('#furnBtn').click();
  await page.locator('#createOpen').click();
  await page.locator('#createPrompt').fill('A round coffee table in walnut');
  await page.locator('#createGo').click();
  await expect(page.locator('#createAsk legend')).toContainText('How tall');
  await page.locator('#createAsk [data-opt]').first().click();
  await page.locator('#createAsk [data-act="answer"]').click();
  await expect(page.locator('#hint')).toContainText('round coffee table');

  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('floorwise.plan') ?? '{}'));
  await expect
    .poll(async () => Object.keys((await saved()).customs ?? {}))
    .toEqual(['spiral-staircase', 'round-coffee-table']);
  const plan = await saved();
  expect(plan.items.map((i: { type: string }) => i.type)).toEqual(
    expect.arrayContaining(['custom:spiral-staircase', 'toilet']),
  );
  expect(errors).toEqual([]);
});

test('Claude reads a style from a reference photo and furnishes the main room like it', async ({ page }) => {
  const errors = watchErrors(page);
  await page.addInitScript(() => {
    const drum = {
      name: 'Drum coffee table',
      w: 0.8,
      d: 0.8,
      h: 0.4,
      parts: [{ shape: 'cylinder', r: 0.4, h: 0.4, x: 0, y: 0.2, z: 0, material: 'metal', color: '#2a2a2a' }],
    };
    const w = window as unknown as { claude: unknown; __photos: string[] };
    w.__photos = [];
    w.claude = {
      use: async (name: string) =>
        name !== 'sample'
          ? null
          : {
              json: async (prompt: string, opts?: { images?: Blob[] }) => {
                for (const b of opts?.images ?? []) w.__photos.push(b.type);
                if (prompt.includes('reference photo of an interior'))
                  return {
                    style: {
                      name: 'Industrial loft',
                      vi: 'Công nghiệp',
                      wood: '#8b5a35',
                      metal: '#262626',
                      legs: 'metal',
                      fabric: ['#b08a6a', '#3e4a52'],
                      finishes: {
                        '*': { floor: 'concrete', wall: 'plaster' },
                        Bedroom: { floor: 'walnut', wall: 'brick' },
                      },
                      signature: ['sofa', 'custom:drum', 'not-a-piece'],
                    },
                    customs: { drum },
                    summary: 'Phong cách công nghiệp.',
                  };
                // The furnishing call: a sofa and the new drum table in the middle of the room.
                const pts = [...prompt.matchAll(/from \((-?[\d.]+), (-?[\d.]+)\)/g)].map((m) => [+m[1]!, +m[2]!]);
                const x = pts.reduce((s, q) => s + q[0]!, 0) / pts.length;
                const z = pts.reduce((s, q) => s + q[1]!, 0) / pts.length;
                const drumType = /- (custom:drum[\w-]*):/.exec(prompt)?.[1];
                return {
                  items: [
                    { type: 'sofa', x, z: z - 1, rot: 0 },
                    { type: drumType, x, z, rot: 0 },
                  ],
                  summary: 'Phòng khách kiểu loft.',
                };
              },
            },
    };
  });
  await page.goto('room/');
  await expect(page.locator('#viewer.ready')).toBeAttached({ timeout: 60_000 });
  await page.locator('#styleBtn').click();
  // A small generated picture stands in for the client's photo.
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  );
  await page.locator('#photoIn').setInputFiles({ name: 'loft.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('#photoPrev')).not.toHaveAttribute('hidden', '');
  await page.locator('#photoGo').click();
  await expect(page.locator('#styleDlg')).not.toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.toast')).toContainText('loft');
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('roomcraft.plan') ?? '{}'));
  await expect.poll(async () => (await saved()).photoStyle?.style.name).toBe('Industrial loft');
  const plan = await saved();
  expect(plan.style).toBe(plan.photoStyle.id);
  // Unknown finishes and pieces were dropped; the new piece the photo needed is in the style and the room.
  expect(plan.photoStyle.style.signature).toEqual(['sofa', 'custom:drum-coffee-table']);
  expect(plan.items.map((i: { type: string }) => i.type)).toContain('custom:drum-coffee-table');
  // Both calls saw the photo, as a JPEG.
  expect(await page.evaluate(() => (window as unknown as { __photos: string[] }).__photos)).toEqual([
    'image/jpeg',
    'image/jpeg',
  ]);
  // The style is offered in the style dialog with the built-in ones.
  await page.locator('#styleBtn').click();
  await expect(page.locator('#styleGrid')).toContainText('Industrial loft');
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
