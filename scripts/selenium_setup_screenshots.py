#!/usr/bin/env python3
"""
Capture Setup-flow screenshots for README using Selenium.

Usage:
  python3 scripts/selenium_setup_screenshots.py --base-url http://localhost:5173

Outputs:
  docs/screenshots/setup/setup_step1_db_selection.png
  docs/screenshots/setup/setup_step1_local_loading.png (if visible)
  docs/screenshots/setup/setup_step2_app_name.png
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


def build_driver(headless: bool) -> webdriver.Chrome:
    options = Options()
    if headless:
        options.add_argument("--headless=new")
    options.add_argument("--window-size=1440,920")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    return webdriver.Chrome(options=options)


def save_shot(driver: webdriver.Chrome, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    ok = driver.save_screenshot(str(path))
    if not ok:
        raise RuntimeError(f"Failed to save screenshot: {path}")
    print(f"saved: {path}")


def wait_text(driver: webdriver.Chrome, text: str, timeout: int = 10) -> bool:
    try:
        WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((By.XPATH, f"//*[contains(normalize-space(.), '{text}')]"))
        )
        return True
    except TimeoutException:
        return False


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://localhost:5173", help="ServerVault frontend URL")
    parser.add_argument(
        "--output-dir",
        default="docs/screenshots/setup",
        help="Directory for generated screenshots",
    )
    parser.add_argument("--no-headless", action="store_true", help="Run with visible browser")
    args = parser.parse_args()

    out_dir = Path(args.output_dir)
    driver = build_driver(headless=not args.no_headless)

    try:
        driver.get(f"{args.base_url.rstrip('/')}/setup")

        if not wait_text(driver, "Choose database", timeout=12):
            print(
                "Could not open setup page. Ensure backend/frontend are running and setup is not already completed.",
                file=sys.stderr,
            )
            return 2

        save_shot(driver, out_dir / "setup_step1_db_selection.png")

        # Local PostgreSQL is selected by default; capture loading state if it appears.
        # We retry briefly because preparation is async.
        local_loading_visible = False
        for _ in range(8):
            if wait_text(driver, "Starting local database", timeout=1) or wait_text(
                driver, "Applying schema", timeout=1
            ):
                local_loading_visible = True
                break
            time.sleep(0.35)

        if local_loading_visible:
            save_shot(driver, out_dir / "setup_step1_local_loading.png")
        else:
            print("info: local loading animation was not visible; skipped loading screenshot")

        # Continue to Step 2 when button is enabled.
        continue_btn = WebDriverWait(driver, 20).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Continue')]"))
        )
        continue_btn.click()
        if not wait_text(driver, "Almost done", timeout=8):
            print("Could not navigate to setup step 2.", file=sys.stderr)
            return 3
        save_shot(driver, out_dir / "setup_step2_app_name.png")

        print("Setup screenshots captured successfully.")
        return 0
    finally:
        driver.quit()


if __name__ == "__main__":
    raise SystemExit(main())

