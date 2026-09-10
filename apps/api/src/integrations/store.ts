import { mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
export const McpConfigSchema = z.object({ id: z.string().uuid(), name: z.string().trim().min(1).max(60), url: z.string().url().max(2048).refine(value => { const u = new URL(value); return ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password; }, 'Use an HTTP or HTTPS URL without embedded credentials.'), token: z.string().max(8000).optional(), enabled: z.boolean() });
export type McpConfig = z.infer<typeof McpConfigSchema>;
const schema = z.object({ providers: z.object({ openai: z.string().optional(), anthropic: z.string().optional() }).default({}), daytonaKey: z.string().optional(), servers: z.array(McpConfigSchema).max(20).default([]) });
export class IntegrationStore {
  data: z.infer<typeof schema>;
  constructor(private directory: string) {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    try { this.data = schema.parse(JSON.parse(readFileSync(join(directory, 'integrations.json'), 'utf8'))); }
    catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; this.data = schema.parse({}); }
  }
  save() {
    const file = join(this.directory, 'integrations.json');
    writeFileSync(file + '.tmp', JSON.stringify(schema.parse(this.data)), { mode: 0o600 });
    renameSync(file + '.tmp', file);
  }
  publicServers() { return this.data.servers.map(({ token, ...server }) => ({ ...server, hasToken: Boolean(token) })); }
}
