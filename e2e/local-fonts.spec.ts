import { expect, test } from '@playwright/test';

test('demo typefaces load locally when external font services are unavailable', async ({ page }) => {
  const externalFonts: string[] = [];
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => {
    externalFonts.push(route.request().url());
    return route.abort();
  });
  await page.goto('./#playground');
  await expect(page.getByRole('textbox', { name: 'Rich text editor', exact: true })).toBeVisible();
  const fonts = await page.evaluate(async () => {
    const families = ['Fraunces', 'Hanken Grotesk', 'JetBrains Mono'];
    const outcomes = [];
    for (const family of families) {
      const faces = await document.fonts.load(`500 20px "${family}"`, 'São João — Łódź');
      outcomes.push({ family, loaded: faces.length > 0 && faces.every(face => face.status === 'loaded') });
    }
    await document.fonts.ready;
    return outcomes;
  });
  expect(fonts).toEqual([
    { family: 'Fraunces', loaded: true },
    { family: 'Hanken Grotesk', loaded: true },
    { family: 'JetBrains Mono', loaded: true },
  ]);
  expect(externalFonts).toEqual([]);
  await test.info().attach('local-typography', { body: await page.screenshot(), contentType: 'image/png' });
});
