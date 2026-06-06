const {
  app,
  BrowserWindow,
  dialog,
  shell,
  Menu,
} = require("electron");
const { spawn } = require("child_process");
const fs = require("fs");
const http = require("http");
const https = require("https");
const net = require("net");
const os = require("os");
const path = require("path");

let mainWindow = null;
let serverProcess = null;
let frontendProcess = null;

const OUTPUT_BUFFER_MAX = 80;
let outputBuffer = [];
let suppressServerExitDialog = false;
let startupComplete = false;

function getProjectRoot() {
  return path.join(__dirname, "..");
}

function getEnvFilePath() {
  if (app.isPackaged) {
    return path.join(path.dirname(process.execPath), ".env");
  }
  return path.join(getProjectRoot(), ".env");
}

function parseEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;

  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function loadEnvFromExeDir() {
  const fileEnv = parseEnvFile(getEnvFilePath());
  return { ...process.env, ...fileEnv };
}

function getLocalIPv4() {
  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    if (!entries) continue;
    for (const entry of entries) {
      if (entry.family === "IPv4" && !entry.internal) {
        return entry.address;
      }
    }
  }
  return null;
}

function httpGet(url, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const client = url.startsWith("https:") ? https : http;
    const req = client.get(url, { timeout: timeoutMs }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once("error", () => resolve(false));
    tester.once("listening", () => {
      tester.close(() => resolve(true));
    });
    tester.listen(port, "127.0.0.1");
  });
}

function isProcessAlive(proc) {
  return proc && proc.exitCode === null && !proc.killed;
}

