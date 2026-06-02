import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function GET() {
  try {
    const homedir = os.homedir();
    const settingsFilePath = path.join(homedir, 'Desktop', 'OralNote_Data', 'Settings', 'clinic.json');
    let vaultPath = '';
    
    if (fs.existsSync(settingsFilePath)) {
      try {
        const config = JSON.parse(fs.readFileSync(settingsFilePath, 'utf8'));
        if (config && config.vaultPath) {
          vaultPath = config.vaultPath;
        }
      } catch (e) {
        console.error('Failed to parse clinic.json for vaultPath:', e);
      }
    }
    
    let basePatientsDir = vaultPath 
      ? path.join(vaultPath, 'Patients')
      : path.join(homedir, 'Desktop', 'OralNote_Data', 'Patients');
      
    if (!fs.existsSync(basePatientsDir)) {
      fs.mkdirSync(basePatientsDir, { recursive: true });
    }
    
    const files = fs.readdirSync(basePatientsDir);
    const patients = files.filter(file => {
      const fullPath = path.join(basePatientsDir, file);
      const isDir = fs.statSync(fullPath).isDirectory();
      return isDir && !file.startsWith('.');
    });
    
    return NextResponse.json(patients);
  } catch (error: any) {
    console.error('Error fetching patients list:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
