import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const run = (args, options = {}) => { const result = spawnSync('pnpm', args, { stdio: 'inherit', ...options }); if (result.status !== 0) process.exit(result.status || 1); };
run(['--filter','@orbit/shared','build']);
run(['build'], { env: { ...process.env, VITE_ORBIT_API_TOKEN: '', VITE_API_URL: '', VITE_COMPUTER_PROVIDER: 'daytona', VITE_AGENT_PROVIDER: 'live' } });
mkdirSync('out/api', { recursive: true });
await build({ entryPoints: ['../api/src/server.ts'], outfile: 'out/api/server.cjs', bundle: true, platform: 'node', target: 'node22', format: 'cjs', external: ['fsevents', 'bufferutil', 'utf-8-validate'] });
// A minimal staging app excludes the workspace dependencies and all .env files.
mkdirSync('out/app', { recursive: true });
const { cpSync } = await import('node:fs');
for (const dir of ['dist','dist-electron','resources']) cpSync(dir, 'out/app/' + dir, { recursive: true });
// Electron's sandboxed preload must be self-contained; bundle the shared IPC constants.
await build({ entryPoints: ['electron/preload.ts'], outfile: 'out/app/dist-electron/preload.js', bundle: true, platform: 'node', format: 'cjs', external: ['electron'] });
await build({ entryPoints: ['electron/main.ts'], outfile: 'out/app/dist-electron/main.js', bundle: true, platform: 'node', format: 'cjs', external: ['electron'] });
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
writeFileSync('out/app/package.json', JSON.stringify({ name: 'orbit', version: pkg.version, main: 'dist-electron/main.js', description: 'Computers for agents', author: 'Orbit' }));
run(['exec','electron-builder', ...process.argv.slice(2)], { env: { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: process.env.CSC_IDENTITY_AUTO_DISCOVERY ?? 'false' } });
