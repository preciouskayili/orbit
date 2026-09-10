const greeting = /^(?:(?:hi|hey|hello|yo|hiya|thanks|thank you|good (?:morning|evening|afternoon)|how are you|what'?s up)[\s!.,?]*)+$/i;
export function substantivePrompt(messages: { role: string; content: string }[]) {
  return messages.filter(m => m.role === 'user').map(m => m.content.trim()).find(text => text && !greeting.test(text));
}
export function fallbackTitle(messages: { role: string; content: string }[]) {
  const text = substantivePrompt(messages);
  if (!text) return 'New session';
  const clean = text.replace(/^\s*(?:hi|hey|hello)[!,\s]+/i, '').replace(/^(?:(?:please|can you|could you|would you|i want you to|help me|i need you to)\s+)+/i, '').replace(/[`#*_]/g, '').replace(/\s+/g, ' ').trim();
  const words = clean.split(' ');
  let title = words.slice(0,7).join(' ');
  while (title.length > 52 && title.includes(' ')) title = title.slice(0,title.lastIndexOf(' '));
  title = title.slice(0,52).replace(/[,.!?;:]+$/, '');
  return title ? title[0]!.toUpperCase() + title.slice(1) : 'New session';
}
