const fs = require('fs');
const path = require('path');

// Paths
const packageJsonPath = path.resolve(__dirname, '../package.json');
const androidGradlePath = path.resolve(__dirname, '../android/app/build.gradle');

// Read package.json
const packageJson = require(packageJsonPath);
const newVersionName = packageJson.version;

console.log(`📦 Syncing version: ${newVersionName}`);

// 1. Update Android
if (fs.existsSync(androidGradlePath)) {
  let gradleContent = fs.readFileSync(androidGradlePath, 'utf8');

  // Update versionName
  const versionNameRegex = /versionName\s+"[^"]+"/;
  if (gradleContent.match(versionNameRegex)) {
    gradleContent = gradleContent.replace(versionNameRegex, `versionName "${newVersionName}"`);
    console.log(`✅ Android versionName updated to ${newVersionName}`);
  } else {
    console.error('❌ Could not find versionName in build.gradle');
  }

  // Auto-increment versionCode
  const versionCodeRegex = /versionCode\s+(\d+)/;
  const match = gradleContent.match(versionCodeRegex);
  if (match) {
    const currentCode = parseInt(match[1], 10);
    const newCode = currentCode + 1;
    gradleContent = gradleContent.replace(versionCodeRegex, `versionCode ${newCode}`);
    console.log(`✅ Android versionCode incremented to ${newCode}`);
  } else {
    console.error('❌ Could not find versionCode in build.gradle');
  }

  fs.writeFileSync(androidGradlePath, gradleContent);
} else {
  console.log('⚠️ Android folder not found, skipping...');
}

console.log('🚀 Version sync complete!');
