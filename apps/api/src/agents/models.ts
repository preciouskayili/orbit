import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { randomUUID } from 'node:crypto';
import type { MessageParam, ContentBlockParam } from '@anthropic-ai/sdk/resources/messages';
import type { ResponseInput, FunctionTool, Response as ModelResponse } from 'openai/resources/responses/responses';
import { ComputerError } from '../computers/service.js';
import { OpenAIAgentModel, type AgentModel } from './service.js';

// Preserve the provider's signed thinking blocks verbatim between tool turns.
export function anthropicMessages(input: ResponseInput): MessageParam[] {
  const messages: MessageParam[] = [];
  const append = (role: 'user' | 'assistant', blocks: ContentBlockParam[]) => {
    const last = messages.at(-1);
    if (last?.role === role && Array.isArray(last.content)) last.content.push(...blocks);
    else messages.push({ role, content: blocks });
  };
  for (const item of input) {
    if (item.type === 'reasoning') {
      if (item.encrypted_content?.startsWith('anthropic:')) append('assistant', JSON.parse(Buffer.from(item.encrypted_content.slice(10), 'base64').toString()));
    } else if (item.type === 'function_call') {
      append('assistant', [{ type: 'tool_use', id: item.call_id, name: item.name, input: JSON.parse(item.arguments) }]);
    } else if (item.type === 'function_call_output') {
      if (!item.call_id) throw new ComputerError(502, 'Missing tool result identifier.');
      const content: Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam> = [];
      if (typeof item.output === 'string') content.push({ type: 'text', text: item.output });
      else for (const block of item.output) {
        if (block.type === 'input_text') content.push({ type: 'text', text: block.text });
        if (block.type === 'input_image' && block.image_url) {
          const match = /^data:image\/(png|jpeg|webp|gif);base64,(.*)$/s.exec(block.image_url);
          if (match) content.push({ type: 'image', source: { type: 'base64', media_type: `image/${match[1]}` as 'image/png', data: match[2]! } });
        }
      }
      append('user', [{ type: 'tool_result', tool_use_id: item.call_id, content }]);
    } else if ('role' in item && (item.role === 'user' || item.role === 'assistant')) {
      const text = typeof item.content === 'string' ? item.content : item.content.map(b => 'text' in b ? b.text : 'refusal' in b ? b.refusal : '').join('');
      if (text) append(item.role, [{ type: 'text', text: String(text) }]);
    }
  }
  return messages;
}
export class AnthropicAgentModel implements AgentModel {
  private client: Anthropic;
  constructor(apiKey: string, private model: string, options: { fetch?: typeof fetch; baseURL?: string } = {}) {
    this.client = new Anthropic({ apiKey, timeout: 60_000, maxRetries: 0, ...options });
  }
  async respond(input: ResponseInput, instructions: string, tools: FunctionTool[], signal: AbortSignal, onText: (id: string, delta: string) => void) {
    const id = randomUUID();
    const stream = this.client.messages.stream({ model: this.model, max_tokens: 8000, system: instructions,
      messages: anthropicMessages(input), tools: tools.map(t => ({ name: t.name, description: t.description ?? '', input_schema: t.parameters as Anthropic.Tool.InputSchema })),
      ...(tools.length ? { tool_choice: { type: 'auto' as const, disable_parallel_tool_use: true } } : {}),
    }, { signal });
    stream.on('text', delta => onText(id, delta));
    const result = await stream.finalMessage();
    if (!['end_turn', 'tool_use', 'stop_sequence', 'refusal'].includes(result.stop_reason ?? '')) throw new ComputerError(502, 'Claude reached a response limit. Inspect the last result before continuing.');
    const output: ModelResponse['output'] = [];
    let text = '';
    for (const block of result.content) {
      if (block.type === 'thinking' || block.type === 'redacted_thinking') output.push({ type: 'reasoning', id: randomUUID(), summary: [], encrypted_content: 'anthropic:' + Buffer.from(JSON.stringify([block])).toString('base64') });
      else if (block.type === 'text') text += block.text;
      else if (block.type === 'tool_use') output.push({ type: 'function_call', id: block.id, call_id: block.id, name: block.name, arguments: JSON.stringify(block.input), status: 'completed' });
    }
    if (text || result.stop_reason === 'refusal') output.push({ type: 'message', id, role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: text || 'Claude declined this request.', annotations: [] }] });
    return { output, status: 'completed' as const, usage: { input_tokens: result.usage.input_tokens, output_tokens: result.usage.output_tokens } };
  }
}
export type Provider = 'openai' | 'anthropic';
export type ModelOption = { id: string; name: string; provider: Provider };
export class ModelRegistry {
  private available: ModelOption[] = [];
  private errors: Partial<Record<Provider, string>> = {};
  constructor(private keys: Partial<Record<Provider, string>>, private preferred?: string) {}
  setKey(provider: Provider, key: string) { this.keys[provider] = key; this.available = this.available.filter(m => m.provider !== provider); }
  async refresh() {
    await Promise.all((['openai', 'anthropic'] as const).map(async provider => {
      this.available = this.available.filter(m => m.provider !== provider);
      delete this.errors[provider];
      if (!this.keys[provider]) return;
      try {
        const models: ModelOption[] = [];
        if (provider === 'openai') {
          const client = new OpenAI({ apiKey: this.keys.openai, maxRetries: 0, timeout: 15_000 });
          for await (const m of client.models.list()) if (/^gpt-(6-astra|5(?:[.-]|$))/.test(m.id) && !/audio|realtime|transcri|search|codex|pro|chat/.test(m.id)) models.push({ id: m.id, name: ({ "gpt-6-astra": "GPT-6 Astra", "gpt-5.6-sol": "GPT-5.6 Sol", "gpt-5.6-terra": "GPT-5.6 Terra", "gpt-5.6-luna": "GPT-5.6 Luna" } as Record<string,string>)[m.id] ?? m.id, provider });
        } else {
          const client = new Anthropic({ apiKey: this.keys.anthropic, maxRetries: 0, timeout: 15_000 });
          for await (const m of client.models.list()) models.push({ id: m.id, name: m.display_name, provider });
        }
        this.available.push(...models);
      } catch { this.errors[provider] = 'Could not load models. Check this provider’s API key and connection.'; }
    }));
    this.available.sort((a,b) => a.id.localeCompare(b.id));
    return this.catalog();
  }
  catalog() { return { models: this.available, defaultModel: this.available.find(m => m.id === this.preferred)?.id ?? this.available.find(m => m.id === 'gpt-6-astra')?.id ?? this.available[0]?.id ?? '', providers: (['openai','anthropic'] as const).map(id => ({ id, configured: Boolean(this.keys[id]), error: this.errors[id] })) }; }
  resolve(id?: string): { model: AgentModel; id: string } {
    const selected = this.available.find(m => m.id === (id || this.catalog().defaultModel));
    if (!selected) throw new ComputerError(400, 'Choose an available model in conversation settings. Refresh providers if needed.');
    return { id: selected.id, model: selected.provider === 'openai' ? new OpenAIAgentModel(this.keys.openai!, selected.id) : new AnthropicAgentModel(this.keys.anthropic!, selected.id) };
  }
}
