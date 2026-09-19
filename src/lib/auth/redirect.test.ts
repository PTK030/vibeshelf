import { describe, expect, it } from "vitest";
import { redirectToPath } from "@/lib/auth/redirect";

describe("redirectToPath", () => {
  /*
   * The point of these: an absolute Location built from request.url moves the
   * browser from 127.0.0.1 to localhost mid-OAuth, and the session cookie is
   * left behind on the other origin. Location must stay relative.
   */
  it("emits a relative Location so the origin is preserved", () => {
    const response = redirectToPath("/start");

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("/start");
  });

  it("never emits an absolute URL", () => {
    const location = redirectToPath("/?blad=brak-kodu").headers.get("location") ?? "";

    expect(location.startsWith("/")).toBe(true);
    expect(location).not.toContain("://");
  });

  it("supports 303 for redirecting after a POST", () => {
    expect(redirectToPath("/", 303).status).toBe(303);
  });
});
