import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { RunJournal } from '../src/agents/journal.js';
import { IntegrationStore } from '../src/integrations/store.js';
import { anthropicMessages, AnthropicAgentModel } from '../src/agents/models.js';
import { agentTools } from '../src/agents/tools.js';
import { McpSession } from '../src/integrations/mcp.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { z } from 'zod';

test('run journal recovers interrupted work without replaying actions or pending approvals', () => {
  const dir = mkdtempSync(join(tmpdir(), 'orbit-journal-'));
  try {
    const id = randomUUID(); const journal = new RunJournal(dir);
    journal.save('fingerprint', { id, conversationId: 'test', status: 'running', messages: [{ id: 'tool', role: 'assistant', content: 'Running', tool: { name: 'terminal', input: '{}', output: '', status: 'running' } }], approval: { id: 'approval', description: 'old' }, model: 'gpt-6-astra' });
    const recovered = new RunJournal(dir).get(id)!;
    assert.equal(recovered.view.status, 'cancelled'); assert.equal(recovered.view.approval, undefined);
    assert.equal(recovered.view.messages[0]?.tool?.status, 'failed'); assert.equal(recovered.fingerprint, 'fingerprint');
    assert.equal(statSync(join(dir, id + '.json')).mode & 0o777, 0o600);
    journal.deleteConversation('test'); assert.equal(journal.get(id), undefined);
  } finally { rmSync(dir, { recursive: true }); }
});
test('provider and MCP secrets persist privately and are absent from public configuration', () => {
  const dir = mkdtempSync(join(tmpdir(), 'orbit-integrations-'));
  try {
    const store = new IntegrationStore(dir); store.data.providers.openai = 'secret-key';
    store.data.servers.push({ id: randomUUID(), name: 'Example', url: 'https://example.com/mcp', token: 'secret-token', enabled: true }); store.save();
    assert.equal(new IntegrationStore(dir).data.providers.openai, 'secret-key');
    assert.equal(JSON.stringify(store.publicServers()).includes('secret-token'), false);
    assert.equal(statSync(join(dir, 'integrations.json')).mode & 0o777, 0o600);
  } finally { rmSync(dir, { recursive: true }); }
});
test('Claude history preserves signed thinking, tool identifiers and screenshot observations', () => {
  const thinking = { type: 'thinking', thinking: '', signature: 'signed' };
  const messages = anthropicMessages([{ role: 'user', content: 'Open the app' }, { type: 'reasoning', id: 'r', summary: [], encrypted_content: 'anthropic:' + Buffer.from(JSON.stringify([thinking])).toString('base64') }, { type: 'function_call', call_id: 'c1', name: 'computer', arguments: '{}' }, { type: 'function_call_output', call_id: 'c1', output: [{ type: 'input_text', text: 'Screen' }, { type: 'input_image', image_url: 'data:image/png;base64,aGVsbG8=', detail: 'original' }] }]);
  assert.deepEqual((messages[1]!.content as unknown[])[0], thinking);
  assert.equal(messages[2]!.role, 'user'); assert.match(JSON.stringify(messages[2]), /tool_use_id.*c1/); assert.match(JSON.stringify(messages[2]), /image\/png/);
});
test('Claude adapter streams text, carries tool calls, and returns usage', async () => {
  let sent: any;
  const events = [
    { type: 'message_start', message: { id: 'msg', type: 'message', role: 'assistant', model: 'claude-fable-5', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 20, output_tokens: 0 } } },
    { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
    { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Done' } },
    { type: 'content_block_stop', index: 0 },
    { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 2 } },
    { type: 'message_stop' },
  ];
  const model = new AnthropicAgentModel('test-key', 'claude-fable-5', { fetch: async (_url, options) => { sent = JSON.parse(String(options?.body)); return new Response(events.map(e => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join(''), { headers: { 'Content-Type': 'text/event-stream' } }); } });
  let text = ''; const result = await model.respond([{ role: 'user', content: 'Hello' }], 'instructions', agentTools(['browser'], true), new AbortController().signal, (_id, delta) => { text += delta; });
  assert.equal(text, 'Done'); assert.equal(result.status, 'completed'); assert.equal(result.usage.output_tokens, 2);
  assert.equal(sent.model, 'claude-fable-5'); assert.equal(sent.tool_choice.disable_parallel_tool_use, true);
  assert.ok(sent.tools.some((t: any) => t.name === 'computer_batch'));
});
test('MCP connects over HTTP, discovers tools and executes a real protocol call', async () => {
  const app = express(); app.use(express.json());
  const transports: StreamableHTTPServerTransport[] = [];
  app.post('/mcp', async (req, res) => {
    const server = new McpServer({ name: 'test', version: '1' });
    server.registerTool('echo', { inputSchema: { text: z.string() } }, async ({ text }) => ({ content: [{ type: 'text', text: 'echo:' + text }] }));
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined }); transports.push(transport);
    await server.connect(transport); await transport.handleRequest(req, res, req.body);
    res.on('close', () => { void transport.close(); void server.close(); });
  });
  const http = app.listen(0, '127.0.0.1'); await new Promise<void>(r => http.once('listening', r));
  const session = new McpSession();
  try {
    await session.connect([{ id: randomUUID(), name: 'Echo', url: `http://127.0.0.1:${(http.address() as {port:number}).port}/mcp`, enabled: true }], AbortSignal.timeout(5000));
    assert.equal(session.tools.length, 1);
    const result = await session.call(session.tools[0]!.name, { text: 'verified' }, AbortSignal.timeout(5000));
    assert.match(result.text, /echo:verified/); assert.equal(result.failed, false);
    await assert.rejects(session.call('unknown', {}, new AbortController().signal), /not attached/);
  } finally { await session.close(); await Promise.allSettled(transports.map(t => t.close())); await new Promise<void>(r => http.close(() => r())); }
});
