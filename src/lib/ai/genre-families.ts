/*
 * Spotify has on the order of a thousand micro-genres ("melodic dubstep",
 * "chamber psych"). Collapsing them into a couple of dozen families lets us
 * build chunks that are internally coherent, which measurably steadies the
 * model on borderline calls.
 *
 * This map lives in code, not in data: it changes together with the prompt and
 * must be versioned in the same commit.
 */
const FAMILY_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
  ["metal", /metal|metalcore|djent|grindcore|doom|sludge/],
  ["punk", /punk|hardcore|emo|screamo|riot/],
  ["rock", /rock|grunge|shoegaze|britpop|garage/],
  ["indie", /indie|lo-fi rock|dream pop|slacker/],
  ["electronic", /tech(no)?|house|trance|edm|electro|rave|breakbeat|dubstep|drum and bass|dnb/],
  ["ambient", /ambient|drone|new age|field recording/],
  ["hiphop", /hip hop|rap|trap|grime|drill|boom bap/],
  ["rnb", /r&b|rnb|soul|neo soul|funk|motown/],
  ["pop", /pop|synthpop|electropop|dance pop|k-pop|j-pop/],
  ["jazz", /jazz|bebop|swing|bossa|fusion/],
  ["classical", /classical|baroque|romantic|orchestra|opera|modern classical|neoclassic/],
  ["folk", /folk|americana|bluegrass|country|singer-songwriter/],
  ["latin", /latin|reggaeton|salsa|cumbia|bachata|samba/],
  ["reggae", /reggae|dub|dancehall|ska/],
  ["blues", /blues|delta|boogie/],
  ["world", /afrobeat|afro|world|celtic|klezmer|flamenco|balkan/],
  ["soundtrack", /soundtrack|score|cinematic|video game|anime/],
  ["experimental", /experimental|noise|avant|industrial|post-/],
  ["chill", /chill|lounge|downtempo|trip hop|lo-fi beats/],
];

export const UNKNOWN_FAMILY = "unknown";

export function genreFamily(genres: readonly string[]): string {
  for (const genre of genres) {
    const lower = genre.toLowerCase();
    for (const [family, pattern] of FAMILY_PATTERNS) {
      if (pattern.test(lower)) return family;
    }
  }
  return UNKNOWN_FAMILY;
}
