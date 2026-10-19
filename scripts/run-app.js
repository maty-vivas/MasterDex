import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const mode = process.argv[2] === 'preview' ? 'preview' : 'dev';
const viteArguments = process.argv.slice(3);
const apiPort = process.env.MASTERDEX_API_PORT || '3001';
const environment = { ...process.env, MASTERDEX_API_PORT: apiPort };
const viteEntry = resolve(projectRoot, 'node_modules/vite/bin/vite.js');

// El modo local levanta el backend persistente y Vite para que ambos compartan el mismo origen lógico.
const backend = spawn(process.execPath, ['server/index.js'], { cwd: projectRoot, env: environment, stdio: 'inherit' });
const frontend = spawn(process.execPath, [viteEntry, ...(mode === 'preview' ? ['preview'] : []), ...viteArguments], {
  cwd: projectRoot,
  env: environment,
  stdio: 'inherit',
});

let shuttingDown = false;
function stop(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  // Ambos procesos comparten el ciclo de vida; se detienen juntos y el timeout evita quedar colgado.
  if (backend.exitCode === null) backend.kill('SIGTERM');
  if (frontend.exitCode === null) frontend.kill('SIGTERM');
  setTimeout(() => process.exit(exitCode), 1000).unref();
}

backend.on('error', (error) => { console.error('No se pudo iniciar el backend:', error.message); stop(1); });
frontend.on('error', (error) => { console.error('No se pudo iniciar Vite:', error.message); stop(1); });
backend.on('exit', (code) => { if (!shuttingDown) stop(code || 0); });
frontend.on('exit', (code) => { if (!shuttingDown) stop(code || 0); });
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
