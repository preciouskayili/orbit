import { apiConnection } from "./api-connection";
import { useEffect, useState } from 'react';
import { z } from 'zod';
const model = z.object({ id: z.string(), name: z.string(), provider: z.enum(['openai','anthropic']) });
export const catalogSchema = z.object({ computerConfigured: z.boolean().default(false), models: z.array(model), defaultModel: z.string(), providers: z.array(z.object({ id: z.enum(['openai','anthropic']), configured: z.boolean(), source: z.enum(['custom', 'default', 'none']).optional(), hasDefault: z.boolean().default(false), error: z.string().optional() })), servers: z.array(z.object({ id: z.string(), name: z.string(), url: z.string(), enabled: z.boolean(), hasToken: z.boolean() })).default([]) });
export type Catalog = z.infer<typeof catalogSchema>;
export async function integrationRequest(workspace: string, path = '', method = 'GET', body?: unknown) {
  const token = apiConnection().token;
  if (!token) throw new Error('Set VITE_ORBIT_API_TOKEN to connect to your local API.');
  const base = (apiConnection().url).replace(/\/$/, '');
  const response = await fetch(`${base}/api/workspaces/${encodeURIComponent(workspace)}/integrations${path}`, { method, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(40_000) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Could not update integrations.');
  if (method !== 'GET' && path !== '/title' && !path.endsWith('/test')) window.dispatchEvent(new Event('orbit-integrations-changed'));
  return result;
}
export function useIntegrations(workspace: string) {
  const [result, setResult] = useState<{ workspace: string; data?: Catalog; error?: Error; isPending: boolean }>({ workspace, isPending: true });
  const refetch = async () => {
    try { const data = catalogSchema.parse(await integrationRequest(workspace)); setResult({ workspace, data, isPending: false }); return data; }
    catch (e) { setResult({ workspace, error: e instanceof Error ? e : new Error('Could not connect.'), isPending: false }); }
  };
  useEffect(() => { let active = true; setResult({ workspace, isPending: true });
    const refresh = () => { void integrationRequest(workspace).then(value => { if (active) setResult({ workspace, data: catalogSchema.parse(value), isPending: false }); }).catch(e => { if (active) setResult({ workspace, error: e, isPending: false }); }); };
    refresh(); window.addEventListener('orbit-integrations-changed', refresh);
    return () => { active = false; window.removeEventListener('orbit-integrations-changed', refresh); };
  }, [workspace]);
  const current = result.workspace === workspace ? result : { workspace, isPending: true, data: undefined, error: undefined };
  return { ...current, isError: Boolean(current.error), refetch };
}
