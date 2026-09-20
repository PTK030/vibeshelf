/*
 * A key is never sent back to the browser — only this. Enough to confirm which
 * key is connected, not enough to use it.
 */
export function maskKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.length <= 8) return "•".repeat(8);

  /* Keep the vendor prefix, which is what tells the keys apart at a glance. */
  const prefixMatch = /^(sk-(?:or-v\d+-|ant-|proj-)?)/.exec(trimmed);
  const prefix = prefixMatch?.[1] ?? trimmed.slice(0, 3);

  return `${prefix}${"•".repeat(12)}${trimmed.slice(-4)}`;
}
