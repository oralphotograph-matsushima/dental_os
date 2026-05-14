const fs = require('fs-extra');
const path = require('path');

async function buildElectron() {
  const standaloneDir = path.join(__dirname, '..', '.next', 'standalone');
  const publicDir = path.join(__dirname, '..', 'public');
  const staticDir = path.join(__dirname, '..', '.next', 'static');
  
  console.log('Preparing standalone build for Electron...');

  if (!fs.existsSync(standaloneDir)) {
    console.error('Error: .next/standalone directory not found. Please run "next build" first.');
    process.exit(1);
  }

  // Copy public directory
  if (fs.existsSync(publicDir)) {
    console.log('Copying public directory...');
    await fs.copy(publicDir, path.join(standaloneDir, 'public'));
  }

  // Copy .next/static directory
  if (fs.existsSync(staticDir)) {
    console.log('Copying .next/static directory...');
    await fs.copy(staticDir, path.join(standaloneDir, '.next', 'static'));
  }

  console.log('Successfully prepared standalone build!');
}

buildElectron().catch(console.error);
