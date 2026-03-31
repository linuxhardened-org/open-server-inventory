#!/usr/bin/env node
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.argv[2] || 'http://localhost:8080';
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
  const page = await browser.newPage({ viewport: { width: 1440, height: 920 } });

  try {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(500);
    await shot(page, 'login_fresh.png');

    await page.goto(`${baseUrl}/setup`, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(800);
    await shot(page, 'setup_fresh.png');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

