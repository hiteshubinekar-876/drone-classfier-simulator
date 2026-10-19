import { chromium } from 'playwright';

async function diagnose() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']
  });

  const urls = [
    'http://localhost:5173/',
    'http://127.0.0.1:5173/',
    'http://172.29.219.240:5173/'
  ];

  for (const url of urls) {
    console.log(`\n========================================`);
    console.log(`=== Testing Endpoint: ${url} ===`);
    console.log(`========================================`);
    const page = await browser.newPage();
    const consoleLogs = [];
    const errors = [];
    const failedReqs = [];

    page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => errors.push(err.toString()));
    page.on('requestfailed', req => failedReqs.push(`${req.url()} (${req.failure()?.errorText})`));

    try {
      const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
      console.log(`HTTP Status: ${response?.status()}`);
      await page.waitForTimeout(800);

      const rootHtml = await page.evaluate(() => document.getElementById('root')?.innerHTML);
      console.log(`Root innerHTML length: ${rootHtml?.length || 0}`);
      console.log(`Page title: ${await page.title()}`);
      
      const welcomeH1 = await page.textContent('h1').catch(() => null);
      console.log(`Main screen header: ${welcomeH1}`);

      // Click "CALIBRATION / SETTINGS" button to test Settings screen
      console.log(`Navigating to Settings screen...`);
      const settingsBtn = await page.getByRole('button', { name: /CALIBRATION/i }).or(page.getByText(/CALIBRATION/i)).first();
      if (await settingsBtn.isVisible()) {
        await settingsBtn.click();
        await page.waitForTimeout(500);

        const settingsH1 = await page.textContent('h1').catch(() => null);
        console.log(`Settings H1: ${settingsH1}`);

        // Switch to CONTROLS tab
        console.log(`Switching to CONTROLS / KEY BINDINGS tab...`);
        const controlsTabBtn = await page.getByRole('button', { name: /CONTROLS/i }).first();
        if (await controlsTabBtn.isVisible()) {
          await controlsTabBtn.click();
          await page.waitForTimeout(500);

          const controlsHeader = await page.textContent('.tactical-header-tag').catch(() => null);
          console.log(`Controls Tab Active Header: ${controlsHeader}`);

          const rebindButtonsCount = await page.getByRole('button', { name: /REBIND/i }).count();
          console.log(`Rebind action buttons found: ${rebindButtonsCount}`);
        }
      }

      console.log(`✅ ${url} verified successfully!`);
    } catch (e) {
      console.log(`❌ Error testing ${url}: ${e.message}`);
    }

    if (errors.length > 0) console.log('Page Errors:', errors);
    if (failedReqs.length > 0) console.log('Failed Requests:', failedReqs);
    if (consoleLogs.length > 0) console.log('Console Logs Sample (last 5):\n', consoleLogs.slice(-5).join('\n'));

    await page.close();
  }

  await browser.close();
}

diagnose();
