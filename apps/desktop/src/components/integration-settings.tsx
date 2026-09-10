import { useState } from 'react';
import { useOrbit } from '@/hooks/use-orbit';
import { integrationRequest, useIntegrations, type Catalog } from '@/lib/integrations';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Field, ErrorNotice } from './flow-ui';
import { Checkbox } from './ui/checkbox';

export function IntegrationSettings({ section }: { section: 'models' | 'mcp' }) {
  const { workspaceId } = useOrbit();
  const query = useIntegrations(workspaceId);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Catalog['servers'][number] | null | undefined>();
  const [tools, setTools] = useState<Record<string, string[]>>({});
  const [provider, setProvider] = useState<'openai' | 'anthropic'>('openai');
  const [key, setKey] = useState('');
  const [daytonaKey, setDaytonaKey] = useState('');
  async function act(fn: () => Promise<unknown>) {
    setBusy(true); setError('');
    try { await fn(); await query.refetch(); } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <section className="space-y-4">
    <div className="flex items-center justify-between"><div><h2 className="text-sm font-medium text-zinc-200">{section === 'models' ? 'Model providers' : 'MCP connections'}</h2><p className="mt-1 text-xs leading-5 text-zinc-500">{section === 'models' ? 'Connect your API accounts. Available models appear in the conversation picker.' : 'Connect a Streamable HTTP MCP server, inspect its tools, then enable it in an instruction profile.'}</p></div>
      {section === 'mcp' ? <Button variant="secondary" disabled={busy || !query.data} onClick={() => setEditing(null)}>Add server</Button> : <Button variant="secondary" disabled={busy || !query.data} onClick={() => void act(() => integrationRequest(workspaceId, '/refresh', 'POST'))}>Refresh models</Button>}
    </div>
    {query.isPending && <p role="status" className="text-xs text-zinc-400">Connecting to your API…</p>}
    <ErrorNotice message={error || query.error?.message || ''} />
    {query.isError && <Button variant="secondary" onClick={() => void query.refetch()}>Retry connection</Button>}
    {section === 'models' && query.data && <>
      <div className="grid gap-3 sm:grid-cols-2">{query.data.providers.map(p => <div key={p.id} className="rounded-xl bg-white/[0.035] p-4"><h3 className="text-sm text-zinc-200">{p.id === 'openai' ? 'OpenAI' : 'Anthropic'}</h3><p className="mt-2 text-xs text-zinc-400">{p.configured ? `${query.data!.models.filter(m => m.provider === p.id).length} models available` : 'API key required'}</p><ErrorNotice message={p.error ?? ''} />{p.configured && <Button variant="ghost" size="sm" disabled={busy} onClick={() => void act(() => integrationRequest(workspaceId, '/providers/' + p.id, 'POST', { key: '' }))}>Disconnect</Button>}</div>)}</div>
      <form className="space-y-3 rounded-xl bg-white/[0.035] p-4" onSubmit={e => { e.preventDefault(); void act(async () => { await integrationRequest(workspaceId, '/providers/' + provider, 'POST', { key }); setKey(''); }); }}>
        <div className="flex gap-2">{(['openai', 'anthropic'] as const).map(p => <Button key={p} type="button" variant={provider === p ? 'secondary' : 'ghost'} onClick={() => setProvider(p)}>{p === 'openai' ? 'OpenAI' : 'Anthropic'}</Button>)}</div>
        <Field label={`${provider === 'openai' ? 'OpenAI' : 'Anthropic'} API key`}><input type="password" autoComplete="off" className="flow-input" value={key} required onChange={e => setKey(e.target.value)} /></Field>
        <p className="text-xs leading-5 text-zinc-500">Keys are saved by your local API with restricted file permissions. They are never stored in the conversation or returned to this page.</p>
        <Button disabled={busy || !key.trim()} type="submit">{busy ? 'Connecting…' : 'Save and load models'}</Button>
      </form>
      <form className="space-y-3 rounded-xl bg-white/[0.035] p-4" onSubmit={e => { e.preventDefault(); void act(async () => { await integrationRequest(workspaceId, '/computer-provider', 'POST', { key: daytonaKey }); setDaytonaKey(''); }); }}><h3 className="text-sm text-zinc-200">Daytona computers · {query.data.computerConfigured ? 'Connected' : 'Not connected'}</h3><Field label="Daytona API key"><input type="password" autoComplete="off" className="flow-input" value={daytonaKey} required onChange={e => setDaytonaKey(e.target.value)} /></Field><Button type="submit" disabled={busy || !daytonaKey.trim()}>Save and test Daytona</Button></form>
    </>}
    {section === 'mcp' && query.data && <div className="space-y-3">
      {!query.data.servers.length && <p className="rounded-xl bg-white/[0.025] p-5 text-sm text-zinc-500">No servers connected yet. Add your server URL to make its tools available.</p>}
      {query.data.servers.map(server => <div key={server.id} className="rounded-xl bg-white/[0.035] p-5">
        <div className="flex items-center gap-3"><h3 className="flex-1 text-sm font-medium text-zinc-200">{server.name}</h3><label className="flex items-center gap-2 text-xs text-zinc-400"><Checkbox disabled={busy} checked={server.enabled} onCheckedChange={enabled => void act(() => integrationRequest(workspaceId, '/servers/' + server.id, 'PATCH', { enabled }))} />Enabled</label></div>
        <p className="mt-2 break-all text-xs text-zinc-500">{server.url}</p>
        <div className="mt-3 flex gap-2"><Button size="sm" variant="secondary" disabled={busy} onClick={() => void act(async () => { const result = await integrationRequest(workspaceId, '/servers/' + server.id + '/test', 'POST'); setTools(t => ({ ...t, [server.id]: result.tools.map((tool: { name: string }) => tool.name) })); })}>Test connection</Button><Button size="sm" variant="ghost" disabled={busy} onClick={() => setEditing(server)}>Edit</Button><Button size="sm" variant="ghost" disabled={busy} onClick={() => void act(() => integrationRequest(workspaceId, '/servers/' + server.id, 'DELETE'))}>Remove</Button></div>
        {tools[server.id] && <div role="status" className="mt-3 text-xs text-emerald-300"><p>Connected · {tools[server.id]!.length} tools</p><ul className="mt-2 space-y-1 text-zinc-400">{tools[server.id]!.map(t => <li key={t}>{t}</li>)}</ul></div>}
      </div>)}
    </div>}
    <Dialog open={editing !== undefined} onOpenChange={open => { if (!open) setEditing(undefined); }}><DialogContent className="p-6"><DialogTitle>{editing ? 'Edit MCP server' : 'Add MCP server'}</DialogTitle><DialogDescription className="mt-2">Use the server’s Streamable HTTP endpoint. A bearer token is optional.</DialogDescription>{editing !== undefined && <McpEditor key={editing?.id ?? 'new'} server={editing} onSave={async body => { await integrationRequest(workspaceId, '/servers' + (editing ? '/' + editing.id : ''), editing ? 'PATCH' : 'POST', body); await query.refetch(); setEditing(undefined); }} />}</DialogContent></Dialog>
  </section>;
}
function McpEditor({ server, onSave }: { server: Catalog['servers'][number] | null; onSave: (body: unknown) => Promise<void> }) {
  const [name, setName] = useState(server?.name ?? ''); const [url, setUrl] = useState(server?.url ?? ''); const [token, setToken] = useState(''); const [clearToken, setClearToken] = useState(false); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  return <form className="mt-5 space-y-4" onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); try { await onSave({ name, url, enabled: server?.enabled ?? true, ...(token || clearToken ? { token: clearToken ? '' : token } : {}) }); } catch(e) { setError((e as Error).message); } finally { setBusy(false); } }}>
    <Field label="Server name"><input className="flow-input" maxLength={60} required value={name} onChange={e => setName(e.target.value)} /></Field>
    <Field label="MCP URL"><input className="flow-input" type="url" required value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/mcp" /></Field>
    <Field label={server?.hasToken ? 'Replace bearer token (leave blank to keep)' : 'Bearer token (optional)'}><input className="flow-input" type="password" autoComplete="off" value={token} onChange={e => setToken(e.target.value)} /></Field>
    {server?.hasToken && <label className="flex items-center gap-2 text-xs text-zinc-400"><Checkbox checked={clearToken} onCheckedChange={setClearToken} />Remove saved token</label>}
    <ErrorNotice message={error} /><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save server'}</Button>
  </form>;
}
