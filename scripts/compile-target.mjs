import { chromium } from 'playwright-core';
import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
  args: ['--no-sandbox'],
});

try {
  const page = await browser.newPage({ acceptDownloads: true, ignoreHTTPSErrors: true });
  await page.goto('https://127.0.0.1:5173/target-compiler.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const text = document.querySelector('#progress')?.textContent ?? '';
    return text.startsWith('Complete') || text === 'Compiler failed' || text.startsWith('Could not load');
  }, null, { timeout: 120_000 });

  const progress = await page.locator('#progress').textContent();
  if (!progress?.startsWith('Complete')) {
    const error = await page.locator('#result').textContent();
    throw new Error(`${progress ?? 'Target compiler stopped'}${error ? `\n${error}` : ''}`);
  }

  const targetPath = join(process.cwd(), 'public', 'targets', 'M1-M5.mind');
  const bytes = await page.evaluate(() => window.__mindTargetBuffer);
  if (!bytes?.length) throw new Error('Target compiler completed without returning bytes.');
  await writeFile(targetPath, Uint8Array.from(bytes));
  console.log(`Wrote ${targetPath}`);
} finally {
  await browser.close();
}
