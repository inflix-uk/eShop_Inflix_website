/**
 * Windows-safe .next cleanup with retries (EPERM when dev server still holds trace).
 */
import { rm } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targets = ['.next', path.join('node_modules', '.cache')];

async function removeWithRetry(target, attempts = 6) {
  const full = path.join(root, target);
  if (!existsSync(full)) return;

  let delay = 400;
  for (let i = 0; i < attempts; i += 1) {
    try {
      await rm(full, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      return;
    } catch (err) {
      const code = err && typeof err === 'object' ? err.code : '';
      if ((code === 'EPERM' || code === 'EBUSY') && i < attempts - 1) {
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      console.error(
        `\n[clean] Could not delete ${target} (${code || 'error'}).\n` +
          `        Stop all "npm run dev" / node processes using this repo, then retry:\n` +
          `          npm run clean\n`
      );
      if (target === '.next') process.exit(1);
      return;
    }
  }
}

for (const target of targets) {
  await removeWithRetry(target);
}

console.log('[clean] Removed .next and node_modules/.cache');
