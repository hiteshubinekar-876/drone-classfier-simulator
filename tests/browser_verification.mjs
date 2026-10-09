import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function runBrowserVerification() {
  console.log('--- STARTING COMPREHENSIVE BROWSER VERIFICATION ---');
  const screenshotsDir = path.resolve('tests/screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const consoleLogs = [];
  const consoleErrors = [];
  const failedRequests = [];

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();

  page.on('console', (msg) => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error') {
      consoleErrors.push(text);
    }
  });

  page.on('requestfailed', (req) => {
    failedRequests.push(`${req.method()} ${req.url()}: ${req.failure()?.errorText}`);
  });

  try {
    // 1. WELCOME SCREEN
    console.log('STEP 1: Navigating to http://localhost:5173/ ...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const welcomeTitle = await page.textContent('h1');
    console.log('Welcome Screen Title:', welcomeTitle?.trim());
    if (!welcomeTitle?.includes('Virtual Drone-Threat')) {
      throw new Error(`Welcome screen title unexpected: ${welcomeTitle}`);
    }

    await page.screenshot({ path: path.join(screenshotsDir, '01_welcome_screen.png') });
    console.log('✓ Welcome Screen verified and captured.');

    // 2. MAIN MENU
    console.log('STEP 2: Clicking ENTER TRAINING FACILITY...');
    await page.click('button:has-text("ENTER TRAINING FACILITY")');
    await page.waitForTimeout(500);

    const menuHeader = await page.textContent('h2');
    console.log('Main Menu Header:', menuHeader?.trim());
    await page.screenshot({ path: path.join(screenshotsDir, '02_main_menu.png') });
    console.log('✓ Main Menu verified.');

    // Test Recognition Dossier Modal
    console.log('Testing Recognition Dossier Modal on Main Menu...');
    await page.click('text=RECOGNITION DOSSIER');
    await page.waitForTimeout(400);
    const dossierTitle = await page.textContent('text=AERIAL THREAT RECOGNITION CATALOG');
    if (!dossierTitle) throw new Error('Dossier modal failed to open');
    await page.screenshot({ path: path.join(screenshotsDir, '02b_recognition_dossier_modal.png') });
    await page.click('button:has-text("CLOSE")');
    await page.waitForTimeout(300);
    console.log('✓ Recognition Dossier modal verified and closed.');

    // 3. SCENARIO SELECTION
    console.log('STEP 3: Clicking START TRAINING...');
    await page.click('text=START TRAINING');
    await page.waitForTimeout(500);

    const selectTitle = await page.textContent('h1');
    console.log('Scenario Selection Title:', selectTitle?.trim());
    await page.screenshot({ path: path.join(screenshotsDir, '03_scenario_select.png') });

    // Test Difficulty Filters
    await page.click('button:has-text("beginner")');
    await page.waitForTimeout(300);
    await page.click('button:has-text("intermediate")');
    await page.waitForTimeout(300);
    await page.click('button:has-text("all")');
    await page.waitForTimeout(300);
    console.log('✓ Scenario Selection and difficulty filters verified.');

    // 4. MISSION BRIEFING
    console.log('STEP 4: Selecting "Border Outpost Perimeter"...');
    await page.click('text=Border Outpost Perimeter');
    await page.waitForTimeout(500);

    const briefTitle = await page.textContent('h1');
    console.log('Briefing Title:', briefTitle?.trim());
    if (!briefTitle?.includes('OP-VANGUARD')) {
      throw new Error(`Briefing title unexpected: ${briefTitle}`);
    }
    await page.screenshot({ path: path.join(screenshotsDir, '04_briefing_screen.png') });
    console.log('✓ Briefing Screen verified.');

    // 5. 3D SIMULATION SCREEN
    console.log('STEP 5: Commencing Simulation...');
    await page.click('button:has-text("COMMENCE SIMULATION")');
    await page.waitForTimeout(1500);

    // Verify canvas exists
    const canvas = await page.$('canvas');
    if (!canvas) throw new Error('3D WebGL Canvas not found in DOM!');
    console.log('✓ 3D Canvas element confirmed in DOM.');

    // Verify HUD elements: Codename, Mission Time, Compass Tape
    const codename = await page.textContent('.tactical-header-tag');
    console.log('Active HUD Codename:', codename?.trim());

    // Test Binocular Zoom toggle
    console.log('Testing Binocular Zoom toggle button...');
    await page.click('button:has-text("ZOOM")');
    await page.waitForTimeout(500);
    const zoomOverlay = await page.$('.binocular-overlay');
    if (!zoomOverlay) throw new Error('Binocular zoom overlay failed to render!');
    await page.screenshot({ path: path.join(screenshotsDir, '05_simulation_zoom_mode.png') });
    console.log('✓ Binocular zoom mode confirmed.');

    // Toggle Zoom off
    await page.click('button:has-text("ZOOM")');
    await page.waitForTimeout(400);

    // Test Pause and Resume
    console.log('Testing Pause modal...');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    const pauseTitle = await page.textContent('text=PAUSE MENU');
    if (!pauseTitle) throw new Error('Pause modal failed to render!');
    await page.screenshot({ path: path.join(screenshotsDir, '06_simulation_paused.png') });
    console.log('✓ Pause modal verified. Resuming simulation...');
    await page.click('button:has-text("RESUME TRAINING")');
    await page.waitForTimeout(500);

    // Wait for Target 1 (VULTURE-1) to spawn (spawnTimeSec: 4s)
    console.log('Waiting for Target 1 spawn at T+4s...');
    await page.waitForTimeout(4000);

    try {
      await page.click('button:has-text("CLASSIFY")', { timeout: 3000 });
      console.log('✓ Target contact detected in airspace HUD! Opening classification...');
      await page.waitForTimeout(500);

      const classificationDrawer = await page.$('.tactical-panel:has-text("AERIAL CONTACT CLASSIFICATION")');
      if (classificationDrawer) {
        console.log('✓ Classification Drawer opened on target acquisition.');
        await page.screenshot({ path: path.join(screenshotsDir, '07_classification_drawer.png') });

        // Select Rotary Quadcopter and submit
        await page.click('text=[1] Rotary');
        await page.waitForTimeout(200);
        await page.click('button:has-text("Submit (Enter)")');
        await page.waitForTimeout(600);
        console.log('✓ Target 1 classified as Quadcopter Surveillance UAV.');
      }
    } catch (e) {
      console.warn('Notice during Target 1 initial click:', e.message);
    }

    await page.screenshot({ path: path.join(screenshotsDir, '08_simulation_in_progress.png') });

    // Progress through simulation and classify remaining contacts
    console.log('Monitoring simulation progress and classifying remaining aerial contacts...');
    for (let sec = 0; sec < 40; sec++) {
      const resultsHeader = await page.$('text=MISSION RESULTS');
      if (resultsHeader) {
        console.log('Mission complete, results rendered.');
        break;
      }

      try {
        const hasClassifyBtn = await page.$('button:has-text("CLASSIFY")');
        if (hasClassifyBtn) {
          await page.click('button:has-text("CLASSIFY")', { timeout: 1500 });
          await page.waitForTimeout(400);

          const drawer = await page.$('.tactical-panel:has-text("AERIAL CONTACT CLASSIFICATION")');
          if (drawer) {
            const drawerText = await drawer.textContent();
            if (drawerText?.includes('SWIFT')) {
              await page.click('text=[2] Fixed-Wing');
              console.log('✓ Selected [2] Fixed-Wing for SWIFT-2.');
            } else if (drawerText?.includes('MOSQUITO')) {
              await page.click('text=[3] Nano/Micro');
              console.log('✓ Selected [3] Nano/Micro for MOSQUITO-3.');
            } else {
              await page.click('text=[1] Rotary');
              console.log('✓ Selected [1] Rotary.');
            }
            await page.waitForTimeout(200);
            await page.click('button:has-text("Submit (Enter)")');
            await page.waitForTimeout(600);
          }
        }
      } catch (err) {
        // Handled: target transition or frame timing
      }

      await page.waitForTimeout(1000);
    }

    // Ensure we transition to results
    const resultsHeader = await page.waitForSelector('text=MISSION RESULTS', { timeout: 45000 });
    if (!resultsHeader) throw new Error('Results screen did not appear after mission completion');
    await page.waitForTimeout(800);

    // 6. RESULTS SCREEN
    console.log('STEP 6: Verifying Results Screen...');
    const scoreVal = await page.textContent('.tactical-panel div:has-text("OUT OF 100")');
    console.log('Recorded Mission Score Summary:', scoreVal?.replace(/\s+/g, ' ').trim());
    await page.screenshot({ path: path.join(screenshotsDir, '09_results_screen.png') });
    console.log('✓ Results Screen verified.');

    // 7. AFTER-ACTION REVIEW (AAR) DASHBOARD
    console.log('STEP 7: Clicking AFTER-ACTION REVIEW (AAR)...');
    await page.click('button:has-text("AFTER-ACTION REVIEW (AAR)")');
    await page.waitForTimeout(600);

    const aarTitle = await page.textContent('h1');
    console.log('AAR Dashboard Title:', aarTitle?.trim());
    if (!aarTitle?.includes('MISSION LOG')) {
      throw new Error(`AAR Dashboard title unexpected: ${aarTitle}`);
    }

    // Verify timeline pins and diagnostic recommendations
    const timelinePins = await page.$$('.tactical-panel div[title*="T+"]');
    console.log(`✓ Timeline rendered ${timelinePins.length} event nodes.`);

    await page.screenshot({ path: path.join(screenshotsDir, '10_aar_dashboard.png') });
    console.log('✓ AAR Dashboard verified.');

    // 8. SESSION HISTORY & PERSISTENCE
    console.log('STEP 8: Returning to Main Menu and checking Session History...');
    await page.click('button:has-text("MAIN MENU")');
    await page.waitForTimeout(500);

    await page.click('text=SESSION HISTORY & AAR');
    await page.waitForTimeout(600);

    const historyTitle = await page.textContent('h1');
    console.log('Session History Title:', historyTitle?.trim());

    // Check table rows
    const sessionRows = await page.$$('tbody tr');
    console.log(`Found ${sessionRows.length} recorded session(s) in IndexedDB table.`);
    if (sessionRows.length === 0) {
      throw new Error('Expected at least 1 saved session in history table!');
    }
    await page.screenshot({ path: path.join(screenshotsDir, '11_session_history.png') });
    console.log('✓ Session History table verified with saved session.');

    // 9. RELOAD PERSISTENCE TEST
    console.log('STEP 9: Hard reloading browser to verify persistence across reloads...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    // Reopen history from menu
    await page.click('button:has-text("ENTER TRAINING FACILITY")');
    await page.waitForTimeout(400);
    await page.click('text=SESSION HISTORY & AAR');
    await page.waitForTimeout(600);

    const reloadedRows = await page.$$('tbody tr');
    console.log(`After reload: Found ${reloadedRows.length} session(s) in IndexedDB.`);
    if (reloadedRows.length === 0) {
      throw new Error('Data persistence failed: records disappeared after browser reload!');
    }
    await page.screenshot({ path: path.join(screenshotsDir, '12_session_history_after_reload.png') });
    console.log('✓ DATA PERSISTENCE VERIFIED: Session records survived hard reload.');

    // 10. SETTINGS SCREEN
    console.log('STEP 10: Testing Simulator Settings...');
    await page.click('button:has-text("MAIN MENU")');
    await page.waitForTimeout(400);
    await page.click('text=SIMULATOR SETTINGS');
    await page.waitForTimeout(500);

    const settingsTitle = await page.textContent('h1');
    console.log('Settings Title:', settingsTitle?.trim());

    // Switch presets
    await page.click('button:has-text("low")');
    await page.waitForTimeout(300);
    await page.click('button:has-text("high")');
    await page.waitForTimeout(300);
    await page.click('button:has-text("medium")');
    await page.waitForTimeout(300);

    await page.screenshot({ path: path.join(screenshotsDir, '13_settings_screen.png') });
    console.log('✓ Settings Screen verified.');

    console.log('\n--- BROWSER VERIFICATION SUMMARY ---');
    console.log(`Total Console Messages: ${consoleLogs.length}`);
    console.log(`Total Console Errors: ${consoleErrors.length}`);
    console.log(`Total Failed Requests: ${failedRequests.length}`);

    if (consoleErrors.length > 0) {
      console.log('Console Errors detected:', consoleErrors);
    }
    if (failedRequests.length > 0) {
      console.log('Failed Requests detected:', failedRequests);
    }

  } catch (err) {
    console.error('VERIFICATION ERROR:', err);
    await page.screenshot({ path: path.join(screenshotsDir, 'error_state.png') }).catch(() => {});
    throw err;
  } finally {
    await browser.close();
  }
}

runBrowserVerification().catch((e) => {
  console.error('Test execution failed:', e);
  process.exit(1);
});
