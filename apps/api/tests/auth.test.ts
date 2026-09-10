import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import type { ComputerService } from '../src/computers/service.js';

test('account checks protect every workspace resource and fail closed', async () => {
  let reads = 0;
  const app = createApp({
    workspaceId: 'personal', token: 'installation',
    service: { list: async () => { reads++; return []; } } as unknown as ComputerService,
    accountAccess: {
      verify: async token => {
        if (token === 'unavailable') throw new Error('provider secret');
        return token === 'owner' || token === 'stranger' ? { id: token } : null;
      },
      canAccessWorkspace: async (id, workspace) => id === 'owner' && workspace === 'personal',
    },
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address() as { port: number };
  try {
    for (const resource of ['computers', 'agent-runs', 'integrations']) {
      for (const [session, status] of [['', 401], ['invalid', 401], ['stranger', 403], ['unavailable', 503]] as const) {
        const response = await fetch(`http://127.0.0.1:${address.port}/api/workspaces/personal/${resource}`, {
          headers: { Authorization: 'Bearer installation', 'X-Orbit-Session': session },
        });
        assert.equal(response.status, status);
        assert.equal((await response.text()).includes('provider secret'), false);
      }
    }
    assert.equal(reads, 0);
    const response = await fetch(`http://127.0.0.1:${address.port}/api/workspaces/personal/computers`, {
      headers: { Authorization: 'Bearer installation', 'X-Orbit-Session': 'owner' },
    });
    assert.equal(response.status, 200);
    assert.equal(reads, 1);
    const foreign = await fetch(`http://127.0.0.1:${address.port}/api/workspaces/other/computers`, {
      headers: { Authorization: 'Bearer installation', 'X-Orbit-Session': 'owner' },
    });
    assert.equal(foreign.status, 403);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
