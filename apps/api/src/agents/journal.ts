import { mkdirSync, writeFileSync, readFileSync, renameSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { AgentRunSchema, type AgentRun } from '@orbit/shared';
import { z } from 'zod';
const recordSchema = z.object({ fingerprint: z.string(), view: AgentRunSchema });
export class RunJournal {
  constructor(private directory: string) {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    const files = readdirSync(directory).filter(f => /^[\da-f-]+\.json$/.test(f));
    for (const file of files) {
      const record = recordSchema.parse(JSON.parse(readFileSync(join(directory, file), 'utf8')));
      if (!['completed','failed','cancelled'].includes(record.view.status)) {
        record.view.status = 'cancelled';
        record.view.error = 'The API restarted during this run. An earlier action may have finished. Inspect the computer before continuing.';
        delete record.view.approval;
        for (const m of record.view.messages) if (m.tool?.status === 'running') { m.tool.status = 'failed'; m.tool.output = record.view.error; }
        this.save(record.fingerprint, record.view);
      }
    }
    // Keep bounded local history; no screenshot or reasoning payload is persisted.
    const records = files.map(f => ({ f, record: this.get(f.slice(0,-5))! })).sort((a,b) => (b.record.view.startedAt ?? '').localeCompare(a.record.view.startedAt ?? ''));
    for (const r of records.slice(500)) unlinkSync(join(directory, r.f));
  }
  get(id: string) {
    if (!z.string().uuid().safeParse(id).success) return undefined;
    try { return recordSchema.parse(JSON.parse(readFileSync(join(this.directory, id + '.json'), 'utf8'))); }
    catch(e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw e; }
  }
  save(fingerprint: string, view: AgentRun) {
    const file = join(this.directory, z.string().uuid().parse(view.id) + '.json');
    writeFileSync(file + '.tmp', JSON.stringify({ fingerprint, view }), { mode: 0o600 });
    renameSync(file + '.tmp', file);
  }
  deleteConversation(id: string) {
    for (const f of readdirSync(this.directory).filter(f => /^[\da-f-]+\.json$/.test(f))) if (this.get(f.slice(0,-5))?.view.conversationId === id) unlinkSync(join(this.directory, f));
  }
}
