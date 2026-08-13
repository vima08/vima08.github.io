const { test, expect } = require('@playwright/test');

const canvasGames = [
  '/2d/pong.html',
  '/2d/cannon.html',
  '/2d/spInv.html',
  '/2d/goblins.html',
  '/2d/goblins2.html',
  '/2d/arkanoid.html',
  '/2d/snake.html',
  '/2d/asteroids.html',
  '/2d/tetris.html',
  '/2d/frogger.html',
  '/2d/platformer.html',
  '/2d/tablet-platformer.html',
  '/2d/paper.html',
];

for (const gamePath of canvasGames) {
  test(`${gamePath} creates a usable canvas`, async ({ page }) => {
    await page.goto(gamePath);
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    const size = await canvas.evaluate((element) => ({ width: element.width, height: element.height }));
    expect(size.width).toBeGreaterThan(0);
    expect(size.height).toBeGreaterThan(0);
  });
}

test('tic-tac-toe detects a winning line and can reset', async ({ page }) => {
  await page.goto('/2d/tic-tac-toe.html');
  const cells = page.locator('.cell');
  await expect(cells).toHaveCount(9);

  for (const index of [0, 3, 1, 4, 2]) await cells.nth(index).click();
  await expect(page.locator('#status')).toHaveText('Winner: X');

  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.locator('#status')).toContainText('Turn: X');
  await expect(cells.nth(0)).toHaveText('');
});

test('minesweeper renders a complete interactive board', async ({ page }) => {
  await page.goto('/2d/minesweeper.html');
  const cells = page.locator('.cell');
  await expect(cells).toHaveCount(100);

  await cells.first().click();
  await expect(page.locator('.cell.open')).not.toHaveCount(0);
});

test('3D pages declare Three.js and the FPS counter', async ({ request }) => {
  for (const gamePath of [
    '/3d/bowling.html',
    '/3d/breakout-3d.html',
    '/3d/invaders-3d.html',
    '/3d/asteroids-3d.html',
    '/3d/snake-3d.html',
    '/3d/platformer-3d.html',
  ]) {
    const html = await (await request.get(gamePath)).text();
    expect(html).toContain('three@0.160.0/build/three.min.js');
    expect(html).toContain('fps-counter.js');
  }
});


test('every game includes working shared audio controls', async ({ page }) => {
  const gamePaths = [
    ...canvasGames,
    '/2d/tic-tac-toe.html', '/2d/minesweeper.html',
    '/3d/bowling.html', '/3d/breakout-3d.html', '/3d/invaders-3d.html',
    '/3d/asteroids-3d.html', '/3d/snake-3d.html', '/3d/platformer-3d.html',
  ];

  for (const gamePath of gamePaths) {
    await page.goto(gamePath);
    const audioToggle = page.locator('.game-audio-toggle');
    await expect(audioToggle).toBeVisible();
    await expect(audioToggle).toHaveAttribute('aria-label', /sound|music/i);
    const volume = page.locator('.game-audio-volume');
    await expect(volume).toBeVisible();
    await expect(volume).toHaveAttribute('aria-label', /volume/i);
    await volume.fill('35');
    await expect(volume).toHaveValue('35');
    await audioToggle.click();
    await expect(audioToggle).toHaveAttribute('aria-pressed', /true|false/);
  }
});
