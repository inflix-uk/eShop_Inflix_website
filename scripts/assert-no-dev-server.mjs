/**
 * Block production builds while Next may still hold `.next/trace`.
 * Windows EPERM on `.next/trace` is almost always another next process
 * (dev or a stuck build) still running in this repo.
 */
import net from 'net';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const PORT = Number(process.env.STOREFRONT_DEV_PORT || 3000);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rootNeedle = root.replace(/\\/g, '/').toLowerCase();

function portInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      resolve(err?.code === 'EADDRINUSE');
    });
    server.once('listening', () => {
      server.close(() => resolve(false));
    });
    server.listen(port, '127.0.0.1');
  });
}

function findConflictingNextPids() {
  if (process.platform !== 'win32') return [];
  try {
    const out = execSync(
      'wmic process where "name=\'node.exe\'" get ProcessId,CommandLine /FORMAT:CSV',
      { encoding: 'utf8', windowsHide: true, maxBuffer: 10 * 1024 * 1024 }
    );
    const selfPid = String(process.pid);
    const pids = [];
    for (const line of out.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('Node,')) continue;
      const lower = trimmed.toLowerCase().replace(/\\/g, '/');
      if (!lower.includes(rootNeedle)) continue;
      // CSV: Node,CommandLine,ProcessId
      const lastComma = trimmed.lastIndexOf(',');
      if (lastComma < 0) continue;
      const pid = trimmed.slice(lastComma + 1).trim();
      const cmd = trimmed.slice(0, lastComma).toLowerCase();
      if (!pid || pid === selfPid) continue;
      // Allow this prebuild's own npm/node ancestors; block next dev/build workers
      if (
        cmd.includes('next\\dist\\bin\\next') ||
        cmd.includes('next/dist/bin/next') ||
        cmd.includes('next\\dist\\server') ||
        cmd.includes('next/dist/server') ||
        cmd.includes('jest-worker')
      ) {
        pids.push(pid);
      }
    }
    return [...new Set(pids)];
  } catch {
    return [];
  }
}

const busy = await portInUse(PORT);
const conflicting = findConflictingNextPids();

if (busy || conflicting.length) {
  const reasons = [];
  if (busy) reasons.push(`port ${PORT} is in use`);
  if (conflicting.length) reasons.push(`next process(es) still running: ${conflicting.join(', ')}`);
  console.error(
    `\n[prebuild] Cannot build — ${reasons.join('; ')}.\n` +
      `         Another Next process locks .next/trace on Windows (EPERM).\n` +
      `         Stop "npm run dev" / stuck builds (Ctrl+C), then run:\n` +
      `           npm run clean\n` +
      `           npm run build\n`
  );
  process.exit(1);
}
