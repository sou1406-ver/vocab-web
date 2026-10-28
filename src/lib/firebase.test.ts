import { describe, expect, it } from "vitest";
import { cloudError, firebaseClient, splitPayload } from "./firebase";

describe("Firebase browser boundary and payload encoding", () => {
  it("does not initialize Firebase during server rendering", () => {
    expect(() => firebaseClient()).toThrow(/trình duyệt/);
  });
  it("does not split emoji surrogate pairs across Firestore chunks", () => {
    const payload = "a".repeat(149999) + "🙂" + " tiếng Việt";
    const chunks = splitPayload(payload);
    const roundTripped = chunks.map((chunk) => new TextDecoder().decode(new TextEncoder().encode(chunk))).join("");
    expect(roundTripped).toBe(payload);
    expect(chunks.every((chunk) => chunk.length <= 150000)).toBe(true);
  });
  it("rejects oversized operations explicitly instead of truncating archives", () => {
    expect(() => splitPayload("a".repeat(6000001))).toThrow(/6 MB/);
  });
  it("explains popup, domain and permission errors without exposing tokens", () => {
    expect(cloudError({ code: "auth/popup-blocked" })).toMatch(/popup/);
    expect(cloudError({ code: "auth/unauthorized-domain" })).toMatch(/Domain/);
    expect(cloudError({ code: "permission-denied" })).toMatch(/Firestore Rules/);
  });
});
