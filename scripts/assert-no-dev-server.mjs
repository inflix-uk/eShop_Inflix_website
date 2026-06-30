/**
 * Block production builds while the Next dev server may still hold `.next/trace`.
 * Windows EPERM on `.next/trace` is almost always dev + build running together.
 */
import net from 'net';

const PORT = Number(process.env.STOREFRONT_DEV_PORT || 3000);

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

const busy = await portInUse(PORT);
if (busy) {
  console.error(
    `\n[prebuild] Port ${PORT} is in use — stop "npm run dev" before "npm run build".\n` +
      `         Building while dev is running locks .next/trace on Windows (EPERM).\n` +
      `         Stop the dev terminal (Ctrl+C), then run:\n` +
      `           npm run clean\n` +
      `           npm run build\n`
  );
  process.exit(1);
}
