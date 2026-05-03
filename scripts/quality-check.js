const { spawn } = require("child_process");
const fs = require("fs/promises");
const net = require("net");
const os = require("os");
const path = require("path");

const root = path.join(__dirname, "..");

async function main() {
  await run("npm", ["run", "check"]);

  const port = await freePort();
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "sn-beauty-quality-"));
  const adminPin = "quality-test-pin";
  const adminSessionSecret = "quality-test-session-secret";
  const server = startServer(port, dataDir, adminPin, adminSessionSecret);

  try {
    const baseUrl = `http://127.0.0.1:${port}`;
    await waitForHealth(baseUrl);
    await run("npm", ["run", "smoke"], {
      ADMIN_PIN: adminPin,
      ADMIN_SESSION_SECRET: adminSessionSecret,
      BASE_URL: baseUrl,
    });
  } finally {
    server.kill();
    await fs.rm(dataDir, { recursive: true, force: true });
  }

  await run("npm", ["run", "mobile:check"]);
  await run("npm", ["run", "responsive:audit"]);
  await run("npm", ["run", "visual:check"]);
  await run("npm", ["audit", "--omit=dev"]);
}

function run(command, args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env: {
        ...process.env,
        ...extraEnv,
      },
      shell: process.platform === "win32",
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} saiu com codigo ${code}`));
    });
  });
}

function startServer(port, dataDir, adminPin, adminSessionSecret) {
  return spawn(process.execPath, ["server.js"], {
    cwd: root,
    env: {
      ...process.env,
      ADMIN_PIN: adminPin,
      ADMIN_SESSION_SECRET: adminSessionSecret,
      DATA_DIR: dataDir,
      NODE_ENV: "production",
      PORT: String(port),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
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

  throw new Error(`Servidor de qualidade nao respondeu em ${baseUrl}: ${lastError?.message || "timeout"}`);
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
