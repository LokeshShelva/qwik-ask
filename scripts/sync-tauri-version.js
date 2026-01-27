import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const version = process.argv[2];

if (!version) {
  console.error('Version argument is required');
  process.exit(1);
}

console.log(`Syncing version ${version} to Tauri files...`);

// Update Cargo.toml
const cargoPath = path.join(__dirname, '../src-tauri/Cargo.toml');
let cargoToml = fs.readFileSync(cargoPath, 'utf8');
cargoToml = cargoToml.replace(
  /^version = ".*"/m,
  `version = "${version}"`
);
fs.writeFileSync(cargoPath, cargoToml);
console.log('✓ Updated Cargo.toml');

// Update tauri.conf.json
const tauriConfPath = path.join(__dirname, '../src-tauri/tauri.conf.json');
let tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
tauriConf.version = version;
fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
console.log('✓ Updated tauri.conf.json');

// Stage the changes
try {
  execSync('git add src-tauri/Cargo.toml src-tauri/tauri.conf.json', { stdio: 'inherit' });
  console.log('✓ Staged Tauri version files');
} catch (error) {
  console.error('Failed to stage files:', error.message);
  process.exit(1);
}