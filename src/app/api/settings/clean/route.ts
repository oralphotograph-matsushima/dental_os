import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';

export async function POST() {
  try {
    const platform = process.platform;
    const tempDir = os.tmpdir();
    
    if (platform === 'win32') {
      const scriptPath = path.join(tempDir, 'oralnote_cleanup.bat');
      const scriptContent = `@echo off
chcp 65001 > nul
echo OralNote Cleanup in progress...
timeout /t 2 /nobreak > nul

taskkill /f /im OralNote.exe > nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do taskkill /f /pid %%a > nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do taskkill /f /pid %%a > nul 2>&1

rmdir /s /q "%APPDATA%\\OralNote" > nul 2>&1
rmdir /s /q "%APPDATA%\\dental-os-prototype" > nul 2>&1
rmdir /s /q "%LOCALAPPDATA%\\Programs\\OralNote" > nul 2>&1
rmdir /s /q "%LOCALAPPDATA%\\oralnote-updater" > nul 2>&1
rmdir /s /q "%TEMP%\\oralnote-updater" > nul 2>&1

del /f /q "%USERPROFILE%\\Desktop\\OralNote.lnk" > nul 2>&1
del /f /q "%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\OralNote.lnk" > nul 2>&1

reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\com.oralnote.ai" /f > nul 2>&1
reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\OralNote" /f > nul 2>&1
reg delete "HKCU\\Software\\com.oralnote.ai" /f > nul 2>&1
reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\com.oralnote.ai" /f > nul 2>&1

reg delete "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\com.oralnote.ai" /f > nul 2>&1
reg delete "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\OralNote" /f > nul 2>&1
reg delete "HKLM\\Software\\com.oralnote.ai" /f > nul 2>&1
reg delete "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\com.oralnote.ai" /f > nul 2>&1
reg delete "HKLM\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\com.oralnote.ai" /f > nul 2>&1
reg delete "HKLM\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\OralNote" /f > nul 2>&1
reg delete "HKLM\\Software\\Wow6432Node\\com.oralnote.ai" /f > nul 2>&1

(goto) 2>nul & del "%~f0"
`;
      
      fs.writeFileSync(scriptPath, scriptContent, 'utf8');
      
      const child = spawn('cmd.exe', ['/c', scriptPath], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
      
      return NextResponse.json({ success: true, platform });
      
    } else if (platform === 'darwin') {
      const scriptPath = path.join(tempDir, 'oralnote_cleanup.sh');
      const scriptContent = `#!/bin/bash
sleep 2
pkill -f "OralNote"

PORT_3000_PID=$(lsof -t -i:3000 2>/dev/null)
if [ ! -z "$PORT_3000_PID" ]; then
  kill -9 $PORT_3000_PID 2>/dev/null
fi

PORT_3001_PID=$(lsof -t -i:3001 2>/dev/null)
if [ ! -z "$PORT_3001_PID" ]; then
  kill -9 $PORT_3001_PID 2>/dev/null
fi

rm -rf "$HOME/Library/Application Support/OralNote"
rm -rf "$HOME/Library/Application Support/dental-os-prototype"
rm -rf "$HOME/Library/Caches/com.oralnote.ai"
rm -rf "$HOME/Library/Caches/com.oralnote.ai.ShipIt"

rm -- "$0"
`;
      
      fs.writeFileSync(scriptPath, scriptContent, 'utf8');
      fs.chmodSync(scriptPath, '755');
      
      const child = spawn('/bin/bash', [scriptPath], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
      
      return NextResponse.json({ success: true, platform });
    }
    
    return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 });
    
  } catch (error: any) {
    console.error('Error starting cleanup:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
