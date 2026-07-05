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
  outputFileTracingExcludes: {
    '*': [
      './dist/**/*',
      './OralNote_Release_v1.2.0/**/*',
      './Clinic_Distribution_Assets/**/*',
      './node_modules/puppeteer/**/*',
    ],
  },
};

export default nextConfig;
