import { NextResponse } from 'next/server';
import 'ftp-srv';
import 'chokidar';
import 'express';
import 'cors';

export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Dummy imports for ensuring watcher dependencies are packaged in standalone build.' 
  });
}
