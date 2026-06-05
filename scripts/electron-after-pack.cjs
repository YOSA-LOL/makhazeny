const fs = require("fs");
const path = require("path");

/**
 * afterPack hook — ensures server + frontend resources are fully copied
 * (electron-builder may filter some files during extraResources copy)
 */
exports.default = async function afterPack(context) {
  const projectRoot = context.packager.projectDir;
  const packDir = path.join(projectRoot, ".electron-pack");
  const resourcesDir = context.packager.getResourcesDir(context.appOutDir);

  if (!fs.existsSync(packDir)) {
    throw new Error(
      ".electron-pack not found. Run pnpm run electron:build first.",
    );
  }

  for (const subdir of ["server", "frontend"]) {
    const src = path.join(packDir, subdir);
    const dest = path.join(resourcesDir, subdir);

    if (!fs.existsSync(src)) {
      throw new Error(`Missing pack directory: ${src}`);
    }

    if (fs.existsSync(dest)) {
      fs.rmSync(dest, { recursive: true, force: true });
    }

    if (fs.cpSync) {
      fs.cpSync(src, dest, { recursive: true, verbatimSymlinks: false });
    } else {
      copyRecursive(src, dest);
    }

    console.log(`afterPack: copied ${subdir} -> ${dest}`);
  }

  // Copy .env beside the exe (user can edit MySQL password after install)
  const envSrc = path.join(projectRoot, ".env");
  const envExampleSrc = path.join(projectRoot, ".env.example");
  const appOutDir = context.appOutDir;

  if (fs.existsSync(envSrc)) {
    fs.copyFileSync(envSrc, path.join(appOutDir, ".env"));
    console.log("afterPack: copied .env beside executable");
  } else if (fs.existsSync(envExampleSrc)) {
    fs.copyFileSync(envExampleSrc, path.join(appOutDir, ".env"));
    console.log("afterPack: copied .env.example as .env beside executable");
  }
};

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
    return;
  }
  fs.copyFileSync(src, dest);
}
