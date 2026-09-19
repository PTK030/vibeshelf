/*
 * Spotify ids are 22 characters of base62. The library context lists entities
 * as "Name [id]" so the model can reference them, and models copy that shape
 * straight into prose no matter what the prompt says — so the ids are removed
 * here rather than hoped away.
 *
 * Also catches the parenthesised and "id=" variants that turn up.
 */
const ID_IN_PROSE = /\s*[([]\s*(?:id[:=]\s*)?[A-Za-z0-9]{22}\s*[)\]]/g;

/*
 * The same thing, half-typed, at the very end of the text. While streaming, an
 * id arrives a character at a time: "Joje [3Mrw" does not match the pattern
 * above yet, so it renders, and then vanishes once the closing bracket lands.
 * That is what made the answer appear to jump backwards as it was written.
 */
const PARTIAL_ID_AT_END = /\s*[([]\s*(?:i(?:d(?:[:=]\s*)?)?)?[A-Za-z0-9]{0,22}$/;

function collapseSpaces(text: string): string {
  /* Tidy the gaps left behind, without touching line breaks. */
  return text.replaceAll(/[^\S\n]{2,}/g, " ");
}

export function stripIds(text: string): string {
  return collapseSpaces(text.replaceAll(ID_IN_PROSE, ""));
}

/*
 * For text that is still arriving. Removes completed ids, then hides any
 * trailing fragment that could still turn into one, so nothing is ever shown
 * and then taken away.
 */
export function stripIdsStreaming(text: string): string {
  return collapseSpaces(text.replaceAll(ID_IN_PROSE, "").replace(PARTIAL_ID_AT_END, ""));
}
