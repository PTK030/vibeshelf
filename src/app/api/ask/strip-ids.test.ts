import { describe, expect, it } from "vitest";
import { stripIds, stripIdsStreaming } from "@/app/api/ask/strip-ids";

describe("stripIds", () => {
  /*
   * The context lists entities as "Name [id]", and models copy that shape into
   * prose whatever the prompt says. These are the forms actually observed.
   */
  it("removes a bracketed id after a name", () => {
    expect(stripIds('You played "wismarer" Joje [3MrwEgiGPH2KtX2qJW2dMW] most.')).toBe(
      'You played "wismarer" Joje most.',
    );
  });

  it("removes several in one sentence", () => {
    const input =
      'Tracks: "Moja wina" Kaz [0fRuValcwoKXwOzFWeoR13] and "Lato" Hellfield [0T02E8IkDyF5gdweCuMNYL].';

    expect(stripIds(input)).toBe('Tracks: "Moja wina" Kaz and "Lato" Hellfield.');
  });

  it("removes the parenthesised and id= forms", () => {
    expect(stripIds("Joje (3MrwEgiGPH2KtX2qJW2dMW) is top.")).toBe("Joje is top.");
    expect(stripIds("Joje (id=3MrwEgiGPH2KtX2qJW2dMW) is top.")).toBe("Joje is top.");
  });

  it("leaves ordinary brackets alone", () => {
    const input = "You listened a lot (45 times) to one track [the long one].";

    expect(stripIds(input)).toBe(input);
  });

  it("keeps line breaks while collapsing runs of spaces", () => {
    expect(stripIds("First line\nSecond  line")).toBe("First line\nSecond line");
  });
});

describe("stripIdsStreaming", () => {
  /*
   * Text is still arriving here, so a half-typed id must never be shown: it
   * would disappear a moment later and read as the answer deleting itself.
   */
  it("hides an id that is still being typed", () => {
    expect(stripIdsStreaming('You played "wismarer" Joje [3Mrw')).toBe(
      'You played "wismarer" Joje',
    );
  });

  it("hides the bracket the moment it opens", () => {
    expect(stripIdsStreaming("Joje [")).toBe("Joje");
    expect(stripIdsStreaming("Joje (id=")).toBe("Joje");
  });

  it("never grows shorter once the id completes", () => {
    const whileTyping = stripIdsStreaming("Joje [3MrwEgiGPH2KtX2qJW2dM");
    const finished = stripIdsStreaming("Joje [3MrwEgiGPH2KtX2qJW2dMW] is top.");

    expect(finished.startsWith(whileTyping)).toBe(true);
  });

  it("leaves a sentence mid-word alone", () => {
    expect(stripIdsStreaming("You listened to a lot of mus")).toBe("You listened to a lot of mus");
  });
});