async function waitForServer(port, proc, timeoutMs = 60000) {
  const start = Date.now();
  const healthUrl = `http://127.0.0.1:${port}/api/healthz`;

  while (Date.now() - start < timeoutMs) {
    if (proc && !isProcessAlive(proc)) return false;
    if (await httpGet(healthUrl, 3000)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function checkServerReachable(serverUrl) {
  const base = serverUrl.replace(/\/+$/, "");
  return httpGet(`${base}/api/healthz`, 8000);
}

function findAvailablePort(preferredPort, extraRangeStart, extraRangeEnd) {
  const ports = [preferredPort];
  if (extraRangeStart != null && extraRangeEnd != null) {
    for (let p = extraRangeStart; p <= extraRangeEnd; p++) {
      if (!ports.includes(p)) ports.push(p);
    }
  }
  for (let p = 3000; p <= 3010; p++) {
    if (!ports.includes(p)) ports.push(p);
  }
  return ports;
}

function bufferOutput(chunk) {
  const text = chunk.toString();
  outputBuffer.push(text);
  if (outputBuffer.length > OUTPUT_BUFFER_MAX) {
    outputBuffer = outputBuffer.slice(-OUTPUT_BUFFER_MAX);
  }
}

function getOutputTail() {
  return outputBuffer.join("").trim().slice(-4000);
}

function getNodeBin() {
  if (process.env.npm_node_execpath) return process.env.npm_node_execpath;
  const candidates = [
    process.execPath,
    path.join(process.env.ProgramFiles || "C:\\Program Files", "nodejs", "node.exe"),
    "node",
  ];
  for (const candidate of candidates) {
    if (candidate === "node") return candidate;
    if (fs.existsSync(candidate)) return candidate;
  }
  return "node";
}

function ensureServerBuilt() {
  const { serverEntry } = getServerPaths();
  if (fs.existsSync(serverEntry)) return;

  const isWin = process.platform === "win32";
  const pnpm = isWin ? "pnpm.cmd" : "pnpm";
  const result = require("child_process").spawnSync(
    pnpm,
    ["--filter", "@workspace/api-server", "run", "build"],
    {
      cwd: getProjectRoot(),
      env: process.env,
      shell: isWin,
      stdio: "inherit",
    },
  );
  if (result.status !== 0) {
    throw new Error("Failed to build API server. Run: pnpm --filter @workspace/api-server run build");
  }
}

function killProcess(proc) {
  if (!proc || proc.killed) return;
  try {
    proc.kill("SIGTERM");
  } catch {
    /* ignore */
  }
}

function createWindow(loadUrl) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "Makhazeny — مخازني",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (app.isPackaged) {
    Menu.setApplicationMenu(null);
    mainWindow.setMenu(null);
    mainWindow.setMenuBarVisibility(false);
  }

  mainWindow.loadURL(loadUrl);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Allow in-app print previews (about:blank); open real URLs externally.
    if (!url || url === "about:blank") {
      return { action: "allow" };
    }
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function getServerPaths() {
  if (app.isPackaged) {
    return {
      serverEntry: path.join(process.resourcesPath, "server", "index.mjs"),
      staticDir: path.join(process.resourcesPath, "frontend"),
    };
  }
  return {
    serverEntry: path.join(
      getProjectRoot(),
      "artifacts",
      "api-server",
      "dist",
      "index.mjs",
    ),
    staticDir: path.join(
      getProjectRoot(),
      "artifacts",
      "makhazeny",
      "dist",
      "public",
    ),
  };
}

function spawnServer(env, port, options = {}) {
  const { devMode = false } = options;
  const { serverEntry, staticDir } = getServerPaths();

  if (!fs.existsSync(serverEntry)) {
    throw new Error(
      `Server entry not found: ${serverEntry}\nRun: pnpm --filter @workspace/api-server run build`,
    );
  }

  const serverEnv = {
    ...env,
    NODE_ENV: devMode ? "development" : "production",
    PORT: String(port),
    HOST: env.SERVER_HOST || "0.0.0.0",
    STATIC_DIR: !devMode && fs.existsSync(staticDir) ? staticDir : "",
  };

  if (app.isPackaged) {
    serverEnv.ELECTRON_RUN_AS_NODE = "1";
  }

  outputBuffer = [];
  const nodeBin = app.isPackaged ? process.execPath : getNodeBin();
  const nodeArgs = app.isPackaged
    ? [serverEntry]
    : ["--enable-source-maps", serverEntry];

  serverProcess = spawn(nodeBin, nodeArgs, {
    env: serverEnv,
    cwd: path.dirname(serverEntry),
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });

  serverProcess.stdout?.on("data", (d) => {
    process.stdout.write(d);
    bufferOutput(d);
  });
  serverProcess.stderr?.on("data", (d) => {
    process.stderr.write(d);
    bufferOutput(d);
  });

  serverProcess.on("exit", (code) => {
    if (
      code !== 0 &&
      code !== null &&
      !app.isQuitting &&
      !suppressServerExitDialog &&
      startupComplete
    ) {
      const tail = getOutputTail();
      dialog.showErrorBox(
        "Server Error",
        `Server exited with code ${code}.\n\n${tail || "No server output captured."}`,
      );
    }
  });

  return serverProcess;
}

async function tryStartApiServer(env, ports, devMode = false) {
  for (const candidate of ports) {
    if (!(await isPortFree(candidate))) {
      continue;
    }

    suppressServerExitDialog = true;
    spawnServer(env, candidate, { devMode });
    const ready = await waitForServer(candidate, serverProcess, 15000);
    if (ready && isProcessAlive(serverProcess)) {
      suppressServerExitDialog = false;
      return candidate;
    }
    killProcess(serverProcess);
    serverProcess = null;
    await new Promise((r) => setTimeout(r, 400));
  }
  suppressServerExitDialog = false;
  return null;
}

function spawnFrontendDev(env, port) {
  const frontendDir = path.join(
    getProjectRoot(),
    "artifacts",
    "makhazeny",
  );
  const isWin = process.platform === "win32";
  const pnpm = isWin ? "pnpm.cmd" : "pnpm";

  const frontendEnv = {
    ...env,
    PORT: String(port),
    API_PORT: String(env.PORT || 8080),
    BASE_PATH: env.BASE_PATH || "/",
    NODE_ENV: "development",
  };

  outputBuffer = [];
  frontendProcess = spawn(
    pnpm,
    ["--filter", "@workspace/makhazeny", "run", "dev"],
    {
      env: frontendEnv,
      cwd: getProjectRoot(),
      shell: isWin,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  frontendProcess.stdout?.on("data", (d) => {
    process.stdout.write(d);
    bufferOutput(d);
  });
  frontendProcess.stderr?.on("data", (d) => {
    process.stderr.write(d);
    bufferOutput(d);
  });

  return frontendProcess;
}

async function startServerMode(env) {
  const preferredPort = Number(env.SERVER_PORT || 4000);
  const ports = findAvailablePort(preferredPort, preferredPort + 1, preferredPort + 20);
  const port = await tryStartApiServer(env, ports, false);

  if (!port) {
    const tail = getOutputTail();
    dialog.showErrorBox(
      "Startup Failed",
      `Could not start server on ports ${ports.join(", ")}.\n\n${tail || "No server output captured."}`,
    );
    app.quit();
    return;
  }

  if (app.isPackaged) {
    const localIp = getLocalIPv4();
    let message = `Server is running.\n\nThis machine: http://127.0.0.1:${port}`;
    if (localIp) {
      message += `\nOther machines: http://${localIp}:${port}`;
    } else {
      message += `\nNetwork: http://0.0.0.0:${port}`;
    }
    message += "\n\nEdit .env beside the exe to change MySQL password and settings.";
    await dialog.showMessageBox({
      type: "info",
      title: "Makhazeny Server",
      message: "Server is running",
      detail: message,
    });
  }

  startupComplete = true;
  createWindow(`http://127.0.0.1:${port}`);
}

async function startDevServerMode(env) {
  ensureServerBuilt();

  const preferredApiPort = Number(env.PORT || 8080);
  const apiPorts = findAvailablePort(preferredApiPort, preferredApiPort + 1, preferredApiPort + 10);
  const apiPort = await tryStartApiServer(env, apiPorts, true);

  if (!apiPort) {
    const tail = getOutputTail();
    dialog.showErrorBox(
      "API Server Failed",
      `API server did not start (tried ports ${apiPorts.join(", ")}).\n\n` +
        `Common causes:\n` +
        `- Port already in use (close other Makhazeny/Node windows)\n` +
        `- MySQL not running or wrong password in .env\n\n` +
        `${tail || "No server output captured."}`,
    );
    app.quit();
    return;
  }

  const preferredFrontendPort = Number(env.FRONTEND_PORT || 25085);
  const frontendPorts = findAvailablePort(
    preferredFrontendPort,
    preferredFrontendPort + 1,
    preferredFrontendPort + 5,
  );
  let frontendPort = null;

  for (const candidate of frontendPorts) {
    if (!(await isPortFree(candidate))) {
      continue;
    }
    spawnFrontendDev({ ...env, PORT: String(apiPort) }, candidate);
    const ready = await waitForServer(candidate, frontendProcess, 90000);
    if (ready && isProcessAlive(frontendProcess)) {
      frontendPort = candidate;
      break;
    }
    killProcess(frontendProcess);
    frontendProcess = null;
    await new Promise((r) => setTimeout(r, 400));
  }

  if (!frontendPort) {
    const tail = getOutputTail();
    dialog.showErrorBox(
      "Frontend Failed",
      `Frontend did not start (tried ports ${frontendPorts.join(", ")}).\n\n${tail || "No server output captured."}`,
    );
    app.quit();
    return;
  }

  startupComplete = true;
  createWindow(`http://127.0.0.1:${frontendPort}`);
}

async function startClientMode(env) {
  const serverUrl = (env.SERVER_URL || "").trim();
  if (!serverUrl) {
    dialog.showErrorBox(
      "Configuration Error",
      "CLIENT mode requires SERVER_URL in .env file.\n\nExample: SERVER_URL=http://192.168.1.100:4000",
    );
    app.quit();
    return;
  }

  const reachable = await checkServerReachable(serverUrl);
  if (!reachable) {
    dialog.showErrorBox(
      "Server Unreachable",
      `Cannot connect to server at:\n${serverUrl}\n\nMake sure the server is running and SERVER_URL is correct in .env`,
    );
    app.quit();
    return;
  }

  startupComplete = true;
  createWindow(serverUrl);
}

async function bootstrap() {
  const env = loadEnvFromExeDir();
  const mode = (env.APP_MODE || "server").toLowerCase();

  if (mode === "client") {
    await startClientMode(env);
    return;
  }

  if (app.isPackaged) {
    await startServerMode(env);
    return;
  }

  await startDevServerMode(env);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.on("ready", () => {
    if (app.isPackaged) {
      Menu.setApplicationMenu(null);
    }

    bootstrap().catch((err) => {
      dialog.showErrorBox("Startup Error", err.message || String(err));
      app.quit();
    });
  });

  app.on("before-quit", () => {
    app.isQuitting = true;
    killProcess(serverProcess);
    killProcess(frontendProcess);
  });

  app.on("window-all-closed", () => {
    killProcess(serverProcess);
    killProcess(frontendProcess);
    app.quit();
  });
}
