import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJsonPath = resolve(projectRoot, "package.json");

if (process.env.ARVELO_SKIP_ENSURE_DEPS === "1") {
  process.exit(0);
}

const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const dependencies = Object.keys(pkg.dependencies ?? {});

const missing = dependencies.filter((dep) => {
  const depPath = resolve(projectRoot, "node_modules", ...dep.split("/"));
  return !existsSync(depPath);
});

const nextBinPath = resolve(projectRoot, "node_modules", ".bin", "next");
const needInstall = missing.length > 0 || !existsSync(nextBinPath);

if (!needInstall) {
  process.exit(0);
}

console.log(
  `[arvelo-frontend] Installing dependencies (missing: ${missing.length})...`,
);

const timeoutMs = Number(process.env.ARVELO_NPM_INSTALL_TIMEOUT_MS ?? 5 * 60_000);

const result = spawnSync(
  process.platform === "win32" ? "npm.cmd" : "npm",
  [
    "install",
    "--no-audit",
    "--no-fund",
    "--progress=false",
    "--no-package-lock",
  ],
  {
    cwd: projectRoot,
    stdio: "inherit",
    timeout: timeoutMs,
  },
);

if (result.error?.code === "ETIMEDOUT") {
  console.error(
    `[arvelo-frontend] npm install timed out after ${timeoutMs}ms. Set ARVELO_NPM_INSTALL_TIMEOUT_MS to increase or ARVELO_SKIP_ENSURE_DEPS=1 to skip.`,
  );
}

process.exit(result.status ?? 1);
