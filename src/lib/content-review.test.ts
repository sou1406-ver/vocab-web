import { describe, expect, it } from "vitest";
import { hasContentReviewRole } from "./content-review";
import { reviewerClaimUpdate } from "../../scripts/lib/reviewer-claim.mjs";

describe("content review capability", () => {
  it("requires the exact server-issued reviewer claim, not an email or a general admin label", () => {
    expect(hasContentReviewRole({ contentReviewer: true })).toBe(true);
    for (const claims of [
      null,
      {},
      { admin: true },
      { email: "reviewer@example.test" },
      { contentReviewer: "true" },
      { contentReviewer: false },
    ])
      expect(hasContentReviewRole(claims)).toBe(false);
  });
  const account = {
    localId: "owner-id",
    email: "reviewer@example.test",
    emailVerified: true,
    providerUserInfo: [{ providerId: "google.com" }],
    customAttributes: '{"existing":"kept"}',
  };
  it("changes only the targeted account's reviewer capability, preserving other claims", () => {
    expect(reviewerClaimUpdate(account, "reviewer@example.test")).toEqual({
      localId: "owner-id",
      customAttributes: '{"existing":"kept","contentReviewer":true}',
    });
  });
  it("refuses a different, disabled, unverified or non-Google account", () => {
    for (const patch of [
      { email: "other@example.test" },
      { emailVerified: false },
      { disabled: true },
      { providerUserInfo: [] },
      { localId: "" },
    ])
      expect(() => reviewerClaimUpdate({ ...account, ...patch }, "reviewer@example.test")).toThrow();
  });
  it("does not silently retain a broader pre-existing admin role", () => {
    expect(() =>
      reviewerClaimUpdate({ ...account, customAttributes: '{"admin":true}' }, "reviewer@example.test"),
    ).toThrow();
  });
});
