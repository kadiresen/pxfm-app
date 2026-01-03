const { spawnSync } = require("node:child_process");

const args = process.argv.slice(2);

if (args[0] === "build") {
  const syncResult = spawnSync("pnpm", ["version:sync"], {
    stdio: "inherit",
  });
  if (syncResult.status !== 0) {
    process.exit(syncResult.status ?? 1);
  }
}

const tauriResult = spawnSync("tauri", args, { stdio: "inherit" });
process.exit(tauriResult.status ?? 1);
