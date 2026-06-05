const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const packDir = path.join(projectRoot, ".electron-pack");
const serverPackDir = path.join(packDir, "server");
const frontendPackDir = path.join(packDir, "frontend");

const isWin = process.platform === "win32";
const pnpm = isWin ? "pnpm.cmd" : "pnpm";
const npx = isWin ? "npx.cmd" : "npx";

function run(cmd, args, env = {}) {
  console.log(`\n> ${cmd} ${args.join(" ")}`);
  const result = spawnSync(cmd, args, {
    cwd: projectRoot,
    env: { ...process.env, ...env },
    stdio: "inherit",
    shell: isWin,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function rmDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyRecursive(src, dest) {
  if (fs.cpSync) {
    fs.cpSync(src, dest, { recursive: true, verbatimSymlinks: false });
    return;
  }
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    ensureDir(dest);
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
    return;
  }
  fs.copyFileSync(src, dest);
}

function loadEnv() {
  const envPath = path.join(projectRoot, ".env");
  if (!fs.existsSync(envPath)) {
    console.warn("Warning: .env not found — using defaults for build");
    return {};
  }
  const env = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

console.log("=== Makhazeny Electron Build ===\n");

const fileEnv = loadEnv();

// 1. Build frontend (Vite)
run(pnpm, ["--filter", "@workspace/makhazeny", "run", "build"], {
  PORT: fileEnv.FRONTEND_PORT || "25085",
  BASE_PATH: fileEnv.BASE_PATH || "/",
  NODE_ENV: "production",
});

// 2. Build API server (esbuild bundle)
run(pnpm, ["--filter", "@workspace/api-server", "run", "build"], {
  NODE_ENV: "production",
});

// 3. Prepare .electron-pack
rmDir(packDir);
ensureDir(serverPackDir);
ensureDir(frontendPackDir);

const serverDistDir = path.join(
  projectRoot,
  "artifacts",
  "api-server",
  "dist",
);
const serverEntry = path.join(serverDistDir, "index.mjs");
const frontendSrc = path.join(
  projectRoot,
  "artifacts",
  "makhazeny",
  "dist",
  "public",
);

if (!fs.existsSync(serverEntry)) {
  console.error(`Missing server build: ${serverEntry}`);
  process.exit(1);
}
if (!fs.existsSync(frontendSrc)) {
  console.error(`Missing frontend build: ${frontendSrc}`);
  process.exit(1);
}

// Copy full server dist (index.mjs + pino worker files)
copyRecursive(serverDistDir, serverPackDir);
copyRecursive(frontendSrc, frontendPackDir);

console.log("\nPacked server + frontend into .electron-pack/");

// 4. Run electron-builder
run(npx, ["electron-builder", "--win", "--publish", "never"]);

console.log("\n=== Build complete! Output in dist/ ===");
console.log("Place .env beside the exe to configure MySQL password and settings.");
