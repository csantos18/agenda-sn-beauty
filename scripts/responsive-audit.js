const { spawn } = require("child_process");
const fs = require("fs/promises");
const net = require("net");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");

const root = path.join(__dirname, "..");
const screenshotsDir = path.join(root, "artifacts", "responsive-audit");
const routes = [
  { name: "public", path: "/" },
  { name: "admin", path: "/admin", admin: true },
  { name: "terms", path: "/termos" },
];
const viewports = [
  { name: "small-mobile", width: 360, height: 740 },
  { name: "mobile", width: 390, height: 844 },
  { name: "large-mobile", width: 480, height: 900 },
  { name: "narrow-tablet", width: 620, height: 900 },
  { name: "tablet-portrait", width: 768, height: 1024 },
  { name: "tablet-air", width: 820, height: 1180 },
  { name: "tablet-wide", width: 900, height: 900 },
  { name: "tablet-landscape", width: 1024, height: 768 },
  { name: "small-desktop", width: 1180, height: 820 },
  { name: "desktop", width: 1366, height: 900 },
];
const structuralSelectors = [
  ".topbar",
  ".admin-topbar",
  ".hero",
  ".hero-panel",
  ".services-grid",
  ".workspace",
  ".lookup-form",
  ".policy-grid",
  ".privacy-grid",
  ".contact-grid",
  ".mothers-section",
  ".reviews-layout",
  ".reviews-list",
  ".admin-panel",
  ".admin-workspace",
  ".monitor-panel",
  ".admin-stats",
  ".week-grid",
  ".appointment-card",
  ".admin-review-card",
  ".terms-shell",
  ".terms-grid",
];
const checks = [];

async function main() {
  const port = await freePort();
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "sn-beauty-responsive-"));
  let server;
  let browser;

  try {
    await fs.rm(screenshotsDir, { recursive: true, force: true });
    await fs.mkdir(screenshotsDir, { recursive: true });

    server = startServer(port, dataDir);
    const baseUrl = `http://localhost:${port}`;
    await waitForHealth(baseUrl);

    browser = await chromium.launch();

    for (const viewport of viewports) {
      for (const route of routes) {
        await auditRoute(browser, baseUrl, route, viewport);
      }
    }
  } finally {
    if (browser) await browser.close();
    if (server) server.kill();
    await fs.rm(dataDir, { recursive: true, force: true });
  }

  console.table(checks);
  console.log(`Screenshots: ${path.relative(root, screenshotsDir)}`);

  if (checks.some((check) => !check.ok)) {
    process.exitCode = 1;
  }
}

async function auditRoute(browser, baseUrl, route, viewport) {
  const page = await browser.newPage({ viewport });
  page.auditConsoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      page.auditConsoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    page.auditConsoleErrors.push(error.message);
  });

  await page.goto(`${baseUrl}${route.path}`, { waitUntil: "networkidle" });

  if (route.admin) {
    await page.locator("#adminPinInput").fill("visual-test-pin");
    await page.locator("#adminForm button[type='submit']").click();
    await page.locator("#adminMonitorPanel").waitFor({ state: "visible", timeout: 5000 });
  }

  const label = `${route.name} ${viewport.name}`;
  const audit = await page.evaluate((selectors) => {
    const documentOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    const structuralOverflow = selectors
      .flatMap((selector) => Array.from(document.querySelectorAll(selector)))
      .filter((element) => element.scrollWidth > element.clientWidth + 2)
      .map((element) => ({
        selector: element.className || element.id || element.tagName,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }));

    const clippedText = Array.from(document.querySelectorAll("button, a, label, h1, h2, h3, strong, span, p"))
      .filter((element) => {
        const style = getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden") return false;
        return element.scrollWidth > element.clientWidth + 3 && style.overflow !== "visible";
      })
      .slice(0, 5)
      .map((element) => ({
        text: element.textContent.trim().slice(0, 48),
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }));

    return { documentOverflow, structuralOverflow, clippedText };
  }, structuralSelectors);

  record(`${label} no document overflow`, !audit.documentOverflow, "document width");
  record(
    `${label} no structural overflow`,
    audit.structuralOverflow.length === 0,
    audit.structuralOverflow.map((item) => `${item.selector}:${item.clientWidth}/${item.scrollWidth}`).join(" | "),
  );
  record(
    `${label} no clipped text`,
    audit.clippedText.length === 0,
    audit.clippedText.map((item) => `${item.text}:${item.clientWidth}/${item.scrollWidth}`).join(" | "),
  );
  record(`${label} console clean`, page.auditConsoleErrors.length === 0, page.auditConsoleErrors.join(" | "));

  await page.screenshot({
    path: path.join(screenshotsDir, `${route.name}-${viewport.name}.png`),
    fullPage: true,
  });
  await page.close();
}

function record(name, ok, detail = "") {
  checks.push({ name, ok, detail });
}

function startServer(port, dataDir) {
  const child = spawn(process.execPath, ["server.js"], {
    cwd: root,
    env: {
      ...process.env,
      ADMIN_PIN: "visual-test-pin",
      ADMIN_SESSION_SECRET: "visual-test-session-secret",
      DATA_DIR: dataDir,
      NODE_ENV: "production",
      PORT: String(port),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", () => {});
  child.stderr.on("data", (data) => {
    process.stderr.write(data);
  });

  return child;
}

async function waitForHealth(baseUrl) {
  const deadline = Date.now() + 10000;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Servidor responsivo nao respondeu em ${baseUrl}: ${lastError?.message || "timeout"}`);
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
