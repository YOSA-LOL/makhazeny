/**
 * Cross-platform preinstall guard.
 * Removes npm/yarn lockfiles and warns when not using pnpm.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

for (const lockfile of ["package-lock.json", "yarn.lock"]) {
  const target = path.join(root, lockfile);
  if (fs.existsSync(target)) {
    fs.unlinkSync(target);
  }
}

const userAgent = process.env.npm_config_user_agent || "";
if (!userAgent.startsWith("pnpm/")) {
  console.error(
    "\n❌ This project requires pnpm — do NOT use npm install.\n\n" +
      "   npm crashes on this monorepo (Cannot read properties of null).\n\n" +
      "   Fix:\n" +
      "     1. npm install -g pnpm\n" +
      "     2. pnpm install\n\n",
  );
  process.exit(1);
}
