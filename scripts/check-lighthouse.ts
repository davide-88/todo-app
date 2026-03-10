/**
 * CLS (Cumulative Layout Shift) validation using Playwright's Chromium.
 *
 * Measures CLS during page load against a vite preview server.
 * Validates CLS <= 0.01 threshold from architecture NFR9.
 *
 * Usage: npx tsx scripts/check-lighthouse.ts
 *
 * Requires: Frontend already built (packages/frontend/dist exists)
 */

import { spawn, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const CLS_THRESHOLD = 0.01;

function startPreview(): Promise<{ process: ChildProcess; url: string }> {
  return new Promise((res, rej) => {
    const frontendDir = resolve("packages/frontend");
    const proc = spawn(
      `${frontendDir}/node_modules/.bin/vite`,
      ["preview", "--port", "0"],
      { cwd: frontendDir, stdio: "pipe" },
    );

    const timeout = setTimeout(() => {
      proc.kill();
      rej(new Error("Preview server did not start within 15s"));
    }, 15000);

    proc.stdout?.on("data", (chunk: Buffer) => {
      const line = chunk.toString();
      const match = /Local:\s+(http:\/\/localhost:\d+)/.exec(line);
      if (match?.[1]) {
        clearTimeout(timeout);
        res({ process: proc, url: match[1] });
      }
    });

    proc.on("error", (e) => {
      clearTimeout(timeout);
      rej(e);
    });
  });
}

async function main() {
  console.log("CLS & Performance Validation");
  console.log("============================\n");

  console.log("Starting vite preview server...");
  const { process: preview, url } = await startPreview();
  console.log(`Preview server ready at ${url}\n`);

  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle" });

    // Collect CLS via PerformanceObserver (buffered captures shifts during load)
    const cls = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const shift = entry as unknown as {
              hadRecentInput: boolean;
              value: number;
            };
            if (!shift.hadRecentInput) {
              clsValue += shift.value;
            }
          }
        });
        observer.observe({ type: "layout-shift", buffered: true });
        setTimeout(() => {
          observer.disconnect();
          resolve(clsValue);
        }, 3000);
      });
    });

    // Collect FCP
    const fcp = await page.evaluate(() => {
      const paint = performance
        .getEntriesByType("paint")
        .find((e) => e.name === "first-contentful-paint");
      return paint?.startTime ?? -1;
    });

    await browser.close();

    // Report
    console.log("Results:");
    console.log("--------");

    const clsPass = cls <= CLS_THRESHOLD;
    console.log(
      `  ${clsPass ? "PASS" : "FAIL"}: CLS = ${cls.toFixed(4)} (threshold: <= ${CLS_THRESHOLD})`,
    );

    if (fcp >= 0) {
      console.log(`  INFO: FCP = ${fcp.toFixed(0)}ms`);
    }

    console.log("");
    if (clsPass) {
      console.log("PASS: All performance checks passed.");
    } else {
      console.log("FAIL: Some performance checks failed.");
      process.exit(1);
    }
  } finally {
    preview.kill();
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
