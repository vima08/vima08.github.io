const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/2d/piano.html');
});

test('places the right-hand part on the right and records held duration', async ({ page }) => {
  await expect(page.locator('.track .title')).toHaveText(['Левая рука', 'Правая рука']);

  await page.locator('#simple-mode').uncheck();
  await page.keyboard.down('a');
  await page.waitForTimeout(175);
  await page.keyboard.up('a');

  const duration = Number(await page.locator('#right-notes select').inputValue());
  expect(duration).toBeGreaterThanOrEqual(120);
  expect(duration).toBeLessThan(500);
});

test('highlights a score note during playback and imports/exports markdown', async ({ page }) => {
  await page.keyboard.press('a');
  await page.locator('#play').click();
  await expect(page.locator('#right-notes .note')).toHaveClass(/playing/);

  await page.locator('#import-file').setInputFiles({
    name: 'parties.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(`| Партия | Нота | Длительность, мс |\n| --- | --- | ---: |\n| Левая | C3 | 250 |\n| Правая | Пауза | 600 |\n`),
  });
  await expect(page.locator('#left-notes .note strong')).toHaveText('C3');
  await expect(page.locator('#right-notes .note strong')).toHaveText('Пауза');

  const downloadPromise = page.waitForEvent('download');
  await page.locator('#export').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('ivory-nocturne-parties.md');
  const stream = await download.createReadStream();
  let markdown = '';
  for await (const chunk of stream) markdown += chunk;
  expect(markdown).toContain('| Левая | C3 | 250 |');
  expect(markdown).toContain('| Правая | Пауза | 600 |');
});
