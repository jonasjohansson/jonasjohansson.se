// The landing shows only the first sentence of the About text on desktop, so
// the wall can start higher. The cut is the first full stop followed by
// whitespace, which keeps a stop inside a link address or a number whole.
export function splitLead(text) {
  const source = String(text || '').trim();
  const match = source.match(/\.\s+/);
  if (!match) return { lead: source, rest: '' };
  const end = match.index + 1;
  return { lead: source.slice(0, end), rest: source.slice(end).trim() };
}
