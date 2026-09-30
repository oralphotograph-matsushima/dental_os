const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');

if (!fs.existsSync(distDir)) {
  console.log('dist directory does not exist. Skipping.');
  process.exit(0);
}

// Keep current and previous clinic versions plus electron-builder metadata
const keepPatterns = [
  '1.5.0',
  '1.4.1',
  'builder-debug.yml',
  'latest.yml'
];

function shouldKeep(filename) {
  // Never delete keep patterns
  return keepPatterns.some(pat => filename.includes(pat));
}

console.log('Starting cleanup of dist folder...');

const files = fs.readdirSync(distDir);

files.forEach(file => {
  const filePath = path.join(distDir, file);
  
  if (shouldKeep(file)) {
    console.log(`Keeping: ${file}`);
    return;
  }
  
  try {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      console.log(`Deleting directory: ${file}`);
      fs.rmSync(filePath, { recursive: true, force: true });
    } else {
      console.log(`Deleting file: ${file}`);
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error(`Failed to delete ${file}:`, err.message);
  }
});

console.log('Cleanup completed successfully.');
