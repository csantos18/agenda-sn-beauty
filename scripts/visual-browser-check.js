const { spawn } = require("child_process");
const fs = require("fs/promises");
const net = require("net");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");

const root = path.join(__dirname, "..");
const screenshotsDir = path.join(root, "artifacts", "visual-check");
const checks = [];

async function main() {
  const port = await freePort();
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "sn-beauty-visual-"));
  let server;
  let browser;

  try {
    await fs.rm(screenshotsDir, { recursive: true, force: true });
    await fs.mkdir(screenshotsDir, { recursive: true });

    server = startServer(port, dataDir);
    const baseUrl = `http://localhost:${port}`;
    await waitForHealth(baseUrl);

    await expectBlockedProjectFiles(baseUrl);

    browser = await chromium.launch();
    await checkPublicPage(browser, baseUrl, "desktop", { width: 1366, height: 900 });
    await checkPublicPage(browser, baseUrl, "mobile", { width: 390, height: 844 });
    await checkTermsPage(browser, baseUrl);
    await checkAdminPage(browser, baseUrl);
  } finally {
    if (browser) {
      await browser.close();
    }
    if (server) {
      server.kill();
    }
    await fs.rm(dataDir, { recursive: true, force: true });
  }

  console.table(checks);
  console.log(`Screenshots: ${path.relative(root, screenshotsDir)}`);

  if (checks.some((check) => !check.ok)) {
    process.exitCode = 1;
  }
}

function record(name, ok, detail = "") {
  checks.push({ name, ok, detail });
}

async function checkPublicPage(browser, baseUrl, label, viewport) {
  const page = await newCheckedPage(browser, viewport);
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });

  record(`public ${label} title`, (await page.title()) === "Agenda SN Beauty", await page.title());
  record(`public ${label} hero`, await page.locator("h1").filter({ hasText: "Agenda SN Beauty" }).isVisible(), "h1");
  record(`public ${label} services render`, (await page.locator(".service-card").count()) >= 6, "service cards");
  record(`public ${label} booking form render`, await page.locator("#bookingForm").isVisible(), "booking form");
  await expectNoHorizontalOverflow(page, `public ${label}`);
  await expectNoConsoleErrors(page, `public ${label}`);
  await page.screenshot({ path: path.join(screenshotsDir, `public-${label}.png`), fullPage: true });
  await page.close();
}

async function checkTermsPage(browser, baseUrl) {
  const page = await newCheckedPage(browser, { width: 390, height: 844 });
  await page.goto(`${baseUrl}/termos`, { waitUntil: "networkidle" });

  record("terms page title", (await page.title()).includes("Termos"), await page.title());
  record("terms content visible", (await page.locator(".terms-card").count()) >= 4, "terms cards");
  await expectNoHorizontalOverflow(page, "terms mobile");
  await expectNoConsoleErrors(page, "terms mobile");
  await page.screenshot({ path: path.join(screenshotsDir, "terms-mobile.png"), fullPage: true });
  await page.close();
}

async function checkAdminPage(browser, baseUrl) {
  const page = await newCheckedPage(browser, { width: 1366, height: 900 });
  await page.goto(`${baseUrl}/admin`, { waitUntil: "networkidle" });

  record("admin title", (await page.title()).includes("Painel"), await page.title());
  record("admin login form visible", await page.locator("#adminForm").isVisible(), "admin form");
  await page.locator("#adminPinInput").fill("visual-test-pin");
  await page.locator("#adminForm button[type='submit']").click();
  await page.locator("#adminMonitorPanel").waitFor({ state: "visible", timeout: 5000 });

  record("admin login works", await page.locator("#adminMonitorPanel").isVisible(), "monitor panel");
  record("admin appointments panel visible", await page.locator("#appointmentsList").isVisible(), "appointments list");
  await expectNoHorizontalOverflow(page, "admin desktop");
  await expectNoConsoleErrors(page, "admin desktop");
  await page.screenshot({ path: path.join(screenshotsDir, "admin-desktop.png"), fullPage: true });
  await page.close();
}

async function newCheckedPage(browser, viewport) {
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
  return page;
}

async function expectNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  record(`${label} no horizontal overflow`, !overflow, "document width");
}

async function expectNoConsoleErrors(page, label) {
  record(`${label} console clean`, page.auditConsoleErrors.length === 0, page.auditConsoleErrors.join(" | "));
}

async function expectBlockedProjectFiles(baseUrl) {
  const blockedFiles = [
    "/.env.example",
    "/.gitignore",
    "/CHANGELOG.md",
    "/database.json",
    "/package.json",
    "/render.yaml",
    "/server.js",
    "/scripts/smoke-test.js",
    "/supabase-schema.sql",
  ];

  const responses = await Promise.all(blockedFiles.map((route) => fetch(`${baseUrl}${route}`)));
  const blocked = responses.every((response) => response.status === 404);
  record(
    "browser server blocks project files",
    blocked,
    responses.map((response, index) => `${blockedFiles[index]}=${response.status}`).join(" "),
  );
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

  throw new Error(`Servidor visual nao respondeu em ${baseUrl}: ${lastError?.message || "timeout"}`);
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
  console.error(error.message);
  process.exit(1);
});
