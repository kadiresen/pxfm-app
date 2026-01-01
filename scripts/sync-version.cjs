const fs = require('fs');
const path = require('path');

// Paths
const packageJsonPath = path.resolve(__dirname, '../package.json');
const tauriConfPath = path.resolve(__dirname, '../src-tauri/tauri.conf.json');
const cargoTomlPath = path.resolve(__dirname, '../src-tauri/Cargo.toml');

// Read package.json
const packageJson = require(packageJsonPath);
const newVersion = packageJson.version;

console.log(`📦 Syncing version: ${newVersion}`);

// Update Tauri Config
if (fs.existsSync(tauriConfPath)) {
  const tauriConf = require(tauriConfPath);
  
  if (tauriConf.version !== newVersion) {
    console.log(`Updating Tauri version from ${tauriConf.version} to ${newVersion}`);
    tauriConf.version = newVersion;
    fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2));
    console.log(`✅ src-tauri/tauri.conf.json updated`);
  } else {
    console.log(`✅ Tauri version is already up to date`);
  }
} else {
  console.log('⚠️ src-tauri/tauri.conf.json not found, skipping...');
}

// Update Cargo.toml
if (fs.existsSync(cargoTomlPath)) {
  let cargoToml = fs.readFileSync(cargoTomlPath, 'utf8');
  const versionRegex = /^version\s*=\s*"(.*)"/m;
  const match = cargoToml.match(versionRegex);

  if (match && match[1] !== newVersion) {
    console.log(`Updating Cargo.toml version from ${match[1]} to ${newVersion}`);
    cargoToml = cargoToml.replace(versionRegex, `version = "${newVersion}"`);
    fs.writeFileSync(cargoTomlPath, cargoToml);
    console.log(`✅ src-tauri/Cargo.toml updated`);
  } else {
    console.log(`✅ Cargo.toml version is already up to date`);
  }
} else {
  console.log('⚠️ src-tauri/Cargo.toml not found, skipping...');
}

console.log('🚀 Version sync complete!');
