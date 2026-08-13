const { test, expect } = require('@playwright/test');

const expectedGames = [
  '/2d/pong.html',
  '/2d/cannon.html',
  '/2d/spInv.html',
  '/2d/goblins.html',
  '/2d/goblins2.html',
  '/2d/arkanoid.html',
  '/2d/snake.html',
  '/2d/asteroids.html',
  '/2d/tetris.html',
  '/2d/tic-tac-toe.html',
  '/2d/minesweeper.html',
  '/2d/frogger.html',
  '/2d/platformer.html',
  '/2d/tablet-platformer.html',
  '/2d/paper.html',
  '/2d/piano.html',
  '/3d/bowling.html',
  '/3d/breakout-3d.html',
  '/3d/invaders-3d.html',
  '/3d/asteroids-3d.html',
  '/3d/snake-3d.html',
  '/3d/platformer-3d.html',
];

test('catalog lists every game exactly once', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('Mini Games Collection');
  const links = page.locator('.grid a');
  await expect(links).toHaveCount(expectedGames.length);
  expect(await links.evaluateAll((items) => items.map((item) => item.getAttribute('href')))).toEqual(expectedGames);
});

for (const gamePath of expectedGames) {
  test(`${gamePath} is a valid game page`, async ({ request }) => {
    const response = await request.get(gamePath);
    expect(response.ok()).toBeTruthy();

    const html = await response.text();
    expect(html).toMatch(/<title>[^<]+<\/title>/i);
    expect(html).toMatch(/<script[\s>]/i);
    expect(html).toMatch(/<link[^>]+rel=["']icon["']/i);
  });
}
