#!/usr/bin/env node
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.argv[2] || 'http://localhost:8080';
const username = process.argv[3] || 'admin';
const password = process.argv[4] || 'changeme';
const outDir = path.resolve('docs/screenshots');

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

async function shot(page, fileName) {
  const out = path.join(outDir, fileName);
  await page.screenshot({ path: out, fullPage: true });
  console.log(`saved: ${out}`);
}

async function run() {
  await ensureDir(outDir);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 920 } });
  await context.clearCookies();
  const page = await context.newPage();

  try {
    // --- Login page screenshot ---
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(800);
    await shot(page, 'login_fresh.png');

    // --- Log in ---
    await page.waitForSelector('#login-username', { timeout: 10000 });
    await page.fill('#login-username', username);
    await page.fill('#login-password', password);
    await page.click('button[type="submit"]');

    // Handle forced password change on first login
    await page.waitForURL(/\/(servers|change-password)/, { timeout: 15000 });
    if (page.url().includes('/change-password')) {
      console.log('Password change required, submitting new password...');
      await page.waitForSelector('input[type="password"]', { timeout: 8000 });
      const pwFields = page.locator('input[type="password"]');
      await pwFields.nth(0).fill(password);
      await pwFields.nth(1).fill(password);
      await page.click('button[type="submit"]');
      await page.waitForURL(`${baseUrl}/servers`, { timeout: 15000 });
    }
    await page.goto(`${baseUrl}/servers`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1200);

    // --- Servers ---
    await shot(page, 'servers.png');

    // --- Server Detail ---
    const firstLink = page.locator('table tbody tr').first().locator('a, td').first();
    if (await firstLink.count()) {
      await firstLink.click();
      await page.waitForURL(/\/servers\/\d+/, { timeout: 10000 }).catch(() => {});
    } else {
      await page.goto(`${baseUrl}/servers/1`, { waitUntil: 'networkidle', timeout: 20000 });
    }
    await page.waitForTimeout(1000);
    await shot(page, 'server_detail.png');

    // --- Groups ---
    await page.goto(`${baseUrl}/groups`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(900);
    await shot(page, 'groups.png');

    // --- Tags ---
    await page.goto(`${baseUrl}/tags`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(900);
    await shot(page, 'tags.png');

    // --- IP Inventory ---
    await page.goto(`${baseUrl}/ips`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(900);
    await shot(page, 'ip_inventory.png');

    // --- Cloud Integrations ---
    await page.goto(`${baseUrl}/cloud`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(900);
    await shot(page, 'cloud_integrations.png');

    // --- Users ---
    await page.goto(`${baseUrl}/users`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(900);
    await shot(page, 'users.png');

    // --- API Settings ---
    await page.goto(`${baseUrl}/api-settings`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(900);
    await shot(page, 'api_settings.png');

    // --- Profile ---
    await page.goto(`${baseUrl}/profile`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(900);
    await shot(page, 'profile.png');

    // --- Settings ---
    await page.goto(`${baseUrl}/settings`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(900);
    await shot(page, 'settings.png');

  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
