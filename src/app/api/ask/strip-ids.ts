/*
 * Spotify ids are 22 characters of base62. The library context lists entities
 * as "Name [id]" so the model can reference them, and models copy that shape
 * straight into prose no matter what the prompt says — so the ids are removed
 * here rather than hoped away.
 *
 * Also catches the parenthesised and "id=" variants that turn up.
 */
const ID_IN_PROSE = /\s*[([]\s*(?:id[:=]\s*)?[A-Za-z0-9]{22}\s*[)\]]/g;

export function stripIds(text: string): string {
  /* Collapse the double spaces left behind, without touching line breaks. */
  return text.replaceAll(ID_IN_PROSE, "").replaceAll(/[^\S\n]{2,}/g, " ");
}
