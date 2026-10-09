import type { NextConfig } from "next";

// Common local network IPs dynamically populated for development accessibility
const devOrigins = [
  "localhost",
  "127.0.0.1",
];

// Generate origins for 192.168.1.X and 192.168.0.X range
for (let i = 1; i <= 100; i++) {
  devOrigins.push(`192.168.1.${i}`);
  devOrigins.push(`192.168.1.${i}:3000`);
  devOrigins.push(`192.168.0.${i}`);
  devOrigins.push(`192.168.0.${i}:3000`);
  devOrigins.push(`192.168.11.${i}`);
  devOrigins.push(`192.168.11.${i}:3000`);
}

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    webpackBuildWorker: false,
  },
  allowedDevOrigins: devOrigins,
  serverExternalPackages: ['ftp-srv', 'chokidar', 'express', 'cors'],
  // settingsHelper 等の動的 fs パスを @vercel/nft が過大に辿ると、
  // LP 動画・マニュアルが各 serverless 関数に同梱され 250MB 制限を超える。
  // public 動画は CDN/静的配信のまま残し、関数トレースからだけ除外する。
  outputFileTracingExcludes: {
    '*': [
      './dist/**/*',
      './Clinic_Distribution_Assets/**/*',
      './node_modules/puppeteer/**/*',
      './node_modules/puppeteer-core/**/*',
      './node_modules/tesseract.js/**/*',
      './node_modules/tesseract.js-core/**/*',
      './node_modules/electron/**/*',
      './node_modules/electron-builder/**/*',
      './node_modules/app-builder-bin/**/*',
      './node_modules/7zip-bin/**/*',
      './public/wireless-connect/videos/**/*',
      './WCマニュアル/**/*',
      './OralNote*.pdf',
      './OralNote*.html',
      './OralNote*.md',
      './electron/**/*',
      './scripts/**/*',
      './build/**/*',
      './tmp_transcript/**/*',
      './manual.html',
      './generate_pdf.js',
      './oralnote-theme.zip',
      './page-oralnote.php',
      './test-*.js',
    ],
  },
};

export default nextConfig;
