import { Daytona } from '@daytona/sdk';
import { DaytonaComputers } from '../src/computers/service.js';
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { AgentRunSchema, MachinesResponseSchema } from '@orbit/shared';
// LIVE: uses tokens and the explicitly selected existing integration-test machine.
// Run: tsx scripts/eval-desktop.ts <computer-id> [model-id] [repetitions]
const [machineId, model = 'gpt-6-astra', count = '2'] = process.argv.slice(2);
const repetitions = Number(count);
if (!machineId || !Number.isInteger(repetitions) || repetitions < 1 || repetitions > 10) throw new Error('Pass a computer ID, optional model, and 1–10 repetitions.');
const base = `http://127.0.0.1:${process.env.API_PORT || 4000}/api/workspaces/${encodeURIComponent(process.env.ORBIT_WORKSPACE_ID || 'personal')}`;
async function request(path: string, body?: unknown) {
  const response = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: 'Bearer ' + process.env.ORBIT_API_TOKEN, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(150_000) });
  const result = await response.json(); if (!response.ok) throw new Error(result.message || 'Request failed'); return result;
}
const machine = MachinesResponseSchema.parse(await request('/computers')).find(m => m.id === machineId);
if (!machine || machine.name !== 'Orbit integration test') throw new Error('Use the dedicated Orbit integration test computer.');
const computerTools = new DaytonaComputers(new Daytona(), { workspaceId: process.env.ORBIT_WORKSPACE_ID || 'personal', instanceId: readFileSync((process.env.ORBIT_DATA_DIR || '.data') + '/instance-id', 'utf8').trim(), image: '', autoStopMinutes: 30, vncPort: 6080 });
const reports: unknown[] = []; let active: string | undefined;
try {
  if (machine.status === 'stopped') await request(`/computers/${machineId}/start`, {});
  for (let i = 0; i < repetitions; i++) {
    const started = Date.now(); active = randomUUID();
    let run = AgentRunSchema.parse(await request('/agent-runs', { requestId: active, conversationId: 'eval-' + active, model, instructions: 'Perform only the requested application-launch test. Do not create projects, change settings, or edit user files.', skills: ['terminal','browser','files'], machineIds: [machineId], messages: [{ role: 'user', content: i === 0 ? 'Open VS Code. If it is not installed, install it first. Leave its window visible.' : 'Open VS Code.' }] }));
    while (!['completed','failed','cancelled'].includes(run.status)) {
      if (Date.now() - started > 240_000) throw new Error('Desktop evaluation exceeded four minutes.');
      await delay(600); run = AgentRunSchema.parse(await request('/agent-runs/' + active, { action: 'heartbeat', humanMachineIds: [] }));
      if (run.approval) throw new Error('The launch task unexpectedly requested confirmation.');
    }
    const verification = await computerTools.execute('terminal', { machineId, command: 'xwininfo -root -tree' }, async () => {});
    const windowVerified = /Visual Studio Code/i.test(verification.text);
    const screenshot = await computerTools.execute('computer', { machineId, action: { type: 'screenshot' } }, async () => {});
    mkdirSync('.data/evals', { recursive: true });
    if (screenshot.image) writeFileSync('.data/evals/' + run.id + '.png', Buffer.from(screenshot.image.split(',')[1]!, 'base64'), { mode: 0o600 });
    const report = { windowVerified, repetition: i + 1, model: run.model, status: run.status, elapsedMs: Date.now() - started, metrics: run.metrics, error: run.error, events: run.messages };
    reports.push(report); console.log(JSON.stringify(report)); active = undefined;
    if (!windowVerified) throw new Error('Independent window inspection did not find Visual Studio Code.');
    if (run.status !== 'completed') throw new Error(run.error || 'Agent did not complete.');
    if (!run.messages.some(m => m.tool?.name === 'computer' && m.tool.status === 'completed')) throw new Error('The agent did not visually verify the application.');
  }
} finally {
  if (active) await request('/agent-runs/' + active, { action: 'cancel' }).catch(() => {});
  if (machine.status === 'stopped') await request(`/computers/${machineId}/stop`, {}).catch(() => {});
  mkdirSync('.data/evals', { recursive: true }); writeFileSync('.data/evals/' + Date.now() + '.json', JSON.stringify(reports, null, 2), { mode: 0o600 });
}
