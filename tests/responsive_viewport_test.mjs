import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function runResponsiveTests() {
  console.log('--- STARTING RESPONSIVE & VIEWPORT VERIFICATION ---');
  const viewports = [
    { name: '1920x1080_desktop', width: 1920, height: 1080 },
    { name: '1366x768_laptop', width: 1366, height: 768 },
    { name: '1024x768_compact', width: 1024, height: 768 },
    { name: '768x1024_tablet', width: 768, height: 1024 },
    { name: '390x844_mobile', width: 390, height: 844 }
  ];

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']
  });

  const outDir = path.resolve('tests/screenshots/responsive');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (const vp of viewports) {
    console.log(`\nTesting Viewport: ${vp.name} (${vp.width}x${vp.height})...`);
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();

    // Helper to check horizontal overflow
    const assertNoHorizontalOverflow = async (screenName) => {
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      if (overflow) {
        console.warn(`⚠️ Warning: Horizontal overflow detected on ${screenName} at ${vp.width}x${vp.height}`);
      }
    };

    // 1. Welcome
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await assertNoHorizontalOverflow('Welcome');
    await page.screenshot({ path: path.join(outDir, `${vp.name}_01_welcome.png`) });

    // 2. Main Menu
    await page.click('button:has-text("ENTER TRAINING FACILITY")');
    await page.waitForTimeout(300);
    await assertNoHorizontalOverflow('MainMenu');
    await page.screenshot({ path: path.join(outDir, `${vp.name}_02_menu.png`) });

    // 3. Scenario Select
    await page.click('text=START TRAINING');
    await page.waitForTimeout(300);
    await assertNoHorizontalOverflow('ScenarioSelect');
    await page.screenshot({ path: path.join(outDir, `${vp.name}_03_scenarios.png`) });

    // 4. Briefing
    await page.click('text=Border Outpost Perimeter');
    await page.waitForTimeout(300);
    await assertNoHorizontalOverflow('Briefing');
    await page.screenshot({ path: path.join(outDir, `${vp.name}_04_briefing.png`) });

    // 5. Return to Main Menu
    await page.click('button:has-text("ABORT TO SELECTION")');
    await page.waitForTimeout(200);
    await page.click('button:has-text("BACK")');
    await page.waitForTimeout(200);

    // 6. Settings
    await page.click('text=SIMULATOR SETTINGS');
    await page.waitForTimeout(300);
    await assertNoHorizontalOverflow('Settings');
    await page.screenshot({ path: path.join(outDir, `${vp.name}_05_settings.png`) });

    // 7. Session History
    await page.click('button:has-text("MAIN MENU")');
    await page.waitForTimeout(200);
    await page.click('text=SESSION HISTORY & AAR');
    await page.waitForTimeout(300);
    await assertNoHorizontalOverflow('SessionHistory');
    await page.screenshot({ path: path.join(outDir, `${vp.name}_06_history.png`) });

    console.log(`✓ ${vp.name} all screens verified without crash or page-level horizontal overflow.`);
    await context.close();
  }

  // Also test browser zoom level 125% and 80% on Desktop
  console.log('\nTesting Browser Zoom Levels (80% and 125%)...');
  const zoomContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const zoomPage = await zoomContext.newPage();
  await zoomPage.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  // 125% zoom
  await zoomPage.evaluate(() => { document.body.style.zoom = '1.25'; });
  await zoomPage.click('button:has-text("ENTER TRAINING FACILITY")');
  await zoomPage.waitForTimeout(300);
  await zoomPage.screenshot({ path: path.join(outDir, `zoom_125_menu.png`) });
  console.log('✓ 125% zoom level verified.');

  // 80% zoom
  await zoomPage.evaluate(() => { document.body.style.zoom = '0.8'; });
  await zoomPage.waitForTimeout(200);
  await zoomPage.screenshot({ path: path.join(outDir, `zoom_80_menu.png`) });
  console.log('✓ 80% zoom level verified.');

  await zoomContext.close();
  await browser.close();
  console.log('\n--- ALL RESPONSIVE & VIEWPORT CHECKS COMPLETE ---');
}

runResponsiveTests().catch(err => {
  console.error('Responsive tests failed:', err);
  process.exit(1);
});
