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

import { chromium } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";

const CLS_THRESHOLD = 0.01;

function getFreePort(): Promise<number> {
  return new Promise((res, rej) => {
    const srv = createServer();
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address() as { port: number };
      srv.close((err) => (err ? rej(err) : res(port)));
    });
  });
}

function startPreview(port: number): Promise<ChildProcess> {
  return new Promise((res, rej) => {
    const frontendDir = resolve("packages/frontend");
    const proc = spawn(
      `${frontendDir}/node_modules/.bin/vite`,
      ["preview", "--port", String(port), "--strictPort"],
      { cwd: frontendDir, stdio: "pipe" },
    );

    const timeout = setTimeout(() => {
      proc.kill();
      rej(new Error("Preview server did not start within 30s"));
    }, 15000);

    const onData = (chunk: Buffer) => {
      if (/Local:/.test(chunk.toString())) {
        clearTimeout(timeout);
        res(proc);
      }
    };
    proc.stdout?.on("data", onData);
    proc.stderr?.on("data", onData);

    proc.on("error", (e) => {
      clearTimeout(timeout);
      rej(e);
    });
  });
}

async function main() {
  console.log("CLS & Performance Validation");
  console.log("============================\n");

  const port = await getFreePort();
  const url = `http://localhost:${port}`;

  console.log("Starting vite preview server...");
  const preview = await startPreview(port);
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
