const { execSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const { join } = require("node:path");

function findPlaywrightChrome() {
  try {
    const result = execSync("npx playwright install chromium --dry-run 2>&1", {
      encoding: "utf8",
    });
    const match = result.match(/chromium[^\n]*?chrome-linux\/chrome/);
    if (match) {
      const path = join(process.env.HOME, ".cache/ms-playwright", match[0]);
      if (existsSync(path)) return path;
    }
  } catch {}

  // Fallback: glob for any installed chromium version
  try {
    const base = join(process.env.HOME, ".cache/ms-playwright");
    const dirs = execSync(`ls ${base}`, { encoding: "utf8" })
      .split("\n")
      .filter((d) => d.startsWith("chromium-"));
    for (const dir of dirs) {
      const candidate = join(base, dir, "chrome-linux/chrome");
      if (existsSync(candidate)) return candidate;
    }
  } catch {}

  return undefined;
}

const chromePath = process.env.CHROME_PATH || findPlaywrightChrome();
if (chromePath) {
  process.env.CHROME_PATH = chromePath;
  console.log(`Using Chrome path: ${chromePath}`);
}

module.exports = {
  ci: {
    collect: {
      ...(chromePath ? { chromePath } : {}),
      url: ["http://localhost:80"],
      numberOfRuns: 3,
      settings: {
        chromeFlags: "--no-sandbox --disable-setuid-sandbox",
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.7 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["error", { minScore: 0.9 }],
        "categories:seo": ["error", { minScore: 0.7 }],
      },
    },
  },
};
